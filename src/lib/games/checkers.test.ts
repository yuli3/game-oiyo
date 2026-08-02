import { describe, expect, it } from "vitest";
import { checkersApply, checkersMoves, type CheckersPiece } from "./checkers";

describe("checkers public engine", () => {
  it("exposes mandatory capture and immutable application", () => {
    const board = Array<CheckersPiece | null>(64).fill(null);
    board[42] = { player: 1, isKing: false }; board[33] = { player: 2, isKing: false };
    const move = checkersMoves(board, 1)[0]; const next = checkersApply(board, move);
    expect(move).toEqual({ from: 42, to: 24, jumpOver: 33 });
    expect(board[42]).not.toBeNull(); expect(next[42]).toBeNull(); expect(next[33]).toBeNull();
  });
});
