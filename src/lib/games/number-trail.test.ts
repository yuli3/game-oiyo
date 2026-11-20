import { describe, expect, it } from "vitest";
import { createTrail, dailySeed, isValidSolution, mulberry32, randomPath, tapCell, trailStatus, TRAIL_SIZE } from "./number-trail";

describe("number-trail", () => {
  it("is deterministic per seed", () => {
    expect(createTrail("medium", 20261120)).toEqual(createTrail("medium", 20261120));
    expect(createTrail("medium", 20261120).digits).not.toEqual(createTrail("medium", 20261121).digits);
  });

  it("random paths are valid self-avoiding corner-to-corner walks", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      const size = TRAIL_SIZE[level];
      for (let s = 1; s <= 30; s++) {
        const path = randomPath(size, mulberry32(s), 2 * size + 1, Math.floor(size * size * 0.6));
        expect(path[0]).toBe(0);
        expect(path.at(-1)).toBe(size * size - 1);
        expect(new Set(path).size).toBe(path.length);
      }
    }
  });

  it("every generated puzzle has the target within reach", () => {
    for (let s = 1; s <= 40; s++) {
      const p = createTrail("hard", s);
      expect(p.target).toBeGreaterThan(0);
      expect(p.par).toBeGreaterThanOrEqual(2 * p.size + 1);
    }
  });

  it("tap rules extend, undo and cut back", () => {
    const p = createTrail("easy", 7);
    let path: number[] = [];
    path = tapCell(p, path, 3);
    expect(path).toEqual([]);
    path = tapCell(p, path, 0);
    path = tapCell(p, path, 1);
    path = tapCell(p, path, 2);
    expect(path).toEqual([0, 1, 2]);
    expect(tapCell(p, path, 8)).toEqual([0, 1, 2]); // not adjacent
    expect(tapCell(p, path, 2)).toEqual([0, 1]);
    expect(tapCell(p, path, 0)).toEqual([0]);
  });

  it("status and validation follow the sum", () => {
    const p = { size: 2, digits: [1, 2, 3, 4], target: 7, par: 3, seed: 1, level: "easy" as const };
    expect(trailStatus(p, [0, 1, 3])).toBe("solved");
    expect(isValidSolution(p, [0, 1, 3])).toBe(true);
    expect(trailStatus(p, [0, 2, 3])).toBe("over");
    expect(isValidSolution(p, [0, 3])).toBe(false);
  });

  it("daily seed is the local date", () => {
    expect(dailySeed(new Date(2026, 10, 20))).toBe(20261120);
  });
});
