import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACTS,
  CAMERA_POSES,
  STEP_CAP,
  createDream,
  floorY,
  makeDream,
  mixSeed,
  nextSeed,
  openActs,
  resign,
  stepDream,
  type Act,
  type DreamState,
} from "./dream-elevator";

const SOLUTIONS: Record<string, readonly Act[]> = {
  "first-bell": ["swap", "up", "swap", "up", "swap", "up"],
  "wrong-dream": ["swap", "up", "swap", "down", "up", "swap", "up", "swap", "up"],
  "borrowed-stone": ["swap", "up", "swap", "down", "up", "swap", "up", "swap", "up"],
  "wake-mote": ["swap", "up", "swap", "up", "up", "swap", "down", "up"],
};

function replay(id: string, acts: readonly Act[]): DreamState {
  return acts.reduce((state, act) => stepDream(state, act), createDream(seedFor(id)));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createDream(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: DreamState): string {
  return [state.floor, state.hand ?? "-", state.slots.map((slot) => slot ?? "-").join(","), state.laws.map((law) => law ?? "-").join(",")].join("|");
}

function shortest(start: DreamState): Act[][] {
  const wins: Act[][] = [];
  const seen = new Set<string>([key(start)]);
  const queue: { state: DreamState; path: Act[] }[] = [{ state: start, path: [] }];
  let head = 0;
  let limit = Number.POSITIVE_INFINITY;
  while (head < queue.length) {
    const cur = queue[head];
    head += 1;
    if (cur.path.length >= limit) continue;
    for (const act of ACTS) {
      const next = stepDream(cur.state, act);
      if (next === cur.state) continue;
      const path = [...cur.path, act];
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

describe("dream elevator", () => {
  it("stacks a higher floor at a higher world y, seen from +z", () => {
    expect(floorY(1)).toBeGreaterThan(floorY(0));
    expect(floorY(3)).toBeGreaterThan(floorY(2));
    expect(CAMERA_POSES[0][0]).toBe(0);
    expect(CAMERA_POSES[0][2]).toBeGreaterThan(0);
    expect(CAMERA_POSES).toHaveLength(4);
  });

  it("keeps one hand-checked shortest ride for each shaft", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createDream(seedFor(id));
      expect(start.floor).toBe(0);
      expect(start.laws.every((law) => law === null)).toBe(true);
      expect(solution.length).toBeLessThanOrEqual(STEP_CAP);
      const end = replay(id, solution);
      expect(end.status).toBe("win");
      expect(end.steps).toBe(solution.length);
      expect(end.floor).toBe(3);
      expect(end.laws[3]).toBe(end.seals[3]);
      expect(end.hand).toBe(end.seals[3]);
      expect(shortest(start)).toEqual([solution]);
    }
  });

  it("refuses an empty cabin, and a wrong dream does not open the next seal", () => {
    const start = createDream(seedFor("wrong-dream"));
    expect(stepDream(start, "up")).toBe(start);
    expect(stepDream(start, "down")).toBe(start);
    expect(openActs(start)).toEqual(["swap"]);
    const carried = stepDream(start, "swap");
    const opened = stepDream(carried, "up");
    expect(opened.floor).toBe(1);
    expect(opened.laws[1]).toBe("mote");
    expect(opened.laws[1]).not.toBe(opened.seals[1]);
    expect(stepDream(opened, "up")).toBe(opened);
    const swapped = stepDream(opened, "swap");
    const back = stepDream(swapped, "down");
    expect(back.floor).toBe(0);
    expect(back.laws[1]).toBe("mote");
    expect(back.hand).toBe("stone");
  });

  it("lets the twelfth ride win when that ride writes the top seal", () => {
    const almost = makeDream({
      seals: ["lobby", "stone", "mote", "hour"],
      slots: [null, "stone", "mote", null],
      hand: "hour",
      laws: [null, "stone", "mote", null],
      floor: 2,
      steps: STEP_CAP - 1,
    });
    const won = stepDream(almost, "up");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(won.floor).toBe(3);
    expect(won.laws[3]).toBe("hour");
  });

  it("spends the step cap on a ride that does not reach the top seal", () => {
    const almost = makeDream({
      seals: ["lobby", "stone", "mote", "hour"],
      slots: [null, "mote", "hour", null],
      hand: "stone",
      laws: [null, "stone", null, null],
      floor: 1,
      steps: STEP_CAP - 1,
    });
    const capped = stepDream(almost, "down");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(capped.floor).toBe(0);
    expect(stepDream(capped, "up")).toBe(capped);
  });

  it("stops a resigned or finished shaft on the same state", () => {
    const start = createDream(seedFor("first-bell"));
    const stopped = resign(start);
    expect(stopped.status).toBe("lose");
    expect(stopped.loseReason).toBe("resign");
    expect(resign(stopped)).toBe(stopped);
    expect(stepDream(stopped, "swap")).toBe(stopped);
    const won = replay("first-bell", SOLUTIONS["first-bell"]);
    expect(stepDream(won, "down")).toBe(won);
    expect(resign(won)).toBe(won);
  });

  it("rebuilds the same shaft from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const dream = createDream(seed);
      expect(createDream(seed)).toEqual(dream);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      seen.add(dream.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createDream(Number.NaN).puzzleId).toBe(createDream(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./dream-elevator.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/DreamElevator.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/DreamElevatorScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(logic.includes("first-bell: [")).toBe(false);
  });
});
