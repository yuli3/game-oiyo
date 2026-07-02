// Reversi/Othello AI — positional weights + mobility, negamax with alpha-beta.
// Board is the flat (number | null)[] the Reversi component uses (8×8, players 1/2).
import { pickWeighted, type AiLevel } from "./types";

const SIZE = 8;
type Board = (number | null)[];

const DIRS = [
  [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

// Classic corner/edge weight table (symmetric).
// prettier-ignore
const W = [
  100, -20, 10,  5,  5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
   10,  -2, -1, -1, -1, -1,  -2,  10,
    5,  -2, -1, -1, -1, -1,  -2,   5,
    5,  -2, -1, -1, -1, -1,  -2,   5,
   10,  -2, -1, -1, -1, -1,  -2,  10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10,  5,  5, 10, -20, 100,
];

export function reversiFlips(board: Board, index: number, player: number): number[] {
  if (board[index] !== null) return [];
  const opponent = player === 1 ? 2 : 1;
  const x = index % SIZE;
  const y = Math.floor(index / SIZE);
  const flips: number[] = [];
  for (const [dx, dy] of DIRS) {
    const temp: number[] = [];
    let nx = x + dx;
    let ny = y + dy;
    while (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
      const j = ny * SIZE + nx;
      if (board[j] === opponent) temp.push(j);
      else {
        if (board[j] === player && temp.length) flips.push(...temp);
        break;
      }
      nx += dx;
      ny += dy;
    }
  }
  return flips;
}

export function reversiMoves(board: Board, player: number): number[] {
  const moves: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (board[i] === null && reversiFlips(board, i, player).length > 0) moves.push(i);
  }
  return moves;
}

function apply(board: Board, index: number, player: number): Board {
  const next = board.slice();
  next[index] = player;
  for (const f of reversiFlips(board, index, player)) next[f] = player;
  return next;
}

function evaluate(board: Board, p: number): number {
  const foe = p === 1 ? 2 : 1;
  let pos = 0;
  let mine = 0;
  let theirs = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === p) { pos += W[i]; mine++; }
    else if (board[i] === foe) { pos -= W[i]; theirs++; }
  }
  const mob = reversiMoves(board, p).length - reversiMoves(board, foe).length;
  const empties = SIZE * SIZE - mine - theirs;
  // Endgame: raw disc count dominates; midgame: position + mobility.
  if (empties <= 8) return (mine - theirs) * 100 + pos;
  return pos + mob * 8;
}

function negamax(board: Board, depth: number, alpha: number, beta: number, p: number, passed: boolean): number {
  const foe = p === 1 ? 2 : 1;
  const moves = reversiMoves(board, p);
  if (moves.length === 0) {
    if (passed) {
      // game over — exact score
      let mine = 0, theirs = 0;
      for (const c of board) { if (c === p) mine++; else if (c === foe) theirs++; }
      return (mine - theirs) * 10_000;
    }
    return -negamax(board, depth, -beta, -alpha, foe, true);
  }
  if (depth <= 0) return evaluate(board, p);
  let best = -Infinity;
  for (const m of moves) {
    const val = -negamax(apply(board, m, p), depth - 1, -beta, -alpha, foe, false);
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Best move index for `ai` at the given level; -1 if no legal move (pass). */
export function reversiBestMove(board: Board, ai: number, level: AiLevel): number {
  const foe = ai === 1 ? 2 : 1;
  const moves = reversiMoves(board, ai);
  if (moves.length === 0) return -1;

  if (level === 1) {
    // Apprentice: mostly max-flips greed (the classic beginner trap of ignoring corners)
    const scored = moves
      .map((m) => ({ m, s: reversiFlips(board, m, ai).length + W[m] * 0.05 }))
      .sort((a, b) => b.s - a.s);
    return pickWeighted(scored, 4).m;
  }

  const depth = level === 2 ? 2 : 4;
  let best = moves[0];
  let bestVal = -Infinity;
  for (const m of moves) {
    const val = -negamax(apply(board, m, ai), depth - 1, -Infinity, Infinity, foe, false);
    if (val > bestVal) {
      bestVal = val;
      best = m;
    }
  }
  return best;
}
