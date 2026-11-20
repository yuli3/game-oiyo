/**
 * Number Trail — original OIYO logic puzzle (2026-11-20).
 * Walk from the top-left cell to the bottom-right cell through orthogonal
 * neighbours, never reusing a cell, so the digits you pass add up to the target.
 * The generator lays a hidden path first and takes its sum as the target, so
 * every puzzle has at least one answer; any path that hits the target wins.
 */
export type TrailLevel = "easy" | "medium" | "hard";
export const TRAIL_SIZE: Record<TrailLevel, number> = { easy: 5, medium: 6, hard: 7 };

export interface TrailPuzzle {
  size: number;
  digits: number[];
  target: number;
  /** Length of the hidden path; shown as "par". */
  par: number;
  seed: number;
  level: TrailLevel;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailySeed(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function neighbours(i: number, size: number): number[] {
  const r = Math.floor(i / size);
  const c = i % size;
  const out: number[] = [];
  if (r > 0) out.push(i - size);
  if (c < size - 1) out.push(i + 1);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  return out;
}

export function isAdjacent(a: number, b: number, size: number): boolean {
  return neighbours(a, size).includes(b);
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Random self-avoiding path from 0 to size*size-1 whose length is in [min, max]. */
export function randomPath(size: number, rnd: () => number, min: number, max: number): number[] {
  const goal = size * size - 1;
  for (let attempt = 0; attempt < 400; attempt++) {
    const path = [0];
    const used = new Set([0]);
    let budget = 4000;
    const walk = (): boolean => {
      if (--budget < 0) return false;
      const here = path[path.length - 1];
      if (here === goal) return path.length >= min;
      if (path.length >= max) return false;
      for (const n of shuffle(neighbours(here, size), rnd)) {
        if (used.has(n)) continue;
        path.push(n);
        used.add(n);
        if (walk()) return true;
        path.pop();
        used.delete(n);
      }
      return false;
    };
    if (walk()) return path;
  }
  // Fallback: serpentine is always valid for odd/even sizes going right then down.
  const snake: number[] = [];
  for (let c = 0; c < size; c++) snake.push(c);
  for (let r = 1; r < size; r++) snake.push(r * size + size - 1);
  return snake;
}

export function createTrail(level: TrailLevel, seed: number): TrailPuzzle {
  const size = TRAIL_SIZE[level];
  const rnd = mulberry32(seed * 7919 + size);
  const digits = Array.from({ length: size * size }, () => 1 + Math.floor(rnd() * 9));
  const shortest = 2 * size - 1;
  const path = randomPath(size, rnd, shortest + 2, Math.floor(size * size * 0.6));
  const target = path.reduce((s, i) => s + digits[i], 0);
  return { size, digits, target, par: path.length, seed, level };
}

export type TrailStatus = "building" | "over" | "solved" | "short";

export function pathSum(p: TrailPuzzle, path: number[]): number {
  return path.reduce((s, i) => s + p.digits[i], 0);
}

/** Tap rule: extend from the end, tap the end to remove it, tap an earlier cell to cut back to it. */
export function tapCell(p: TrailPuzzle, path: number[], cell: number): number[] {
  if (path.length === 0) return cell === 0 ? [0] : path;
  const at = path.indexOf(cell);
  if (at === path.length - 1) return path.slice(0, -1);
  if (at >= 0) return path.slice(0, at + 1);
  const end = path[path.length - 1];
  if (end === p.size * p.size - 1) return path;
  if (!isAdjacent(end, cell, p.size)) return path;
  return [...path, cell];
}

export function trailStatus(p: TrailPuzzle, path: number[]): TrailStatus {
  const sum = pathSum(p, path);
  const end = path[path.length - 1];
  const atGoal = end === p.size * p.size - 1;
  if (sum > p.target) return "over";
  if (atGoal && sum === p.target) return "solved";
  if (atGoal) return "short";
  return "building";
}

export function isValidSolution(p: TrailPuzzle, path: number[]): boolean {
  if (path[0] !== 0 || path[path.length - 1] !== p.size * p.size - 1) return false;
  if (new Set(path).size !== path.length) return false;
  for (let i = 1; i < path.length; i++) if (!isAdjacent(path[i - 1], path[i], p.size)) return false;
  return pathSum(p, path) === p.target;
}
