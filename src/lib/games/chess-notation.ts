import { chessInCheck, chessLegalStateMoves, isWhitePiece, type ChessMove, type ChessState } from "./ai/chess";

const PIECE_LETTER: Record<string, string> = { p: "", n: "N", b: "B", r: "R", q: "Q", k: "K" };
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function chessSquareName([row, column]: [number, number]): string {
  return `${String.fromCharCode(97 + column)}${8 - row}`;
}

export function capturedChessPiece(state: ChessState, move: ChessMove): string | null {
  const piece = state.board[move.from[0]][move.from[1]];
  const direct = state.board[move.to[0]][move.to[1]];
  if (direct) return direct;
  if (piece?.toLowerCase() === "p" && state.enPassant?.[0] === move.to[0] && state.enPassant[1] === move.to[1]) {
    return state.board[move.from[0]][move.to[1]];
  }
  return null;
}

export function formatChessMove(state: ChessState, move: ChessMove, next: ChessState): string {
  const piece = state.board[move.from[0]][move.from[1]];
  if (!piece) return chessSquareName(move.to);
  if (piece.toLowerCase() === "k" && Math.abs(move.to[1] - move.from[1]) === 2) {
    return move.to[1] === 6 ? "O-O" : "O-O-O";
  }
  const captured = capturedChessPiece(state, move);
  const pawnFile = piece.toLowerCase() === "p" && captured ? String.fromCharCode(97 + move.from[1]) : "";
  const promotion = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
  const check = chessInCheck(next.board, next.whiteToMove)
    ? chessLegalStateMoves(next).length === 0 ? "#" : "+"
    : "";
  return `${PIECE_LETTER[piece.toLowerCase()]}${pawnFile}${captured ? "x" : ""}${chessSquareName(move.to)}${promotion}${check}`;
}

export type ChessReviewEntry = { notation: string; captured: string | null; white: boolean };
export type ChessReviewMoment = { notation: string; moveNumber: number; kind: "capture" | "check" | "last-move" };

/** Last forcing move by the opponent, from the requested player's perspective. */
export function chessReviewMoment(history: ChessReviewEntry[], perspectiveWhite = true): ChessReviewMoment | null {
  if (!history.length) return null;
  let index = -1;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (entry.white !== perspectiveWhite && (entry.captured || /[+#]$/.test(entry.notation))) { index = i; break; }
  }
  if (index < 0) index = history.length - 1;
  const entry = history[index];
  return {
    notation: entry.notation,
    moveNumber: Math.floor(index / 2) + 1,
    kind: entry.captured ? "capture" : /[+#]$/.test(entry.notation) ? "check" : "last-move",
  };
}

export function chessMaterialBalance(captured: string[]): number {
  return captured.reduce((balance, piece) => balance + (isWhitePiece(piece) ? -1 : 1) * PIECE_VALUE[piece.toLowerCase()], 0);
}
