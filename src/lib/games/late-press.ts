// Daily late press. The limit is never drawn. Earlier movements are feints,
// and the gap to the next movement is longer than the hidden window, so
// waiting to see if another feint comes is already too late (2026-10-21).

import { mulberry32 } from "./daily";

export const GAME_ID = "late-press";
export const ROUNDS = 5;
export const NEED = 3;
export const RULES = [1, 2, 3] as const;
export const GAP = 900;
export const WINDOW = 700;

export type Rule = (typeof RULES)[number];
export type Mark = "early" | "hit" | "late";
export type Phase = "ready" | "play" | "won" | "lost";

export interface Round {
  moves: number[];
  limit: number;
}

export interface Match {
  seed: number;
  rule: Rule;
  rounds: Round[];
}

export interface Run {
  match: Match;
  phase: Phase;
  index: number;
  marks: (Mark | null)[];
  hits: number;
}

export function createMatch(seed: number): Match {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0x1a7e0001);
  const rule = RULES[Math.floor(rng() * RULES.length)] ?? 2;
  const rounds: Round[] = [];
  for (let round = 0; round < ROUNDS; round += 1) {
    const jitter = Math.floor(rng() * 180);
    const moves = Array.from({ length: rule }, (_, step) => 800 + step * GAP + jitter);
    const real = moves[moves.length - 1] ?? 800;
    rounds.push({ moves, limit: real + WINDOW });
  }
  return { seed: mixed, rule, rounds };
}

export function createRun(match: Match): Run {
  return {
    match,
    phase: "ready",
    index: 0,
    marks: Array.from({ length: ROUNDS }, () => null),
    hits: 0,
  };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

export function realAt(round: Round): number {
  return round.moves[round.moves.length - 1] ?? 0;
}

export function press(run: Run, at: number): Run {
  if (run.phase !== "play" || run.index >= ROUNDS) return run;
  const round = run.match.rounds[run.index];
  if (!round) return run;
  const real = realAt(round);
  const mark: Mark = at <= real ? "early" : at <= round.limit ? "hit" : "late";
  return settle(run, mark);
}

export function expire(run: Run): Run {
  if (run.phase !== "play" || run.index >= ROUNDS) return run;
  const round = run.match.rounds[run.index];
  if (!round) return run;
  return press(run, round.limit + 1);
}

function settle(run: Run, mark: Mark): Run {
  const marks = run.marks.slice();
  marks[run.index] = mark;
  const hits = run.hits + (mark === "hit" ? 1 : 0);
  const next = run.index + 1;
  const left = ROUNDS - next;
  if (hits >= NEED) return { ...run, marks, hits, index: next, phase: "won" };
  if (hits + left < NEED || next >= ROUNDS) return { ...run, marks, hits, index: next, phase: "lost" };
  return { ...run, marks, hits, index: next, phase: "play" };
}
