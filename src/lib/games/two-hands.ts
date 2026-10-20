// Daily two-hand deal. Each hand fills its own leftmost hole, and that plank
// flips the paired cell on the other hand (2026-10-21). The rows are the
// budget: one body cell can jump one hole, and background cells are the
// shared planks. Emptying one hand, or always mending the longer row, loses
// deals a mixed order still clears. The puzzle stores the rows, not the touches.

export const GAME_ID = "two-hands";
export const CELLS = 4;
export const ROUNDS = 3;
export const BODY = 1;

export type Face = "H" | "F";
export type Hand = "L" | "R";
export type Act = Hand | "E";
export type Phase = "ready" | "play" | "won" | "lost";

export interface Deal {
  sky: number;
  top: Face[];
  bottom: Face[];
}

export interface Puzzle {
  seed: number;
  rounds: Deal[];
}

export interface Run {
  puzzle: Puzzle;
  phase: Phase;
  round: number;
  top: Face[];
  bottom: Face[];
  sky: number;
  moves: number;
  kept: number;
}

export const DEALS: readonly Deal[] = [
  { sky: 2, top: ["H", "H", "H", "F"], bottom: ["F", "F", "H", "H"] },
  { sky: 2, top: ["F", "F", "H", "H"], bottom: ["H", "H", "H", "F"] },
  { sky: 2, top: ["F", "F", "H", "H"], bottom: ["H", "H", "H", "H"] },
  { sky: 2, top: ["H", "H", "H", "H"], bottom: ["F", "F", "H", "H"] },
  { sky: 3, top: ["F", "F", "H", "F"], bottom: ["H", "H", "H", "F"] },
  { sky: 3, top: ["F", "F", "H", "F"], bottom: ["H", "H", "H", "H"] },
  { sky: 3, top: ["H", "H", "H", "F"], bottom: ["F", "F", "H", "F"] },
  { sky: 3, top: ["F", "F", "F", "H"], bottom: ["F", "H", "H", "H"] },
  { sky: 3, top: ["F", "H", "F", "H"], bottom: ["H", "H", "H", "F"] },
  { sky: 3, top: ["H", "H", "F", "H"], bottom: ["F", "H", "H", "F"] },
  { sky: 3, top: ["H", "F", "H", "H"], bottom: ["F", "H", "H", "H"] },
  { sky: 3, top: ["F", "H", "H", "H"], bottom: ["F", "F", "F", "H"] },
  { sky: 3, top: ["F", "H", "H", "H"], bottom: ["H", "F", "H", "H"] },
  { sky: 3, top: ["H", "H", "H", "H"], bottom: ["F", "F", "H", "F"] },
];

function cloneDeal(deal: Deal): Deal {
  return { sky: deal.sky, top: [...deal.top], bottom: [...deal.bottom] };
}

export function holeRun(cells: readonly Face[]): number {
  let best = 0;
  let run = 0;
  for (const cell of cells) {
    if (cell === "H") {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function flipped(cells: readonly Face[], index: number): Face[] {
  const next = cells.slice();
  next[index] = next[index] === "H" ? "F" : "H";
  return next;
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
    top: [...deal.top],
    bottom: [...deal.bottom],
    sky: deal.sky,
    moves: 0,
    kept: 0,
  };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

export function help(run: Run, hand: Hand): Run {
  if (run.phase !== "play" || run.sky <= 0) return run;
  const own = hand === "L" ? run.top : run.bottom;
  const index = own.indexOf("H");
  if (index < 0) return run;
  const filled = own.slice();
  filled[index] = "F";
  if (hand === "L") {
    return { ...run, top: filled, bottom: flipped(run.bottom, index), sky: run.sky - 1, moves: run.moves + 1 };
  }
  return { ...run, bottom: filled, top: flipped(run.top, index), sky: run.sky - 1, moves: run.moves + 1 };
}

export function cross(run: Run): Run {
  if (run.phase !== "play") return run;
  if (holeRun(run.top) > BODY || holeRun(run.bottom) > BODY) return { ...run, phase: "lost" };
  const kept = run.kept + run.sky;
  const round = run.round + 1;
  if (round >= run.puzzle.rounds.length) return { ...run, kept, phase: "won" };
  const deal = run.puzzle.rounds[round]!;
  return {
    ...run,
    phase: "ready",
    round,
    top: [...deal.top],
    bottom: [...deal.bottom],
    sky: deal.sky,
    moves: 0,
    kept,
  };
}

export function expire(run: Run): Run {
  if (run.phase !== "play") return run;
  return { ...run, phase: "lost" };
}
