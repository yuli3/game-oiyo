import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  ABSENT,
  ACTS,
  CAMERA_POSES,
  COLS,
  INK,
  ROWS,
  SPAWN,
  STEP_CAP,
  STONE,
  cellX,
  cellZ,
  createLine,
  makeLine,
  mixSeed,
  nextSeed,
  openActions,
  resign,
  stepLine,
  type Act,
  type LineState,
} from "./doodle-line";

const SOLUTIONS: Record<string, readonly Act[]> = {
  "near-span": ["E", "E", "H"],
  "stone-hook": ["S", "E", "E", "H"],
  "trap-south": ["E", "N", "E", "H"],
  "far-lane": ["S", "E", "E", "E", "H"],
};

const CAUGHT: Record<string, readonly number[]> = {
  "near-span": [0, ABSENT, 0, ABSENT],
  "stone-hook": [0, ABSENT, 1, ABSENT],
  "trap-south": [1, ABSENT, 0, ABSENT],
  "far-lane": [0, ABSENT, ABSENT, 1],
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
  return `${state.cells.join("")}@${state.tip}`;
}

function inkCount(state: LineState): number {
  return state.cells.filter((cell) => cell === INK).length;
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
      if (nextDist >= goalDist) continue;
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

describe("doodle line", () => {
  it("puts east on screen-right and north above the base from the +z camera", () => {
    expect(CAMERA_POSES[0][0]).toBe(0);
    expect(CAMERA_POSES[0][2]).toBeGreaterThan(0);
    expect(CAMERA_POSES).toHaveLength(4);
    expect(cellX(COLS - 1)).toBeGreaterThan(cellX(0));
    expect(cellZ(0)).toBeLessThan(cellZ(ROWS - 1));
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
      const north = new Vector3(cellX(1), 0.2, cellZ(0));
      const south = new Vector3(cellX(1), 0.2, cellZ(ROWS - 1));
      expect(north.project(camera).y).toBeGreaterThan(south.project(camera).y);
    }
    const camera = new PerspectiveCamera(36, 1, 0.1, 40);
    camera.position.set(CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const east = new Vector3(cellX(COLS - 1), 0, 0);
    const west = new Vector3(cellX(0), 0, 0);
    expect(east.dot(right)).toBeGreaterThan(west.dot(right));
  });

  it("keeps one hand-checked shortest stroke for each page", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createLine(seedFor(id));
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      expect(start.steps).toBe(0);
      expect(start.cells[start.tip]).toBe(INK);
      let ink = inkCount(start);
      let state = start;
      for (const action of solution) {
        const stones = state.cells;
        state = stepLine(state, action);
        expect(inkCount(state)).toBeGreaterThanOrEqual(ink);
        ink = inkCount(state);
        for (let index = 0; index < stones.length; index += 1) {
          if (stones[index] === STONE) expect(state.cells[index]).toBe(STONE);
        }
        if (action !== "H") expect(state.status).toBe("play");
      }
      expect(state.status).toBe("win");
      expect(state.steps).toBe(solution.length);
      expect(state.loseReason).toBeNull();
      expect(state.caught).toEqual(CAUGHT[id]);
      expect(shortest(start)).toEqual([solution]);
    }
  });

  it("rejects the border, a stone, and ink already drawn, and waits to win until the hand lets go", () => {
    const start = createLine(seedFor("near-span"));
    expect(start.caught[0]).toBe(SPAWN);
    expect(start.caught[2]).toBe(SPAWN);
    expect(start.caught[1]).toBe(ABSENT);
    expect(stepLine(start, "W")).toBe(start);
    const stepped = stepLine(start, "E");
    expect(stepped).not.toBe(start);
    expect(stepLine(stepped, "W")).toBe(stepped);
    expect(stepLine(stepLine(stepped, "E"), "H").status).toBe("win");
    expect(stepLine(start, "E").status).toBe("play");

    const hooked = createLine(seedFor("stone-hook"));
    expect(stepLine(hooked, "E")).toBe(hooked);

    const early = stepLine(start, "H");
    expect(early.status).toBe("lose");
    expect(early.loseReason).toBe("breach");
    expect(early.steps).toBe(1);
    expect(early.caught[0]).toBe(0);
    expect(early.caught[2]).toBe(ROWS);
    expect(early.caught[1]).toBe(ABSENT);
  });

  it("spends the cap on the eighth stroke and still seals the page when the hand lets go", () => {
    let state = makeLine({ start: [0, 0], stones: [], threats: [3] });
    for (const action of ["E", "E", "E", "S", "W", "W", "W"] as const) {
      state = stepLine(state, action);
      expect(state.status).toBe("play");
    }
    expect(state.steps).toBe(7);
    const won = stepLine(state, "H");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(won.caught[3]).toBe(0);
    const capped = stepLine(state, "S");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(capped.steps).toBe(STEP_CAP);
    expect(capped.caught[3]).toBe(SPAWN);

    let open = makeLine({ start: [0, 0], stones: [], threats: [3] });
    for (const action of ["E", "S", "W", "S", "E", "E", "N"] as const) {
      open = stepLine(open, action);
      expect(open.status).toBe("play");
    }
    const sealedLate = stepLine(open, "E");
    expect(sealedLate.status).toBe("lose");
    expect(sealedLate.loseReason).toBe("cap");
    expect(sealedLate.cells[sealedLate.tip]).toBe(INK);

    let missed = makeLine({ start: [0, 0], stones: [], threats: [3] });
    for (const action of ["E", "E", "S", "W", "W", "S", "E"] as const) {
      missed = stepLine(missed, action);
      expect(missed.status).toBe("play");
    }
    const breached = stepLine(missed, "H");
    expect(breached.status).toBe("lose");
    expect(breached.loseReason).toBe("breach");
    expect(breached.steps).toBe(STEP_CAP);
    expect(breached.caught[3]).toBe(ROWS);
  });

  it("stops a resigned or finished page on the same state", () => {
    const start = createLine(seedFor("near-span"));
    const stopped = resign(start);
    expect(stopped.loseReason).toBe("resign");
    expect(resign(stopped)).toBe(stopped);
    expect(stepLine(stopped, "E")).toBe(stopped);
    const won = replay("near-span", SOLUTIONS["near-span"]);
    expect(stepLine(won, "S")).toBe(won);
    expect(resign(won)).toBe(won);
    const lost = stepLine(start, "H");
    expect(stepLine(lost, "E")).toBe(lost);
    expect(resign(lost)).toBe(lost);
  });

  it("rebuilds the same page from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 80; seed += 1) {
      const page = createLine(seed);
      expect(createLine(seed)).toEqual(page);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      expect(page.cells).toHaveLength(COLS * ROWS);
      expect(page.caught).toHaveLength(COLS);
      seen.add(page.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createLine(Number.NaN).puzzleId).toBe(createLine(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
    expect(openActions(createLine(0)).length).toBeGreaterThan(0);
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./doodle-line.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/DoodleLine.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/DoodleLineScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
      expect(source.includes("speechSynthesis")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(logic.includes("near-span: [")).toBe(false);
    expect(scene.includes("transmission")).toBe(false);
    expect(scene.includes("setFromUnitVectors")).toBe(false);
    expect(scene.includes("cellX")).toBe(true);
    expect(scene.split("lookAt").length - 1).toBe(1);
  });
});
