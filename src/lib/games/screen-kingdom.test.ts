import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  ACTS,
  CAMERA_POSES,
  HOUSE,
  KEEP,
  LEN,
  MARK_Z,
  ROOM_Z,
  STEP_CAP,
  YARD,
  cellX,
  createKingdom,
  makeKingdom,
  mixSeed,
  nextSeed,
  openActions,
  resign,
  stepKingdom,
  type Act,
  type KingdomState,
} from "./screen-kingdom";

const SOLUTIONS: Record<string, readonly Act[]> = {
  "beside-keep": ["W", "R", "R"],
  "clear-house": ["R", "W", "R", "R"],
  "swapped-keep": ["W", "R", "W", "W", "W"],
  "return-court": ["W", "W", "R", "W", "W", "W"],
};

function replay(id: string, actions: readonly Act[]): KingdomState {
  return actions.reduce((state, action) => stepKingdom(state, action), createKingdom(seedFor(id)));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createKingdom(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: KingdomState): string {
  // The mark is part of the kingdom, so the same heights with the banner elsewhere are a different realm.
  return `${state.cells.join("")}:${state.mark}`;
}

function shortest(start: KingdomState): Act[][] {
  const dist = new Map<string, number>([[key(start), 0]]);
  const ways = new Map<string, number>([[key(start), 1]]);
  const via = new Map<string, Act[]>([[key(start), []]]);
  const queue: KingdomState[] = [start];
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
      const next = stepKingdom(cur, action);
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

function stories(cells: readonly number[]): number {
  return cells.reduce((sum, cell) => sum + cell, 0);
}

describe("screen kingdom", () => {
  it("puts east on screen-right and the mark above the kingdom from the +z camera", () => {
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
      const field = new Vector3(cellX(2), 0.2, ROOM_Z);
      expect(mark.project(camera).y).toBeGreaterThan(field.project(camera).y);
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

  it("keeps one hand-checked order for each realm, and the mark keeps a keep and a yard", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createKingdom(seedFor(id));
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      expect(start.steps).toBe(0);
      expect(start.read).toEqual([]);
      expect(start.cells).not.toEqual(start.goal);
      expect(start.goal.some((cell) => cell === KEEP)).toBe(true);
      expect(start.goal.some((cell) => cell === YARD)).toBe(true);
      expect(stories(start.cells)).toBe(stories(start.goal));
      expect(start.goalMark).toBeGreaterThanOrEqual(0);
      expect(start.goalMark).toBeLessThan(LEN);
      let state = start;
      for (const action of solution) {
        const before = state;
        state = stepKingdom(state, action);
        expect(state).not.toBe(before);
        expect(stories(state.cells)).toBe(stories(start.cells));
        if (action !== solution[solution.length - 1]) expect(state.status).toBe("play");
      }
      expect(state.status).toBe("win");
      expect(state.steps).toBe(solution.length);
      expect(state.read).toEqual(solution);
      expect(state.loseReason).toBeNull();
      expect(state.cells).toEqual(state.goal);
      expect(state.mark).toBe(state.goalMark);
      expect(shortest(start)).toEqual([solution]);
    }
  });

  it("takes one story from the east neighbor and leaves the mark where it stands", () => {
    const raised = stepKingdom(makeKingdom({
      cells: [YARD, YARD, YARD, HOUSE, KEEP],
      mark: 2,
      goal: [KEEP, KEEP, KEEP, KEEP, KEEP],
      goalMark: 4,
    }), "R");
    expect(raised.cells).toEqual([YARD, YARD, HOUSE, YARD, KEEP]);
    expect(raised.mark).toBe(2);

    const blocked = makeKingdom({
      cells: [YARD, YARD, KEEP, HOUSE, YARD],
      mark: 2,
      goal: [YARD, YARD, YARD, YARD, YARD],
    });
    expect(stepKingdom(blocked, "R")).toBe(blocked);

    const emptyEast = makeKingdom({
      cells: [HOUSE, YARD, YARD, YARD, YARD],
      mark: 0,
      goal: [KEEP, KEEP, KEEP, KEEP, KEEP],
    });
    expect(stepKingdom(emptyEast, "R")).toBe(emptyEast);

    const eastEnd = makeKingdom({
      cells: [YARD, YARD, YARD, HOUSE, KEEP],
      mark: 4,
      goal: [KEEP, KEEP, KEEP, KEEP, KEEP],
    });
    expect(stepKingdom(eastEnd, "R")).toBe(eastEnd);
  });

  it("walks the mark one plot east and returns from the east end without changing a height", () => {
    const walked = stepKingdom(makeKingdom({
      cells: [YARD, HOUSE, YARD, YARD, KEEP],
      mark: 2,
      goal: [KEEP, KEEP, KEEP, KEEP, KEEP],
      goalMark: 0,
    }), "W");
    expect(walked.cells).toEqual([YARD, HOUSE, YARD, YARD, KEEP]);
    expect(walked.mark).toBe(3);

    const wrapped = stepKingdom(makeKingdom({
      cells: [HOUSE, YARD, YARD, YARD, KEEP],
      mark: 4,
      goal: [KEEP, KEEP, KEEP, KEEP, KEEP],
      goalMark: 1,
    }), "W");
    expect(wrapped.cells).toEqual([HOUSE, YARD, YARD, YARD, KEEP]);
    expect(wrapped.mark).toBe(0);
  });

  it("wins on the eighth act when the mark matches, and stops when it does not", () => {
    const aimed = makeKingdom({
      cells: [YARD, HOUSE, YARD, KEEP, YARD],
      mark: 4,
      goal: [YARD, HOUSE, YARD, KEEP, YARD],
      goalMark: 0,
      steps: 7,
    });
    const won = stepKingdom(aimed, "W");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(won.loseReason).toBeNull();
    expect(won.mark).toBe(0);

    const missed = makeKingdom({
      cells: [YARD, HOUSE, YARD, KEEP, YARD],
      mark: 4,
      goal: [YARD, HOUSE, YARD, KEEP, YARD],
      goalMark: 1,
      steps: 7,
    });
    const capped = stepKingdom(missed, "W");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(capped.steps).toBe(STEP_CAP);

    const still = makeKingdom({
      cells: [YARD, YARD, KEEP, HOUSE, YARD],
      mark: 4,
      goal: [YARD, YARD, YARD, YARD, KEEP],
      goalMark: 0,
      steps: 7,
    });
    expect(stepKingdom(still, "R")).toBe(still);
    expect(still.steps).toBe(7);

    const early = makeKingdom({
      cells: [YARD, YARD, YARD, KEEP, HOUSE],
      mark: 1,
      goal: [YARD, YARD, KEEP, YARD, HOUSE],
      goalMark: 2,
      steps: 7,
    });
    expect(stepKingdom(early, "W").status).not.toBe("win");
    expect(stepKingdom(early, "R")).toBe(early);
    expect(shortest(early)).toEqual([]);
  });

  it("counts two equal-length orders as more than one answer", () => {
    const split = makeKingdom({
      cells: [YARD, YARD, YARD, HOUSE, HOUSE],
      mark: 2,
      goal: [YARD, YARD, HOUSE, HOUSE, YARD],
      goalMark: 2,
    });
    const takeWest = ["R", "W", "R", "W", "W", "W", "W"] as const;
    const takeEast = ["W", "R", "W", "W", "W", "W", "R"] as const;
    expect(takeWest.reduce((state, action) => stepKingdom(state, action), split).status).toBe("win");
    expect(takeEast.reduce((state, action) => stepKingdom(state, action), split).status).toBe("win");
    expect(shortest(split)).toEqual([]);
  });

  it("stops a resigned or finished kingdom on the same state", () => {
    const start = createKingdom(seedFor("beside-keep"));
    const stopped = resign(start);
    expect(stopped.loseReason).toBe("resign");
    expect(stopped.steps).toBe(start.steps);
    expect(resign(stopped)).toBe(stopped);
    expect(stepKingdom(stopped, "W")).toBe(stopped);
    const won = replay("beside-keep", SOLUTIONS["beside-keep"]);
    expect(stepKingdom(won, "R")).toBe(won);
    expect(resign(won)).toBe(won);
    const lost = stepKingdom(makeKingdom({
      cells: [YARD, HOUSE, YARD, KEEP, YARD],
      mark: 4,
      goal: [YARD, HOUSE, YARD, KEEP, YARD],
      goalMark: 1,
      steps: 7,
    }), "W");
    expect(stepKingdom(lost, "R")).toBe(lost);
    expect(resign(lost)).toBe(lost);
  });

  it("rebuilds the same kingdom from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 80; seed += 1) {
      const realm = createKingdom(seed);
      expect(createKingdom(seed)).toEqual(realm);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      expect(realm.cells).toHaveLength(LEN);
      expect(realm.goal).toHaveLength(LEN);
      seen.add(realm.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createKingdom(Number.NaN).puzzleId).toBe(createKingdom(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
    expect(openActions(createKingdom(seedFor("clear-house")))).toEqual(["R", "W"]);
    expect(openActions(createKingdom(seedFor("beside-keep")))).toEqual(["W"]);
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./screen-kingdom.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/ScreenKingdom.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/ScreenKingdomScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
      expect(source.includes("speechSynthesis")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(screen.includes("openActions")).toBe(false);
    expect(logic.includes("beside-keep: [")).toBe(false);
    expect(logic.includes("clear-house: [")).toBe(false);
    expect(logic.includes("swapped-keep: [")).toBe(false);
    expect(logic.includes("return-court: [")).toBe(false);
    expect(scene.includes("transmission")).toBe(false);
    expect(scene.includes("setFromUnitVectors")).toBe(false);
    expect(scene.includes("cellX")).toBe(true);
    expect(scene.split("lookAt").length - 1).toBe(1);
    expect(screen.includes("一時停止")).toBe(true);
  });
});
