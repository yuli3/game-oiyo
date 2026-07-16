import { pickWeighted, type AiLevel } from "./types";

export type ChessBoard = (string | null)[][];
export type PromotionPiece = "q" | "r" | "b" | "n";
export type ChessMove = {
  from: [number, number];
  to: [number, number];
  promotion?: PromotionPiece;
};
export type CastlingRights = { K: boolean; Q: boolean; k: boolean; q: boolean };
export type ChessState = {
  board: ChessBoard;
  whiteToMove: boolean;
  castling: CastlingRights;
  enPassant: [number, number] | null;
  halfmoveClock: number;
  fullmoveNumber: number;
};
export type ChessDrawReason = "fiftyMove" | "threefold" | "insufficientMaterial";

const VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const PROMOTIONS: PromotionPiece[] = ["q", "r", "b", "n"];

export function createInitialChessState(): ChessState {
  return {
    board: [
      ["r", "n", "b", "q", "k", "b", "n", "r"],
      Array(8).fill("p"),
      ...Array.from({ length: 4 }, () => Array(8).fill(null)),
      Array(8).fill("P"),
      ["R", "N", "B", "Q", "K", "B", "N", "R"],
    ],
    whiteToMove: true,
    castling: { K: true, Q: true, k: true, q: true },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

export function isWhitePiece(p: string): boolean {
  return p === p.toUpperCase();
}

function inB(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] as const;
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as const;
const ROOK_D = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const BISHOP_D = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;

function squareAttacked(board: ChessBoard, row: number, col: number, byWhite: boolean): boolean {
  const pawnRow = row + (byWhite ? 1 : -1);
  for (const dc of [-1, 1]) {
    if (inB(pawnRow, col + dc) && board[pawnRow][col + dc] === (byWhite ? "P" : "p")) return true;
  }
  for (const [dr, dc] of KNIGHT) {
    const r = row + dr, c = col + dc;
    if (inB(r, c) && board[r][c] === (byWhite ? "N" : "n")) return true;
  }
  for (const [dr, dc] of KING) {
    const r = row + dr, c = col + dc;
    if (inB(r, c) && board[r][c] === (byWhite ? "K" : "k")) return true;
  }
  for (const [dirs, pieces] of [[ROOK_D, ["r", "q"]], [BISHOP_D, ["b", "q"]]] as const) {
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc;
      while (inB(r, c)) {
        const p = board[r][c];
        if (p) {
          if (isWhitePiece(p) === byWhite && pieces.includes(p.toLowerCase() as never)) return true;
          break;
        }
        r += dr; c += dc;
      }
    }
  }
  return false;
}

function pseudoMoves(state: ChessState, white: boolean): ChessMove[] {
  const { board } = state;
  const moves: ChessMove[] = [];
  const push = (fr: number, fc: number, tr: number, tc: number, promotion?: PromotionPiece) => {
    moves.push({ from: [fr, fc], to: [tr, tc], ...(promotion ? { promotion } : {}) });
  };
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p || isWhitePiece(p) !== white) continue;
    const lower = p.toLowerCase();
    if (lower === "p") {
      const dir = white ? -1 : 1;
      const start = white ? 6 : 1;
      const addPawnMove = (tr: number, tc: number) => {
        if (tr === (white ? 0 : 7)) PROMOTIONS.forEach((promotion) => push(r, c, tr, tc, promotion));
        else push(r, c, tr, tc);
      };
      if (inB(r + dir, c) && !board[r + dir][c]) {
        addPawnMove(r + dir, c);
        if (r === start && !board[r + 2 * dir][c]) push(r, c, r + 2 * dir, c);
      }
      for (const dc of [-1, 1]) {
        const tr = r + dir, tc = c + dc;
        if (!inB(tr, tc)) continue;
        const target = board[tr][tc];
        if ((target && isWhitePiece(target) !== white && target.toLowerCase() !== "k")
          || (state.enPassant?.[0] === tr && state.enPassant[1] === tc)) addPawnMove(tr, tc);
      }
    } else if (lower === "n" || lower === "k") {
      for (const [dr, dc] of lower === "n" ? KNIGHT : KING) {
        const tr = r + dr, tc = c + dc;
        if (!inB(tr, tc)) continue;
        const target = board[tr][tc];
        if (!target || (isWhitePiece(target) !== white && target.toLowerCase() !== "k")) push(r, c, tr, tc);
      }
      if (lower === "k" && c === 4 && r === (white ? 7 : 0) && !squareAttacked(board, r, 4, !white)) {
        const kingSide = white ? state.castling.K : state.castling.k;
        const queenSide = white ? state.castling.Q : state.castling.q;
        if (kingSide && board[r][7] === (white ? "R" : "r") && !board[r][5] && !board[r][6]
          && !squareAttacked(board, r, 5, !white) && !squareAttacked(board, r, 6, !white)) push(r, c, r, 6);
        if (queenSide && board[r][0] === (white ? "R" : "r") && !board[r][1] && !board[r][2] && !board[r][3]
          && !squareAttacked(board, r, 3, !white) && !squareAttacked(board, r, 2, !white)) push(r, c, r, 2);
      }
    } else {
      const dirs = lower === "r" ? ROOK_D : lower === "b" ? BISHOP_D : [...ROOK_D, ...BISHOP_D];
      for (const [dr, dc] of dirs) {
        let tr = r + dr, tc = c + dc;
        while (inB(tr, tc)) {
          const target = board[tr][tc];
          if (!target) push(r, c, tr, tc);
          else {
            if (isWhitePiece(target) !== white && target.toLowerCase() !== "k") push(r, c, tr, tc);
            break;
          }
          tr += dr; tc += dc;
        }
      }
    }
  }
  return moves;
}

function disableRookRight(castling: CastlingRights, r: number, c: number): void {
  if (r === 7 && c === 7) castling.K = false;
  if (r === 7 && c === 0) castling.Q = false;
  if (r === 0 && c === 7) castling.k = false;
  if (r === 0 && c === 0) castling.q = false;
}

export function chessApplyState(state: ChessState, move: ChessMove): ChessState {
  const board = state.board.map((row) => [...row]);
  const [fr, fc] = move.from, [tr, tc] = move.to;
  const piece = board[fr][fc];
  if (!piece) return state;
  const captured = board[tr][tc];
  const white = isWhitePiece(piece);
  const castling = { ...state.castling };

  if (piece.toLowerCase() === "p" && state.enPassant?.[0] === tr && state.enPassant[1] === tc && !captured) {
    board[fr][tc] = null;
  }
  board[tr][tc] = piece;
  board[fr][fc] = null;
  if (piece.toLowerCase() === "p" && (tr === 0 || tr === 7)) {
    const promoted = move.promotion ?? "q";
    board[tr][tc] = white ? promoted.toUpperCase() : promoted;
  }
  if (piece.toLowerCase() === "k" && Math.abs(tc - fc) === 2) {
    const rookFrom = tc === 6 ? 7 : 0;
    const rookTo = tc === 6 ? 5 : 3;
    board[tr][rookTo] = board[tr][rookFrom];
    board[tr][rookFrom] = null;
  }

  if (piece === "K") { castling.K = false; castling.Q = false; }
  if (piece === "k") { castling.k = false; castling.q = false; }
  if (piece.toLowerCase() === "r") disableRookRight(castling, fr, fc);
  if (captured?.toLowerCase() === "r") disableRookRight(castling, tr, tc);

  return {
    board,
    whiteToMove: !state.whiteToMove,
    castling,
    enPassant: piece.toLowerCase() === "p" && Math.abs(tr - fr) === 2 ? [(fr + tr) / 2, fc] : null,
    halfmoveClock: piece.toLowerCase() === "p" || captured ? 0 : state.halfmoveClock + 1,
    fullmoveNumber: state.fullmoveNumber + (white ? 0 : 1),
  };
}

function kingPos(board: ChessBoard, white: boolean): [number, number] | null {
  const king = white ? "K" : "k";
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c] === king) return [r, c];
  return null;
}

export function chessInCheck(board: ChessBoard, white: boolean): boolean {
  const king = kingPos(board, white);
  return !king || squareAttacked(board, king[0], king[1], !white);
}

export function chessLegalStateMoves(state: ChessState): ChessMove[] {
  const white = state.whiteToMove;
  return pseudoMoves(state, white).filter((move) => !chessInCheck(chessApplyState(state, move).board, white));
}

export function chessPositionKey(state: ChessState): string {
  const board = state.board.map((row) => row.map((p) => p ?? ".").join("")).join("/");
  const rights = Object.entries(state.castling).filter(([, value]) => value).map(([key]) => key).join("") || "-";
  const ep = state.enPassant && [-1, 1].some((dc) => {
    const pawnRow = state.enPassant![0] + (state.whiteToMove ? 1 : -1);
    const pawnCol = state.enPassant![1] + dc;
    return inB(pawnRow, pawnCol) && state.board[pawnRow][pawnCol] === (state.whiteToMove ? "P" : "p");
  }) ? `${state.enPassant[0]}${state.enPassant[1]}` : "-";
  return `${board} ${state.whiteToMove ? "w" : "b"} ${rights} ${ep}`;
}

export function chessInsufficientMaterial(board: ChessBoard): boolean {
  const pieces: { piece: string; row: number; col: number }[] = [];
  board.forEach((row, r) => row.forEach((piece, c) => { if (piece && piece.toLowerCase() !== "k") pieces.push({ piece, row: r, col: c }); }));
  if (pieces.length === 0) return true;
  if (pieces.some(({ piece }) => !["b", "n"].includes(piece.toLowerCase()))) return false;
  if (pieces.length === 1) return true;
  if (pieces.every(({ piece }) => piece.toLowerCase() === "b")) {
    return new Set(pieces.map(({ row, col }) => (row + col) % 2)).size === 1;
  }
  return false;
}

export function chessDrawReason(state: ChessState, positionHistory: string[]): ChessDrawReason | null {
  if (state.halfmoveClock >= 100) return "fiftyMove";
  if (chessInsufficientMaterial(state.board)) return "insufficientMaterial";
  const key = chessPositionKey(state);
  if (positionHistory.filter((entry) => entry === key).length >= 3) return "threefold";
  return null;
}

// Compatibility wrappers for board-only callers. History-dependent special moves are disabled.
function boardState(board: ChessBoard, white: boolean): ChessState {
  return { board, whiteToMove: white, castling: { K: false, Q: false, k: false, q: false }, enPassant: null, halfmoveClock: 0, fullmoveNumber: 1 };
}
export function chessApply(board: ChessBoard, move: ChessMove): ChessBoard {
  return chessApplyState(boardState(board, isWhitePiece(board[move.from[0]][move.from[1]] ?? "P")), move).board;
}
export function chessLegalMoves(board: ChessBoard, white: boolean): ChessMove[] {
  return chessLegalStateMoves(boardState(board, white));
}

function pst(p: string, r: number, c: number): number {
  const lower = p.toLowerCase();
  const centre = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5));
  if (lower === "n" || lower === "b") return centre * 6;
  if (lower === "p") return (isWhitePiece(p) ? 6 - r : r - 1) * 4 + centre * 2;
  return 0;
}
function evaluate(board: ChessBoard, white: boolean): number {
  let score = 0;
  board.forEach((row, r) => row.forEach((p, c) => {
    if (p) score += (isWhitePiece(p) === white ? 1 : -1) * (VALUES[p.toLowerCase()] + pst(p, r, c));
  }));
  return score;
}
function orderMoves(board: ChessBoard, moves: ChessMove[]): ChessMove[] {
  return [...moves].sort((a, b) => {
    const gain = (m: ChessMove) => (board[m.to[0]][m.to[1]] ? VALUES[board[m.to[0]][m.to[1]]!.toLowerCase()] : 0)
      + (m.promotion ? VALUES[m.promotion] : 0);
    return gain(b) - gain(a);
  });
}
function negamax(state: ChessState, depth: number, alpha: number, beta: number): number {
  const moves = chessLegalStateMoves(state);
  if (!moves.length) return chessInCheck(state.board, state.whiteToMove) ? -1_000_000 - depth * 1000 : 0;
  if (depth <= 0 || chessInsufficientMaterial(state.board)) return evaluate(state.board, state.whiteToMove);
  let best = -Infinity;
  for (const move of orderMoves(state.board, moves)) {
    const value = -negamax(chessApplyState(state, move), depth - 1, -beta, -alpha);
    best = Math.max(best, value); alpha = Math.max(alpha, best);
    if (alpha >= beta) break;
  }
  return best;
}
export function chessBestStateMove(state: ChessState, level: AiLevel): ChessMove | null {
  const moves = chessLegalStateMoves(state);
  if (!moves.length) return null;
  const depth = level === 1 ? 1 : level === 2 ? 2 : 3;
  const scored = orderMoves(state.board, moves)
    .map((move) => ({ m: move, val: -negamax(chessApplyState(state, move), depth - 1, -Infinity, Infinity) }))
    .sort((a, b) => b.val - a.val);
  if (level === 1 && scored[0].val < 500_000) return pickWeighted(scored, 4).m;
  return scored[0].m;
}
export function chessBestMove(board: ChessBoard, white: boolean, level: AiLevel): ChessMove | null {
  return chessBestStateMove(boardState(board, white), level);
}
