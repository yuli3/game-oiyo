import { readFileSync } from "node:fs";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  ACTS,
  CAMERA_POSES,
  EMPTY,
  LEGS,
  POND,
  SPORE,
  STEP_CAP,
  cellX,
  coneCenter,
  createPond,
  gazeVector,
  makePond,
  mixSeed,
  nextSeed,
  openActions,
  resign,
  stepPond,
  windFrom,
  windTo,
  type Act,
  type PondState,
} from "./ink-ecology";

const SOLUTIONS: Record<string, readonly Act[]> = {
  "fed-bridge": ["G", "G", "L"],
  "beside-bridge": ["L", "G", "G"],
  "held-spore": ["L", "G", "L"],
  "late-legs": ["C", "G", "G", "G", "L", "G"],
};

function replay(id: string, actions: readonly Act[]): PondState {
  return actions.reduce((state, action) => stepPond(state, action), createPond(seedFor(id)));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createPond(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: PondState): string {
  return state.cells.join("");
}

function shortest(start: PondState): Act[][] {
  const dist = new Map<string, number>([[key(start), 0]]);
  const ways = new Map<string, number>([[key(start), 1]]);
  const via = new Map<string, Act[]>([[key(start), []]]);
  const queue: PondState[] = [start];
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
      const next = stepPond(cur, action);
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

describe("ink ecology", () => {
  it("puts east on screen-right from the +z camera and aims the gust along +y", () => {
    expect(CAMERA_POSES[0][0]).toBe(0);
    expect(CAMERA_POSES[0][2]).toBeGreaterThan(0);
    expect(CAMERA_POSES).toHaveLength(4);
    expect(cellX(POND - 1)).toBeGreaterThan(cellX(0));
    const pond = new Vector3(0, 0, 0);
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
      expect(dir.dot(pond.clone().sub(camera.position).normalize())).toBeGreaterThan(0.9);
    }
    const camera = new PerspectiveCamera(36, 1, 0.1, 40);
    camera.position.set(CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const east = new Vector3(cellX(POND - 1), 0, 0);
    const west = new Vector3(cellX(0), 0, 0);
    expect(east.dot(right)).toBeGreaterThan(west.dot(right));

    const from = windFrom();
    const to = windTo();
    const dir = gazeVector(from, to);
    expect(dir[0]).toBeGreaterThan(0.9);
    expect(dir[1]).toBeLessThan(0);
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(dir[0], dir[1], dir[2]));
    const aimed = new Vector3(0, 1, 0).applyQuaternion(quat);
    expect(aimed.dot(new Vector3(dir[0], dir[1], dir[2]))).toBeGreaterThan(0.99);
    const center = coneCenter(from, to, 1.15);
    const tip = new Vector3(center[0] + dir[0] * 0.575, center[1] + dir[1] * 0.575, center[2] + dir[2] * 0.575);
    const base = new Vector3(center[0] - dir[0] * 0.575, center[1] - dir[1] * 0.575, center[2] - dir[2] * 0.575);
    const focus = new Vector3(to[0], to[1], to[2]);
    expect(tip.distanceTo(focus)).toBeLessThan(base.distanceTo(focus));
  });

  it("keeps one hand-checked shortest season for each pond", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createPond(seedFor(id));
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      expect(start.cells).not.toEqual(start.goal);
      let legs = start.cells.filter((cell) => cell === LEGS).length;
      let state = start;
      for (const action of solution) {
        state = stepPond(state, action);
        const nextLegs = state.cells.filter((cell) => cell === LEGS).length;
        expect(nextLegs).toBeGreaterThanOrEqual(legs);
        legs = nextLegs;
      }
      expect(state.status).toBe("win");
      expect(state.steps).toBe(solution.length);
      expect(state.cells).toEqual(state.goal);
      expect(shortest(start)).toEqual([solution]);
    }
  });

  it("births on the empty shore, feeds the near spore, and blows only the eastern one", () => {
    const blank = makePond({ cells: [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY], goal: [SPORE, SPORE, SPORE, SPORE, SPORE] });
    const circled = stepPond(blank, "C");
    expect(circled.cells).toEqual([SPORE, EMPTY, EMPTY, EMPTY, EMPTY]);
    const bridged = stepPond(blank, "L");
    expect(bridged.cells).toEqual([EMPTY, EMPTY, EMPTY, EMPTY, LEGS]);
    const pair = makePond({ cells: [SPORE, EMPTY, SPORE, EMPTY, EMPTY] });
    const blown = stepPond(pair, "G");
    expect(blown.cells).toEqual([SPORE, EMPTY, EMPTY, SPORE, EMPTY]);
    expect(blown.ids[3]).toBe(pair.ids[2]);
    expect(blown.ids[0]).toBe(pair.ids[0]);
    const meal = makePond({ cells: [EMPTY, EMPTY, EMPTY, SPORE, EMPTY] });
    expect(stepPond(meal, "L").cells).toEqual([EMPTY, EMPTY, EMPTY, EMPTY, LEGS]);
    const into = makePond({ cells: [EMPTY, EMPTY, EMPTY, SPORE, LEGS] });
    expect(stepPond(into, "G").cells).toEqual([EMPTY, EMPTY, EMPTY, EMPTY, LEGS]);
    const edge = makePond({ cells: [EMPTY, EMPTY, EMPTY, EMPTY, SPORE] });
    expect(stepPond(edge, "G").cells).toEqual([EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]);
  });

  it("spends the cap on a dark fidget and still accepts the mark on the last step", () => {
    let state = makePond({
      cells: [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      goal: [LEGS, LEGS, LEGS, LEGS, LEGS],
    });
    const fidget: Act[] = ["C", "C", "C", "C", "C", "G", "C"];
    for (const action of fidget) {
      state = stepPond(state, action);
      expect(state.status).toBe("play");
    }
    const capped = stepPond(state, "G");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(capped.steps).toBe(STEP_CAP);
    const ready = makePond({
      cells: [SPORE, EMPTY, EMPTY, EMPTY, EMPTY],
      goal: [SPORE, EMPTY, EMPTY, EMPTY, LEGS],
      steps: STEP_CAP - 1,
    });
    const won = stepPond(ready, "L");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(won.cells).toEqual(ready.goal);
  });

  it("stops a resigned or finished pond on the same state", () => {
    const start = createPond(seedFor("fed-bridge"));
    const stopped = resign(start);
    expect(stopped.loseReason).toBe("resign");
    expect(resign(stopped)).toBe(stopped);
    expect(stepPond(stopped, "G")).toBe(stopped);
    const won = replay("fed-bridge", SOLUTIONS["fed-bridge"]);
    expect(stepPond(won, "C")).toBe(won);
    expect(resign(won)).toBe(won);
    const full = makePond({ cells: [LEGS, LEGS, LEGS, LEGS, LEGS] });
    expect(stepPond(full, "C")).toBe(full);
    expect(stepPond(full, "L")).toBe(full);
    expect(stepPond(full, "G")).toBe(full);
  });

  it("rebuilds the same pond from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 80; seed += 1) {
      const pond = createPond(seed);
      expect(createPond(seed)).toEqual(pond);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      expect(pond.cells).toHaveLength(POND);
      expect(pond.goal).toHaveLength(POND);
      seen.add(pond.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createPond(Number.NaN).puzzleId).toBe(createPond(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
    expect(openActions(createPond(0)).length).toBeGreaterThan(0);
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./ink-ecology.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/InkEcology.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/InkEcologyScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
      expect(source.includes("speechSynthesis")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(logic.includes("fed-bridge: [")).toBe(false);
    expect(scene.includes("transmission")).toBe(false);
    expect(scene.includes("cellX")).toBe(true);
    expect(scene.includes("setFromUnitVectors")).toBe(true);
    expect(scene.split("lookAt").length - 1).toBe(1);
  });
});
