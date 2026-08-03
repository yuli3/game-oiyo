import { describe, expect, it } from "vitest";
import {
  createSolvedPuzzle15Board,
  isPuzzle15Solvable,
  isPuzzle15Solved,
  movePuzzle15Tile,
  shufflePuzzle15,
} from "./puzzle15";

describe("puzzle15 engine", () => {
  it("creates a solved board for each supported size", () => {
    expect(createSolvedPuzzle15Board(3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(isPuzzle15Solved(createSolvedPuzzle15Board(4), 4)).toBe(true);
    expect(isPuzzle15Solved(createSolvedPuzzle15Board(5), 5)).toBe(true);
  });

  it("moves a tile adjacent to the blank and reports the immutable result", () => {
    const board = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15];
    const move = movePuzzle15Tile(board, 15, 4);
    expect(move).toEqual({ board: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0], moved: true, solved: true });
    expect(board).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15]); // original untouched
  });

  it("rejects a tile that is not orthogonally adjacent to the blank", () => {
    const board = createSolvedPuzzle15Board(4);
    board[15] = 0;
    board[14] = 15;
    const move = movePuzzle15Tile(board, 0, 4); // top-left corner, not adjacent to bottom-right blank
    expect(move.moved).toBe(false);
  });

  it("declares every solved board solvable", () => {
    expect(isPuzzle15Solvable(createSolvedPuzzle15Board(3), 3)).toBe(true);
    expect(isPuzzle15Solvable(createSolvedPuzzle15Board(4), 4)).toBe(true);
    expect(isPuzzle15Solvable(createSolvedPuzzle15Board(5), 5)).toBe(true);
  });

  it("rejects the classic 14-15 swap as unsolvable on a 4x4 board", () => {
    // Solved except the last two tiles are swapped — the textbook unsolvable case.
    const board = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0];
    expect(isPuzzle15Solvable(board, 4)).toBe(false);
  });

  it("rejects a single adjacent-pair swap as unsolvable on an odd-width board", () => {
    // Swapping any two tiles from solved flips the permutation parity to odd.
    const board = [2, 1, 3, 4, 5, 6, 7, 8, 0];
    expect(isPuzzle15Solvable(board, 3)).toBe(false);
  });

  it("rejects malformed boards (wrong length)", () => {
    expect(isPuzzle15Solvable([1, 2, 3, 0], 3)).toBe(false);
  });

  it("keeps every shuffle solvable across sizes and seeds", () => {
    for (const size of [3, 4, 5] as const) {
      for (let seed = 0; seed < 20; seed += 1) {
        let counter = seed;
        const pseudoRandom = () => { counter = (counter * 1103515245 + 12345) & 0x7fffffff; return counter / 0x7fffffff; };
        const board = shufflePuzzle15(size, size * size * 10, pseudoRandom);
        expect(isPuzzle15Solvable(board, size)).toBe(true);
        expect(new Set(board).size).toBe(size * size);
      }
    }
  });
});
