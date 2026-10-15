import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  ACTS,
  CAMERA_POSES,
  DUE,
  LATE,
  LEN,
  MARK_Z,
  QUIET,
  ROOM_Z,
  STEP_CAP,
  cellX,
  createLine,
  makeLine,
  mixSeed,
  nextSeed,
  openActions,
  resign,
  stepLine,
  type Act,
  type LineState,
} from "./subway-conductor";

const SOLUTIONS: Record<string, readonly Act[]> = {
  "kept-late": ["S", "H", "S"],
  "second-bunch": ["S", "H", "S", "S"],
  "east-due": ["S", "H", "H", "S", "S"],
  "pushed-late": ["S", "S", "S", "H", "S", "S"],
};

function replay(id: string, actions: readonly Act[]): LineState {
  return actions.reduce((state, action) => stepLine(state, action), createLine(seedFor(id)));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createLine(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: LineState): string {
  return state.cells.join("");
}

function shortest(start: LineState): Act[][] {
  const dist = new Map<string, number>([[key(start), 0]]);
  const ways = new Map<string, number>([[key(start), 1]]);
  const via = new Map<string, Act[]>([[key(start), []]]);
  const queue: LineState[] = [start];
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
      const next = stepLine(cur, action);
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

describe("subway conductor", () => {
  it("puts east on screen-right and the mark above the line from the +z camera", () => {
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
      const line = new Vector3(cellX(2), 0.2, ROOM_Z);
      expect(mark.project(camera).y).toBeGreaterThan(line.project(camera).y);
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

  it("keeps one hand-checked order for each line, and the mark keeps a quiet platform and a late train", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createLine(seedFor(id));
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      expect(start.steps).toBe(0);
      expect(start.read).toEqual([]);
      expect(start.cells).not.toEqual(start.goal);
      expect(start.goal.some((cell) => cell === QUIET)).toBe(true);
      expect(start.goal.some((cell) => cell === LATE)).toBe(true);
      expect(start.goal.every((cell) => cell === DUE)).toBe(false);
      let state = start;
      for (const action of solution) {
        const before = state;
        state = stepLine(state, action);
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

  it("changes only the westernmost platform an act fits, and the east takes the cascade", () => {
    const held = stepLine(makeLine({
      cells: [LATE, DUE, LATE, QUIET, QUIET],
      goal: [QUIET, QUIET, QUIET, QUIET, QUIET],
    }), "H");
    expect(held.cells).toEqual([DUE, QUIET, LATE, QUIET, QUIET]);

    const sent = stepLine(makeLine({
      cells: [DUE, QUIET, DUE, QUIET, QUIET],
      goal: [LATE, LATE, LATE, LATE, LATE],
    }), "S");
    expect(sent.cells).toEqual([QUIET, DUE, DUE, QUIET, QUIET]);

    const eastHold = stepLine(makeLine({
      cells: [QUIET, QUIET, QUIET, QUIET, LATE],
      goal: [LATE, LATE, LATE, LATE, LATE],
    }), "H");
    expect(eastHold.cells).toEqual([QUIET, QUIET, QUIET, QUIET, DUE]);

    const eastSend = stepLine(makeLine({
      cells: [QUIET, QUIET, QUIET, QUIET, DUE],
      goal: [LATE, LATE, LATE, LATE, LATE],
    }), "S");
    expect(eastSend.cells).toEqual([QUIET, QUIET, QUIET, QUIET, QUIET]);

    const alreadyQuiet = stepLine(makeLine({
      cells: [LATE, QUIET, QUIET, QUIET, QUIET],
      goal: [LATE, LATE, LATE, LATE, LATE],
    }), "H");
    expect(alreadyQuiet.cells).toEqual([DUE, QUIET, QUIET, QUIET, QUIET]);

    const alreadyLate = stepLine(makeLine({
      cells: [DUE, LATE, QUIET, QUIET, QUIET],
      goal: [QUIET, QUIET, QUIET, QUIET, QUIET],
    }), "S");
    expect(alreadyLate.cells).toEqual([QUIET, LATE, QUIET, QUIET, QUIET]);
  });

  it("leaves an act with no platform on the same line", () => {
    const quiet = makeLine({
      cells: [QUIET, QUIET, QUIET, QUIET, QUIET],
      goal: [LATE, QUIET, QUIET, QUIET, QUIET],
    });
    expect(stepLine(quiet, "H")).toBe(quiet);
    expect(stepLine(quiet, "S")).toBe(quiet);
    expect(quiet.steps).toBe(0);
    const packed = makeLine({
      cells: [LATE, LATE, LATE, LATE, LATE],
      goal: [QUIET, QUIET, QUIET, QUIET, QUIET],
    });
    expect(stepLine(packed, "S")).toBe(packed);
    const due = makeLine({
      cells: [DUE, DUE, DUE, DUE, DUE],
      goal: [QUIET, QUIET, QUIET, QUIET, QUIET],
    });
    expect(stepLine(due, "H")).toBe(due);
    expect(openActions(quiet)).toEqual([]);
  });

  it("wins on the eighth act when the mark matches, and stops when it does not", () => {
    const held = makeLine({
      cells: [LATE, DUE, QUIET, QUIET, QUIET],
      goal: [DUE, QUIET, QUIET, QUIET, QUIET],
      steps: 7,
    });
    const won = stepLine(held, "H");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(won.loseReason).toBeNull();
    expect(won.cells).toEqual([DUE, QUIET, QUIET, QUIET, QUIET]);

    const missed = makeLine({
      cells: [LATE, DUE, QUIET, QUIET, QUIET],
      goal: [DUE, DUE, DUE, DUE, DUE],
      steps: 7,
    });
    const capped = stepLine(missed, "H");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(capped.steps).toBe(STEP_CAP);
    expect(capped.cells).toEqual([DUE, QUIET, QUIET, QUIET, QUIET]);

    const still = makeLine({
      cells: [QUIET, QUIET, QUIET, QUIET, QUIET],
      goal: [LATE, QUIET, QUIET, QUIET, QUIET],
      steps: 7,
    });
    expect(stepLine(still, "H")).toBe(still);
    expect(still.steps).toBe(7);

    const late = makeLine({
      cells: [LATE, DUE, DUE, QUIET, QUIET],
      goal: [QUIET, DUE, LATE, QUIET, QUIET],
      steps: 7,
    });
    expect(stepLine(late, "H").status).not.toBe("win");
    expect(stepLine(late, "S").status).not.toBe("win");
    expect(shortest(late)).toEqual([]);
  });

  it("counts two equal-length orders as more than one answer", () => {
    const split = makeLine({
      cells: [LATE, LATE, DUE, QUIET, QUIET],
      goal: [QUIET, LATE, QUIET, DUE, QUIET],
    });
    const holdFirst = ["H", "S", "S"] as const;
    const sendFirst = ["S", "H", "S"] as const;
    expect(holdFirst.reduce((state, action) => stepLine(state, action), split).status).toBe("win");
    expect(sendFirst.reduce((state, action) => stepLine(state, action), split).status).toBe("win");
    expect(shortest(split)).toEqual([]);
  });

  it("stops a resigned or finished line on the same state", () => {
    const start = createLine(seedFor("kept-late"));
    const stopped = resign(start);
    expect(stopped.loseReason).toBe("resign");
    expect(stopped.steps).toBe(start.steps);
    expect(resign(stopped)).toBe(stopped);
    expect(stepLine(stopped, "H")).toBe(stopped);
    const won = replay("kept-late", SOLUTIONS["kept-late"]);
    expect(stepLine(won, "S")).toBe(won);
    expect(resign(won)).toBe(won);
    const lost = stepLine(makeLine({
      cells: [LATE, DUE, QUIET, QUIET, QUIET],
      goal: [DUE, DUE, DUE, DUE, DUE],
      steps: 7,
    }), "H");
    expect(stepLine(lost, "S")).toBe(lost);
    expect(resign(lost)).toBe(lost);
  });

  it("rebuilds the same line from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 80; seed += 1) {
      const line = createLine(seed);
      expect(createLine(seed)).toEqual(line);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      expect(line.cells).toHaveLength(LEN);
      expect(line.goal).toHaveLength(LEN);
      seen.add(line.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createLine(Number.NaN).puzzleId).toBe(createLine(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
    expect(openActions(createLine(seedFor("kept-late")))).toEqual(["H", "S"]);
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./subway-conductor.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/SubwayConductor.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/SubwayConductorScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
      expect(source.includes("speechSynthesis")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(screen.includes("openActions")).toBe(false);
    expect(logic.includes("kept-late: [")).toBe(false);
    expect(logic.includes("second-bunch: [")).toBe(false);
    expect(logic.includes("east-due: [")).toBe(false);
    expect(logic.includes("pushed-late: [")).toBe(false);
    expect(scene.includes("transmission")).toBe(false);
    expect(scene.includes("setFromUnitVectors")).toBe(false);
    expect(scene.includes("cellX")).toBe(true);
    expect(scene.split("lookAt").length - 1).toBe(1);
    expect(screen.includes("一時停止")).toBe(true);
  });
});
