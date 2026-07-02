// Gomoku AI — pattern-scored greedy with shallow lookahead at the top level.
// Board is the same flat (number | null)[] the Gomoku component uses (15×15, players 1/2).
import { pickWeighted, type AiLevel } from "./types";

const SIZE = 15;
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

type Board = (number | null)[];

const WIN = 10_000_000;

function lineScore(count: number, openEnds: number): number {
  if (count >= 5) return WIN;
  if (count === 4) return openEnds === 2 ? 1_000_000 : openEnds === 1 ? 100_000 : 0;
  if (count === 3) return openEnds === 2 ? 10_000 : openEnds === 1 ? 500 : 0;
  if (count === 2) return openEnds === 2 ? 100 : openEnds === 1 ? 10 : 0;
  if (count === 1) return openEnds === 2 ? 5 : 1;
  return 0;
}

/** Score of hypothetically placing `player`'s stone at `idx` (sum of the 4 lines through it). */
function scoreCell(board: Board, idx: number, player: number): number {
  const x = idx % SIZE;
  const y = Math.floor(idx / SIZE);
  let total = 0;
  for (const [dx, dy] of DIRS) {
    let count = 1;
    let openEnds = 0;
    for (const sign of [1, -1]) {
      let i = 1;
      for (; i < 5; i++) {
        const nx = x + dx * i * sign;
        const ny = y + dy * i * sign;
        if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) break;
        const cell = board[ny * SIZE + nx];
        if (cell === player) count++;
        else {
          if (cell === null) openEnds++;
          break;
        }
      }
      if (i === 5) openEnds++; // ran past 4 own stones without hitting a wall/foe
    }
    total += lineScore(count, openEnds);
  }
  return total;
}

/** Empty cells within radius 2 of any stone; center if the board is empty. */
function candidates(board: Board): number[] {
  const seen = new Set<number>();
  let any = false;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) continue;
    any = true;
    const x = i % SIZE;
    const y = Math.floor(i / SIZE);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
        const j = ny * SIZE + nx;
        if (board[j] === null) seen.add(j);
      }
    }
  }
  if (!any) return [Math.floor((SIZE * SIZE) / 2)];
  return Array.from(seen);
}

/** Best move for `ai` (1|2) at the given level. Returns a board index. */
export function gomokuBestMove(board: Board, ai: number, level: AiLevel): number {
  const foe = ai === 1 ? 2 : 1;
  const cells = candidates(board);

  // Immediate win / must-block first (Apprentice sometimes misses the block).
  let winAt = -1;
  let blockAt = -1;
  for (const c of cells) {
    if (winAt < 0 && scoreCell(board, c, ai) >= WIN) winAt = c;
    if (blockAt < 0 && scoreCell(board, c, foe) >= WIN) blockAt = c;
  }
  if (winAt >= 0) return winAt;
  if (blockAt >= 0 && (level >= 2 || Math.random() < 0.7)) return blockAt;

  const scored = cells
    .map((c) => ({ c, s: scoreCell(board, c, ai) + scoreCell(board, c, foe) * 0.9 }))
    .sort((a, b) => b.s - a.s);

  if (level === 1) return pickWeighted(scored, 5).c;
  if (level === 2) return scored[0].c;

  // Master: 2-ply — penalize moves that hand the opponent a strong reply.
  const top = scored.slice(0, 6);
  let best = top[0].c;
  let bestVal = -Infinity;
  for (const { c, s } of top) {
    const next = board.slice();
    next[c] = ai;
    const replies = candidates(next);
    let oppBest = 0;
    for (const r of replies) {
      const rs = scoreCell(next, r, foe) + scoreCell(next, r, ai) * 0.5;
      if (rs > oppBest) oppBest = rs;
    }
    const val = s - oppBest * 0.8;
    if (val > bestVal) {
      bestVal = val;
      best = c;
    }
  }
  return best;
}
