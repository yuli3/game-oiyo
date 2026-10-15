import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CAMERA_POSES,
  DIRS,
  STEP_CAP,
  createConstellation,
  lineStar,
  makeSky,
  mixSeed,
  nextSeed,
  openDirs,
  pegPosition,
  resign,
  ropeBetween,
  ropesCross,
  stepDir,
  toolOffset,
  type Dir,
  type SkyState,
} from "./constellation-shepherd";

const SOLUTIONS: Record<string, readonly Dir[]> = {
  kindle: ["right", "down", "right", "up"],
  snag: ["down", "right", "down", "right"],
  hook: ["left", "down", "right", "down", "left"],
  "long-night": ["right", "down", "right", "down", "right", "up"],
};

function replay(id: string, dirs: readonly Dir[]): SkyState {
  const seed = seedFor(id);
  return dirs.reduce((state, dir) => stepDir(state, dir), createConstellation(seed));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 80; seed += 1) {
    if (createConstellation(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function key(state: SkyState): string {
  return [
    state.shepherd,
    state.steps,
    ...state.stars.map((star) => {
      const tether = star.tether ? `${star.tether.axis}${star.tether.fixed}${star.tether.lo}${star.tether.hi}` : "-";
      return `${star.at}:${tether}`;
    }),
  ].join("|");
}

function shortest(start: SkyState): Dir[][] {
  const wins: Dir[][] = [];
  const seen = new Set<string>([key(start)]);
  const queue: { state: SkyState; path: Dir[] }[] = [{ state: start, path: [] }];
  let head = 0;
  let limit = Number.POSITIVE_INFINITY;
  while (head < queue.length) {
    const cur = queue[head];
    head += 1;
    if (cur.path.length >= limit) continue;
    for (const dir of DIRS) {
      const next = stepDir(cur.state, dir);
      if (next === cur.state) continue;
      const path = [...cur.path, dir];
      if (next.status === "win") {
        if (path.length < limit) {
          limit = path.length;
          wins.length = 0;
        }
        if (path.length === limit) wins.push(path);
        continue;
      }
      if (next.status !== "play") continue;
      const id = key(next);
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push({ state: next, path });
    }
  }
  return wins;
}

describe("constellation shepherd", () => {
  it("puts peg 0 at the top left when the camera sits on +z", () => {
    const origin = pegPosition(0);
    const right = pegPosition(1);
    const below = pegPosition(3);
    expect(right[0]).toBeGreaterThan(origin[0]);
    expect(right[1]).toBeCloseTo(origin[1], 5);
    expect(below[1]).toBeLessThan(origin[1]);
    expect(below[0]).toBeCloseTo(origin[0], 5);
    expect(CAMERA_POSES[0][0]).toBe(0);
    expect(CAMERA_POSES[0][2]).toBeGreaterThan(0);
  });

  it("points the crook along the sky direction, with the head still upright", () => {
    const right = toolOffset("right");
    const up = toolOffset("up");
    const down = toolOffset("down");
    expect(right[0]).toBeGreaterThan(0);
    expect(right[1]).toBe(0);
    expect(up[1]).toBeGreaterThan(0);
    expect(up[0]).toBe(0);
    expect(down[1]).toBeLessThan(0);
  });

  it("treats only a middle-row rope and a middle-column rope as a snag", () => {
    expect(ropesCross(ropeBetween(3, 5), ropeBetween(1, 7))).toBe(true);
    expect(ropesCross(ropeBetween(0, 2), ropeBetween(0, 6))).toBe(false);
  });

  it("keeps one hand-checked shortest walk for each sky", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const start = createConstellation(seedFor(id));
      expect(start.stars.every((star) => star.at === star.goal)).toBe(false);
      expect(start.figure).toEqual(expect.arrayContaining(start.stars.map((star) => star.goal)));
      const end = replay(id, solution);
      expect(end.status).toBe("win");
      expect(end.steps).toBe(solution.length);
      const moved = end.stars.some((star, index) => star.at === star.goal && start.stars[index].at !== star.at);
      expect(moved).toBe(true);
      const wins = shortest(start);
      expect(wins).toEqual([solution]);
    }
  });

  it("blocks the haul that would cross the heavy rope on snag", () => {
    let state = createConstellation(seedFor("snag"));
    for (const dir of ["right", "down", "left"] as const) {
      const next = stepDir(state, dir);
      expect(next).not.toBe(state);
      state = next;
    }
    expect(stepDir(state, "right")).toBe(state);
    expect(lineStar(state, "right")?.at).toBe(state.stars[0].at);
  });

  it("does not walk off the board, and an open sky is not a haul", () => {
    const start = createConstellation(seedFor("kindle"));
    expect(stepDir(start, "left")).toBe(start);
    expect(stepDir(start, "up")).toBe(start);
    expect(openDirs(start)).toEqual(["right", "down"]);
    const reeled = stepDir(start, "right");
    expect(reeled.shepherd).toBe(0);
    expect(reeled.stars[0].at).toBe(1);
    expect(reeled.stars[0].tether).not.toBeNull();
    expect(reeled.stars[1].tether).toBeNull();
  });

  it("lets the eighth step win when that step seats the last star", () => {
    const almost = makeSky({
      shepherd: 4,
      stars: [
        { mass: 1, at: 1, goal: 4 },
        { mass: 3, at: 6, goal: 6 },
      ],
      steps: STEP_CAP - 1,
    });
    const won = stepDir(almost, "up");
    expect(won.status).toBe("win");
    expect(won.steps).toBe(STEP_CAP);
    expect(won.stars[0].at).toBe(4);
  });

  it("spends the step cap on pacing after the heavy star is seated", () => {
    const dirs = ["right", "down", "right", "left", "right", "left", "right", "left"] as const;
    let state = createConstellation(seedFor("kindle"));
    for (let i = 0; i < dirs.length - 1; i += 1) {
      state = stepDir(state, dirs[i]);
      expect(state.status).toBe("play");
    }
    const capped = stepDir(state, "left");
    expect(capped.status).toBe("lose");
    expect(capped.loseReason).toBe("cap");
    expect(stepDir(capped, "right")).toBe(capped);
  });

  it("stops a resigned or finished sky on the same state", () => {
    const start = createConstellation(seedFor("hook"));
    const stopped = resign(start);
    expect(stopped.status).toBe("lose");
    expect(stopped.loseReason).toBe("resign");
    expect(resign(stopped)).toBe(stopped);
    const won = replay("hook", SOLUTIONS.hook);
    expect(stepDir(won, "left")).toBe(won);
    expect(resign(won)).toBe(won);
  });

  it("rebuilds the same sky from the same seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const sky = createConstellation(seed);
      expect(createConstellation(seed)).toEqual(sky);
      expect(mixSeed(seed)).toBe(mixSeed(seed));
      seen.add(sky.puzzleId);
    }
    expect(seen).toEqual(new Set(Object.keys(SOLUTIONS)));
    expect(createConstellation(Number.NaN).puzzleId).toBe(createConstellation(0).puzzleId);
    expect(nextSeed(0)).toBe(nextSeed(0));
    expect(nextSeed(0)).not.toBe(0);
  });

  it("keeps solutions out of the runtime module and the screen", () => {
    const logic = readFileSync(new URL("./constellation-shepherd.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../../components/games/ConstellationShepherd.tsx", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/ConstellationShepherdScene.tsx", import.meta.url), "utf8");
    for (const source of [logic, screen, scene]) {
      expect(source.includes("Math.random(")).toBe(false);
    }
    expect(screen.includes("localStorage")).toBe(false);
    expect(scene.includes("localStorage")).toBe(false);
    expect(logic.includes("kindle: [")).toBe(false);
  });
});
