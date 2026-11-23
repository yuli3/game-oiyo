import { describe, expect, it } from "vitest";
import { createWalk, isSolved, walkStage, WALK_STAGES } from "./arrow-walk";
import { createTrail, dragTo, isValidSolution, trailStage, TRAIL_STAGES } from "./number-trail";

describe("arrow-walk stages", () => {
  it("has 30 distinct solvable boards that grow in size", () => {
    const keys = new Set<string>();
    let lastSize = 0;
    for (let i = 0; i < WALK_STAGES; i++) {
      const { level, seed } = walkStage(i);
      const p = createWalk(level, seed);
      expect(p.size).toBeGreaterThanOrEqual(lastSize);
      lastSize = p.size;
      expect(isSolved(p, p.solution)).toBe(true);
      expect(isSolved(p, p.arrows)).toBe(false);
      keys.add(p.arrows.join(""));
    }
    expect(keys.size).toBe(WALK_STAGES);
    expect(walkStage(99)).toEqual(walkStage(WALK_STAGES - 1));
  });
});

describe("number-trail stages", () => {
  it("has 30 boards that grow in size", () => {
    let lastSize = 0;
    for (let i = 0; i < TRAIL_STAGES; i++) {
      const { level, seed } = trailStage(i);
      const p = createTrail(level, seed);
      expect(p.size).toBeGreaterThanOrEqual(lastSize);
      lastSize = p.size;
      expect(p.target).toBeGreaterThan(0);
    }
  });

  it("drag extends to neighbours, steps back, and ignores jumps", () => {
    const p = createTrail("easy", 1);
    let path = [0];
    path = dragTo(p, path, 1);
    expect(path).toEqual([0, 1]);
    path = dragTo(p, path, 6);
    expect(path).toEqual([0, 1, 6]);
    expect(dragTo(p, path, 20)).toEqual(path);
    expect(dragTo(p, path, 0)).toEqual(path);
    path = dragTo(p, path, 1);
    expect(path).toEqual([0, 1]);
  });

  it("a serpentine drawn by dragging is a valid path shape", () => {
    const p = createTrail("easy", 3);
    let path = [0];
    for (const c of [1, 2, 3, 4, 9, 14, 19, 24]) path = dragTo(p, path, c);
    expect(path[path.length - 1]).toBe(24);
    expect(isValidSolution({ ...p, target: path.reduce((s, i) => s + p.digits[i], 0) }, path)).toBe(true);
  });
});
