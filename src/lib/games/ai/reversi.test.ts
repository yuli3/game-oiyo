import { describe, expect, it } from "vitest";

import { reversiBestMove, reversiFlips, reversiMoveReview, reversiMoves } from "./reversi";

type Board = (number | null)[];

// Standard Othello opening position (8×8, players 1/2), flat row-major.
function startingBoard(): Board {
  const b: Board = new Array(64).fill(null);
  b[3 * 8 + 3] = 2; // d4 white
  b[3 * 8 + 4] = 1; // e4 black
  b[4 * 8 + 3] = 1; // d5 black
  b[4 * 8 + 4] = 2; // e5 white
  return b;
}

describe("reversi: reversiFlips + reversiMoves", () => {
  it("summarizes flips, edge, corner, and reply mobility", () => {
    const board = new Array<number | null>(64).fill(null);
    board[1] = 2; board[2] = 1;
    expect(reversiMoveReview(board, 0, 1)).toEqual({ index: 0, flips: 1, corner: true, edge: true, opponentMobility: 0 });
    expect(reversiMoveReview(board, 7, 1)).toBeNull();
  });

  it("finds the 4 classic opening moves for black", () => {
    const board = startingBoard();
    const moves = reversiMoves(board, 1).sort((a, b) => a - b);
    // d3(19), c4(26), f5(37), e6(44) in 0-indexed row-major flat coords.
    expect(moves).toEqual([19, 26, 37, 44]);
  });

  it("flips exactly the bracketed opponent discs for a legal move", () => {
    const board = startingBoard();
    // c4 = row 3, col 2 = index 26; flips d4 (3,3)=index 27.
    const flips = reversiFlips(board, 26, 1);
    expect(flips).toEqual([27]);
  });

  it("returns no flips (illegal move) for a cell that brackets nothing", () => {
    const board = startingBoard();
    expect(reversiFlips(board, 0, 1)).toEqual([]);
  });

  it("returns no flips for an already-occupied cell", () => {
    const board = startingBoard();
    expect(reversiFlips(board, 3 * 8 + 3, 1)).toEqual([]);
  });
});

describe("reversi: reversiBestMove", () => {
  it("always returns one of the legal moves", () => {
    const board = startingBoard();
    const legal = reversiMoves(board, 1);
    const move = reversiBestMove(board, 1, 3);
    expect(legal).toContain(move);
  });

  it("returns -1 when the player has no legal move", () => {
    // A near-full board where player 2 has nowhere to bracket player 1 discs.
    const board: Board = new Array(64).fill(1);
    board[63] = null; // one empty cell, but surrounded only by 1s and edges
    expect(reversiBestMove(board, 2, 1)).toBe(-1);
  });

  it("takes an immediate corner-clinching win when available at any level", () => {
    // Row 0: cells 1..6 are white(2) sandwiched between black(1) at 0 and empty at 7.
    // Playing the corner (7) for black flips the whole row.
    const board: Board = new Array(64).fill(null);
    board[0] = 1;
    for (let c = 1; c <= 6; c++) board[c] = 2;
    const move = reversiBestMove(board, 1, 3);
    expect(move).toBe(7);
  });
});
