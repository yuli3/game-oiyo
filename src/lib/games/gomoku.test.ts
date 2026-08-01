import { describe, expect, it } from "vitest";
import { createGomokuBoard, getGomokuResult, GOMOKU_CELL_COUNT, placeGomokuStone } from "./gomoku";

describe("gomoku engine", () => {
  it("creates an empty 15 by 15 board", () => {
    expect(createGomokuBoard()).toEqual(Array(GOMOKU_CELL_COUNT).fill(null));
  });

  it("places immutably and advances the turn", () => {
    const board = createGomokuBoard();
    const move = placeGomokuStone(board, 112, 1);
    expect(board[112]).toBeNull();
    expect(move).toMatchObject({ nextPlayer: 2, result: null });
    expect(move?.board[112]).toBe(1);
  });

  it("rejects occupied and out-of-range intersections", () => {
    const board = createGomokuBoard();
    board[112] = 1;
    expect(placeGomokuStone(board, 112, 2)).toBeNull();
    expect(placeGomokuStone(board, -1, 1)).toBeNull();
    expect(placeGomokuStone(board, GOMOKU_CELL_COUNT, 1)).toBeNull();
  });

  it.each([
    [112, [1, 2, 3, 4]],
    [112, [15, 30, 45, 60]],
    [112, [16, 32, 48, 64]],
    [112, [14, 28, 42, 56]],
  ])("detects a five-stone line from the last move", (lastIndex, offsets) => {
    const board = createGomokuBoard();
    board[lastIndex] = 1;
    for (const offset of offsets) board[lastIndex + offset] = 1;
    expect(getGomokuResult(board, lastIndex)).toBe(1);
  });

  it("does not wrap a horizontal line across board edges", () => {
    const board = createGomokuBoard();
    for (const index of [13, 14, 15, 16, 17]) board[index] = 2;
    expect(getGomokuResult(board, 15)).toBeNull();
  });
});
