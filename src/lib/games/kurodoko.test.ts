import { describe, expect, it } from "vitest";
import { mulberry32 } from "./daily";
import {
  autoMarkAdjacentWhites,
  countKurodokoSolutions,
  generateKurodokoPuzzle,
  getKurodokoConflicts,
  KURODOKO_DIFFICULTIES,
  kurodokoVisibleWhites,
  validateKurodokoBoard,
} from "./kurodoko";

describe("kurodoko engine", () => {
  it.each(["easy", "medium", "hard"] as const)("generates a valid unique %s puzzle", (difficulty) => {
    const generated = generateKurodokoPuzzle(difficulty, mulberry32(20260802));
    expect(validateKurodokoBoard(generated.solution, generated.puzzle)).toEqual({ ok: true, complete: true, error: null });
    expect(countKurodokoSolutions(generated.puzzle)).toBe(1);
    expect(generated.solution.flat().filter((cell) => cell === 1)).toHaveLength(KURODOKO_DIFFICULTIES[difficulty].blacks);
  });

  it.each([1, 7, 42, 404, 20260802])("keeps uniqueness across representative seed %s", (seed) => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const generated = generateKurodokoPuzzle(difficulty, mulberry32(seed));
      expect(countKurodokoSolutions(generated.puzzle)).toBe(1);
    }
  });

  it("is byte-equivalent for the same seed", () => {
    expect(generateKurodokoPuzzle("medium", mulberry32(42))).toEqual(generateKurodokoPuzzle("medium", mulberry32(42)));
  });

  it("counts visibility in four straight directions until black cells", () => {
    const board = Array.from({ length: 5 }, () => Array<0 | 1>(5).fill(0));
    board[2][0] = 1;
    board[4][2] = 1;
    expect(kurodokoVisibleWhites(board, 2, 2)).toBe(7);
  });

  it("rejects touching black cells and disconnected white regions", () => {
    const adjacent = Array.from({ length: 3 }, () => Array<0 | 1>(3).fill(0));
    adjacent[0][0] = adjacent[0][1] = 1;
    expect(validateKurodokoBoard(adjacent, Array.from({ length: 3 }, () => Array(3).fill(null))).error).toBe("adjacent");
    const disconnected: (0 | 1)[][] = [[0, 1, 0], [1, 0, 0], [0, 0, 0]];
    expect(validateKurodokoBoard(disconnected, Array.from({ length: 3 }, () => Array(3).fill(null))).error).toBe("disconnected");
  });

  it("detects adjacent black cell conflicts and broken/satisfied clues", () => {
    const board: (0 | 1)[][] = [
      [1, 1, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const puzzle: (number | null)[][] = [
      [null, null, 2],
      [null, null, null],
      [null, null, null],
    ];
    const conflicts = getKurodokoConflicts(board, puzzle);
    expect(conflicts.adjacentBlacks.has("0-0")).toBe(true);
    expect(conflicts.adjacentBlacks.has("0-1")).toBe(true);
    // At 0-2 (clue 2), visible whites in column 2 and row 0:
    // (0,2) can look down (1,2) and (2,2) -> 3 whites visible in that direction, plus looking left hits (0,1) which is black!
    // Total visible from (0,2) is 3 (cells (0,2), (1,2), (2,2)). Clue is 2. So visible > clue.
    expect(conflicts.brokenClues.has("0-2")).toBe(false);
  });

  it("auto-marks orthogonal neighbors of black cells as white", () => {
    const marks: (-1 | 0 | 1)[][] = [
      [-1, 1, -1],
      [-1, -1, -1],
      [-1, -1, -1],
    ];
    const { nextMarks, changedCount } = autoMarkAdjacentWhites(marks);
    expect(changedCount).toBe(3); // top out of bounds, left (0,0), right (0,2), down (1,1)
    expect(nextMarks[0][0]).toBe(0);
    expect(nextMarks[0][2]).toBe(0);
    expect(nextMarks[1][1]).toBe(0);
  });
});
