// Checkers AI — mirrors the simplified rules of the Checkers component:
// men step diagonally forward, kings step any diagonal; single jumps in any
// direction over an enemy piece (no multi-jump, no forced capture).
import { pickWeighted, type AiLevel } from "./types";

const SIZE = 8;

export type CheckersPiece = { player: number; isKing: boolean };
type Board = (CheckersPiece | null)[];

export type CheckersMove = { from: number; to: number; jumpOver?: number };

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

export function checkersMoves(board: Board, player: number): CheckersMove[] {
  const moves: CheckersMove[] = [];
  const fwd = player === 1 ? -1 : 1;
  for (let i = 0; i < board.length; i++) {
    const p = board[i];
    if (!p || p.player !== player) continue;
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    for (const dc of [-1, 1]) {
      // simple steps: forward for men, both directions for kings
      for (const dr of p.isKing ? [-1, 1] : [fwd]) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && board[nr * SIZE + nc] === null) moves.push({ from: i, to: nr * SIZE + nc });
      }
      // jumps: any direction (matches the component's rules)
      for (const dr of [-1, 1]) {
        const mr = r + dr;
        const mc = c + dc;
        const nr = r + dr * 2;
        const nc = c + dc * 2;
        if (!inBounds(nr, nc)) continue;
        const mid = board[mr * SIZE + mc];
        if (mid && mid.player !== player && board[nr * SIZE + nc] === null) {
          moves.push({ from: i, to: nr * SIZE + nc, jumpOver: mr * SIZE + mc });
        }
      }
    }
  }
  return moves;
}

export function checkersApply(board: Board, m: CheckersMove): Board {
  const next = board.slice();
  const piece = next[m.from]!;
  const r = Math.floor(m.to / SIZE);
  const promoted = !piece.isKing && ((piece.player === 1 && r === 0) || (piece.player === 2 && r === SIZE - 1));
  next[m.to] = promoted ? { ...piece, isKing: true } : piece;
  next[m.from] = null;
  if (m.jumpOver !== undefined) next[m.jumpOver] = null;
  return next;
}

function evaluate(board: Board, p: number): number {
  let score = 0;
  for (let i = 0; i < board.length; i++) {
    const piece = board[i];
    if (!piece) continue;
    const r = Math.floor(i / SIZE);
    const advance = piece.player === 1 ? SIZE - 1 - r : r; // rows advanced toward promotion
    const val = (piece.isKing ? 160 : 100) + advance * 2;
    score += piece.player === p ? val : -val;
  }
  return score;
}

function negamax(board: Board, depth: number, alpha: number, beta: number, p: number): number {
  const foe = p === 1 ? 2 : 1;
  const moves = checkersMoves(board, p);
  if (moves.length === 0) return -100_000 - depth; // no moves = loss (or fully captured)
  if (depth <= 0) return evaluate(board, p);
  // order captures first for better pruning
  moves.sort((a, b) => (b.jumpOver !== undefined ? 1 : 0) - (a.jumpOver !== undefined ? 1 : 0));
  let best = -Infinity;
  for (const m of moves) {
    const val = -negamax(checkersApply(board, m), depth - 1, -beta, -alpha, foe);
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Best move for `ai` at the given level; null if no legal move. */
export function checkersBestMove(board: Board, ai: number, level: AiLevel): CheckersMove | null {
  const foe = ai === 1 ? 2 : 1;
  const moves = checkersMoves(board, ai);
  if (moves.length === 0) return null;
  const depth = level === 1 ? 2 : level === 2 ? 4 : 6;
  const scored = moves
    .map((m) => ({ m, val: -negamax(checkersApply(board, m), depth - 1, -Infinity, Infinity, foe) }))
    .sort((a, b) => b.val - a.val);
  if (level === 1 && scored[0].val < 50_000) return pickWeighted(scored, 3).m;
  return scored[0].m;
}
