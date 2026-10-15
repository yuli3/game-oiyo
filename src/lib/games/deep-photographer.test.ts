import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  CAMERA_POSES,
  STEP_CAP,
  createShot,
  inBeam,
  makeShot,
  mixSeed,
  nextSeed,
  openActions,
  resign,
  stationX,
  stepShot,
  type Action,
  type ShotState,
} from "./deep-photographer";

const SOLUTIONS: Record<string, readonly Action[]> = {
  "edge-light": ["bright", "shutter"],
  washout: ["dim", "shutter"],
  "step-then-ease": ["bright", "dim", "shutter"],
  "long-swim": ["bright", "bright", "shutter"],
};

function replay(id: string, actions: readonly Action[]): ShotState {
  return actions.reduce((state, action) => stepShot(state, action), createShot(seedFor(id)));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createShot(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: ShotState): string {
  return [state.lamp, state.subject, state.predator].join("|");
}

function shortest(start: ShotState): Action[][] {
  const wins: Action[][] = [];
  const seen = new Set<string>([key(start)]);
  const queue: { state: ShotState; path: Action[] }[] = [{ state: start, path: [] }];
  let head = 0;
  let limit = Number.POSITIVE_INFINITY;
  while (head < queue.length) {
    const cur = queue[head];
    head += 1;
    if (cur.path.length >= limit) continue;
    for (const action of ACTIONS) {
      const next = stepShot(cur.state, action);
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

describe("deep photographer", () => {
  it("puts the dark end of the trench on screen-right from the +z camera", () => {
    expect(CAMERA_POSES[0][0]).toBe(0);
    expect(CAMERA_POSES[0][2]).toBeGreaterThan(0);
    expect(CAMERA_POSES).toHaveLength(4);
    expect(stationX(0)).toBeLessThan(0);
    expect(stationX(3)).toBeGreaterThan(stationX(0));
    expect(inBeam(0, 0)).toBe(false);
    expect(inBeam(0, 1)).toBe(true);
    expect(inBeam(1, 1)).toBe(false);
    const trench = new Vector3(0, 0.2, 0);
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
      const toTrench = trench.clone().sub(camera.position).normalize();
      expect(dir.dot(toTrench)).toBeGreaterThan(0.9);
    }
  });

  it("keeps one hand-checked shortest exposure for each scene", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createShot(seedFor(id));
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      expect(start.seat).toBeLessThan(start.need);
      const end = replay(id, solution);
      expect(end.status).toBe("win");
      expect(end.steps).toBe(solution.length);
      expect(end.lamp).toBe(end.need);
      expect(end.subject).toBe(end.seat);
      expect(end.predator).toBeGreaterThanOrEqual(end.lamp);
      expect(shortest(start)).toEqual([solution]);
    }
  });

  it("lets a dim lower the lamp without moving the fish, and a bright call the predator", () => {
    const start = createShot(seedFor("washout"));
    expect(start.subject).toBe(start.seat);
    expect(start.lamp).toBeGreaterThan(start.need);
    const eased = stepShot(start, "dim");
    expect(eased.subject).toBe(start.subject);
    expect(eased.lamp).toBe(start.lamp - 1);
    expect(eased.predator).toBe(start.predator + 1);
    expect(eased.status).toBe("play");
    const early = stepShot(start, "shutter");
    expect(early.status).toBe("lose");
    expect(early.loseReason).toBe("miss");
    expect(early.miss).toEqual(["lamp-high"]);
  });

  it("ends the scene when the predator reaches the fish", () => {
    const start = makeShot({ lamp: 1, subject: 1, predator: 2, need: 2, seat: 1 });
    const next = stepShot(start, "bright");
    expect(next.status).toBe("lose");
    expect(next.loseReason).toBe("taken");
    expect(next.predator).toBeLessThanOrEqual(next.subject);
    expect(stepShot(next, "shutter")).toBe(next);
  });

  it("spends the cap on fidgeting the lamp and still accepts a centered shutter on the last step", () => {
    let state = makeShot({ lamp: 1, subject: 3, predator: 2, need: 2, seat: 0 });
    for (let i = 0; i < STEP_CAP - 1; i += 1) {
      state = stepShot(state, i % 2 === 0 ? "bright" : "dim");
      expect(state.status).toBe("play");
    }
    const capped = stepShot(state, "bright");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    const ready = makeShot({ lamp: 1, subject: 0, predator: 3, need: 1, seat: 0, steps: STEP_CAP - 1 });
    const won = stepShot(ready, "shutter");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
  });

  it("stops a resigned or finished scene on the same state", () => {
    const start = createShot(seedFor("edge-light"));
    const stopped = resign(start);
    expect(stopped.loseReason).toBe("resign");
    expect(resign(stopped)).toBe(stopped);
    expect(stepShot(stopped, "shutter")).toBe(stopped);
    const won = replay("edge-light", SOLUTIONS["edge-light"]);
    expect(stepShot(won, "bright")).toBe(won);
    expect(resign(won)).toBe(won);
  });

  it("rebuilds the same scene from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const shot = createShot(seed);
      expect(createShot(seed)).toEqual(shot);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      seen.add(shot.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createShot(Number.NaN).puzzleId).toBe(createShot(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
    expect(openActions(createShot(0))).toContain("shutter");
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./deep-photographer.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/DeepPhotographer.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/DeepPhotographerScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(logic.includes("edge-light: [")).toBe(false);
    expect(scene.includes("transmission")).toBe(false);
    expect(scene.includes("stationX")).toBe(true);
  });
});
