import { describe, expect, it } from "vitest";
import { evaluateAkari, isSudokuSolved, validateHitori } from "./logic-puzzles";

const solvedSudoku = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2], [6, 7, 2, 1, 9, 5, 3, 4, 8], [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3], [4, 2, 6, 8, 5, 3, 7, 9, 1], [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4], [2, 8, 7, 4, 1, 9, 6, 3, 5], [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

describe("Sudoku validation", () => {
  it("requires rows, columns, and 3x3 boxes", () => {
    expect(isSudokuSolved(solvedSudoku)).toBe(true);
    const rowOnlyLatinSquare = Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, column) => (row + column) % 9 + 1));
    expect(rowOnlyLatinSquare.every((row) => new Set(row).size === 9)).toBe(true);
    expect(isSudokuSolved(rowOnlyLatinSquare)).toBe(false);
  });
  it("rejects incomplete and malformed grids", () => {
    expect(isSudokuSolved(solvedSudoku.map((row) => [...row]).map((row, i) => i ? row : [null, ...row.slice(1)]))).toBe(false);
    expect(isSudokuSolved([[1]])).toBe(false);
  });
});

describe("Hitori validation", () => {
  const values = [[1, 1, 2], [2, 3, 1], [3, 2, 3]];
  it("rejects adjacent black cells and disconnected whites", () => {
    const adjacent = [[true, true, false], [false, false, false], [false, false, true]];
    expect(validateHitori(values, adjacent).noAdjacentBlack).toBe(false);
    const disconnected = [[false, true, false], [true, false, true], [false, true, false]];
    expect(validateHitori(values, disconnected).whiteConnected).toBe(false);
  });
  it("rejects an all-black board even though no duplicates remain", () => {
    const allBlack = values.map((row) => row.map(() => true));
    const result = validateHitori(values, allBlack);
    expect(result.duplicateFree).toBe(true);
    expect(result.whiteConnected).toBe(false);
    expect(result.valid).toBe(false);
  });
});

describe("Akari validation", () => {
  it("lights along rows and columns but stops at black cells", () => {
    const spec = [[null, null, 0, null], [null, null, null, null]];
    const bulbs = [[true, false, false, false], [false, false, false, false]];
    const result = evaluateAkari(spec, bulbs);
    expect(result.lit[0]).toEqual([true, true, false, false]);
    expect(result.lit[1][0]).toBe(true);
  });
  it("marks both mutually visible bulbs and enforces numbered walls", () => {
    const conflict = evaluateAkari([[null, null, null]], [[true, false, true]]);
    expect(conflict.bulbErrors[0]).toEqual([true, false, true]);
    expect(conflict.solved).toBe(false);
    const clue = evaluateAkari([[null, 1, null]], [[false, false, false]]);
    expect(clue.clueErrors[0][1]).toBe(true);
  });
  it("solves only when all white cells are lit, bulbs do not conflict, and clues match", () => {
    expect(evaluateAkari([[null, 2], [null, null]], [[true, false], [false, true]]).solved).toBe(true);
  });
});
