// Daily last pixel. The strip is the budget: a foothold spends a background
// pixel, and opening vision spends a body pixel (2026-10-21). Holes are one
// connected pair, so the open cells determine the rest. The puzzle stores
// that terrain, not the winning touches. Looking through every fog, or
// paving every unresolved cell, loses deals a mixed touch still clears.

export const GAME_ID = "last-pixel";
export const CELLS = 4;
export const ROUNDS = 3;

export type Face = "H" | "F";
export type Cell = Face | "?" | "P" | "B";
export type Act = "look" | "plank" | "leap";
export type Phase = "ready" | "play" | "won" | "lost";

export interface Deal {
  body: number;
  sky: number;
  cells: Face[];
  open: boolean[];
}

export interface Puzzle {
  seed: number;
  rounds: Deal[];
}

export interface Run {
  puzzle: Puzzle;
  phase: Phase;
  round: number;
  body: number;
  sky: number;
  row: Cell[];
  moves: number;
  kept: number;
}

export const DEALS: readonly Deal[] = [
  { body: 1, sky: 3, cells: ["F", "H", "H", "F"], open: [true, true, false, false] },
  { body: 1, sky: 3, cells: ["H", "H", "F", "F"], open: [false, false, true, false] },
  { body: 1, sky: 3, cells: ["H", "H", "F", "F"], open: [true, false, true, false] },
  { body: 1, sky: 3, cells: ["H", "H", "F", "F"], open: [false, true, true, false] },
  { body: 1, sky: 3, cells: ["H", "H", "F", "F"], open: [true, false, false, true] },
  { body: 2, sky: 1, cells: ["F", "F", "H", "H"], open: [true, false, false, true] },
  { body: 2, sky: 1, cells: ["F", "F", "H", "H"], open: [false, true, false, true] },
  { body: 2, sky: 1, cells: ["F", "H", "H", "F"], open: [false, false, true, true] },
  { body: 2, sky: 3, cells: ["H", "H", "F", "F"], open: [true, false, false, false] },
  { body: 2, sky: 3, cells: ["H", "H", "F", "F"], open: [false, false, true, false] },
  { body: 3, sky: 1, cells: ["F", "F", "H", "H"], open: [false, true, false, false] },
  { body: 3, sky: 1, cells: ["F", "F", "H", "H"], open: [false, false, false, true] },
];

function cloneDeal(deal: Deal): Deal {
  return { body: deal.body, sky: deal.sky, cells: [...deal.cells], open: [...deal.open] };
}

function rowOf(deal: Deal): Cell[] {
  return deal.cells.map((cell, index) => (deal.open[index] ? cell : "?"));
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
    body: deal.body,
    sky: deal.sky,
    row: rowOf(deal),
    moves: 0,
    kept: 0,
  };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

export function look(run: Run): Run {
  if (run.phase !== "play" || run.body <= 0) return run;
  const index = run.row.indexOf("?");
  if (index < 0) return run;
  const row = run.row.slice();
  row[index] = run.puzzle.rounds[run.round]!.cells[index]!;
  return { ...run, body: run.body - 1, row, moves: run.moves + 1 };
}

export function plank(run: Run): Run {
  if (run.phase !== "play" || run.sky <= 0) return run;
  const index = run.row.findIndex((cell) => cell === "?" || cell === "H");
  if (index < 0) return run;
  const row = run.row.slice();
  const under = run.puzzle.rounds[run.round]!.cells[index]!;
  if (row[index] === "?" && under === "F") {
    row[index] = "B";
    return { ...run, sky: run.sky - 1, row, moves: run.moves + 1, phase: "lost" };
  }
  row[index] = "P";
  return { ...run, sky: run.sky - 1, row, moves: run.moves + 1 };
}

export function leap(run: Run): Run {
  if (run.phase !== "play") return run;
  if (run.row.includes("?") || run.row.includes("B") || holeRun(run.row) > run.body) {
    return { ...run, phase: "lost" };
  }
  const kept = run.kept + run.body + run.sky;
  const round = run.round + 1;
  if (round >= run.puzzle.rounds.length) return { ...run, kept, phase: "won" };
  const deal = run.puzzle.rounds[round]!;
  return {
    ...run,
    phase: "ready",
    round,
    body: deal.body,
    sky: deal.sky,
    row: rowOf(deal),
    moves: 0,
    kept,
  };
}

export function expire(run: Run): Run {
  if (run.phase !== "play") return run;
  return { ...run, phase: "lost" };
}

function holeRun(row: Cell[]): number {
  let best = 0;
  let run = 0;
  for (const cell of row) {
    if (cell === "H") {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}
