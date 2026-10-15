import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  ACTS,
  CAMERA_POSES,
  DRY,
  FAIR,
  LEN,
  MARK_Z,
  ROOM_Z,
  STEP_CAP,
  WET,
  cellX,
  createTown,
  makeTown,
  mixSeed,
  nextSeed,
  openActions,
  resign,
  stepTown,
  type Act,
  type TownState,
} from "./emotion-weather";

const SOLUTIONS: Record<string, readonly Act[]> = {
  "east-rain": ["R", "C", "R"],
  "keep-river": ["R", "C", "R", "R"],
  "two-banks": ["R", "R", "C", "C", "R"],
  "kept-dry": ["C", "C", "R", "R", "C", "C"],
};

function replay(id: string, actions: readonly Act[]): TownState {
  return actions.reduce((state, action) => stepTown(state, action), createTown(seedFor(id)));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createTown(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: TownState): string {
  return state.cells.join("");
}

function shortest(start: TownState): Act[][] {
  const dist = new Map<string, number>([[key(start), 0]]);
  const ways = new Map<string, number>([[key(start), 1]]);
  const via = new Map<string, Act[]>([[key(start), []]]);
  const queue: TownState[] = [start];
  let head = 0;
  let goalDist = Number.POSITIVE_INFINITY;
  let goalWays = 0;
  const goalPaths: Act[][] = [];
  while (head < queue.length) {
    const cur = queue[head];
    head += 1;
    const curKey = key(cur);
    const curDist = dist.get(curKey) ?? 0;
    if (curDist > goalDist) continue;
    const curWays = ways.get(curKey) ?? 0;
    const curPath = via.get(curKey) ?? [];
    for (const action of ACTS) {
      const next = stepTown(cur, action);
      if (next === cur || next.status === "lose") continue;
      const nextDist = curDist + 1;
      const path = [...curPath, action];
      if (next.status === "win") {
        if (nextDist < goalDist) {
          goalDist = nextDist;
          goalWays = curWays;
          goalPaths.length = 0;
          if (curWays === 1) goalPaths.push(path);
        } else if (nextDist === goalDist) {
          goalWays += curWays;
          goalPaths.length = 0;
        }
        continue;
      }
      if (nextDist >= STEP_CAP || nextDist >= goalDist) continue;
      const id = key(next);
      const prev = dist.get(id);
      if (prev === undefined) {
        dist.set(id, nextDist);
        ways.set(id, curWays);
        if (curWays === 1) via.set(id, path);
        queue.push(next);
      } else if (nextDist === prev) {
        ways.set(id, (ways.get(id) ?? 0) + curWays);
        via.delete(id);
      }
    }
  }
  if (goalWays !== 1) return [];
  return goalPaths;
}

describe("emotion weather", () => {
  it("puts east on screen-right and the mark above the town from the +z camera", () => {
    expect(CAMERA_POSES[0][0]).toBe(0);
    expect(CAMERA_POSES[0][2]).toBeGreaterThan(0);
    expect(CAMERA_POSES).toHaveLength(4);
    expect(cellX(LEN - 1)).toBeGreaterThan(cellX(0));
    expect(MARK_Z).toBeLessThan(ROOM_Z);
    const page = new Vector3(0, 0, 0);
    for (const pose of CAMERA_POSES) {
      expect(pose[2]).toBeGreaterThan(2);
      expect(Math.hypot(pose[0], pose[1])).toBeLessThan(pose[2]);
      const camera = new PerspectiveCamera(36, 1, 0.1, 40);
      camera.position.set(pose[0], pose[1], pose[2]);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      const dir = new Vector3();
      camera.getWorldDirection(dir);
      expect(dir.z).toBeLessThan(-0.7);
      expect(dir.dot(page.clone().sub(camera.position).normalize())).toBeGreaterThan(0.9);
      const mark = new Vector3(cellX(2), 0.35, MARK_Z);
      const town = new Vector3(cellX(2), 0.2, ROOM_Z);
      expect(mark.project(camera).y).toBeGreaterThan(town.project(camera).y);
    }
    const camera = new PerspectiveCamera(36, 1, 0.1, 40);
    camera.position.set(CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const east = new Vector3(cellX(LEN - 1), 0, 0);
    const west = new Vector3(cellX(0), 0, 0);
    expect(east.dot(right)).toBeGreaterThan(west.dot(right));
  });

  it("keeps one hand-checked order for each town, and the mark is never all mild", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createTown(seedFor(id));
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      expect(start.steps).toBe(0);
      expect(start.read).toEqual([]);
      expect(start.cells).not.toEqual(start.goal);
      expect(start.goal.some((cell) => cell === DRY || cell === WET)).toBe(true);
      let state = start;
      for (const action of solution) {
        const before = state;
        state = stepTown(state, action);
        expect(state).not.toBe(before);
        expect(state.cells).not.toEqual(before.cells);
        if (action !== solution[solution.length - 1]) expect(state.status).toBe("play");
      }
      expect(state.status).toBe("win");
      expect(state.steps).toBe(solution.length);
      expect(state.read).toEqual(solution);
      expect(state.loseReason).toBeNull();
      expect(state.cells).toEqual(state.goal);
      expect(shortest(start)).toEqual([solution]);
    }
  });

  it("changes only the westernmost district an act fits, and the east takes the spill", () => {
    const cheered = stepTown(makeTown({
      cells: [WET, FAIR, WET, FAIR, FAIR],
      goal: [FAIR, FAIR, FAIR, FAIR, FAIR],
    }), "C");
    expect(cheered.cells).toEqual([FAIR, DRY, WET, FAIR, FAIR]);

    const rained = stepTown(makeTown({
      cells: [DRY, FAIR, DRY, FAIR, FAIR],
      goal: [FAIR, FAIR, FAIR, FAIR, FAIR],
    }), "R");
    expect(rained.cells).toEqual([FAIR, WET, DRY, FAIR, FAIR]);

    const eastEdge = stepTown(makeTown({
      cells: [FAIR, FAIR, FAIR, FAIR, WET],
      goal: [FAIR, FAIR, FAIR, FAIR, FAIR],
    }), "C");
    expect(eastEdge.cells).toEqual([FAIR, FAIR, FAIR, FAIR, FAIR]);
    expect(eastEdge).not.toBe(makeTown({
      cells: [FAIR, FAIR, FAIR, FAIR, WET],
      goal: [FAIR, FAIR, FAIR, FAIR, FAIR],
    }));

    const dryEdge = stepTown(makeTown({
      cells: [FAIR, FAIR, FAIR, FAIR, DRY],
      goal: [DRY, DRY, DRY, DRY, DRY],
    }), "R");
    expect(dryEdge.cells).toEqual([FAIR, FAIR, FAIR, FAIR, FAIR]);

    const alreadyDry = stepTown(makeTown({
      cells: [WET, DRY, FAIR, FAIR, FAIR],
      goal: [DRY, DRY, DRY, DRY, DRY],
    }), "C");
    expect(alreadyDry.cells).toEqual([FAIR, DRY, FAIR, FAIR, FAIR]);

    const alreadyWet = stepTown(makeTown({
      cells: [DRY, WET, FAIR, FAIR, FAIR],
      goal: [DRY, DRY, DRY, DRY, DRY],
    }), "R");
    expect(alreadyWet.cells).toEqual([FAIR, WET, FAIR, FAIR, FAIR]);
  });

  it("leaves an act with no district on the same town", () => {
    const mild = makeTown({
      cells: [FAIR, FAIR, FAIR, FAIR, FAIR],
      goal: [DRY, FAIR, FAIR, FAIR, FAIR],
    });
    expect(stepTown(mild, "C")).toBe(mild);
    expect(stepTown(mild, "R")).toBe(mild);
    expect(mild.steps).toBe(0);
    expect(openActions(mild)).toEqual([]);
  });

  it("wins on the eighth act when the mark matches, and stops when it does not", () => {
    const cheered = makeTown({
      cells: [WET, FAIR, FAIR, FAIR, FAIR],
      goal: [FAIR, DRY, FAIR, FAIR, FAIR],
      steps: 7,
    });
    const won = stepTown(cheered, "C");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(won.loseReason).toBeNull();
    expect(won.cells).toEqual([FAIR, DRY, FAIR, FAIR, FAIR]);

    const missed = makeTown({
      cells: [WET, FAIR, FAIR, FAIR, FAIR],
      goal: [FAIR, FAIR, FAIR, FAIR, FAIR],
      steps: 7,
    });
    const capped = stepTown(missed, "C");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(capped.steps).toBe(STEP_CAP);
    expect(capped.cells).toEqual([FAIR, DRY, FAIR, FAIR, FAIR]);

    const quiet = makeTown({
      cells: [FAIR, FAIR, FAIR, FAIR, FAIR],
      goal: [DRY, FAIR, FAIR, FAIR, FAIR],
      steps: 7,
    });
    expect(stepTown(quiet, "C")).toBe(quiet);
    expect(quiet.steps).toBe(7);

    const late = makeTown({
      cells: [WET, FAIR, DRY, FAIR, DRY],
      goal: [FAIR, FAIR, WET, WET, DRY],
      steps: 7,
    });
    expect(stepTown(late, "C").status).not.toBe("win");
    expect(stepTown(late, "R").status).not.toBe("win");
    expect(shortest(late)).toEqual([]);
  });

  it("counts two equal-length orders as more than one answer", () => {
    const split = makeTown({
      cells: [WET, FAIR, FAIR, DRY, DRY],
      goal: [FAIR, FAIR, WET, FAIR, FAIR],
    });
    const cheerFirst = ["C", "R", "R"] as const;
    const rainFirst = ["R", "C", "R"] as const;
    expect(cheerFirst.reduce((state, action) => stepTown(state, action), split).status).toBe("win");
    expect(rainFirst.reduce((state, action) => stepTown(state, action), split).status).toBe("win");
    expect(shortest(split)).toEqual([]);
  });

  it("stops a resigned or finished town on the same state", () => {
    const start = createTown(seedFor("east-rain"));
    const stopped = resign(start);
    expect(stopped.loseReason).toBe("resign");
    expect(stopped.steps).toBe(start.steps);
    expect(resign(stopped)).toBe(stopped);
    expect(stepTown(stopped, "C")).toBe(stopped);
    const won = replay("east-rain", SOLUTIONS["east-rain"]);
    expect(stepTown(won, "R")).toBe(won);
    expect(resign(won)).toBe(won);
    const lost = stepTown(makeTown({
      cells: [WET, FAIR, FAIR, FAIR, FAIR],
      goal: [FAIR, FAIR, FAIR, FAIR, FAIR],
      steps: 7,
    }), "C");
    expect(stepTown(lost, "R")).toBe(lost);
    expect(resign(lost)).toBe(lost);
  });

  it("rebuilds the same town from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 80; seed += 1) {
      const town = createTown(seed);
      expect(createTown(seed)).toEqual(town);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      expect(town.cells).toHaveLength(LEN);
      expect(town.goal).toHaveLength(LEN);
      seen.add(town.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createTown(Number.NaN).puzzleId).toBe(createTown(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
    expect(openActions(createTown(seedFor("east-rain")))).toEqual(["C", "R"]);
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./emotion-weather.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/EmotionWeather.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/EmotionWeatherScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
      expect(source.includes("speechSynthesis")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(screen.includes("openActions")).toBe(false);
    expect(logic.includes("east-rain: [")).toBe(false);
    expect(logic.includes("keep-river: [")).toBe(false);
    expect(logic.includes("two-banks: [")).toBe(false);
    expect(logic.includes("kept-dry: [")).toBe(false);
    expect(scene.includes("transmission")).toBe(false);
    expect(scene.includes("setFromUnitVectors")).toBe(false);
    expect(scene.includes("cellX")).toBe(true);
    expect(scene.split("lookAt").length - 1).toBe(1);
    expect(screen.includes("一時停止")).toBe(true);
  });
});
