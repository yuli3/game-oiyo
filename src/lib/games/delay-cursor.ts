// Daily delayed cursor. The ghost is your own cell from ten seconds ago,
// so a win is a timed revisit, not a second player (2026-10-20).
// The floor stays open: the read is the two plates and the delay.

import { mulberry32 } from "./daily";

export const GAME_ID = "delay-cursor";
export const SIZE = 5;
export const DELAY = 10;
export const LIMIT = 45;

export type Dir = "n" | "e" | "s" | "w";
export type Move = Dir | "stay";
export type Phase = "ready" | "play" | "won" | "lost";

export interface Puzzle {
  seed: number;
  grid: number[];
  start: number;
  livePlate: number;
  ghostPlate: number;
}

export interface Run {
  puzzle: Puzzle;
  phase: Phase;
  at: number;
  history: number[];
  elapsed: number;
}

const DELTA: Record<Dir, number> = { n: -SIZE, e: 1, s: SIZE, w: -1 };

function inside(index: number, delta: number): boolean {
  const next = index + delta;
  if (next < 0 || next >= SIZE * SIZE) return false;
  const col = index % SIZE;
  if (delta === -1 && col === 0) return false;
  if (delta === 1 && col === SIZE - 1) return false;
  return true;
}

function manhattan(a: number, b: number): number {
  return Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) + Math.abs((a % SIZE) - (b % SIZE));
}

function fallback(seed: number): Puzzle {
  const grid = new Array<number>(SIZE * SIZE).fill(0);
  return { seed, grid, start: 12, ghostPlate: 4, livePlate: 20 };
}

export function createPuzzle(seed: number): Puzzle {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0xd1a7c0de);
  const cells = SIZE * SIZE;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const start = Math.floor(rng() * cells);
    const ghostPlate = Math.floor(rng() * cells);
    const livePlate = Math.floor(rng() * cells);
    if (new Set([start, ghostPlate, livePlate]).size !== 3) continue;
    const gap = manhattan(ghostPlate, livePlate);
    if (gap < 5 || gap > DELAY) continue;
    const grid = new Array<number>(cells).fill(0);
    return { seed: mixed, grid, start, ghostPlate, livePlate };
  }
  return fallback(mixed);
}

export function createRun(puzzle: Puzzle): Run {
  return { puzzle, phase: "ready", at: puzzle.start, history: [puzzle.start], elapsed: 0 };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

export function ghostAt(run: Run): number {
  if (run.elapsed < DELAY) return run.history[0] as number;
  return run.history[run.elapsed - DELAY] as number;
}

export function tick(run: Run, move: Move): Run {
  if (run.phase !== "play") return run;
  let next = run.at;
  if (move !== "stay") {
    const delta = DELTA[move];
    if (!inside(run.at, delta)) return run;
    const candidate = run.at + delta;
    if (run.puzzle.grid[candidate] !== 0) return run;
    next = candidate;
  }
  const elapsed = run.elapsed + 1;
  const history = [...run.history, next];
  const ghost = elapsed < DELAY ? (history[0] as number) : (history[elapsed - DELAY] as number);
  let phase: Phase = "play";
  if (elapsed >= DELAY && next === run.puzzle.livePlate && ghost === run.puzzle.ghostPlate) phase = "won";
  else if (elapsed >= LIMIT) phase = "lost";
  return { ...run, at: next, history, elapsed, phase };
}
