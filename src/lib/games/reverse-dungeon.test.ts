import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  KEY_LIGHT,
  PUZZLES,
  STEP_CAP,
  cellCenter,
  createReverseDungeon,
  doorWorldOffset,
  facingDir,
  fingerprint,
  forwardDir,
  heroYaw,
  makeDungeon,
  mixSeed,
  nextSeed,
  poseOnArc,
  puzzleIndexForSeed,
  replay,
  sliceEuler,
  replayPuzzle,
  resign,
  rotateCell,
  rotateSlice,
  stepAdventurer,
} from "./reverse-dungeon";

describe("reverse dungeon", () => {
  it("keeps one frame: logic up is world up, and a finished arc matches the discrete turn", () => {
    const origin = cellCenter(0, 0, 0);
    expect(cellCenter(1, 0, 0)[0]).toBeGreaterThan(origin[0]);
    expect(cellCenter(0, 0, 1)[1]).toBeGreaterThan(origin[1]);
    expect(cellCenter(0, 1, 0)[2]).toBeGreaterThan(origin[2]);
    expect(doorWorldOffset(0)[0]).toBeGreaterThan(0);
    expect(doorWorldOffset(4)[1]).toBeGreaterThan(0);
    expect(doorWorldOffset(2)[2]).toBeGreaterThan(0);
    for (const axis of ["x", "y", "z"] as const) {
      for (const turn of [1, -1] as const) {
        const turned = rotateCell(0, 0, 0, axis, turn);
        const posed = poseOnArc(0, 0, 0, axis, turn, 1);
        const center = cellCenter(turned[0], turned[1], turned[2]);
        expect(posed[0]).toBeCloseTo(center[0], 5);
        expect(posed[1]).toBeCloseTo(center[1], 5);
        expect(posed[2]).toBeCloseTo(center[2], 5);
      }
    }
  });

  it("uses the shared key-light direction", () => {
    expect(KEY_LIGHT[0]).toBeCloseTo(0.55 / Math.hypot(0.55, 0.72, 0.42), 6);
    expect(KEY_LIGHT[1]).toBeGreaterThan(KEY_LIGHT[0]);
    expect(KEY_LIGHT[1]).toBeGreaterThan(KEY_LIGHT[2]);
  });

  it("does not build a board with Math.random", () => {
    const source = readFileSync(new URL("./reverse-dungeon.ts", import.meta.url), "utf8");
    expect(source.includes("Math.random(")).toBe(false);
  });

  it("picks a stable puzzle from the seed and can reach every hand-made board", () => {
    expect(puzzleIndexForSeed(Number.NaN)).toBe(puzzleIndexForSeed(0));
    expect(fingerprint(createReverseDungeon(7))).toBe(fingerprint(createReverseDungeon(7)));
    expect(mixSeed(3)).toBe(mixSeed(3));
    const seen = new Set<number>();
    for (let seed = 0; seed < 48; seed += 1) seen.add(puzzleIndexForSeed(seed));
    expect(seen.size).toBe(PUZZLES.length);
    expect(nextSeed(4)).toBe(nextSeed(4));
    expect(puzzleIndexForSeed(nextSeed(4))).toBeGreaterThanOrEqual(0);
  });

  it("returns to the same rooms, hero and entry after four turns", () => {
    let state = createReverseDungeon(0);
    state = stepAdventurer(state);
    const before = fingerprint(state);
    for (const axis of ["x", "y", "z"] as const) {
      let turned = state;
      for (let i = 0; i < 4; i += 1) turned = rotateSlice(turned, axis, 1, 1);
      expect(fingerprint(turned)).toBe(before);
    }
  });

  it("replays each hand-checked solution to the exit, and stepping alone does not win", () => {
    expect(PUZZLES.map((puzzle) => puzzle.id)).toEqual(["chimney", "pit-step", "side-door", "twist"]);
    for (let index = 0; index < PUZZLES.length; index += 1) {
      const solved = replayPuzzle(index);
      expect(solved.status, PUZZLES[index].id).toBe("win");
      expect(solved.steps).toBeGreaterThan(0);
      expect(solved.steps).toBeLessThanOrEqual(STEP_CAP);
      let stepped = replayPuzzle(index, []);
      for (let i = 0; i < 8; i += 1) stepped = stepAdventurer(stepped);
      expect(stepped.status, PUZZLES[index].id).not.toBe("win");
    }
  });

  it("kills a first step into the pit, and a wrong turn that slides the pit under the hero", () => {
    const pit = replayPuzzle(1, []);
    expect(stepAdventurer(pit).loseReason).toBe("trap");
    expect(rotateSlice(pit, "z", 0, -1).loseReason).toBe("trap");
    expect(rotateSlice(pit, "z", 0, -1).hero).toEqual([0, 0, 0]);
  });

  it("waits at a junction instead of guessing, and ignores rotation after the run ends", () => {
    const start = replayPuzzle(0, []);
    expect(forwardDir(start)).not.toBeNull();
    const won = replayPuzzle(0);
    expect(rotateSlice(won, "z", 0, 1)).toBe(won);
    expect(stepAdventurer(won)).toBe(won);
    expect(resign(won)).toBe(won);
  });

  it("loses at the step cap on a loop and can resign without walking", () => {
    const loop = makeDungeon({
      rooms: [1 | 4, 2 | 4, 1 | 8, 8 | 2, 0, 0, 0, 0],
      tags: ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
      cameFrom: 2,
    });
    let state = loop;
    for (let i = 0; i < STEP_CAP; i += 1) state = stepAdventurer(state);
    expect(state.status).toBe("lose");
    expect(state.loseReason).toBe("cap");
    expect(state.steps).toBe(STEP_CAP);
    const resigned = resign(loop);
    expect(resigned.loseReason).toBe("resign");
    expect(resigned.steps).toBe(0);
  });

  it("rejects a turn that is not a quarter, and replays one seed without depending on another", () => {
    const state = createReverseDungeon(2);
    expect(rotateSlice(state, "z", 2, 1)).toBe(state);
    expect(rotateSlice(state, "z", 0, 0)).toBe(state);
    const moves = PUZZLES[puzzleIndexForSeed(2)].solution;
    expect(fingerprint(replay(2, moves))).toBe(fingerprint(replay(2, moves)));
  });

  it("faces the open corridor and turns a door with the scene euler", () => {
    const start = replayPuzzle(0, []);
    expect(facingDir(start)).toBe(0);
    expect(facingDir(start)).toBe(forwardDir(start));
    const lantern = (dir: number | null) => {
      const angle = heroYaw(dir);
      return [Math.cos(angle), -Math.sin(angle)] as const;
    };
    expect(lantern(0)[0]).toBeCloseTo(1, 5);
    expect(lantern(1)[0]).toBeCloseTo(-1, 5);
    expect(lantern(2)[1]).toBeCloseTo(1, 5);
    expect(lantern(3)[1]).toBeCloseTo(-1, 5);
    expect(heroYaw(4)).toBe(0);

    const apply = (v: readonly [number, number, number], euler: readonly [number, number, number]) => {
      let x = v[0];
      let y = v[1];
      let z = v[2];
      const cx = Math.cos(euler[0]);
      const sx = Math.sin(euler[0]);
      const yx = y * cx - z * sx;
      const zx = y * sx + z * cx;
      y = yx;
      z = zx;
      const cy = Math.cos(euler[1]);
      const sy = Math.sin(euler[1]);
      const xy = x * cy + z * sy;
      const zy = -x * sy + z * cy;
      x = xy;
      z = zy;
      const cz = Math.cos(euler[2]);
      const sz = Math.sin(euler[2]);
      return [x * cz - y * sz, x * sz + y * cz, z] as const;
    };
    expect(sliceEuler("z", 1, 0)).toEqual([0, 0, 0]);
    const aroundUp = apply(doorWorldOffset(0), sliceEuler("z", 1, 1));
    const north = doorWorldOffset(2);
    expect(aroundUp[0]).toBeCloseTo(north[0], 5);
    expect(aroundUp[1]).toBeCloseTo(north[1], 5);
    expect(aroundUp[2]).toBeCloseTo(north[2], 5);
    const aroundX = apply(doorWorldOffset(2), sliceEuler("x", 1, 1));
    const up = doorWorldOffset(4);
    expect(aroundX[0]).toBeCloseTo(up[0], 5);
    expect(aroundX[1]).toBeCloseTo(up[1], 5);
    expect(aroundX[2]).toBeCloseTo(up[2], 5);
  });
});
