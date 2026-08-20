import { describe, expect, it } from "vitest";
import { chessApplyState, createInitialChessState, type ChessMove } from "./ai/chess";
import { capturedChessPiece, chessMaterialBalance, chessReviewMoment, chessSquareName, formatChessMove } from "./chess-notation";

describe("chess notation and material", () => {
  it("formats quiet moves and square names", () => {
    const state = createInitialChessState();
    const move: ChessMove = { from: [6, 4], to: [4, 4] };
    expect(chessSquareName(move.to)).toBe("e4");
    expect(formatChessMove(state, move, chessApplyState(state, move))).toBe("e4");
  });

  it("formats captures, checks, castling, and promotion", () => {
    const state = createInitialChessState();
    state.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    state.board[7][4] = "K"; state.board[0][4] = "k"; state.board[4][4] = "R"; state.board[4][6] = "n";
    const capture: ChessMove = { from: [4, 4], to: [4, 6] };
    expect(capturedChessPiece(state, capture)).toBe("n");
    expect(formatChessMove(state, capture, chessApplyState(state, capture))).toBe("Rxg4");

    state.board[7][7] = "R"; state.castling.K = true;
    const castle: ChessMove = { from: [7, 4], to: [7, 6] };
    expect(formatChessMove(state, castle, chessApplyState(state, castle))).toBe("O-O");

    state.board[1][0] = "P";
    const promotion: ChessMove = { from: [1, 0], to: [0, 0], promotion: "q" };
    expect(formatChessMove(state, promotion, chessApplyState(state, promotion))).toContain("a8=Q");
  });

  it("finds the opponent's last forcing move for a loss review", () => {
    const history = [
      { notation: "e4", captured: null, white: true },
      { notation: "e5", captured: null, white: false },
      { notation: "Nf3", captured: null, white: true },
      { notation: "Qxh2+", captured: "P", white: false },
      { notation: "Ke2", captured: null, white: true },
      { notation: "Qe2#", captured: null, white: false },
    ];
    expect(chessReviewMoment(history, true)).toEqual({ notation: "Qe2#", moveNumber: 3, kind: "check" });
    expect(chessReviewMoment(history.slice(0, 5), true)).toEqual({ notation: "Qxh2+", moveNumber: 2, kind: "capture" });
  });

  it("falls back to the last move when there was no forcing move", () => {
    expect(chessReviewMoment([{ notation: "e4", captured: null, white: true }], true)).toEqual({ notation: "e4", moveNumber: 1, kind: "last-move" });
    expect(chessReviewMoment([])).toBeNull();
  });

  it("scores captured material from White's perspective", () => {
    expect(chessMaterialBalance(["p", "n", "P"])).toBe(3);
    expect(chessMaterialBalance(["Q"])).toBe(-9);
  });
});
