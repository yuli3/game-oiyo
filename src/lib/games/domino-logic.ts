// Domino-cell daily. Solution-first generation (2026-10-20): filling constraints
// first often yields zero or many tilings. A double-six tiling is laid down,
// region rules are read off that grid, and the board is kept only when the
// solver sees exactly one pip grid. Tiles come from the shared double-six set.
import { makeSet } from "./ai/dominoes";
import { mulberry32, shuffle } from "./daily";
import type { BestConditions } from "./records";
import { dateKeyIndex } from "./todays-game";

export const GAME_ID = "domino-logic";

export const DIFFICULTIES = ["easy", "normal", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type Rule =
  | { kind: "sum"; n: number }
  | { kind: "same" }
  | { kind: "diff" }
  | { kind: "lt"; n: number };

export interface LogicCell {
  id: number;
  x: number;
  y: number;
  region: number;
}

export interface LogicTile {
  id: number;
  a: number;
  b: number;
}

export interface LogicPuzzle {
  difficulty: Difficulty;
  width: number;
  height: number;
  cells: LogicCell[];
  tiles: LogicTile[];
  rules: { region: number; rule: Rule }[];
  /** Dominoes already on the board. A solid 6×6 cannot be proved unique in the daily time budget, so hard locks some of the laid tiles (2026-10-21). */
  given?: Placement[];
}

export interface Placement {
  tileId: number;
  cellA: number;
  cellB: number;
  a: number;
  b: number;
}

type Pt = readonly [number, number];

function rectangle(width: number, height: number, holes: readonly Pt[] = []): Pt[] {
  const skip = new Set(holes.map(([x, y]) => `${x},${y}`));
  const points: Pt[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!skip.has(`${x},${y}`)) points.push([x, y]);
    }
  }
  return points;
}

// A 5×5 rectangle has 25 cells, so a domino tiling leaves the center empty (2026-10-21).
const SHAPES: Record<Difficulty, Pt[][]> = {
  easy: [rectangle(4, 4)],
  normal: [rectangle(5, 5, [[2, 2]])],
  hard: [rectangle(6, 6)],
};

const MAX_PINS: Record<Difficulty, number> = { easy: 3, normal: 4, hard: 5 };
const LOCKED_TILES: Record<Difficulty, number> = { easy: 0, normal: 0, hard: 8 };
// Uniqueness search stops here. An unproven board is discarded, not shipped (2026-10-21).
const SEARCH_BUDGET = 40_000;

function adjacency(count: number, points: Pt[]): number[][] {
  const adj = Array.from({ length: count }, () => [] as number[]);
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[j];
      if (Math.abs(ax - bx) + Math.abs(ay - by) !== 1) continue;
      adj[i].push(j);
      adj[j].push(i);
    }
  }
  return adj;
}

function findTiling(adj: number[][], rng: () => number): Array<[number, number]> | null {
  const used = new Uint8Array(adj.length);
  const pairs: Array<[number, number]> = [];
  const walk = (): boolean => {
    let cell = -1;
    for (let i = 0; i < adj.length; i++) if (!used[i]) { cell = i; break; }
    if (cell < 0) return true;
    for (const other of shuffle(adj[cell].filter((id) => !used[id]), rng)) {
      used[cell] = 1;
      used[other] = 1;
      pairs.push([cell, other]);
      if (walk()) return true;
      pairs.pop();
      used[cell] = 0;
      used[other] = 0;
    }
    return false;
  };
  return walk() ? pairs : null;
}

function regionsFromTiling(adj: number[][], tiling: Array<[number, number]>, target: number, rng: () => number): number[] | null {
  // Merge across touches that are not the laid domino first, so a flip moves
  // pips between regions and a sum rule can reject the other orientation.
  const parent = adj.map((_, index) => index);
  const find = (id: number): number => (parent[id] === id ? id : (parent[id] = find(parent[id])));
  const unite = (a: number, b: number) => {
    const left = find(a);
    const right = find(b);
    if (left === right) return false;
    parent[right] = left;
    return true;
  };
  const domino = new Set(tiling.map(([a, b]) => `${Math.min(a, b)}:${Math.max(a, b)}`));
  const edges: Array<[number, number]> = [];
  const cuts: Array<[number, number]> = [];
  for (let i = 0; i < adj.length; i++) {
    for (const next of adj[i]) {
      if (i >= next) continue;
      (domino.has(`${i}:${next}`) ? cuts : edges).push([i, next]);
    }
  }
  let groups = adj.length;
  for (const [a, b] of [...shuffle(edges, rng), ...shuffle(cuts, rng)]) {
    if (groups <= target) break;
    if (unite(a, b)) groups -= 1;
  }
  if (groups !== target) return null;
  const ids = new Map<number, number>();
  return adj.map((_, index) => {
    const root = find(index);
    if (!ids.has(root)) ids.set(root, ids.size);
    return ids.get(root) as number;
  });
}

export function ruleAllows(rule: Rule, known: readonly number[], complete: boolean): boolean {
  if (known.length === 0) return true;
  if (rule.kind === "same") return known.every((value) => value === known[0]);
  if (rule.kind === "diff") return new Set(known).size === known.length;
  if (rule.kind === "lt") return known.every((value) => value < rule.n);
  const sum = known.reduce((total, value) => total + value, 0);
  if (sum > rule.n) return false;
  return complete ? sum === rule.n : true;
}

function searchSolutions(puzzle: LogicPuzzle, limit: number, budget: number): { grids: string[]; proven: boolean } {
  const cellCount = puzzle.cells.length;
  const tileCount = puzzle.tiles.length;
  const points = puzzle.cells.map((cell) => [cell.x, cell.y] as const);
  const adj = adjacency(cellCount, points);
  const regionOf = new Uint8Array(cellCount);
  let regionMax = 0;
  for (let i = 0; i < cellCount; i++) {
    regionOf[i] = puzzle.cells[i].region;
    if (puzzle.cells[i].region > regionMax) regionMax = puzzle.cells[i].region;
  }
  const regions = regionMax + 1;
  const regionSize = new Uint8Array(regions);
  for (let i = 0; i < cellCount; i++) regionSize[regionOf[i]]++;
  // 1 sum, 2 same, 3 all different, 4 less-than. Checked as each pip lands so the
  // daily proof does not rebuild a map at every node (2026-10-21).
  const kind = new Uint8Array(regions);
  const ruleN = new Int16Array(regions);
  for (const entry of puzzle.rules) {
    if (entry.rule.kind === "sum") {
      kind[entry.region] = 1;
      ruleN[entry.region] = entry.rule.n;
    } else if (entry.rule.kind === "same") kind[entry.region] = 2;
    else if (entry.rule.kind === "diff") kind[entry.region] = 3;
    else {
      kind[entry.region] = 4;
      ruleN[entry.region] = entry.rule.n;
    }
  }
  const sums = new Int16Array(regions);
  const counts = new Uint8Array(regions);
  const pipCount = new Uint8Array(regions * 8);
  const first = new Int8Array(regions);
  const value = new Int8Array(cellCount).fill(-1);
  const used = new Uint8Array(tileCount);
  const tileA = new Int8Array(tileCount);
  const tileB = new Int8Array(tileCount);
  for (let t = 0; t < tileCount; t++) {
    tileA[t] = puzzle.tiles[t].a;
    tileB[t] = puzzle.tiles[t].b;
  }

  const add = (cell: number, pip: number): boolean => {
    const id = regionOf[cell];
    const rule = kind[id];
    const prevCount = counts[id];
    const nextSum = sums[id] + pip;
    const bit = id * 8 + pip;
    if (rule === 1) {
      if (nextSum > ruleN[id]) return false;
      if (prevCount + 1 === regionSize[id] && nextSum !== ruleN[id]) return false;
    } else if (rule === 2) {
      if (prevCount > 0 && pip !== first[id]) return false;
    } else if (rule === 3) {
      if (pipCount[bit] > 0) return false;
    } else if (rule === 4 && pip >= ruleN[id]) return false;
    sums[id] = nextSum;
    counts[id] = prevCount + 1;
    pipCount[bit]++;
    if (prevCount === 0) first[id] = pip;
    return true;
  };
  const remove = (cell: number, pip: number) => {
    const id = regionOf[cell];
    sums[id] -= pip;
    counts[id]--;
    pipCount[id * 8 + pip]--;
  };

  const given = puzzle.given ?? [];
  for (const place of given) {
    value[place.cellA] = place.a;
    value[place.cellB] = place.b;
    const tileIndex = puzzle.tiles.findIndex((tile) => tile.id === place.tileId);
    if (tileIndex >= 0) used[tileIndex] = 1;
    if (!add(place.cellA, place.a) || !add(place.cellB, place.b)) return { grids: [], proven: true };
  }

  const grids = new Set<string>();
  let nodes = 0;
  let proven = true;

  const pick = (): number => {
    let best = -1;
    let bestOpen = 99;
    for (let i = 0; i < cellCount; i++) {
      if (value[i] >= 0) continue;
      let open = 0;
      const neighbors = adj[i];
      for (let n = 0; n < neighbors.length; n++) if (value[neighbors[n]] < 0) open++;
      if (open < bestOpen) {
        bestOpen = open;
        best = i;
        if (open === 0) break;
      }
    }
    return best;
  };

  const walk = (placed: number) => {
    if (!proven || grids.size >= limit) return;
    if (nodes >= budget) {
      proven = false;
      return;
    }
    nodes += 1;
    if (placed === tileCount) {
      grids.add(value.join(","));
      return;
    }
    const cell = pick();
    if (cell < 0) return;
    const neighbors = adj[cell];
    for (let t = 0; t < tileCount; t++) {
      if (used[t]) continue;
      const a = tileA[t];
      const b = tileB[t];
      for (let n = 0; n < neighbors.length; n++) {
        const other = neighbors[n];
        if (value[other] >= 0) continue;
        const orients = a === b ? 1 : 2;
        for (let flip = 0; flip < orients; flip++) {
          const left = flip === 0 ? a : b;
          const right = flip === 0 ? b : a;
          if (!add(cell, left)) continue;
          value[cell] = left;
          if (!add(other, right)) {
            remove(cell, left);
            value[cell] = -1;
            continue;
          }
          value[other] = right;
          used[t] = 1;
          walk(placed + 1);
          used[t] = 0;
          value[cell] = -1;
          value[other] = -1;
          remove(other, right);
          remove(cell, left);
          if (!proven || grids.size >= limit) return;
        }
      }
    }
  };
  walk(given.length);
  return { grids: [...grids], proven };
}

export function sampleSolutions(puzzle: LogicPuzzle, limit = 2): string[] {
  return searchSolutions(puzzle, limit, Number.POSITIVE_INFINITY).grids;
}

export function countSolutions(puzzle: LogicPuzzle, limit = 2): number {
  return sampleSolutions(puzzle, limit).length;
}

function rulesFor(cells: readonly LogicCell[], value: readonly number[]): LogicPuzzle["rules"] {
  const ids = [...new Set(cells.map((cell) => cell.region))].sort((a, b) => a - b);
  return ids.map((region) => {
    const pip = cells.filter((cell) => cell.region === region).map((cell) => value[cell.id]);
    if (pip.length >= 2 && pip.every((item) => item === pip[0])) return { region, rule: { kind: "same" as const } };
    return { region, rule: { kind: "sum" as const, n: pip.reduce((total, item) => total + item, 0) } };
  });
}

function withVariety(puzzle: LogicPuzzle, value: readonly number[], rng: () => number): LogicPuzzle {
  const order = shuffle(puzzle.rules.map((_, index) => index), rng);
  const swap = (index: number, rule: Rule) => puzzle.rules.map((entry, ruleIndex) => ruleIndex === index ? { region: entry.region, rule } : entry);
  const passes: Array<(index: number, pip: number[]) => Rule | null> = rng() < 0.5
    ? [diffRule, ltRule]
    : [ltRule, diffRule];
  for (const pick of passes) {
    for (const index of order) {
      const pip = puzzle.cells.filter((cell) => cell.region === puzzle.rules[index].region).map((cell) => value[cell.id]);
      const rule = pick(index, pip);
      if (!rule) continue;
      const next = { ...puzzle, rules: swap(index, rule) };
      const found = searchSolutions(next, 2, SEARCH_BUDGET);
      if (found.proven && found.grids.length === 1) return next;
    }
  }
  return puzzle;
}

function diffRule(_index: number, pip: number[]): Rule | null {
  return pip.length >= 3 && new Set(pip).size === pip.length ? { kind: "diff" } : null;
}

function ltRule(_index: number, pip: number[]): Rule | null {
  if (pip.length < 2) return null;
  const max = Math.max(...pip);
  return max <= 4 ? { kind: "lt", n: max + 1 } : null;
}

function attempt(rng: () => number, difficulty: Difficulty): LogicPuzzle | null {
  const shape = SHAPES[difficulty][Math.floor(rng() * SHAPES[difficulty].length)];
  const adj = adjacency(shape.length, shape);
  const tiling = findTiling(adj, rng);
  const regions = tiling ? regionsFromTiling(adj, tiling, Math.max(3, Math.floor(shape.length / 2)), rng) : null;
  if (!tiling || !regions) return null;
  const chosen = shuffle(makeSet(), rng).slice(0, tiling.length);
  const value = new Array<number>(shape.length).fill(0);
  const source: Placement[] = tiling.map(([cellA, cellB], index) => {
    const tile = chosen[index];
    const flip = rng() < 0.5;
    const a = flip ? tile.b : tile.a;
    const b = flip ? tile.a : tile.b;
    value[cellA] = a;
    value[cellB] = b;
    return { tileId: tile.id, cellA, cellB, a, b };
  });
  let cells: LogicCell[] = shape.map(([x, y], id) => ({ id, x, y, region: regions[id] }));
  const tiles = shuffle(chosen.map((tile) => ({ id: tile.id, a: tile.a, b: tile.b })), rng);
  const width = Math.max(...shape.map((point) => point[0])) + 1;
  const height = Math.max(...shape.map((point) => point[1])) + 1;
  const given = shuffle(source, rng).slice(0, LOCKED_TILES[difficulty]);
  let nextRegion = Math.max(...regions) + 1;
  for (let pin = 0; pin <= MAX_PINS[difficulty]; pin++) {
    const puzzle: LogicPuzzle = { difficulty, width, height, cells, tiles, rules: rulesFor(cells, value), given };
    if (!isSolved(puzzle, source)) return null;
    const found = searchSolutions(puzzle, 2, SEARCH_BUDGET);
    if (found.proven && found.grids.length === 1) return withVariety(puzzle, value, rng);
    if (!found.proven || pin === MAX_PINS[difficulty]) return null;
    const other = found.grids.find((grid) => grid !== value.join(","));
    if (!other) return null;
    const index = other.split(",").map(Number).findIndex((pip, cell) => pip !== value[cell]);
    if (index < 0) return null;
    const region = nextRegion++;
    cells = cells.map((cell, cellIndex) => cellIndex === index ? { ...cell, region } : cell);
  }
  return null;
}

export function generatePuzzle(seed: number, difficulty: Difficulty): LogicPuzzle {
  const rng = mulberry32(seed >>> 0);
  for (let i = 0; i < 24; i++) {
    const puzzle = attempt(rng, difficulty);
    if (puzzle) return puzzle;
  }
  throw new Error(`domino-logic: no unique ${difficulty} board for seed ${seed}`);
}

export function puzzlesForDate(dateKey: string): LogicPuzzle[] {
  const day = dateKeyIndex(dateKey);
  return DIFFICULTIES.map((difficulty, index) => generatePuzzle((day + 1) * 16 + index + 1, difficulty));
}

export function practiceSeed(salt: number, dailySeed: number): number {
  const next = salt >>> 0;
  const daily = dailySeed >>> 0;
  return next === daily ? (next + 1) >>> 0 : next;
}

export function practicePuzzles(salt: number, dateKey: string): LogicPuzzle[] {
  const day = dateKeyIndex(dateKey);
  return DIFFICULTIES.map((difficulty, index) => {
    const daily = (day + 1) * 16 + index + 1;
    return generatePuzzle(practiceSeed((salt + index * 97) >>> 0, daily), difficulty);
  });
}

export function isSolved(puzzle: LogicPuzzle, placements: readonly Placement[]): boolean {
  if (placements.length !== puzzle.tiles.length) return false;
  const tileById = new Map(puzzle.tiles.map((tile) => [tile.id, tile]));
  const pos = new Map(puzzle.cells.map((cell) => [cell.id, cell]));
  const value = new Map<number, number>();
  const used = new Set<number>();
  for (const place of placements) {
    const tile = tileById.get(place.tileId);
    const left = pos.get(place.cellA);
    const right = pos.get(place.cellB);
    if (!tile || !left || !right || used.has(place.tileId)) return false;
    if (value.has(place.cellA) || value.has(place.cellB)) return false;
    if (Math.abs(left.x - right.x) + Math.abs(left.y - right.y) !== 1) return false;
    const matches = (tile.a === place.a && tile.b === place.b) || (tile.a === place.b && tile.b === place.a);
    if (!matches) return false;
    value.set(place.cellA, place.a);
    value.set(place.cellB, place.b);
    used.add(place.tileId);
  }
  if (value.size !== puzzle.cells.length) return false;
  return puzzle.rules.every(({ region, rule }) => {
    const known = puzzle.cells.filter((cell) => cell.region === region).map((cell) => value.get(cell.id) ?? -1);
    return ruleAllows(rule, known, true);
  });
}

export interface SnapCell {
  id: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
}

// The finger can rest on the outer edge of a cell, about one cell-pitch from
// the pair's midpoint. 1.2 covers that edge plus a little slop, and still
// loses to a nearer pair (2026-10-21).
const SNAP_RADIUS_FACTOR = 1.2;

/** Nearest adjacent empty pair in screen space. cellA is west or north, matching the ghost's first pip. */
export function nearestDominoPair(
  cells: readonly SnapCell[],
  occupied: readonly number[],
  point: { x: number; y: number },
  radiusFactor = SNAP_RADIUS_FACTOR,
): { cellA: number; cellB: number } | null {
  const taken = new Set(occupied);
  const open = cells.filter((cell) => !taken.has(cell.id) && Number.isFinite(cell.cx) && Number.isFinite(cell.cy));
  let pitch = 0;
  for (let i = 0; i < open.length && pitch === 0; i++) {
    for (let j = i + 1; j < open.length; j++) {
      if (Math.abs(open[i].x - open[j].x) + Math.abs(open[i].y - open[j].y) !== 1) continue;
      pitch = Math.hypot(open[i].cx - open[j].cx, open[i].cy - open[j].cy);
      break;
    }
  }
  if (!(pitch > 0)) return null;
  const radius = pitch * radiusFactor;
  let best: { cellA: number; cellB: number; score: number } | null = null;
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const left = open[i];
      const right = open[j];
      if (Math.abs(left.x - right.x) + Math.abs(left.y - right.y) !== 1) continue;
      const score = Math.hypot(point.x - (left.cx + right.cx) / 2, point.y - (left.cy + right.cy) / 2);
      if (score > radius || (best !== null && score >= best.score)) continue;
      const horizontal = left.y === right.y;
      const [first, second] = horizontal
        ? (left.x <= right.x ? [left, right] : [right, left])
        : (left.y <= right.y ? [left, right] : [right, left]);
      best = { cellA: first.id, cellB: second.id, score };
    }
  }
  return best ? { cellA: best.cellA, cellB: best.cellB } : null;
}

export function placeTile(
  puzzle: LogicPuzzle,
  placements: readonly Placement[],
  tileId: number,
  cellA: number,
  cellB: number,
  flipped: boolean,
): Placement[] | null {
  const tile = puzzle.tiles.find((item) => item.id === tileId);
  if (!tile || cellA === cellB) return null;
  if (placements.some((place) => place.tileId === tileId || place.cellA === cellA || place.cellB === cellA || place.cellA === cellB || place.cellB === cellB)) return null;
  const next = placements.concat({
    tileId,
    cellA,
    cellB,
    a: flipped ? tile.b : tile.a,
    b: flipped ? tile.a : tile.b,
  });
  const covered = new Map<number, number>();
  for (const place of next) {
    covered.set(place.cellA, place.a);
    covered.set(place.cellB, place.b);
  }
  for (const { region, rule } of puzzle.rules) {
    const cells = puzzle.cells.filter((cell) => cell.region === region);
    const known = cells.flatMap((cell) => (covered.has(cell.id) ? [covered.get(cell.id) as number] : []));
    if (!ruleAllows(rule, known, known.length === cells.length)) return null;
  }
  const last = next[next.length - 1];
  const pos = new Map(puzzle.cells.map((cell) => [cell.id, cell]));
  const left = pos.get(last.cellA);
  const right = pos.get(last.cellB);
  if (!left || !right || Math.abs(left.x - right.x) + Math.abs(left.y - right.y) !== 1) return null;
  return next;
}

export function regionMarks(puzzle: LogicPuzzle, placements: readonly Placement[]): { region: number; full: boolean; ok: boolean }[] {
  const covered = new Map<number, number>();
  for (const place of placements) {
    covered.set(place.cellA, place.a);
    covered.set(place.cellB, place.b);
  }
  return puzzle.rules.map(({ region, rule }) => {
    const cells = puzzle.cells.filter((cell) => cell.region === region);
    const known = cells.flatMap((cell) => covered.has(cell.id) ? [covered.get(cell.id) as number] : []);
    const full = known.length === cells.length;
    return { region, full, ok: ruleAllows(rule, known, full) };
  });
}

export function shareGrid(title: string, dateKey: string, solved: readonly boolean[]): string {
  return `${title} ${dateKey}\n${solved.map((ok) => (ok ? "🟩" : "⬜")).join("")}`;
}

export function dailyBestConditions(dateKey: string, difficulty: Difficulty, assist: "none" | "undo"): BestConditions {
  return { seed: dateKey, difficulty, assist };
}
