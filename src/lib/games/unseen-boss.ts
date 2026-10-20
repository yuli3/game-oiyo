// Daily unseen boss. The body never appears. Four shakes name one rule, and
// the fifth shake confirms or disproves the guess (2026-10-20).

import { mulberry32 } from "./daily";

export const GAME_ID = "unseen-boss";
export const LANES = [0, 1, 2] as const;
export const RULES = ["stay", "step", "mirror"] as const;
export const SHOWN = 4;
export const MISSES = 2;

export type Lane = (typeof LANES)[number];
export type Rule = (typeof RULES)[number];
export type Phase = "ready" | "watch" | "ask" | "won" | "lost";

export interface Puzzle {
  seed: number;
  rule: Rule;
  beats: Lane[];
}

export interface Run {
  puzzle: Puzzle;
  phase: Phase;
  seen: number;
  misses: number;
  lastGuess: Rule | null;
}

export function nextLane(rule: Rule, lane: Lane): Lane {
  if (rule === "stay") return lane;
  if (rule === "step") return ((lane + 1) % 3) as Lane;
  return (2 - lane) as Lane;
}

export function explains(rule: Rule, beats: readonly Lane[]): boolean {
  for (let index = 1; index < beats.length; index += 1) {
    if (nextLane(rule, beats[index - 1]) !== beats[index]) return false;
  }
  return true;
}

function build(rule: Rule, start: Lane): Lane[] {
  const beats: Lane[] = [start];
  for (let index = 1; index < SHOWN + 1; index += 1) beats.push(nextLane(rule, beats[index - 1]));
  return beats;
}

export function createPuzzle(seed: number): Puzzle {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0xb0550001);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const rule = RULES[Math.floor(rng() * RULES.length)] ?? "step";
    const start = Math.floor(rng() * LANES.length) as Lane;
    const beats = build(rule, start);
    const fit = RULES.filter((item) => explains(item, beats.slice(0, SHOWN)));
    if (fit.length === 1 && fit[0] === rule) return { seed: mixed, rule, beats };
  }
  return { seed: mixed, rule: "step", beats: [0, 1, 2, 0, 1] };
}

export function createRun(puzzle: Puzzle): Run {
  return { puzzle, phase: "ready", seen: 0, misses: 0, lastGuess: null };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "watch" };
}

export function reveal(run: Run): Run {
  if (run.phase !== "watch") return run;
  const seen = run.seen + 1;
  if (seen >= SHOWN) return { ...run, seen: SHOWN, phase: "ask" };
  return { ...run, seen };
}

export function guess(run: Run, rule: Rule): Run {
  if (run.phase !== "ask") return run;
  if (rule === run.puzzle.rule) return { ...run, lastGuess: rule, phase: "won" };
  const misses = run.misses + 1;
  if (misses >= MISSES) return { ...run, lastGuess: rule, misses, phase: "lost" };
  return { ...run, lastGuess: rule, misses };
}

export function forecast(rule: Rule, beats: readonly Lane[]): Lane {
  return nextLane(rule, beats[SHOWN - 1]);
}

// The first shake index, counting from 0, where a rule stops matching.
// A wrong rule breaks inside the four shown shakes (2026-10-20).
export function breakIndex(rule: Rule, beats: readonly Lane[]): number | null {
  for (let index = 1; index < beats.length; index += 1) {
    if (nextLane(rule, beats[index - 1]) !== beats[index]) return index;
  }
  return null;
}
