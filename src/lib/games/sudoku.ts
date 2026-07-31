import { dayIndex } from "./daily";
import type { SudokuValue } from "./logic-puzzles";

export type SudokuDifficultyId = "easy" | "medium" | "hard";

// Clue targets are honest capability bounds: the digger removes clues one at a
// time and keeps every removal that preserves a unique solution, stopping at
// the target. Uniqueness is always verified; the target is a floor request,
// not a promise of exact clue count.
export const SUDOKU_DIFFICULTIES: Record<SudokuDifficultyId, { clueTarget: number }> = {
  easy: { clueTarget: 40 },
  medium: { clueTarget: 32 },
  hard: { clueTarget: 26 },
};

export const SUDOKU_DAILY_DIFFICULTY: SudokuDifficultyId = "medium";

export interface SudokuPuzzle {
  givens: SudokuValue[][];
  solution: number[][];
  clueCount: number;
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function boxStart(index: number): number {
  return index - (index % 3);
}

function candidateMask(grid: Int8Array, cell: number): number {
  const row = Math.floor(cell / 9);
  const column = cell % 9;
  let used = 0;
  for (let i = 0; i < 9; i++) {
    used |= 1 << grid[row * 9 + i];
    used |= 1 << grid[i * 9 + column];
  }
  const br = boxStart(row);
  const bc = boxStart(column);
  for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) used |= 1 << grid[r * 9 + c];
  return ~used & 0b1111111110;
}

// Fill the grid with a complete valid solution, choosing digits in an order
// derived from the seed so every seed yields one deterministic solution grid.
export function generateSolvedSudoku(seed: number): number[][] {
  const random = mulberry32(seed);
  const grid = new Int8Array(81);
  const digitOrders: number[][] = [];
  for (let cell = 0; cell < 81; cell++) digitOrders.push(shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], random));

  const fill = (cell: number): boolean => {
    if (cell === 81) return true;
    const mask = candidateMask(grid, cell);
    for (const digit of digitOrders[cell]) {
      if (!(mask & (1 << digit))) continue;
      grid[cell] = digit;
      if (fill(cell + 1)) return true;
    }
    grid[cell] = 0;
    return false;
  };
  fill(0);

  const rows: number[][] = [];
  for (let r = 0; r < 9; r++) rows.push([...grid.slice(r * 9, r * 9 + 9)]);
  return rows;
}

// Count solutions with early exit at `limit`, using a most-constrained-cell
// heuristic so the digger's repeated uniqueness checks stay fast.
export function countSudokuSolutions(givens: SudokuValue[][], limit = 2): number {
  const grid = new Int8Array(81);
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) grid[r * 9 + c] = givens[r]?.[c] ?? 0;

  let found = 0;
  const search = (): void => {
    if (found >= limit) return;
    let bestCell = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (let cell = 0; cell < 81; cell++) {
      if (grid[cell] !== 0) continue;
      const mask = candidateMask(grid, cell);
      let count = 0;
      for (let digit = 1; digit <= 9; digit++) if (mask & (1 << digit)) count++;
      if (count === 0) return;
      if (count < bestCount) {
        bestCell = cell;
        bestMask = mask;
        bestCount = count;
        if (count === 1) break;
      }
    }
    if (bestCell === -1) {
      found++;
      return;
    }
    for (let digit = 1; digit <= 9; digit++) {
      if (!(bestMask & (1 << digit))) continue;
      grid[bestCell] = digit;
      search();
      grid[bestCell] = 0;
      if (found >= limit) return;
    }
  };
  search();
  return found;
}

export function generateSudokuPuzzle(difficultyId: SudokuDifficultyId, seed: number): SudokuPuzzle {
  const solution = generateSolvedSudoku(seed);
  const givens: SudokuValue[][] = solution.map((row) => [...row]);
  const { clueTarget } = SUDOKU_DIFFICULTIES[difficultyId];
  // Separate stream from the solution fill so the removal order is stable
  // regardless of how many backtracks the fill needed.
  const random = mulberry32(seed ^ 0x9e3779b9);
  const order = shuffled(Array.from({ length: 81 }, (_, i) => i), random);

  let clueCount = 81;
  for (const cell of order) {
    if (clueCount <= clueTarget) break;
    const row = Math.floor(cell / 9);
    const column = cell % 9;
    const removed = givens[row][column];
    givens[row][column] = null;
    if (countSudokuSolutions(givens, 2) === 1) clueCount--;
    else givens[row][column] = removed;
  }
  return { givens, solution, clueCount };
}

export function sudokuDailySeed(index = dayIndex()): number {
  return (0x53d0 ^ Math.imul(index + 1, 2654435761)) | 0;
}

// Flags every cell that shares its value with another cell in the same row,
// column, or box. Purely positional — never consults the hidden solution.
export function findSudokuConflicts(grid: SudokuValue[][]): boolean[][] {
  const conflicts = Array.from({ length: 9 }, () => Array<boolean>(9).fill(false));
  const mark = (cells: Array<[number, number]>) => {
    const byValue = new Map<number, Array<[number, number]>>();
    for (const [r, c] of cells) {
      const value = grid[r]?.[c];
      if (typeof value !== "number") continue;
      const group = byValue.get(value) ?? [];
      group.push([r, c]);
      byValue.set(value, group);
    }
    for (const group of byValue.values()) {
      if (group.length < 2) continue;
      for (const [r, c] of group) conflicts[r][c] = true;
    }
  };
  for (let i = 0; i < 9; i++) {
    mark(Array.from({ length: 9 }, (_, j) => [i, j] as [number, number]));
    mark(Array.from({ length: 9 }, (_, j) => [j, i] as [number, number]));
  }
  for (let br = 0; br < 9; br += 3) for (let bc = 0; bc < 9; bc += 3) {
    const cells: Array<[number, number]> = [];
    for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) cells.push([r, c]);
    mark(cells);
  }
  return conflicts;
}
