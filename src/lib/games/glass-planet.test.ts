import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CAMERA_POSES,
  SHELL,
  STEP_CAP,
  antipode,
  axisOpen,
  cellDirection,
  cellPosition,
  createGlassPlanet,
  frameAlong,
  edgeKey,
  makePlanet,
  mixSeed,
  nextSeed,
  poseOnArc,
  resign,
  seams,
  stepAxis,
  walkerFrame,
  type AxisBit,
  type PlanetState,
} from "./glass-planet";

const SOLUTIONS: Record<string, readonly AxisBit[]> = {
  meridian: [4, 2, 1],
  sealed: [2, 1],
  echo: [2, 4, 1],
  "long-way": [2, 1, 4, 2],
};

function nearly(a: readonly number[], b: readonly number[], slack = 1e-6) {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i += 1) expect(a[i]).toBeCloseTo(b[i], slack === 1e-6 ? 5 : 4);
}

function replay(seed: number, bits: readonly AxisBit[]): PlanetState {
  return bits.reduce((state, bit) => stepAxis(state, bit), createGlassPlanet(seed));
}

function seedFor(id: string): number {
  for (let seed = 0; seed < 40; seed += 1) {
    if (createGlassPlanet(seed).puzzleId === id) return seed;
  }
  throw new Error(`no seed for ${id}`);
}

function winningWalks(start: PlanetState): AxisBit[][] {
  const wins: AxisBit[][] = [];
  const bits: AxisBit[] = [1, 2, 4];
  const walk = (state: PlanetState, path: AxisBit[]) => {
    if (state.status === "win") {
      wins.push(path);
      return;
    }
    if (state.status !== "play") return;
    for (const bit of bits) {
      const next = stepAxis(state, bit);
      if (next === state) continue;
      walk(next, [...path, bit]);
    }
  };
  walk(start, []);
  return wins;
}

describe("glass planet", () => {
  it("keeps the shell and the core on opposite points of one sphere", () => {
    for (let cell = 0; cell < 8; cell += 1) {
      const outer = cellPosition(cell, SHELL);
      const inner = cellPosition(antipode(cell), SHELL);
      nearly(inner, [-outer[0], -outer[1], -outer[2]]);
      expect(Math.hypot(...outer)).toBeCloseTo(SHELL, 5);
    }
  });

  it("names each of the twelve edges once", () => {
    const keys = new Set<number>();
    for (const bit of [1, 2, 4] as const) {
      for (let cell = 0; cell < 8; cell += 1) {
        if (cell > (cell ^ bit)) continue;
        keys.add(edgeKey(cell, bit));
      }
    }
    expect([...keys].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(seams(createGlassPlanet(0))).toHaveLength(12);
  });

  it("faces the move, with local -z along travel and right = facing × up", () => {
    const frame = walkerFrame(0, 1);
    expect(frame.facing[0]).toBeGreaterThan(0.5);
    const arrived = frameAlong(0, 1, 1);
    const from = cellDirection(0);
    const to = cellDirection(1);
    const chord = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
    const forward = arrived.facing[0] * chord[0] + arrived.facing[1] * chord[1] + arrived.facing[2] * chord[2];
    expect(forward).toBeGreaterThan(0);
    expect(frame.facing[0] * frame.up[0] + frame.facing[1] * frame.up[1] + frame.facing[2] * frame.up[2]).toBeCloseTo(0, 5);
    const crossed = [
      frame.facing[1] * frame.up[2] - frame.facing[2] * frame.up[1],
      frame.facing[2] * frame.up[0] - frame.facing[0] * frame.up[2],
      frame.facing[0] * frame.up[1] - frame.facing[1] * frame.up[0],
    ];
    nearly(frame.right, crossed.map((value) => value / Math.hypot(...crossed)));
  });

  it("slides on the short arc and keeps the inner walker opposite", () => {
    const start = poseOnArc(0, 1, 0, SHELL);
    const end = poseOnArc(0, 1, 1, SHELL);
    nearly(start, cellPosition(0, SHELL));
    nearly(end, cellPosition(1, SHELL));
    const mid = poseOnArc(0, 1, 0.5, SHELL);
    const innerMid = poseOnArc(antipode(0), antipode(1), 0.5, SHELL);
    nearly(innerMid, [-mid[0], -mid[1], -mid[2]]);
    expect(poseOnArc(0, 1, 0, 1)[0]).not.toBe(-0);
  });

  it("puts the first camera on +z", () => {
    expect(CAMERA_POSES[0][0]).toBe(0);
    expect(CAMERA_POSES[0][2]).toBeGreaterThan(1);
    expect(CAMERA_POSES).toHaveLength(4);
  });

  it("rebuilds the same planet from the same seed", () => {
    expect(createGlassPlanet(4)).toEqual(createGlassPlanet(4));
    expect(createGlassPlanet(Number.NaN).puzzleId).toBe(createGlassPlanet(0).puzzleId);
    expect(nextSeed(3)).toBe(mixSeed(4));
    const ids = new Set(Array.from({ length: 24 }, (_, seed) => createGlassPlanet(seed).puzzleId));
    expect(ids).toEqual(new Set(Object.keys(SOLUTIONS)));
  });

  it("has one shortest win on each hand-checked board", () => {
    for (const [id, solution] of Object.entries(SOLUTIONS)) {
      const seed = seedFor(id);
      const start = createGlassPlanet(seed);
      expect(start.status).toBe("play");
      expect(start.outerTags[start.outer]).not.toBe("exit");
      const end = replay(seed, solution);
      expect(end.status).toBe("win");
      expect(end.innerTags[antipode(end.outer)]).toBe("exit");
      expect(end.outerTags[end.outer]).toBe("exit");
      let cursor = start;
      for (const bit of solution) {
        cursor = stepAxis(cursor, bit);
        expect(antipode(cursor.outer)).toBe(cursor.outer ^ 7);
      }
      const wins = winningWalks(start);
      const shortest = Math.min(...wins.map((path) => path.length));
      const shorts = wins.filter((path) => path.length === shortest);
      expect(shortest).toBeLessThan(STEP_CAP);
      expect(shorts).toEqual([Array.from(solution)]);
    }
  });

  it("refuses a sealed seam and loses on a crack or an inner void", () => {
    const sealed = createGlassPlanet(seedFor("sealed"));
    expect(axisOpen(sealed, 1)).toBe(false);
    expect(stepAxis(sealed, 1)).toBe(sealed);
    expect(stepAxis(sealed, 4)).toBe(sealed);
    const opened = stepAxis(sealed, 2);
    expect(opened).not.toBe(sealed);
    expect(opened.status).toBe("play");

    const meridian = createGlassPlanet(seedFor("meridian"));
    const cracked = stepAxis(meridian, 1);
    expect(cracked.status).toBe("lose");
    expect(cracked.loseReason).toBe("trap");
    expect(stepAxis(cracked, 2)).toBe(cracked);

    const echoed = createGlassPlanet(seedFor("echo"));
    const mid = stepAxis(stepAxis(echoed, 2), 4);
    const side = stepAxis(mid, 2);
    expect(side.loseReason).toBe("trap");
  });

  it("spends the step cap only after a real step, and a win or resignation sticks", () => {
    const blanks = Array.from({ length: 8 }, () => "empty" as const);
    let state = makePlanet({ outerTags: blanks, innerTags: blanks });
    for (let i = 0; i < STEP_CAP - 1; i += 1) state = stepAxis(state, 1);
    expect(state.status).toBe("play");
    const capped = stepAxis(state, 2);
    expect(capped.loseReason).toBe("cap");
    expect(stepAxis(capped, 1)).toBe(capped);

    const won = replay(seedFor("sealed"), SOLUTIONS.sealed);
    expect(resign(won)).toBe(won);
    expect(stepAxis(won, 1)).toBe(won);
    const playing = createGlassPlanet(0);
    const stopped = resign(playing);
    expect(stopped.loseReason).toBe("resign");
    expect(resign(stopped)).toBe(stopped);
  });

  it("does not draw a puzzle with Math.random", () => {
    const logic = readFileSync(new URL("./glass-planet.ts", import.meta.url), "utf8");
    const scene = readFileSync(new URL("../../components/games/GlassPlanetScene.tsx", import.meta.url), "utf8");
    const view = readFileSync(new URL("../../components/games/GlassPlanet.tsx", import.meta.url), "utf8");
    expect(logic.includes("Math.random(")).toBe(false);
    expect(scene.includes("Math.random(")).toBe(false);
    expect(view.includes("Math.random(")).toBe(false);
    expect(view.includes("localStorage")).toBe(false);
  });
});
