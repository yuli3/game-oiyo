import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  CAMERA_POSES,
  DIRS,
  STEP_CAP,
  STONE,
  blow,
  cellX,
  cellY,
  createCloud,
  destination,
  makeCloud,
  mixSeed,
  nextSeed,
  openActions,
  resign,
  stepCloud,
  type CloudState,
  type Dir,
} from "./cloud-sculptor";

const SOLUTIONS: Record<string, readonly Dir[]> = {
  "lee-side": ["E", "S"],
  "cross-cut": ["S", "E"],
  "high-blow": ["W", "N", "N"],
  "shed-east": ["E", "W", "S"],
};

function replay(id: string, actions: readonly Dir[]): CloudState {
  return actions.reduce((state, action) => stepCloud(state, action), createCloud(seedFor(id)));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createCloud(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: CloudState): string {
  return state.cells.join(",");
}

function shortest(start: CloudState): Dir[][] {
  const wins: Dir[][] = [];
  const seen = new Set<string>([key(start)]);
  const queue: { state: CloudState; path: Dir[] }[] = [{ state: start, path: [] }];
  let head = 0;
  let limit = Number.POSITIVE_INFINITY;
  while (head < queue.length) {
    const cur = queue[head];
    head += 1;
    if (cur.path.length >= limit) continue;
    for (const action of DIRS) {
      const next = stepCloud(cur.state, action);
      if (next === cur.state) continue;
      const path = [...cur.path, action];
      if (next.status === "win") {
        if (path.length < limit) {
          limit = path.length;
          wins.length = 0;
        }
        if (path.length === limit) wins.push(path);
        continue;
      }
      if (next.status !== "play" || path.length >= limit) continue;
      const id = key(next);
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push({ state: next, path });
    }
  }
  return wins;
}

describe("cloud sculptor", () => {
  it("puts east on screen-right and north on screen-up from the +z camera", () => {
    expect(CAMERA_POSES[0][0]).toBe(0);
    expect(CAMERA_POSES[0][2]).toBeGreaterThan(0);
    expect(CAMERA_POSES).toHaveLength(4);
    expect(cellX(5)).toBeGreaterThan(cellX(3));
    expect(cellY(1)).toBeGreaterThan(cellY(7));
    expect(cellX(STONE)).toBe(0);
    expect(cellY(STONE)).toBe(0);
    expect(destination(1, "S")).toBeNull();
    expect(destination(2, "E")).toBeNull();
    expect(destination(0, "E")).toBe(1);
    const sky = new Vector3(0, 0, 0);
    for (const pose of CAMERA_POSES) {
      expect(pose[2]).toBeGreaterThan(2);
      expect(Math.hypot(pose[0], pose[1])).toBeLessThan(pose[2]);
      const camera = new PerspectiveCamera(36, 1, 0.1, 40);
      camera.position.set(pose[0], pose[1], pose[2]);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const dir = new Vector3();
      camera.getWorldDirection(dir);
      expect(dir.z).toBeLessThan(-0.7);
      const toSky = sky.clone().sub(camera.position).normalize();
      expect(dir.dot(toSky)).toBeGreaterThan(0.9);
    }
    const camera = new PerspectiveCamera(36, 1, 0.1, 40);
    camera.position.set(CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const east = new Vector3(cellX(5), cellY(5), 0);
    const west = new Vector3(cellX(3), cellY(3), 0);
    const north = new Vector3(cellX(1), cellY(1), 0);
    const south = new Vector3(cellX(7), cellY(7), 0);
    expect(east.dot(right)).toBeGreaterThan(west.dot(right));
    expect(north.dot(up)).toBeGreaterThan(south.dot(up));
  });

  it("keeps one hand-checked shortest carving for each sky", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createCloud(seedFor(id));
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      expect(start.cells.length).toBeGreaterThan(start.target.length);
      expect(start.cells.includes(STONE)).toBe(false);
      expect(start.target.includes(STONE)).toBe(false);
      const end = replay(id, solution);
      expect(end.status).toBe("win");
      expect(end.steps).toBe(solution.length);
      expect(end.cells).toEqual(end.target);
      expect(shortest(start)).toEqual([solution]);
    }
  });

  it("sends a puff into the stone on the lee side and scatters a north wind off the top", () => {
    const lee = createCloud(seedFor("lee-side"));
    const slid = stepCloud(lee, "E");
    expect(slid.status).toBe("play");
    expect(slid.cells).toEqual([1, 2]);
    const cut = stepCloud(slid, "S");
    expect(cut.status).toBe("win");
    expect(cut.cells).toEqual([5]);
    const high = createCloud(seedFor("high-blow"));
    const blown = stepCloud(high, "N");
    expect(blown.status).toBe("lose");
    expect(blown.loseReason).toBe("scattered");
    expect(blown.cells).toEqual([]);
    expect(stepCloud(blown, "W")).toBe(blown);
  });

  it("spends the cap on an east-west fidget and still accepts a matching wind on the last step", () => {
    let state = makeCloud({ cells: [0], target: [8] });
    const fidget: Dir[] = ["E", "W", "E", "W", "E", "W", "E"];
    for (const action of fidget) {
      state = stepCloud(state, action);
      expect(state.status).toBe("play");
    }
    const capped = stepCloud(state, "W");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(capped.steps).toBe(STEP_CAP);
    const ready = makeCloud({ cells: [3], target: [0], steps: STEP_CAP - 1 });
    const won = stepCloud(ready, "N");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(won.cells).toEqual([0]);
  });

  it("stops a resigned or finished sky on the same state", () => {
    const start = createCloud(seedFor("lee-side"));
    const stopped = resign(start);
    expect(stopped.loseReason).toBe("resign");
    expect(resign(stopped)).toBe(stopped);
    expect(stepCloud(stopped, "E")).toBe(stopped);
    const won = replay("lee-side", SOLUTIONS["lee-side"]);
    expect(stepCloud(won, "N")).toBe(won);
    expect(resign(won)).toBe(won);
  });

  it("rebuilds the same sky from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const sky = createCloud(seed);
      expect(createCloud(seed)).toEqual(sky);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      seen.add(sky.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createCloud(Number.NaN).puzzleId).toBe(createCloud(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
    expect(openActions(createCloud(0)).length).toBeGreaterThan(0);
    expect(blow([0, 1], "E")).toEqual([1, 2]);
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./cloud-sculptor.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/CloudSculptor.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/CloudSculptorScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(logic.includes("lee-side: [")).toBe(false);
    expect(scene.includes("transmission")).toBe(false);
    expect(scene.includes("cellX")).toBe(true);
  });
});
