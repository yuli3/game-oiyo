import { describe, expect, it } from "vitest";
import {
  chessApplyState,
  chessDrawReason,
  chessInCheck,
  chessInsufficientMaterial,
  chessBestStateMoveIterative,
  chessLegalStateMoves,
  chessPositionKey,
  createInitialChessState,
  type ChessBoard,
  type ChessMove,
  type ChessState,
} from "./chess";

const emptyBoard = (): ChessBoard => Array.from({ length: 8 }, () => Array(8).fill(null));
const stateWith = (board: ChessBoard, overrides: Partial<ChessState> = {}): ChessState => ({
  board,
  whiteToMove: true,
  castling: { K: false, Q: false, k: false, q: false },
  enPassant: null,
  halfmoveClock: 0,
  fullmoveNumber: 1,
  ...overrides,
});
const hasMove = (moves: ReturnType<typeof chessLegalStateMoves>, from: [number, number], to: [number, number]) =>
  moves.some((move) => move.from[0] === from[0] && move.from[1] === from[1] && move.to[0] === to[0] && move.to[1] === to[1]);

describe("stateful chess rules", () => {
  it("starts with the standard 20 legal moves and recognizes Fool's Mate", () => {
    let state = createInitialChessState();
    expect(chessLegalStateMoves(state)).toHaveLength(20);
    for (const move of [
      { from: [6, 5], to: [5, 5] },
      { from: [1, 4], to: [3, 4] },
      { from: [6, 6], to: [4, 6] },
      { from: [0, 3], to: [4, 7] },
    ] as ChessMove[]) state = chessApplyState(state, move);
    expect(chessInCheck(state.board, true)).toBe(true);
    expect(chessLegalStateMoves(state)).toHaveLength(0);
  });

  it("castles king- and queen-side, moving the rook and revoking rights", () => {
    const board = emptyBoard();
    board[7][4] = "K"; board[7][0] = "R"; board[7][7] = "R"; board[0][4] = "k";
    const state = stateWith(board, { castling: { K: true, Q: true, k: false, q: false } });
    const moves = chessLegalStateMoves(state);
    expect(hasMove(moves, [7, 4], [7, 6])).toBe(true);
    expect(hasMove(moves, [7, 4], [7, 2])).toBe(true);
    const next = chessApplyState(state, moves.find((move) => move.to[1] === 6)!);
    expect(next.board[7][6]).toBe("K");
    expect(next.board[7][5]).toBe("R");
    expect(next.board[7][7]).toBeNull();
    expect(next.castling.K || next.castling.Q).toBe(false);
  });

  it("forbids castling through an attacked square", () => {
    const board = emptyBoard();
    board[7][4] = "K"; board[7][7] = "R"; board[0][4] = "k"; board[0][5] = "r";
    const state = stateWith(board, { castling: { K: true, Q: false, k: false, q: false } });
    expect(hasMove(chessLegalStateMoves(state), [7, 4], [7, 6])).toBe(false);
  });

  it("permanently revokes castling after a rook moves away", () => {
    const board = emptyBoard();
    board[7][4] = "K"; board[7][7] = "R"; board[0][4] = "k";
    const state = stateWith(board, { castling: { K: true, Q: false, k: false, q: false } });
    const moved = chessApplyState(state, { from: [7, 7], to: [6, 7] });
    expect(moved.castling.K).toBe(false);
  });

  it("allows en passant for one reply and removes the passed pawn", () => {
    const board = emptyBoard();
    board[7][4] = "K"; board[0][4] = "k"; board[3][4] = "P"; board[1][3] = "p";
    const black = stateWith(board, { whiteToMove: false });
    const pushed = chessApplyState(black, { from: [1, 3], to: [3, 3] });
    expect(pushed.enPassant).toEqual([2, 3]);
    const ep = chessLegalStateMoves(pushed).find((move) => move.from[1] === 4 && move.to[1] === 3)!;
    const captured = chessApplyState(pushed, ep);
    expect(captured.board[2][3]).toBe("P");
    expect(captured.board[3][3]).toBeNull();
  });

  it("offers and applies all four promotion pieces", () => {
    const board = emptyBoard();
    board[7][4] = "K"; board[0][7] = "k"; board[1][0] = "P";
    const state = stateWith(board);
    const promotions = chessLegalStateMoves(state).filter((move) => move.from[0] === 1 && move.from[1] === 0);
    expect(promotions.map((move) => move.promotion).sort()).toEqual(["b", "n", "q", "r"]);
    expect(chessApplyState(state, promotions.find((move) => move.promotion === "n")!).board[0][0]).toBe("N");
  });

  it("detects fifty-move, threefold-repetition, and insufficient-material draws", () => {
    const board = emptyBoard();
    board[7][4] = "K"; board[0][4] = "k";
    const state = stateWith(board);
    expect(chessInsufficientMaterial(board)).toBe(true);
    expect(chessDrawReason(state, [])).toBe("insufficientMaterial");

    board[6][0] = "R";
    const fifty = stateWith(board, { halfmoveClock: 100 });
    expect(chessDrawReason(fifty, [])).toBe("fiftyMove");
    const key = chessPositionKey(stateWith(board));
    expect(chessDrawReason(stateWith(board), [key, key, key])).toBe("threefold");
  });

  it("resets the halfmove clock for pawn moves and captures", () => {
    let state = createInitialChessState();
    state = { ...state, halfmoveClock: 12 };
    expect(chessApplyState(state, { from: [6, 4], to: [4, 4] }).halfmoveClock).toBe(0);

    const board = emptyBoard();
    board[7][4] = "K"; board[0][4] = "k"; board[4][4] = "R"; board[4][6] = "n";
    expect(chessApplyState(stateWith(board, { halfmoveClock: 12 }), { from: [4, 4], to: [4, 6] }).halfmoveClock).toBe(0);
  });

  it("ignores a non-capturable en-passant target in repetition keys", () => {
    const state = createInitialChessState();
    expect(chessPositionKey({ ...state, enPassant: [2, 3] })).toBe(chessPositionKey(state));
  });

  it("keeps a legal fallback when an iterative AI search is cancelled", () => {
    const state = createInitialChessState();
    let checks = 0;
    const result = chessBestStateMoveIterative(state, 5, () => ++checks > 12);
    expect(result.aborted).toBe(true);
    expect(chessLegalStateMoves(state)).toContainEqual(result.move);
    expect(result.completedDepth).toBeLessThan(5);
  });

  it("publishes only the deepest fully completed AI iteration", () => {
    const result = chessBestStateMoveIterative(createInitialChessState(), 2, () => false);
    expect(result.aborted).toBe(false);
    expect(result.completedDepth).toBe(2);
    expect(result.move).not.toBeNull();
  });
});
