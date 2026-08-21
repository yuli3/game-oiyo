import { describe, expect, it } from "vitest";

import { connectFourBestMove, connectFourMoveReview } from "./connectfour";

type Cell = 0 | 1 | 2;
type Board = Cell[][];

const ROWS = 6;
const COLS = 7;

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
}

// Drops a piece into `col` from the bottom (mirrors the component's gravity).
function drop(board: Board, col: number, player: Cell): void {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = player;
      return;
    }
  }
  throw new Error("column full");
}

describe("connectFourBestMove", () => {
  it("names immediate wins, blocks, and center control", () => {
    const win = emptyBoard(); drop(win,0,2);drop(win,1,2);drop(win,2,2);
    expect(connectFourMoveReview(win,3,2)?.kind).toBe("win");
    const block = emptyBoard(); drop(block,0,1);drop(block,1,1);drop(block,2,1);
    expect(connectFourMoveReview(block,3,2)?.kind).toBe("block");
    expect(connectFourMoveReview(emptyBoard(),3,2)?.kind).toBe("center");
  });
  it("takes an immediate winning move (3-in-a-row with an open 4th) at every level", () => {
    const board = emptyBoard();
    // Bottom row: three black discs at cols 0,1,2 — col 3 wins.
    drop(board, 0, 1);
    drop(board, 1, 1);
    drop(board, 2, 1);
    // Give white a couple of unrelated discs so the board isn't trivially empty.
    drop(board, 5, 2);
    drop(board, 6, 2);

    for (const level of [1, 2, 3] as const) {
      expect(connectFourBestMove(board, 1, level)).toBe(3);
    }
  });

  it("blocks the opponent's immediate win at Adept and Master levels", () => {
    const board = emptyBoard();
    // White has three in a row at cols 0,1,2 — black (AI) must block at col 3.
    drop(board, 0, 2);
    drop(board, 1, 2);
    drop(board, 2, 2);
    drop(board, 6, 1);

    expect(connectFourBestMove(board, 1, 2)).toBe(3);
    expect(connectFourBestMove(board, 1, 3)).toBe(3);
  });

  it("always returns a column that still has room", () => {
    const board = emptyBoard();
    drop(board, 3, 1);
    drop(board, 2, 2);
    const move = connectFourBestMove(board, 2, 2);
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThan(COLS);
    expect(board[0][move]).toBe(0); // column not full
  });

  it("returns -1 only when the entire board is full", () => {
    const board = emptyBoard();
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) board[r][c] = ((r + c) % 2 === 0 ? 1 : 2) as Cell;
    }
    expect(connectFourBestMove(board, 1, 1)).toBe(-1);
  });
});
