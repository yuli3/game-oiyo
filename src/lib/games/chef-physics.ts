// Daily chef physics. Wait raises heat and dries the piece, cool does the
// opposite, and one cut only slows the toss (2026-10-21). The texture is the
// bin of heat, moisture, and speed. Maxing the heat, or cutting at once,
// misses a dish a mixed order still plates. The puzzle stores the pan and
// the target, not the presses. The 20 second clock is play time, outside
// this model, so a reduced-motion setting cannot skip it.

export const GAME_ID = "chef-physics";
export const ROUNDS = 3;
export const CLOCK_MS = 20_000;

export type Texture = "crisp" | "moist" | "dry";
export type Act = "W" | "L" | "C" | "T";
export type Phase = "ready" | "play" | "won" | "lost";

export interface Dish {
  heat: number;
  moisture: number;
  target: Texture;
}

export interface Puzzle {
  seed: number;
  rounds: Dish[];
}

export interface Run {
  puzzle: Puzzle;
  phase: Phase;
  round: number;
  heat: number;
  moisture: number;
  cut: boolean;
  moves: number;
  kept: number;
}

export const DISHES: readonly Dish[] = [
  { heat: 1, moisture: 2, target: "crisp" },
  { heat: 0, moisture: 0, target: "dry" },
  { heat: 0, moisture: 1, target: "moist" },
  { heat: 2, moisture: 1, target: "crisp" },
  { heat: 2, moisture: 2, target: "dry" },
  { heat: 2, moisture: 0, target: "moist" },
];

function cloneDish(dish: Dish): Dish {
  return { heat: dish.heat, moisture: dish.moisture, target: dish.target };
}

export function texture(heat: number, moisture: number, cut: boolean): Texture | null {
  if (!cut && heat === 2 && moisture === 0) return "crisp";
  if (cut && heat === 1 && moisture === 1) return "moist";
  if (cut && heat === 2 && moisture === 0) return "dry";
  return null;
}

export function createPuzzle(seed: number): Puzzle {
  const mixed = seed >>> 0;
  const rounds = [0, 1, 2].map((offset) => cloneDish(DISHES[(mixed + offset * 5) % DISHES.length]!));
  return { seed: mixed, rounds };
}

export function createRun(puzzle: Puzzle): Run {
  const dish = puzzle.rounds[0]!;
  return {
    puzzle,
    phase: "ready",
    round: 0,
    heat: dish.heat,
    moisture: dish.moisture,
    cut: false,
    moves: 0,
    kept: 0,
  };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

export function act(run: Run, choice: Act): Run {
  if (run.phase !== "play") return run;
  if (choice === "C") {
    if (run.cut) return run;
    return { ...run, cut: true, moves: run.moves + 1 };
  }
  if (choice === "W") {
    return { ...run, heat: Math.min(2, run.heat + 1), moisture: Math.max(0, run.moisture - 1), moves: run.moves + 1 };
  }
  if (choice === "L") {
    return { ...run, heat: Math.max(0, run.heat - 1), moisture: Math.min(2, run.moisture + 1), moves: run.moves + 1 };
  }
  const plated = texture(run.heat, run.moisture, run.cut);
  if (plated !== run.puzzle.rounds[run.round]!.target) return { ...run, phase: "lost" };
  const kept = run.kept + 1;
  const round = run.round + 1;
  if (round >= run.puzzle.rounds.length) return { ...run, moves: run.moves + 1, kept, phase: "won" };
  const dish = run.puzzle.rounds[round]!;
  return {
    ...run,
    phase: "ready",
    round,
    heat: dish.heat,
    moisture: dish.moisture,
    cut: false,
    moves: 0,
    kept,
  };
}

export function expire(run: Run): Run {
  if (run.phase !== "play") return run;
  return { ...run, phase: "lost" };
}
