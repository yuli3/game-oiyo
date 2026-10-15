import { readFileSync } from "node:fs";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  ACTS,
  CAMERA_POSES,
  HALL,
  STEP_CAP,
  cellX,
  coneCenter,
  createNight,
  focusAt,
  gazeVector,
  lensAt,
  makeNight,
  mixSeed,
  nextSeed,
  openActions,
  playerAt,
  resign,
  stepNight,
  visitorAt,
  type Act,
  type NightState,
} from "./museum-night";

const SOLUTIONS: Record<string, readonly Act[]> = {
  "still-plinth": ["H", "E", "H", "E"],
  "under-cone": ["E", "H", "E"],
  "long-hall": ["E", "E", "H", "E"],
  "west-mark": ["W", "H", "W"],
};

function replay(id: string, actions: readonly Act[]): NightState {
  return actions.reduce((state, action) => stepNight(state, action), createNight(seedFor(id)));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createNight(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: NightState): string {
  return `${playerAt(state.seats)}:${state.phase}`;
}

function shortest(start: NightState): Act[][] {
  const dist = new Map<string, number>([[key(start), 0]]);
  const ways = new Map<string, number>([[key(start), 1]]);
  const via = new Map<string, Act[]>([[key(start), []]]);
  const queue: NightState[] = [start];
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
      const next = stepNight(cur, action);
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

describe("museum night", () => {
  it("puts east on screen-right from the +z camera and aims cones along +y", () => {
    expect(CAMERA_POSES[0][0]).toBe(0);
    expect(CAMERA_POSES[0][2]).toBeGreaterThan(0);
    expect(CAMERA_POSES).toHaveLength(4);
    expect(cellX(HALL - 1)).toBeGreaterThan(cellX(0));
    const hall = new Vector3(0, 0, 0);
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
      expect(dir.dot(hall.clone().sub(camera.position).normalize())).toBeGreaterThan(0.9);
    }
    const camera = new PerspectiveCamera(36, 1, 0.1, 40);
    camera.position.set(CAMERA_POSES[0][0], CAMERA_POSES[0][1], CAMERA_POSES[0][2]);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const east = new Vector3(cellX(HALL - 1), 0, 0);
    const west = new Vector3(cellX(0), 0, 0);
    expect(east.dot(right)).toBeGreaterThan(west.dot(right));

    const from = visitorAt(2);
    const to = focusAt(2);
    const dir = gazeVector(from, to);
    expect(dir[1]).toBeLessThan(0);
    expect(dir[2]).toBeLessThan(0);
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(dir[0], dir[1], dir[2]));
    const aimed = new Vector3(0, 1, 0).applyQuaternion(quat);
    expect(aimed.dot(new Vector3(dir[0], dir[1], dir[2]))).toBeGreaterThan(0.99);
    const center = coneCenter(from, to, 0.7);
    const tip = new Vector3(center[0] + dir[0] * 0.35, center[1] + dir[1] * 0.35, center[2] + dir[2] * 0.35);
    const base = new Vector3(center[0] - dir[0] * 0.35, center[1] - dir[1] * 0.35, center[2] - dir[2] * 0.35);
    const focus = new Vector3(to[0], to[1], to[2]);
    expect(tip.distanceTo(focus)).toBeLessThan(base.distanceTo(focus));
    expect(gazeVector(lensAt(2), focusAt(2))[1]).toBeLessThan(-0.9);
  });

  it("keeps one hand-checked shortest night for each hall", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createNight(seedFor(id));
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      expect(playerAt(start.seats)).not.toBe(start.goal);
      expect(start.camera.includes(start.goal)).toBe(false);
      const end = replay(id, solution);
      expect(end.status).toBe("win");
      expect(end.steps).toBe(solution.length);
      expect(playerAt(end.seats)).toBe(end.goal);
      expect(shortest(start)).toEqual([solution]);
    }
  });

  it("is seen when the first plinth is watched and stays safe while holding", () => {
    const still = createNight(seedFor("still-plinth"));
    expect(playerAt(still.seats)).toBe(1);
    const caught = stepNight(still, "W");
    expect(caught.status).toBe("lose");
    expect(caught.loseReason).toBe("seen");
    expect(caught.seats).toEqual(still.seats);
    expect(stepNight(caught, "H")).toBe(caught);
    const held = stepNight(still, "H");
    expect(held.status).toBe("play");
    expect(playerAt(held.seats)).toBe(1);
    expect(held.phase).toBe(1);
    const under = createNight(seedFor("under-cone"));
    const stepped = stepNight(under, "E");
    expect(playerAt(stepped.seats)).toBe(2);
    expect(stepNight(stepped, "E").loseReason).toBe("seen");
    expect(stepNight(stepped, "H").status).toBe("play");
  });

  it("spends the cap on a dark fidget and still accepts the mark on the last step", () => {
    let state = makeNight({ at: 1, goal: 4 });
    const fidget: Act[] = ["E", "W", "E", "W", "E", "W", "E"];
    for (const action of fidget) {
      state = stepNight(state, action);
      expect(state.status).toBe("play");
    }
    const capped = stepNight(state, "W");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(capped.steps).toBe(STEP_CAP);
    const ready = makeNight({ at: 3, goal: 4, steps: STEP_CAP - 1 });
    const won = stepNight(ready, "E");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(playerAt(won.seats)).toBe(4);
    const watched = makeNight({ at: 1, goal: 4, camera: [0], steps: STEP_CAP - 1 });
    const seen = stepNight(watched, "W");
    expect(seen.loseReason).toBe("seen");
    expect(seen.steps).toBe(STEP_CAP);
  });

  it("stops a resigned or finished night on the same state", () => {
    const start = createNight(seedFor("still-plinth"));
    const stopped = resign(start);
    expect(stopped.loseReason).toBe("resign");
    expect(resign(stopped)).toBe(stopped);
    expect(stepNight(stopped, "H")).toBe(stopped);
    const won = replay("still-plinth", SOLUTIONS["still-plinth"]);
    expect(stepNight(won, "E")).toBe(won);
    expect(resign(won)).toBe(won);
    const edge = makeNight({ at: 0 });
    expect(stepNight(edge, "W")).toBe(edge);
  });

  it("rebuilds the same night from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const night = createNight(seed);
      expect(createNight(seed)).toEqual(night);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      expect(night.seats).toHaveLength(HALL);
      expect(night.seats.filter((token) => token === 0)).toHaveLength(1);
      seen.add(night.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createNight(Number.NaN).puzzleId).toBe(createNight(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
    expect(openActions(createNight(0)).length).toBeGreaterThan(0);
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./museum-night.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/MuseumNight.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/MuseumNightScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
      expect(source.includes("speechSynthesis")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(logic.includes("still-plinth: [")).toBe(false);
    expect(scene.includes("transmission")).toBe(false);
    expect(scene.includes("cellX")).toBe(true);
    expect(scene.includes("setFromUnitVectors")).toBe(true);
    expect(scene.split("lookAt").length - 1).toBe(1);
  });
});

