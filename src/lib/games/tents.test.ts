import { describe, expect, it } from "vitest";

import {
  autoMarkGrass,
  countTentsSolutions,
  explainTentsHint,
  generateTents,
  generateUniqueTents,
  getLineHintStatuses,
  validateTents,
  type TentsPuzzle,
} from "./tents";
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

describe("explainTentsHint", () => {
  it("points at a violating pair without changing the board", () => {
    const puzzle: TentsPuzzle = { size: 4, trees: [[0, 0], [1, 2]], rowHints: [1, 1, 0, 0], colHints: [0, 1, 1, 0] };
    const tents: [number, number][] = [[0, 1], [1, 2]];
    expect(explainTentsHint(tents, puzzle)).toEqual({ reason: "adjacent", cells: [[0, 1], [1, 2]] });
    expect(tents).toEqual([[0, 1], [1, 2]]);
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

describe("getLineHintStatuses and autoMarkGrass", () => {
  it("correctly identifies pending, satisfied, and exceeded lines", () => {
    const statuses = getLineHintStatuses(4, [1, 0, 1, 0], [0, 1, 0, 1], [[0, 1], [0, 2]]);
    expect(statuses.rowStatuses[0]).toBe("exceeded"); // row 0 has 2 tents, hint is 1
    expect(statuses.rowStatuses[1]).toBe("satisfied"); // row 1 has 0 tents, hint is 0
    expect(statuses.rowStatuses[2]).toBe("pending"); // row 2 has 0 tents, hint is 1
    expect(statuses.colStatuses[1]).toBe("satisfied"); // col 1 has 1 tent, hint is 1
    expect(statuses.colStatuses[2]).toBe("exceeded"); // col 2 has 1 tent, hint is 0
  });

  it("autoMarkGrass fills empty cells in satisfied lines and around placed tents", () => {
    const initialMarks: ("empty" | "tent" | "grass")[][] = [
      ["empty", "tent", "empty", "empty"],
      ["empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty"],
    ];
    const { nextMarks, addedCount } = autoMarkGrass(PUZZLE, initialMarks);
    expect(addedCount).toBeGreaterThan(0);
    // row 0 hint is 1, tent is placed -> remaining row 0 cells (except tree at [0,0]) should become grass
    expect(nextMarks[0][2]).toBe("grass");
    expect(nextMarks[0][3]).toBe("grass");
    // row 1 hint is 0 -> empty cells become grass
    expect(nextMarks[1][0]).toBe("grass");
    expect(nextMarks[1][1]).toBe("grass");
    expect(nextMarks[1][2]).toBe("grass");
    // cell [0,0] is a tree, not marked
    expect(nextMarks[0][0]).toBe("empty");
  });
});
