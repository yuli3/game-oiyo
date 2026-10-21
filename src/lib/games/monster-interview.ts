// Daily monster interview. Hire inverts the standard, reject slides it by
// the candidate, and hold leaves it (2026-10-21). Each answer is legal only
// inside its distance band, and each answer is used once. Preferring hire,
// hold, or reject whenever it is legal loses at least one round of the day.
// The puzzle stores the seats, not the presses.

export const GAME_ID = "monster-interview";
export const ROUNDS = 3;

export type Answer = "H" | "W" | "R";
export type Phase = "ready" | "play" | "won" | "lost";

export interface Deal {
  standard: number;
  seats: readonly [number, number, number];
}

export interface Puzzle {
  seed: number;
  rounds: Deal[];
}

export interface Run {
  puzzle: Puzzle;
  phase: Phase;
  round: number;
  standard: number;
  seats: readonly [number, number, number];
  used: Answer[];
  moves: number;
  kept: number;
}

export const DEALS: readonly Deal[] = [
  { standard: 1, seats: [0, 1, 2] },
  { standard: 0, seats: [1, 3, 2] },
  { standard: 1, seats: [3, 0, 2] },
  { standard: 1, seats: [3, 1, 2] },
  { standard: 0, seats: [2, 3, 1] },
  { standard: 1, seats: [3, 2, 0] },
  { standard: 2, seats: [0, 2, 1] },
  { standard: 1, seats: [0, 2, 1] },
  { standard: 2, seats: [3, 0, 1] },
];

export function cells(value: number): readonly [0 | 1, 0 | 1] {
  return [value & 1 ? 1 : 0, value & 2 ? 1 : 0];
}

export function distance(left: number, right: number): number {
  const a = cells(left);
  const b = cells(right);
  return (a[0] === b[0] ? 0 : 1) + (a[1] === b[1] ? 0 : 1);
}

export function legal(answer: Answer, gap: number): boolean {
  if (answer === "H") return gap <= 1;
  if (answer === "W") return gap === 1;
  return gap >= 1;
}

function cloneDeal(deal: Deal): Deal {
  return { standard: deal.standard, seats: [deal.seats[0], deal.seats[1], deal.seats[2]] };
}

export function createPuzzle(seed: number): Puzzle {
  const mixed = seed >>> 0;
  const rounds = [0, 1, 2].map((offset) => cloneDeal(DEALS[(mixed + offset * 5) % DEALS.length]!));
  return { seed: mixed, rounds };
}

export function createRun(puzzle: Puzzle): Run {
  const deal = puzzle.rounds[0]!;
  return {
    puzzle,
    phase: "ready",
    round: 0,
    standard: deal.standard,
    seats: deal.seats,
    used: [],
    moves: 0,
    kept: 0,
  };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

function shifted(standard: number, seat: number, answer: Answer): number {
  if (answer === "H") return standard ^ 3;
  if (answer === "R") return standard ^ seat;
  return standard;
}

export function answer(run: Run, choice: Answer): Run {
  if (run.phase !== "play" || run.used.includes(choice) || run.used.length >= 3) return run;
  const seat = run.seats[run.used.length]!;
  if (!legal(choice, distance(seat, run.standard))) return { ...run, phase: "lost" };
  const used = [...run.used, choice];
  const standard = shifted(run.standard, seat, choice);
  const moves = run.moves + 1;
  if (used.length < 3) return { ...run, standard, used, moves };
  const kept = run.kept + 1;
  const round = run.round + 1;
  if (round >= run.puzzle.rounds.length) return { ...run, standard, used, moves, kept, phase: "won" };
  const deal = run.puzzle.rounds[round]!;
  return {
    ...run,
    phase: "ready",
    round,
    standard: deal.standard,
    seats: deal.seats,
    used: [],
    moves: 0,
    kept,
  };
}

export function expire(run: Run): Run {
  if (run.phase !== "play") return run;
  return { ...run, phase: "lost" };
}
