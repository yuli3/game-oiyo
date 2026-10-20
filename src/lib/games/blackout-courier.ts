// Daily blackout courier. Lights freeze the clock so the player can memorize.
// Walking is allowed only while the map is dark, and every hidden cell is drawn
// the same so the street shape cannot leak (2026-10-20).

import { mulberry32, shuffle } from "./daily";

export const GAME_ID = "blackout-courier";
export const SIZE = 7;
export const DARK_SECONDS = 5;
export const MOVE_SLACK = 6;

const PATH_LEN = 16;
const EXTRA_ROADS = 5;
const MIN_ROUTE = 10;

export type Dir = "n" | "e" | "s" | "w";
export type Phase = "plan" | "dark" | "won" | "lost";

export interface Puzzle {
  seed: number;
  grid: number[];
  start: number;
  drops: [number, number, number];
  moveCap: number;
}

export interface Run {
  puzzle: Puzzle;
  phase: Phase;
  at: number;
  nextDrop: number;
  moves: number;
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

function neighborIndexes(index: number): number[] {
  const out: number[] = [];
  for (const delta of Object.values(DELTA)) {
    if (inside(index, delta)) out.push(index + delta);
  }
  return out;
}

function distance(grid: readonly number[], from: number, to: number): number {
  if (from === to) return 0;
  const seen = new Array<number>(SIZE * SIZE).fill(-1);
  const queue = [from];
  seen[from] = 0;
  for (let head = 0; head < queue.length; head += 1) {
    const here = queue[head] as number;
    const soFar = seen[here] as number;
    for (const next of neighborIndexes(here)) {
      if (grid[next] !== 0 || seen[next] !== -1) continue;
      seen[next] = soFar + 1;
      if (next === to) return soFar + 1;
      queue.push(next);
    }
  }
  return Number.POSITIVE_INFINITY;
}

function routeLength(grid: readonly number[], start: number, drops: readonly number[]): number {
  let total = distance(grid, start, drops[0] as number);
  for (let i = 1; i < drops.length; i += 1) {
    total += distance(grid, drops[i - 1] as number, drops[i] as number);
  }
  return total;
}

function carve(rng: () => number): number[] | null {
  const start = Math.floor(rng() * SIZE * SIZE);
  const path = [start];
  const seen = new Set<number>([start]);
  const options: number[][] = [shuffle(neighborIndexes(start), rng)];
  let guard = 0;
  while (path.length < PATH_LEN && path.length > 0 && guard < 2500) {
    guard += 1;
    const opts = options[options.length - 1] as number[];
    const next = opts.pop();
    if (next === undefined) {
      const dead = path.pop() as number;
      seen.delete(dead);
      options.pop();
      continue;
    }
    if (seen.has(next)) continue;
    path.push(next);
    seen.add(next);
    options.push(shuffle(neighborIndexes(next), rng));
  }
  return path.length === PATH_LEN ? path : null;
}

function tryBuild(seed: number, rng: () => number): Puzzle | null {
  const path = carve(rng);
  if (!path) return null;
  const grid = new Array<number>(SIZE * SIZE).fill(1);
  for (const cell of path) grid[cell] = 0;
  let added = 0;
  let guard = 0;
  while (added < EXTRA_ROADS && guard < 80) {
    guard += 1;
    const from = path[Math.floor(rng() * path.length)] as number;
    const open = neighborIndexes(from).filter((cell) => grid[cell] === 1);
    if (open.length === 0) continue;
    grid[open[Math.floor(rng() * open.length)] as number] = 0;
    added += 1;
  }
  const drops: [number, number, number] = [path[5] as number, path[10] as number, path[15] as number];
  const start = path[0] as number;
  const length = routeLength(grid, start, drops);
  if (!Number.isFinite(length) || length < MIN_ROUTE) return null;
  return { seed, grid, start, drops, moveCap: length + MOVE_SLACK };
}

function fallbackPuzzle(seed: number): Puzzle {
  const grid = new Array<number>(SIZE * SIZE).fill(1);
  for (let row = 0; row < SIZE; row += 2) {
    for (let col = 0; col < SIZE; col += 1) grid[row * SIZE + col] = 0;
    if (row + 1 < SIZE) {
      const col = (row / 2) % 2 === 0 ? SIZE - 1 : 0;
      grid[(row + 1) * SIZE + col] = 0;
    }
  }
  const start = 0;
  const drops: [number, number, number] = [6, 14, 45];
  const length = routeLength(grid, start, drops);
  return { seed, grid, start, drops, moveCap: length + MOVE_SLACK };
}

export function createPuzzle(seed: number): Puzzle {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0x5a17c0de);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const built = tryBuild(mixed, rng);
    if (built) return built;
  }
  return fallbackPuzzle(mixed);
}

export function createRun(puzzle: Puzzle): Run {
  return { puzzle, phase: "plan", at: puzzle.start, nextDrop: 0, moves: 0 };
}

/** Null means the whole map is visible. During a blackout only the courier cell is. */
export function visibleCells(run: Run): number[] | null {
  if (run.phase === "dark") return [run.at];
  return null;
}

export function extinguish(run: Run): Run {
  if (run.phase !== "plan") return run;
  return { ...run, phase: "dark" };
}

export function restore(run: Run): Run {
  if (run.phase !== "dark") return run;
  if (run.nextDrop >= run.puzzle.drops.length) return { ...run, phase: "won" };
  if (run.moves >= run.puzzle.moveCap) return { ...run, phase: "lost" };
  return { ...run, phase: "plan" };
}

export function step(run: Run, dir: Dir): Run {
  if (run.phase !== "dark") return run;
  const delta = DELTA[dir];
  if (!inside(run.at, delta)) return run;
  const next = run.at + delta;
  if (run.puzzle.grid[next] !== 0) return run;
  const moves = run.moves + 1;
  const nextDrop = next === run.puzzle.drops[run.nextDrop] ? run.nextDrop + 1 : run.nextDrop;
  if (nextDrop >= run.puzzle.drops.length) {
    return { ...run, at: next, moves, nextDrop, phase: "won" };
  }
  if (moves >= run.puzzle.moveCap) {
    return { ...run, at: next, moves, nextDrop, phase: "lost" };
  }
  return { ...run, at: next, moves, nextDrop };
}
