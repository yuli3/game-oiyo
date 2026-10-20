// Daily ghost composer. The ghost is the last few notes, not another player.
// It never names its habit. The first note only teaches, and a point lands
// only when the next note is not the one that habit expected (2026-10-21).

import { mulberry32 } from "./daily";

export const GAME_ID = "ghost-composer";
export const BEATS = 8;
export const NEED = 5;
export const NOTES = [0, 1] as const;
export const RULES = ["echo", "gap", "flip"] as const;

export type Note = (typeof NOTES)[number];
export type Rule = (typeof RULES)[number];
export type Phase = "ready" | "play" | "won" | "lost";

export interface Puzzle {
  seed: number;
  rule: Rule;
}

export interface Run {
  puzzle: Puzzle;
  phase: Phase;
  notes: Note[];
  breaks: number;
  lastExpected: Note | null;
  lastBroke: boolean;
}

export function createPuzzle(seed: number): Puzzle {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0x6c057000);
  const rule = RULES[Math.floor(rng() * RULES.length)] ?? "echo";
  return { seed: mixed, rule };
}

export function createRun(puzzle: Puzzle): Run {
  return { puzzle, phase: "ready", notes: [], breaks: 0, lastExpected: null, lastBroke: false };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

export function predict(rule: Rule, notes: readonly Note[]): Note | null {
  if (notes.length === 0) return null;
  const last = notes[notes.length - 1] ?? 0;
  if (rule === "echo") return last;
  if (rule === "flip") return last === 0 ? 1 : 0;
  const earlier = notes[notes.length - 2];
  return earlier ?? last;
}

export function play(run: Run, note: Note): Run {
  if (run.phase !== "play" || run.notes.length >= BEATS) return run;
  const expected = predict(run.puzzle.rule, run.notes);
  const broke = expected !== null && expected !== note;
  const notes = [...run.notes, note];
  const breaks = run.breaks + (broke ? 1 : 0);
  const left = BEATS - notes.length;
  const next = { ...run, notes, breaks, lastExpected: expected, lastBroke: broke };
  if (breaks >= NEED) return { ...next, phase: "won" };
  if (breaks + left < NEED || notes.length >= BEATS) return { ...next, phase: "lost" };
  return next;
}
