import { describe, expect, it } from "vitest";

import { countTentsSolutions, generateTents, generateUniqueTents, validateTents, type TentsPuzzle } from "./tents";
import { mulberry32 } from "./daily";

// Hand-built 4×4 board with a known unique solution:
//   🌲 ⛺ .  .        trees at (0,0),(2,2)
//   .  .  .  .        tents at (0,1),(2,3)
//   .  .  🌲 ⛺
//   .  .  .  .
const PUZZLE: TentsPuzzle = {
  size: 4,
  trees: [[0, 0], [2, 2]],
  rowHints: [1, 0, 1, 0],
  colHints: [0, 1, 0, 1],
};

describe("validateTents", () => {
  it("accepts the correct solution as complete", () => {
    expect(validateTents([[0, 1], [2, 3]], PUZZLE)).toEqual({ ok: true, complete: true, error: null });
  });

  it("a partial board is ok but not complete", () => {
    expect(validateTents([[0, 1]], PUZZLE)).toEqual({ ok: true, complete: false, error: null });
  });

  it("flags tents touching diagonally", () => {
    const puzzle: TentsPuzzle = { size: 4, trees: [[0, 0], [1, 2]], rowHints: [1, 1, 0, 0], colHints: [0, 1, 1, 0] };
    expect(validateTents([[0, 1], [1, 2]], puzzle).error).toBe("adjacent");
  });

  it("flags a tent that has no orthogonally adjacent tree", () => {
    expect(validateTents([[3, 3]], PUZZLE).error).toBe("orphan");
  });

  it("flags exceeding a row/column hint", () => {
    // (0,1) and (2,1) are both next to a tree and not touching, but col 1 allows only 1 tent
    const puzzle: TentsPuzzle = { size: 4, trees: [[0, 0], [2, 0]], rowHints: [1, 0, 1, 0], colHints: [0, 1, 0, 0] };
    expect(validateTents([[0, 1], [2, 1]], puzzle).error).toBe("count");
  });

  it("counts matching but tents outnumbering trees is not complete", () => {
    // hints crafted so two tents fit the counts while only one tree exists
    const puzzle: TentsPuzzle = { size: 4, trees: [[1, 1]], rowHints: [1, 0, 1, 0], colHints: [0, 2, 0, 0] };
    const v = validateTents([[0, 1], [2, 1]], puzzle);
    expect(v.error).toBeNull();
    expect(v.complete).toBe(false); // no 1:1 matching possible
  });

  it("requires a perfect 1:1 matching, not just proximity", () => {
    // both tents can only pair with the SAME tree (1,1); tree (3,3) is left
    // tentless, so even with exact counts the board is not complete
    const puzzle: TentsPuzzle = { size: 4, trees: [[1, 1], [3, 3]], rowHints: [1, 0, 1, 0], colHints: [0, 2, 0, 0] };
    const v = validateTents([[0, 1], [2, 1]], puzzle);
    expect(v.error).toBeNull();
    expect(v.complete).toBe(false);
  });
});

describe("generateTents", () => {
  it("produces the requested number of tree/tent pairs with consistent hints", () => {
    const { puzzle, solution } = generateTents(6, 7);
    expect(puzzle.trees).toHaveLength(7);
    expect(solution).toHaveLength(7);
    expect(puzzle.rowHints.reduce((a, b) => a + b, 0)).toBe(7);
    expect(puzzle.colHints.reduce((a, b) => a + b, 0)).toBe(7);
  });

  it("solution passes validation across many random boards", () => {
    for (let i = 0; i < 25; i++) {
      const { puzzle, solution } = generateTents(5, 5);
      expect(validateTents(solution, puzzle)).toEqual({ ok: true, complete: true, error: null });
    }
  });

  it("trees and tents never overlap", () => {
    const { puzzle, solution } = generateTents(6, 7);
    const treeSet = new Set(puzzle.trees.map(([r, c]) => `${r},${c}`));
    for (const [r, c] of solution) expect(treeSet.has(`${r},${c}`)).toBe(false);
  });
});

describe("unique Tents & Trees generation", () => {
  it("counts a known unique puzzle", () => {
    expect(countTentsSolutions(PUZZLE, 2)).toBe(1);
  });

  it("stops at the requested limit for an ambiguous puzzle", () => {
    const { puzzle } = generateTents(
      6,
      7,
      mulberry32(0x74656e ^ Math.imul(903, 2654435761)),
    );
    expect(countTentsSolutions(puzzle, 2)).toBe(2);
  });

  it("is deterministic and uniquely solvable across representative daily seeds", () => {
    for (let seed = 900; seed < 960; seed++) {
      const a = generateUniqueTents(6, 7, mulberry32(seed));
      const b = generateUniqueTents(6, 7, mulberry32(seed));
      expect(a).toEqual(b);
      expect(countTentsSolutions(a.puzzle, 2)).toBe(1);
      expect(validateTents(a.solution, a.puzzle).complete).toBe(true);
    }
  });
});
