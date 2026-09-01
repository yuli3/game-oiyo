export const WATER_SORT_CAPACITY = 4;
export const WATER_SORT_COLOR_COUNT = 5;
export const WATER_SORT_TUBE_COUNT = 7;

export type WaterSortDifficulty = "easy" | "medium" | "hard";
export interface WaterSortMove { from: number; to: number }
export interface WaterSortState {
  tubes: number[][];
  seed: number;
  difficulty: WaterSortDifficulty;
  rngState: number;
  moves: number;
  status: "playing" | "solved";
}

// Each accepted step is an inverse-safe structural split, not a cosmetic swap.
// With five colors, 6/10/14 splits create meaningful depth without exhausting
// the finite set of reversible layouts.
const SCRAMBLE_STEPS: Record<WaterSortDifficulty, number> = { easy: 6, medium: 10, hard: 14 };
const UINT32_RANGE = 0x1_0000_0000;

function nextUint32(state: number): number {
  let value = state >>> 0;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  return value >>> 0;
}

function randomInt(state: number, max: number): [number, number] {
  const next = nextUint32(state || 0x9e37_79b9);
  return [Math.floor((next / UINT32_RANGE) * max), next];
}

const cloneTubes = (tubes: number[][]) => tubes.map((tube) => tube.slice());
const sameTubes = (a: number[][], b: number[][]) => a.every((tube, index) => tube.length === b[index].length && tube.every((color, layer) => color === b[index][layer]));

export function topGroupSize(tube: number[]): number {
  if (tube.length === 0) return 0;
  const color = tube[tube.length - 1];
  let size = 1;
  while (size < tube.length && tube[tube.length - 1 - size] === color) size += 1;
  return size;
}

export function pouredLayerCount(before: readonly number[][], after: readonly number[][], to: number): number {
  if (!Number.isInteger(to) || to < 0 || to >= before.length || to >= after.length) return 0;
  return Math.max(0, after[to].length - before[to].length);
}

export function pourWater(tubes: number[][], from: number, to: number): number[][] | null {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to || from < 0 || to < 0 || from >= tubes.length || to >= tubes.length) return null;
  const source = tubes[from], target = tubes[to];
  if (!source || source.length === 0 || !target || target.length >= WATER_SORT_CAPACITY) return null;
  const color = source[source.length - 1];
  if (target.length > 0 && target[target.length - 1] !== color) return null;
  const amount = Math.min(topGroupSize(source), WATER_SORT_CAPACITY - target.length);
  if (amount <= 0) return null;
  const next = cloneTubes(tubes);
  next[from] = source.slice(0, source.length - amount);
  next[to] = [...target, ...new Array(amount).fill(color)];
  return next;
}

export function isWaterSortSolved(tubes: number[][]): boolean {
  return tubes.length === WATER_SORT_TUBE_COUNT && tubes.every((tube) => tube.length === 0 || tube.length === WATER_SORT_CAPACITY && tube.every((color) => color === tube[0]));
}

export function generateWaterSortPuzzle(seed: number, difficulty: WaterSortDifficulty): { tubes: number[][]; solution: WaterSortMove[]; rngState: number } {
  let tubes = Array.from({ length: WATER_SORT_COLOR_COUNT }, (_, color) => new Array(WATER_SORT_CAPACITY).fill(color));
  tubes.push([], []);
  let rngState = seed >>> 0 || 0x9e37_79b9;
  const inverseMoves: WaterSortMove[] = [];
  const targetSteps = SCRAMBLE_STEPS[difficulty];
  let attempts = 0;

  while (inverseMoves.length < targetSteps && attempts < targetSteps * 300) {
    attempts += 1;
    let from: number, to: number, amount: number;
    [from, rngState] = randomInt(rngState, tubes.length);
    [to, rngState] = randomInt(rngState, tubes.length);
    if (from === to || tubes[from].length === 0 || tubes[to].length >= WATER_SORT_CAPACITY) continue;
    const maxAmount = Math.min(topGroupSize(tubes[from]), WATER_SORT_CAPACITY - tubes[to].length);
    [amount, rngState] = randomInt(rngState, maxAmount);
    amount += 1;
    const candidate = cloneTubes(tubes);
    const color = candidate[from][candidate[from].length - 1];
    candidate[from] = candidate[from].slice(0, candidate[from].length - amount);
    candidate[to] = [...candidate[to], ...new Array(amount).fill(color)];
    const restored = pourWater(candidate, to, from);
    if (!restored || !sameTubes(restored, tubes) || sameTubes(candidate, tubes)) continue;
    tubes = candidate;
    inverseMoves.push({ from: to, to: from });
  }

  if (inverseMoves.length < targetSteps) throw new Error(`Unable to generate ${difficulty} Water Sort puzzle for seed ${seed}`);
  return { tubes, solution: inverseMoves.reverse(), rngState };
}

export function createWaterSort(seed: number, difficulty: WaterSortDifficulty = "medium"): WaterSortState {
  const generated = generateWaterSortPuzzle(seed, difficulty);
  return { tubes: generated.tubes, seed: seed >>> 0, difficulty, rngState: generated.rngState, moves: 0, status: isWaterSortSolved(generated.tubes) ? "solved" : "playing" };
}

export function moveWaterSort(state: WaterSortState, move: WaterSortMove): WaterSortState {
  if (state.status === "solved") return state;
  const tubes = pourWater(state.tubes, move.from, move.to);
  if (!tubes) return state;
  return { ...state, tubes, moves: state.moves + 1, status: isWaterSortSolved(tubes) ? "solved" : "playing" };
}

export function legalWaterSortMoves(tubes: number[][]): WaterSortMove[] {
  const moves: WaterSortMove[] = [];
  for (let from = 0; from < tubes.length; from += 1) {
    if (tubes[from].length === 0) continue;
    // Never break a completed tube; that only lengthens a solution.
    if (tubes[from].length === WATER_SORT_CAPACITY && tubes[from].every((color) => color === tubes[from][0])) continue;
    for (let to = 0; to < tubes.length; to += 1) if (pourWater(tubes, from, to)) moves.push({ from, to });
  }
  return moves;
}

function disorder(tubes: number[][]): number {
  let score = 0;
  for (const tube of tubes) {
    for (let layer = 1; layer < tube.length; layer += 1) if (tube[layer] !== tube[layer - 1]) score += 3;
    if (tube.length > 0 && tube.length < WATER_SORT_CAPACITY) score += 1;
  }
  return score;
}

/** A deterministic, non-spoiling hint: merge groups and reduce color boundaries. */
export function waterSortHint(tubes: number[][]): WaterSortMove | null {
  const ranked = legalWaterSortMoves(tubes).map((move) => {
    const targetWasEmpty = tubes[move.to].length === 0;
    const next = pourWater(tubes, move.from, move.to)!;
    const completesTube = next[move.to].length === WATER_SORT_CAPACITY && next[move.to].every((color) => color === next[move.to][0]);
    const mergesGroup = !targetWasEmpty;
    return { move, score: disorder(next) - (completesTube ? 10 : 0) - (mergesGroup ? 4 : 0) + (targetWasEmpty ? 2 : 0) };
  });
  ranked.sort((a, b) => a.score - b.score || a.move.from - b.move.from || a.move.to - b.move.to);
  return ranked[0]?.move ?? null;
}

export function isWaterSortDeadEnd(state: WaterSortState): boolean {
  return state.status === "playing" && legalWaterSortMoves(state.tubes).length === 0;
}
