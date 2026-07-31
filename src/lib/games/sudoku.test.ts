import { describe, expect, it } from "vitest";
import { isSudokuSolved } from "./logic-puzzles";
import {
  SUDOKU_DIFFICULTIES,
  countSudokuSolutions,
  findSudokuConflicts,
  generateSolvedSudoku,
  generateSudokuPuzzle,
  sudokuDailySeed,
} from "./sudoku";

const SEEDS = [1, -2026, 0x7fffffff, 123456789];

describe("sudoku solution generation", () => {
  it("produces a complete valid solution deterministically per seed", () => {
    for (const seed of SEEDS) {
      const first = generateSolvedSudoku(seed);
      const second = generateSolvedSudoku(seed);
      expect(second).toEqual(first);
      expect(isSudokuSolved(first)).toBe(true);
    }
  });

  it("produces different solutions for different seeds", () => {
    expect(generateSolvedSudoku(1)).not.toEqual(generateSolvedSudoku(2));
  });
});

describe("sudoku puzzle generation", () => {
  it("is deterministic and unique-solution for every difficulty", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const puzzle = generateSudokuPuzzle(difficulty, 42);
      expect(generateSudokuPuzzle(difficulty, 42)).toEqual(puzzle);
      expect(countSudokuSolutions(puzzle.givens, 2)).toBe(1);
      const clues = puzzle.givens.flat().filter((v) => v !== null).length;
      expect(clues).toBe(puzzle.clueCount);
      expect(clues).toBeGreaterThanOrEqual(17);
      expect(clues).toBeLessThanOrEqual(81);
    }
  });

  it("keeps every given consistent with the solution", () => {
    const { givens, solution } = generateSudokuPuzzle("medium", 7);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (givens[r][c] !== null) expect(givens[r][c]).toBe(solution[r][c]);
    }
    expect(isSudokuSolved(solution)).toBe(true);
  });

  it("orders difficulties by clue count for a fixed seed", () => {
    const easy = generateSudokuPuzzle("easy", 42).clueCount;
    const medium = generateSudokuPuzzle("medium", 42).clueCount;
    const hard = generateSudokuPuzzle("hard", 42).clueCount;
    expect(easy).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(hard);
    expect(easy).toBeGreaterThanOrEqual(SUDOKU_DIFFICULTIES.easy.clueTarget);
    expect(hard).toBeGreaterThanOrEqual(SUDOKU_DIFFICULTIES.hard.clueTarget);
  });

  it("counts multiple solutions on an under-constrained grid", () => {
    const empty = Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));
    expect(countSudokuSolutions(empty, 2)).toBe(2);
  });
});

describe("sudoku daily seed", () => {
  it("derives one stable seed per day index", () => {
    expect(sudokuDailySeed(10)).toBe(sudokuDailySeed(10));
    expect(sudokuDailySeed(10)).not.toBe(sudokuDailySeed(11));
    expect(Number.isInteger(sudokuDailySeed(0))).toBe(true);
  });
});

describe("sudoku conflicts", () => {
  it("flags duplicates in rows, columns, and boxes without consulting the solution", () => {
    const { givens } = generateSudokuPuzzle("easy", 42);
    expect(findSudokuConflicts(givens).flat().some(Boolean)).toBe(false);

    const grid = givens.map((row) => [...row]);
    const targetRow = grid.findIndex((row) => row.includes(null));
    const targetColumn = grid[targetRow].indexOf(null);
    const duplicated = grid[targetRow].find((v) => v !== null)!;
    grid[targetRow][targetColumn] = duplicated;
    const conflicts = findSudokuConflicts(grid);
    expect(conflicts[targetRow][targetColumn]).toBe(true);
    expect(conflicts.flat().filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });

  it("keeps a clean grid conflict-free", () => {
    const empty = Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));
    expect(findSudokuConflicts(empty).flat().some(Boolean)).toBe(false);
  });
});
