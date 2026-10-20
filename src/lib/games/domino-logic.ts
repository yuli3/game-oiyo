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
}

export interface Placement {
  tileId: number;
  cellA: number;
  cellB: number;
  a: number;
  b: number;
}

type Pt = readonly [number, number];

const SHAPES: Record<Difficulty, Pt[][]> = {
  easy: [
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
  ],
  normal: [
    [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]],
  ],
  hard: [
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
    [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [1, 3], [2, 3]],
  ],
};

const REGION_COUNT: Record<Difficulty, number> = { easy: 3, normal: 3, hard: 3 };
const MAX_PINS: Record<Difficulty, number> = { easy: 3, normal: 4, hard: 5 };

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

export function sampleSolutions(puzzle: LogicPuzzle, limit = 2): string[] {
  const points = puzzle.cells.map((cell) => [cell.x, cell.y] as const);
  const adj = adjacency(puzzle.cells.length, points);
  const region = puzzle.cells.map((cell) => cell.region);
  const regionSize = new Map<number, number>();
  for (const id of region) regionSize.set(id, (regionSize.get(id) ?? 0) + 1);
  const ruleByRegion = new Map(puzzle.rules.map((entry) => [entry.region, entry.rule]));
  const value = new Int8Array(puzzle.cells.length).fill(-1);
  const used = new Uint8Array(puzzle.tiles.length);
  const grids = new Set<string>();

  const ok = (): boolean => {
    const known = new Map<number, number[]>();
    for (let i = 0; i < value.length; i++) {
      if (value[i] < 0) continue;
      const list = known.get(region[i]) ?? [];
      list.push(value[i]);
      known.set(region[i], list);
    }
    for (const [id, rule] of ruleByRegion) {
      const list = known.get(id) ?? [];
      if (!ruleAllows(rule, list, list.length === regionSize.get(id))) return false;
    }
    return true;
  };

  const walk = (placed: number) => {
    if (grids.size >= limit) return;
    if (placed === puzzle.tiles.length) {
      grids.add(value.join(","));
      return;
    }
    let cell = -1;
    for (let i = 0; i < value.length; i++) if (value[i] < 0) { cell = i; break; }
    if (cell < 0) return;
    for (let t = 0; t < puzzle.tiles.length; t++) {
      if (used[t]) continue;
      const tile = puzzle.tiles[t];
      const orients: Array<readonly [number, number]> = tile.a === tile.b ? [[tile.a, tile.b]] : [[tile.a, tile.b], [tile.b, tile.a]];
      for (const other of adj[cell]) {
        if (value[other] >= 0) continue;
        for (const [a, b] of orients) {
          value[cell] = a;
          value[other] = b;
          used[t] = 1;
          if (ok()) walk(placed + 1);
          value[cell] = -1;
          value[other] = -1;
          used[t] = 0;
          if (grids.size >= limit) return;
        }
      }
    }
  };
  walk(0);
  return [...grids];
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
      if (countSolutions(next, 2) === 1) return next;
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
  const regions = tiling ? regionsFromTiling(adj, tiling, Math.min(REGION_COUNT[difficulty], shape.length), rng) : null;
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
  let nextRegion = Math.max(...regions) + 1;
  for (let pin = 0; pin <= MAX_PINS[difficulty]; pin++) {
    const puzzle: LogicPuzzle = { difficulty, width, height, cells, tiles, rules: rulesFor(cells, value) };
    if (!isSolved(puzzle, source)) return null;
    const grids = sampleSolutions(puzzle, 2);
    if (grids.length === 1) return withVariety(puzzle, value, rng);
    if (pin === MAX_PINS[difficulty]) return null;
    const other = grids.find((grid) => grid !== value.join(","));
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
