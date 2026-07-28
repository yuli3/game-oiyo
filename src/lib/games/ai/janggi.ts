// Casual janggi (Korean chess) engine — real piece movement + negamax AI.
// Simplifications (casual scope, matches the JanggiBoard component): capturing
// the enemy general wins; no check/bikjang/repetition rules; a side with no
// moves passes. Board: (string | null)[][] 10×9 — lowercase = Cho (초, top),
// uppercase = Han (한, bottom).
import { type AiLevel } from "./types";

export type JanggiBoard = (string | null)[][];
export type JanggiMove = { from: [number, number]; to: [number, number] };

const ROWS = 10;
const COLS = 9;

export const isChoPiece = (p: string) => p === p.toLowerCase();
const isCannon = (p: string) => p.toLowerCase() === "p";
const inB = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

// Palace centers (cho top, han bottom). Each palace is the 3×3 around a center.
const CENTERS: [number, number][] = [[1, 4], [8, 4]];

const inPalace = (r: number, c: number) =>
  CENTERS.some(([cr, cc]) => Math.abs(r - cr) <= 1 && Math.abs(c - cc) <= 1);

// Diagonal palace lines run only between a palace center and its four corners.
const diagStep = (r1: number, c1: number, r2: number, c2: number) =>
  CENTERS.some(([cr, cc]) => {
    const in1 = Math.abs(r1 - cr) <= 1 && Math.abs(c1 - cc) <= 1;
    const in2 = Math.abs(r2 - cr) <= 1 && Math.abs(c2 - cc) <= 1;
    return in1 && in2 && ((r1 === cr && c1 === cc) || (r2 === cr && c2 === cc));
  });

const ORTHO: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Knight: [move, blocking leg]
const KNIGHT: [[number, number], [number, number]][] = [
  [[-2, -1], [-1, 0]], [[-2, 1], [-1, 0]], [[2, -1], [1, 0]], [[2, 1], [1, 0]],
  [[-1, -2], [0, -1]], [[1, -2], [0, -1]], [[-1, 2], [0, 1]], [[1, 2], [0, 1]],
];
// Elephant (상): 1 orthogonal + 2 diagonal, both intermediate points must be empty
const ELEPHANT: [[number, number], [number, number], [number, number]][] = [
  [[-3, -2], [-1, 0], [-2, -1]], [[-3, 2], [-1, 0], [-2, 1]],
  [[3, -2], [1, 0], [2, -1]], [[3, 2], [1, 0], [2, 1]],
  [[-2, -3], [0, -1], [-1, -2]], [[2, -3], [0, -1], [1, -2]],
  [[-2, 3], [0, 1], [-1, 2]], [[2, 3], [0, 1], [1, 2]],
];

/** Legal target squares for the piece at (r,c). */
export function janggiTargets(board: JanggiBoard, r: number, c: number): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  const mine = isChoPiece(piece);
  const targets: [number, number][] = [];
  const push = (nr: number, nc: number) => {
    if (!inB(nr, nc)) return;
    const dst = board[nr][nc];
    if (dst && isChoPiece(dst) === mine) return; // own piece
    targets.push([nr, nc]);
  };

  const type = piece.toLowerCase();

  if (type === "k" || type === "g") {
    // General/guard: 1 step along palace lines, confined to the palace
    for (const [dr, dc] of ORTHO) {
      const nr = r + dr, nc = c + dc;
      if (inPalace(nr, nc)) push(nr, nc);
    }
    for (const dr of [-1, 1]) for (const dc of [-1, 1]) {
      const nr = r + dr, nc = c + dc;
      if (inPalace(nr, nc) && diagStep(r, c, nr, nc)) push(nr, nc);
    }
  } else if (type === "r") {
    // Chariot: slides orthogonally; may also slide along palace diagonals
    for (const [dr, dc] of ORTHO) {
      let nr = r + dr, nc = c + dc;
      while (inB(nr, nc)) {
        push(nr, nc);
        if (board[nr][nc]) break;
        nr += dr; nc += dc;
      }
    }
    for (const dr of [-1, 1]) for (const dc of [-1, 1]) {
      const nr = r + dr, nc = c + dc;
      if (!inB(nr, nc) || !diagStep(r, c, nr, nc)) continue;
      push(nr, nc);
      // corner → center → opposite corner when the center is empty
      const fr = nr + dr, fc = nc + dc;
      if (!board[nr][nc] && inB(fr, fc) && diagStep(nr, nc, fr, fc)) push(fr, fc);
    }
  } else if (type === "n") {
    for (const [[dr, dc], [lr, lc]] of KNIGHT) {
      if (inB(r + lr, c + lc) && !board[r + lr][c + lc]) push(r + dr, c + dc);
    }
  } else if (type === "b") {
    for (const [[dr, dc], [l1r, l1c], [l2r, l2c]] of ELEPHANT) {
      if (
        inB(r + l1r, c + l1c) && !board[r + l1r][c + l1c] &&
        inB(r + l2r, c + l2c) && !board[r + l2r][c + l2c]
      ) push(r + dr, c + dc);
    }
  } else if (type === "p") {
    // Cannon: needs exactly one non-cannon screen; cannot capture a cannon
    for (const [dr, dc] of ORTHO) {
      let nr = r + dr, nc = c + dc;
      while (inB(nr, nc) && !board[nr][nc]) { nr += dr; nc += dc; }
      if (!inB(nr, nc) || isCannon(board[nr][nc]!)) continue; // no screen / cannon screen
      nr += dr; nc += dc;
      while (inB(nr, nc)) {
        const dst = board[nr][nc];
        if (!dst) { targets.push([nr, nc]); nr += dr; nc += dc; continue; }
        if (isChoPiece(dst) !== mine && !isCannon(dst)) targets.push([nr, nc]);
        break;
      }
    }
    // Palace diagonal jump: corner → over occupied center → opposite corner
    for (const [cr, cc] of CENTERS) {
      const isCorner = Math.abs(r - cr) === 1 && Math.abs(c - cc) === 1;
      if (!isCorner) continue;
      const screen = board[cr][cc];
      if (!screen || isCannon(screen)) continue;
      const or = 2 * cr - r, oc = 2 * cc - c;
      const dst = board[or][oc];
      if (!dst || (isChoPiece(dst) !== mine && !isCannon(dst))) targets.push([or, oc]);
    }
  } else if (type === "s") {
    // Soldier: forward or sideways; forward diagonal along palace lines
    const fwd = mine ? 1 : -1;
    push(r + fwd, c);
    push(r, c - 1);
    push(r, c + 1);
    for (const dc of [-1, 1]) {
      const nr = r + fwd, nc = c + dc;
      if (inB(nr, nc) && diagStep(r, c, nr, nc)) push(nr, nc);
    }
  }

  return targets;
}

/** All moves for one side. */
export function janggiMoves(board: JanggiBoard, cho: boolean): JanggiMove[] {
  const moves: JanggiMove[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || isChoPiece(p) !== cho) continue;
      for (const [tr, tc] of janggiTargets(board, r, c)) {
        moves.push({ from: [r, c], to: [tr, tc] });
      }
    }
  }
  return moves;
}

export function janggiApply(board: JanggiBoard, m: JanggiMove): JanggiBoard {
  const next = board.map((row) => [...row]);
  next[m.to[0]][m.to[1]] = next[m.from[0]][m.from[1]];
  next[m.from[0]][m.from[1]] = null;
  return next;
}

// Standard janggi point values ×100, king large for capture-to-win scoring.
const VALUES: Record<string, number> = { r: 1300, p: 700, n: 500, b: 300, g: 300, s: 200, k: 100000 };

const hasKing = (board: JanggiBoard, cho: boolean) =>
  board.some((row) => row.some((p) => p === (cho ? "k" : "K")));

function evaluate(board: JanggiBoard, cho: boolean): number {
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      let v = VALUES[p.toLowerCase()];
      // soldier advancement bonus toward the enemy camp
      if (p.toLowerCase() === "s") v += (isChoPiece(p) ? r - 3 : 6 - r) * 15;
      score += isChoPiece(p) === cho ? v : -v;
    }
  }
  return score;
}

function orderMoves(board: JanggiBoard, moves: JanggiMove[]): JanggiMove[] {
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

function negamax(board: JanggiBoard, depth: number, alpha: number, beta: number, cho: boolean): number {
  if (!hasKing(board, cho)) return -1_000_000 - depth * 1000; // our king captured
  if (!hasKing(board, !cho)) return 1_000_000 + depth * 1000;
  if (depth <= 0) return evaluate(board, cho);
  const moves = janggiMoves(board, cho);
  if (moves.length === 0) return -negamax(board, depth - 1, -beta, -alpha, !cho); // pass
  let best = -Infinity;
  for (const m of orderMoves(board, moves)) {
    const val = -negamax(janggiApply(board, m), depth - 1, -beta, -alpha, !cho);
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Best move for the side at the given level; null if no legal move (pass). */
export function janggiBestMove(board: JanggiBoard, cho: boolean, level: AiLevel, seed = 0): JanggiMove | null {
  const moves = janggiMoves(board, cho);
  if (moves.length === 0) return null;
  const depth = level === 1 ? 1 : level === 2 ? 2 : 3;
  const scored = orderMoves(board, moves)
    .map((m) => ({ m, val: -negamax(janggiApply(board, m), depth - 1, -Infinity, Infinity, !cho) }))
    .sort((a, b) => b.val - a.val);
  // Apprentice remains shallow, but must still be reproducible and take a
  // free capture / winning move when one exists.
  if (level === 1 && scored[0].val < 500_000) return scored[Math.abs(seed) % Math.min(4, scored.length)].m;
  return scored[0].m;
}
