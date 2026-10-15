import { readFileSync } from "node:fs";
import { Object3D, PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  CAMERA_POSES,
  STEP_CAP,
  createPilot,
  makePilot,
  mixSeed,
  needle,
  needleAngle,
  needleTip,
  nextSeed,
  openActions,
  radioOpen,
  radioScript,
  resign,
  stepPilot,
  type Action,
  type PilotState,
} from "./blind-pilot";

const SOLUTIONS: Record<string, readonly Action[]> = {
  "outer-marker": ["pitch-", "land"],
  "wing-low": ["bank+", "pitch-", "land"],
  "thrust-pitch": ["power+", "land"],
  "night-turn": ["bank-", "power-", "land"],
};

function replay(id: string, actions: readonly Action[]): PilotState {
  return actions.reduce((state, action) => stepPilot(state, action), createPilot(seedFor(id)));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createPilot(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: PilotState): string {
  return [state.pitch, state.bank, state.power].join("|");
}

function shortest(start: PilotState): Action[][] {
  const wins: Action[][] = [];
  const seen = new Set<string>([key(start)]);
  const queue: { state: PilotState; path: Action[] }[] = [{ state: start, path: [] }];
  let head = 0;
  let limit = Number.POSITIVE_INFINITY;
  while (head < queue.length) {
    const cur = queue[head];
    head += 1;
    if (cur.path.length >= limit) continue;
    for (const action of ACTIONS) {
      const next = stepPilot(cur.state, action);
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

describe("blind pilot", () => {
  it("tips a positive needle toward world +x from the +z camera", () => {
    expect(CAMERA_POSES[0]).toEqual([0, 0.35, 4.8]);
    expect(CAMERA_POSES[0][0]).toBe(0);
    expect(CAMERA_POSES[0][2]).toBeGreaterThan(0);
    expect(CAMERA_POSES).toHaveLength(4);
    const panel = new Vector3(0, 0.08, 0.18);
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
      const toPanel = panel.clone().sub(camera.position).normalize();
      expect(dir.dot(toPanel)).toBeGreaterThan(0.9);
    }
    expect(needleAngle(0)).toBe(0);
    expect(needleTip(1)[0]).toBeGreaterThan(0);
    expect(needleTip(-1)[0]).toBeLessThan(0);
    expect(needleTip(1)[0]).toBeGreaterThan(needleTip(0)[0]);
    const pivot = new Object3D();
    pivot.rotation.z = needleAngle(1);
    const tip = new Vector3(0, 1, 0).applyQuaternion(pivot.quaternion);
    expect(tip.x).toBeGreaterThan(0.4);
    expect(tip.y).toBeGreaterThan(0);
    pivot.rotation.z = needleAngle(0);
    const rest = new Vector3(0, 1, 0).applyQuaternion(pivot.quaternion);
    expect(rest.x).toBeCloseTo(0);
    expect(rest.y).toBeCloseTo(1);
  });

  it("keeps one hand-checked shortest approach for each flight", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createPilot(seedFor(id));
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      expect(needle(start, start.dead)).not.toBe(start[start.dead]);
      const end = replay(id, solution);
      expect(end.status).toBe("win");
      expect(end.steps).toBe(solution.length);
      expect(end.pitch).toBe(0);
      expect(end.bank).toBe(0);
      expect(end.power).toBe(0);
      expect(shortest(start)).toEqual([solution]);
    }
  });

  it("locks pitch and thrust while a wing is down, and keeps the dead needle still", () => {
    const start = createPilot(seedFor("wing-low"));
    expect(start.bank).toBe(-1);
    expect(needle(start, "bank")).toBe(0);
    expect(needle(start, "pitch")).toBe(start.pitch);
    expect(stepPilot(start, "pitch-")).toBe(start);
    expect(stepPilot(start, "power+")).toBe(start);
    expect(openActions(start)).toEqual(["bank+", "land"]);
    const level = stepPilot(start, "bank+");
    expect(level.bank).toBe(0);
    expect(needle(level, "bank")).toBe(0);
    expect(stepPilot(level, "pitch-").pitch).toBe(0);
  });

  it("raises the nose when thrust is added", () => {
    const start = createPilot(seedFor("thrust-pitch"));
    expect(stepPilot(start, "power-")).toBe(start);
    const added = stepPilot(start, "power+");
    expect(added.power).toBe(0);
    expect(added.pitch).toBe(0);
    expect(needle(added, "power")).toBe(start.stuck);
  });

  it("lets the eighth step win when the landing is already centered", () => {
    const almost = makePilot({ pitch: 0, bank: 0, power: 0, steps: STEP_CAP - 1 });
    const won = stepPilot(almost, "land");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(won.miss).toEqual([]);
  });

  it("explains a late wrong landing as a miss, and spends the cap on wagging the wings", () => {
    const late = makePilot({ pitch: 1, bank: 0, power: -1, steps: STEP_CAP - 1 });
    const missed = stepPilot(late, "land");
    expect(missed.status).toBe("lose");
    expect(missed.loseReason).toBe("miss");
    expect(missed.miss).toEqual([
      { axis: "pitch", value: 1 },
      { axis: "power", value: -1 },
    ]);
    expect(stepPilot(missed, "pitch-")).toBe(missed);

    let state = makePilot({ pitch: 0, bank: 0, power: 0 });
    const wags = ["bank+", "bank-", "bank+", "bank-", "bank+", "bank-", "bank+", "bank-"] as const;
    for (let i = 0; i < wags.length - 1; i += 1) {
      state = stepPilot(state, wags[i]);
      expect(state.status).toBe("play");
    }
    const capped = stepPilot(state, "bank-");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(stepPilot(capped, "land")).toBe(capped);
  });

  it("stops a resigned or finished approach on the same state", () => {
    const start = createPilot(seedFor("outer-marker"));
    const stopped = resign(start);
    expect(stopped.loseReason).toBe("resign");
    expect(resign(stopped)).toBe(stopped);
    expect(stepPilot(stopped, "land")).toBe(stopped);
    const won = replay("outer-marker", SOLUTIONS["outer-marker"]);
    expect(stepPilot(won, "pitch+")).toBe(won);
    expect(resign(won)).toBe(won);
  });

  it("rebuilds the same approach from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const flight = createPilot(seed);
      expect(createPilot(seed)).toEqual(flight);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      seen.add(flight.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createPilot(Number.NaN).puzzleId).toBe(createPilot(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
  });

  it("speaks the stored call during play and the debrief only after the flight ends", () => {
    expect(radioOpen(false, false, false, false)).toBe(false);
    expect(radioOpen(true, false, false, false)).toBe(true);
    expect(radioOpen(true, true, false, false)).toBe(false);
    expect(radioOpen(true, false, true, false)).toBe(false);
    expect(radioOpen(true, false, false, true)).toBe(false);
    const start = createPilot(seedFor("wing-low"));
    expect(needle(start, "bank")).not.toBe(start.bank);
    expect(radioScript(start.status, "outer-marker", "the wing was still down")).toBe("outer-marker");
    expect(radioScript("win", "outer-marker", "centered")).toBe("centered");
    expect(radioScript("lose", "outer-marker", "the wing was still down")).toBe("the wing was still down");
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./blind-pilot.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/BlindPilot.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/BlindPilotScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(logic.includes("outer-marker: [")).toBe(false);
    expect(screen.includes("speechSynthesis")).toBe(true);
    expect(screen.includes("radioOpen")).toBe(true);
    expect(scene.includes("transmission")).toBe(false);
    expect(scene.includes("depthWrite={false}")).toBe(true);
  });
});
