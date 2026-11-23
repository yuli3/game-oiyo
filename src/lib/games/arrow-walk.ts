/**
 * Arrow Walk — original OIYO logic puzzle (2026-11-20).
 * Every cell holds an arrow. Rotate arrows so that walking from the start cell
 * and following them visits every cell exactly once and stops on the goal.
 * The generator builds a hidden route that covers the grid (backbite moves on a
 * Hamiltonian path), points each arrow along it, then turns the free arrows.
 */
import { mulberry32 } from "./number-trail";

export type WalkLevel = "easy" | "medium" | "hard";
export const WALK_SIZE: Record<WalkLevel, number> = { easy: 4, medium: 5, hard: 6 };
const LOCKED_SHARE: Record<WalkLevel, number> = { easy: 0.4, medium: 0.25, hard: 0.12 };

/** 0 up, 1 right, 2 down, 3 left. */
export type Dir = 0 | 1 | 2 | 3;
export const DR = [-1, 0, 1, 0];
export const DC = [0, 1, 0, -1];

export interface WalkPuzzle {
  size: number;
  start: number;
  goal: number;
  /** Arrow direction per cell; the goal cell's value is ignored. */
  arrows: Dir[];
  locked: boolean[];
  solution: Dir[];
  seed: number;
  level: WalkLevel;
}

function nbrs(i: number, size: number): number[] {
  const r = Math.floor(i / size), c = i % size, out: number[] = [];
  if (r > 0) out.push(i - size);
  if (c < size - 1) out.push(i + 1);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  return out;
}

export function dirBetween(a: number, b: number, size: number): Dir {
  if (b === a - size) return 0;
  if (b === a + 1) return 1;
  if (b === a + size) return 2;
  return 3;
}

/** Hamiltonian path on the grid, randomised by backbite moves from a serpentine. */
export function hamiltonianPath(size: number, rnd: () => number, moves = size * size * 40): number[] {
  let path: number[] = [];
  for (let r = 0; r < size; r++) for (let k = 0; k < size; k++) path.push(r * size + (r % 2 === 0 ? k : size - 1 - k));
  for (let m = 0; m < moves; m++) {
    if (rnd() < 0.5) path.reverse();
    // backbite at the tail end
    const end = path[path.length - 1];
    const pos = new Map(path.map((v, i) => [v, i]));
    const options = nbrs(end, size).filter((n) => n !== path[path.length - 2]);
    if (options.length === 0) continue;
    const pick = options[Math.floor(rnd() * options.length)];
    const i = pos.get(pick)!;
    path = [...path.slice(0, i + 1), ...path.slice(i + 1).reverse()];
  }
  return path;
}

export function createWalk(level: WalkLevel, seed: number): WalkPuzzle {
  const size = WALK_SIZE[level];
  const rnd = mulberry32(seed * 104729 + size);
  const route = hamiltonianPath(size, rnd);
  const solution: Dir[] = new Array(size * size).fill(0);
  for (let k = 0; k < route.length - 1; k++) solution[route[k]] = dirBetween(route[k], route[k + 1], size);
  const start = route[0];
  const goal = route[route.length - 1];
  const locked = solution.map((_, i) => i === goal || i === start ? false : rnd() < LOCKED_SHARE[level]);
  locked[goal] = true;
  const arrows = solution.map((d, i) => (locked[i] ? d : (((d + 1 + Math.floor(rnd() * 3)) % 4) as Dir)));
  return { size, start, goal, arrows, locked, solution, seed, level };
}

export interface Trace {
  cells: number[];
  /** "goal" only when the walk ends on the goal; "full" when it also covered every cell. */
  end: "edge" | "loop" | "goal" | "full";
}

export function traceWalk(p: WalkPuzzle, arrows: Dir[] = p.arrows): Trace {
  const seen = new Set<number>();
  const cells: number[] = [];
  let at = p.start;
  for (;;) {
    if (seen.has(at)) return { cells, end: "loop" };
    seen.add(at);
    cells.push(at);
    if (at === p.goal) return { cells, end: cells.length === p.size * p.size ? "full" : "goal" };
    const d = arrows[at];
    const r = Math.floor(at / p.size) + DR[d];
    const c = (at % p.size) + DC[d];
    if (r < 0 || c < 0 || r >= p.size || c >= p.size) return { cells, end: "edge" };
    at = r * p.size + c;
  }
}

export function rotate(p: WalkPuzzle, arrows: Dir[], cell: number, by = 1): Dir[] {
  if (p.locked[cell]) return arrows;
  const next = arrows.slice();
  next[cell] = (((next[cell] + by) % 4) + 4) % 4 as Dir;
  return next;
}

export function isSolved(p: WalkPuzzle, arrows: Dir[]): boolean {
  return traceWalk(p, arrows).end === "full";
}

/** A free cell whose arrow differs from the hidden route, earliest along the current trace first. */
export function hintCell(p: WalkPuzzle, arrows: Dir[]): number | null {
  const trace = traceWalk(p, arrows).cells;
  for (const c of trace) if (c !== p.goal && !p.locked[c] && arrows[c] !== p.solution[c]) return c;
  const i = arrows.findIndex((d, c) => c !== p.goal && !p.locked[c] && d !== p.solution[c]);
  return i < 0 ? null : i;
}

/** Stage campaign (2026-11-23): 30 fixed boards, 4×4 → 5×5 → 6×6. */
export const WALK_STAGES = 30;
export function walkStage(index: number): { level: WalkLevel; seed: number } {
  const i = Math.max(0, Math.min(WALK_STAGES - 1, Math.floor(index)));
  return { level: i < 10 ? "easy" : i < 20 ? "medium" : "hard", seed: 31000 + i * 17 };
}
