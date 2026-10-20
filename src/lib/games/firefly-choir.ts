// Daily firefly choir. Six flies, three hidden periods, two flies each.
// A pair starts sounding on the next beat, so the blink that reveals a group
// is not itself a point. Waiting for that group's own confirming blink spends
// the last beat that could have reached eleven (2026-10-21).
// Periods 3, 4, and 5 over 20 beats: only the true pairing reaches 11, and
// only if it is locked before beat 5. Any other pairing stays at 10 or below
// even when locked on beat 0.

import { mulberry32, shuffle } from "./daily";

export const GAME_ID = "firefly-choir";
export const TICKS = 20;
export const NEED = 11;
export const FLIES = 6;
export const PERIODS = [3, 4, 5] as const;

export type Period = (typeof PERIODS)[number];
export type Phase = "ready" | "play" | "won" | "lost";

export interface Fly {
  period: Period;
}

export interface Puzzle {
  seed: number;
  flies: Fly[];
}

export interface Run {
  puzzle: Puzzle;
  phase: Phase;
  tick: number;
  pending: number | null;
  partner: (number | null)[];
  starts: (number | null)[];
  sounds: number;
  lastSung: number;
}

export function createPuzzle(seed: number): Puzzle {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0xf1ae0001);
  const bag = shuffle<Period>([3, 3, 4, 4, 5, 5], rng);
  return { seed: mixed, flies: bag.map((period) => ({ period })) };
}

export function createRun(puzzle: Puzzle): Run {
  return {
    puzzle,
    phase: "ready",
    tick: 0,
    pending: null,
    partner: Array.from({ length: FLIES }, () => null),
    starts: Array.from({ length: FLIES }, () => null),
    sounds: 0,
    lastSung: 0,
  };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

export function blinks(period: number, tick: number): boolean {
  return tick >= 0 && tick % period === 0;
}

export function pair(run: Run, index: number): Run {
  if (run.phase !== "play" || index < 0 || index >= FLIES) return run;
  const other = run.partner[index];
  if (other !== null) {
    const start = run.starts[index];
    if (start === null || start <= run.tick) return run;
    const partner = run.partner.slice();
    const starts = run.starts.slice();
    partner[index] = null;
    partner[other] = null;
    starts[index] = null;
    starts[other] = null;
    return { ...run, partner, starts, pending: null };
  }
  if (run.pending === null) return { ...run, pending: index };
  if (run.pending === index) return { ...run, pending: null };
  const pending = run.pending;
  if (run.partner[pending] !== null) return { ...run, pending: null };
  const partner = run.partner.slice();
  const starts = run.starts.slice();
  const at = run.tick + 1;
  partner[index] = pending;
  partner[pending] = index;
  starts[index] = at;
  starts[pending] = at;
  return { ...run, partner, starts, pending: null };
}

export function advance(run: Run): Run {
  if (run.phase !== "play") return run;
  const sung = sing(run, run.tick);
  const sounds = run.sounds + sung;
  const scored = { ...run, sounds, lastSung: sung };
  if (sounds >= NEED) return { ...scored, phase: "won" };
  const upcoming = run.tick + 1;
  if (upcoming >= TICKS || ceiling(scored, upcoming) < NEED) return { ...scored, phase: "lost" };
  return { ...scored, tick: upcoming };
}

function sing(run: Run, tick: number): number {
  let count = 0;
  for (let index = 0; index < FLIES; index += 1) {
    const other = run.partner[index];
    if (other === null || other < index) continue;
    const start = run.starts[index];
    if (start === null || start > tick) continue;
    const left = run.puzzle.flies[index]?.period ?? 0;
    const right = run.puzzle.flies[other]?.period ?? 0;
    if (tick % left === 0 && tick % right === 0) count += 1;
  }
  return count;
}

function ceiling(run: Run, from: number): number {
  const used = new Set<number>();
  let locked = 0;
  for (let index = 0; index < FLIES; index += 1) {
    const other = run.partner[index];
    if (other === null || used.has(index)) continue;
    used.add(index);
    used.add(other);
    const start = run.starts[index] ?? from;
    const left = run.puzzle.flies[index]?.period ?? 0;
    const right = run.puzzle.flies[other]?.period ?? 0;
    locked += coincidences(left, right, Math.max(start, from), TICKS);
  }
  const free = run.puzzle.flies.filter((_, index) => !used.has(index)).map((fly) => fly.period);
  return run.sounds + locked + best(free, from);
}

function coincidences(left: number, right: number, from: number, to: number): number {
  let count = 0;
  for (let tick = from; tick < to; tick += 1) {
    if (tick % left === 0 && tick % right === 0) count += 1;
  }
  return count;
}

function best(periods: number[], from: number): number {
  if (periods.length < 2) return 0;
  let max = 0;
  for (let index = 1; index < periods.length; index += 1) {
    const rest = periods.filter((_, cursor) => cursor !== 0 && cursor !== index);
    const got = coincidences(periods[0] ?? 0, periods[index] ?? 0, from, TICKS) + best(rest, from);
    if (got > max) max = got;
  }
  return max;
}
