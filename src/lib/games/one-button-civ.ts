// Daily one-button realm. The button never names a policy. The land shows
// the result of a press, and only after the player has already started the
// next season, so knowing the three timings is not enough to clear the row
// (2026-10-21).

import { mulberry32, shuffle } from "./daily";

export const GAME_ID = "one-button-civ";
export const PLOTS = 4;
export const GESTURES = ["tap", "hold", "rest"] as const;
export const POLICIES = ["field", "wall", "road"] as const;

export type Gesture = (typeof GESTURES)[number];
export type Policy = (typeof POLICIES)[number];
export type Phase = "ready" | "play" | "won" | "lost";

export interface Puzzle {
  seed: number;
  map: Record<Gesture, Policy>;
  target: Policy[];
}

export interface Run {
  puzzle: Puzzle;
  phase: Phase;
  cursor: number;
  committed: (Gesture | null)[];
}

export function createPuzzle(seed: number): Puzzle {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0x0b170001);
  const assigned = shuffle(POLICIES, rng);
  const map: Record<Gesture, Policy> = {
    tap: assigned[0] ?? "field",
    hold: assigned[1] ?? "wall",
    rest: assigned[2] ?? "road",
  };
  const extra = POLICIES[Math.floor(rng() * POLICIES.length)] ?? "field";
  const target = shuffle([...POLICIES, extra], rng);
  return { seed: mixed, map, target };
}

export function createRun(puzzle: Puzzle): Run {
  return {
    puzzle,
    phase: "ready",
    cursor: 0,
    committed: Array.from({ length: PLOTS }, () => null),
  };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

export function commit(run: Run, gesture: Gesture): Run {
  if (run.phase !== "play" || run.cursor >= PLOTS) return run;
  const committed = run.committed.slice();
  committed[run.cursor] = gesture;
  const cursor = run.cursor + 1;
  if (cursor < PLOTS) return { ...run, committed, cursor };
  const won = committed.every((item, index) => item !== null && run.puzzle.map[item] === run.puzzle.target[index]);
  return { ...run, committed, cursor, phase: won ? "won" : "lost" };
}

/** The policy already committed on a plot. Null until that plot is filled. */
export function resolved(run: Run, index: number): Policy | null {
  if (index < 0 || index >= run.cursor) return null;
  const gesture = run.committed[index];
  if (!gesture) return null;
  return run.puzzle.map[gesture];
}

export function matched(run: Run): number {
  let count = 0;
  for (let index = 0; index < PLOTS; index += 1) {
    if (resolved(run, index) === run.puzzle.target[index]) count += 1;
  }
  return count;
}
