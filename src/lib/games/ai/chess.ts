// Casual chess engine — legal piece movement, check-aware, checkmate/stalemate.
// Simplifications (casual scope): no castling, no en passant; promotion is auto-queen.
// Board matches the ChessBoard component: (string | null)[][] — uppercase = white.
import { pickWeighted, type AiLevel } from "./types";

export type ChessBoard = (string | null)[][];
export type ChessMove = { from: [number, number]; to: [number, number] };

const VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

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

/** Pseudo-legal moves for one side (may leave own king in check — filtered later). */
function pseudoMoves(board: ChessBoard, white: boolean): ChessMove[] {
  const moves: ChessMove[] = [];
  const push = (fr: number, fc: number, tr: number, tc: number) => {
    moves.push({ from: [fr, fc], to: [tr, tc] });
  };
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || isWhitePiece(p) !== white) continue;
      const lower = p.toLowerCase();
      if (lower === "p") {
        const dir = white ? -1 : 1;
        const start = white ? 6 : 1;
        if (inB(r + dir, c) && !board[r + dir][c]) {
          push(r, c, r + dir, c);
          if (r === start && !board[r + 2 * dir][c]) push(r, c, r + 2 * dir, c);
        }
        for (const dc of [-1, 1]) {
          const tr = r + dir;
          const tc = c + dc;
          if (inB(tr, tc) && board[tr][tc] && isWhitePiece(board[tr][tc]!) !== white) push(r, c, tr, tc);
        }
      } else if (lower === "n" || lower === "k") {
        for (const [dr, dc] of lower === "n" ? KNIGHT : KING) {
          const tr = r + dr;
          const tc = c + dc;
          if (!inB(tr, tc)) continue;
          const t = board[tr][tc];
          if (!t || isWhitePiece(t) !== white) push(r, c, tr, tc);
        }
      } else {
        const dirs = lower === "r" ? ROOK_D : lower === "b" ? BISHOP_D : [...ROOK_D, ...BISHOP_D];
        for (const [dr, dc] of dirs) {
          let tr = r + dr;
          let tc = c + dc;
          while (inB(tr, tc)) {
            const t = board[tr][tc];
            if (!t) push(r, c, tr, tc);
            else {
              if (isWhitePiece(t) !== white) push(r, c, tr, tc);
              break;
            }
            tr += dr;
            tc += dc;
          }
        }
      }
    }
  }
  return moves;
}

export function chessApply(board: ChessBoard, m: ChessMove): ChessBoard {
  const next = board.map((row) => [...row]);
  const p = next[m.from[0]][m.from[1]]!;
  let placed = p;
  // auto-queen promotion
  if (p === "P" && m.to[0] === 0) placed = "Q";
  if (p === "p" && m.to[0] === 7) placed = "q";
  next[m.to[0]][m.to[1]] = placed;
  next[m.from[0]][m.from[1]] = null;
  return next;
}

function kingPos(board: ChessBoard, white: boolean): [number, number] | null {
  const k = white ? "K" : "k";
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c] === k) return [r, c];
  return null;
}

/** Is `white`'s king currently attacked? */
export function chessInCheck(board: ChessBoard, white: boolean): boolean {
  const kp = kingPos(board, white);
  if (!kp) return true; // king gone (shouldn't happen with legal moves)
  return pseudoMoves(board, !white).some((m) => m.to[0] === kp[0] && m.to[1] === kp[1]);
}

export function chessLegalMoves(board: ChessBoard, white: boolean): ChessMove[] {
  return pseudoMoves(board, white).filter((m) => !chessInCheck(chessApply(board, m), white));
}

// Light positional bonus: centralization for knights/bishops/pawns, pawn advancement.
function pst(p: string, r: number, c: number): number {
  const lower = p.toLowerCase();
  const centre = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5)); // 0 (edge) .. 3.5-ish
  if (lower === "n" || lower === "b") return centre * 6;
  if (lower === "p") {
    const advance = isWhitePiece(p) ? 6 - r : r - 1;
    return advance * 4 + centre * 2;
  }
  return 0;
}

function evaluate(board: ChessBoard, white: boolean): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const v = VALUES[p.toLowerCase()] + pst(p, r, c);
      score += isWhitePiece(p) === white ? v : -v;
    }
  }
  return score;
}

function orderMoves(board: ChessBoard, moves: ChessMove[]): ChessMove[] {
  return moves
    .map((m) => {
      const victim = board[m.to[0]][m.to[1]];
      const attacker = board[m.from[0]][m.from[1]]!;
      const gain = victim ? VALUES[victim.toLowerCase()] - VALUES[attacker.toLowerCase()] / 10 : 0;
      return { m, gain };
    })
    .sort((a, b) => b.gain - a.gain)
    .map((x) => x.m);
}

function negamax(board: ChessBoard, depth: number, alpha: number, beta: number, white: boolean): number {
  const moves = chessLegalMoves(board, white);
  if (moves.length === 0) {
    // checkmate (very bad, prefer later mates) or stalemate (draw)
    return chessInCheck(board, white) ? -1_000_000 - depth * 1000 : 0;
  }
  if (depth <= 0) return evaluate(board, white);
  let best = -Infinity;
  for (const m of orderMoves(board, moves)) {
    const val = -negamax(chessApply(board, m), depth - 1, -beta, -alpha, !white);
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Best move for the side (white=true/false) at the given level; null if no legal move. */
export function chessBestMove(board: ChessBoard, white: boolean, level: AiLevel): ChessMove | null {
  const moves = chessLegalMoves(board, white);
  if (moves.length === 0) return null;
  const depth = level === 1 ? 1 : level === 2 ? 2 : 3;
  const scored = orderMoves(board, moves)
    .map((m) => ({ m, val: -negamax(chessApply(board, m), depth - 1, -Infinity, Infinity, !white) }))
    .sort((a, b) => b.val - a.val);
  if (level === 1 && scored[0].val < 500_000) return pickWeighted(scored, 4).m;
  return scored[0].m;
}
