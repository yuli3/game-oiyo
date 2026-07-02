// Connect Four AI — negamax with alpha-beta pruning over the 6×7 board.
// Board shape matches the ConnectFour component: Cell[][] rows×cols, 0=empty.
import { pickWeighted, type AiLevel } from "./types";

type Cell = 0 | 1 | 2;
type Board = Cell[][];

const ROWS = 6;
const COLS = 7;
const ORDER = [3, 2, 4, 1, 5, 0, 6]; // centre-first move ordering for pruning
const WIN = 1_000_000;

function dropRow(board: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === 0) return r;
  return -1;
}

function wins(board: Board, row: number, col: number, p: Cell): boolean {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]] as const) {
    let n = 1;
    for (const s of [1, -1]) {
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i * s;
        const c = col + dc * i * s;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== p) break;
        n++;
      }
    }
    if (n >= 4) return true;
  }
  return false;
}

/** Static evaluation from `p`'s perspective: score every 4-window. */
function evaluate(board: Board, p: Cell): number {
  const foe = p === 1 ? 2 : 1;
  let score = 0;
  // centre-column preference
  for (let r = 0; r < ROWS; r++) if (board[r][3] === p) score += 6;
  const scoreWindow = (cells: Cell[]) => {
    const mine = cells.filter((c) => c === p).length;
    const theirs = cells.filter((c) => c === foe).length;
    if (mine > 0 && theirs > 0) return 0;
    if (mine === 3) return 60;
    if (mine === 2) return 8;
    if (theirs === 3) return -80;
    if (theirs === 2) return -8;
    return 0;
  };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 3 < COLS) score += scoreWindow([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]]);
      if (r + 3 < ROWS) score += scoreWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]]);
      if (r + 3 < ROWS && c + 3 < COLS) score += scoreWindow([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]]);
      if (r + 3 < ROWS && c - 3 >= 0) score += scoreWindow([board[r][c], board[r + 1][c - 1], board[r + 2][c - 2], board[r + 3][c - 3]]);
    }
  }
  return score;
}

function negamax(board: Board, depth: number, alpha: number, beta: number, p: Cell): number {
  const foe: Cell = p === 1 ? 2 : 1;
  let moved = false;
  let best = -Infinity;
  for (const col of ORDER) {
    const row = dropRow(board, col);
    if (row < 0) continue;
    moved = true;
    board[row][col] = p;
    let val: number;
    if (wins(board, row, col, p)) val = WIN + depth; // prefer faster wins
    else if (depth <= 1) val = evaluate(board, p);
    else val = -negamax(board, depth - 1, -beta, -alpha, foe);
    board[row][col] = 0;
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  if (!moved) return 0; // board full → draw
  return best;
}

/** Best column for `ai` at the given level. Returns -1 only if the board is full. */
export function connectFourBestMove(board: Board, ai: Cell, level: AiLevel): number {
  const depth = level === 1 ? 2 : level === 2 ? 4 : 7;
  const foe: Cell = ai === 1 ? 2 : 1;
  const scored: { col: number; val: number }[] = [];
  const work = board.map((r) => [...r]) as Board;
  for (const col of ORDER) {
    const row = dropRow(work, col);
    if (row < 0) continue;
    work[row][col] = ai;
    let val: number;
    if (wins(work, row, col, ai)) val = WIN;
    else val = -negamax(work, depth - 1, -Infinity, Infinity, foe);
    work[row][col] = 0;
    scored.push({ col, val });
  }
  if (scored.length === 0) return -1;
  scored.sort((a, b) => b.val - a.val);
  // Apprentice: never miss its own win, otherwise play loosely
  if (level === 1 && scored[0].val < WIN) return pickWeighted(scored, 3).col;
  return scored[0].col;
}
