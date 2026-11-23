// Advent puzzle calendar (OIYO original): 25 doors, one puzzle a day from 1 to 25 December.
// Four small puzzle families rotate and grow harder as the month goes on; door 25 is a big finale.
// Everything here is pure and seeded so every player gets the same door on the same day.
import { mulberry32, shuffle } from "./daily";

export const ADVENT_SLUG = "advent-puzzles";
export const DAY_COUNT = 25;

export type Kind = "lights" | "slide" | "garland" | "sort";
const ROTATION: readonly Kind[] = ["lights", "slide", "garland", "sort"];

export function kindForDay(day: number): Kind {
  if (day === DAY_COUNT) return "garland";
  return ROTATION[(day - 1) % ROTATION.length];
}

/** 0 for the first week's doors, rising to 5 by the 21st–24th. */
export function tierForDay(day: number): number {
  return Math.min(5, Math.floor((day - 1) / 4));
}

function seedForDay(day: number): number {
  return 20261200 + day * 7919;
}

// ---------------------------------------------------------------- unlocking

/**
 * Last door that may be opened on this device-local date.
 * December: one more door each day (all 25 from the 25th). November: door 1 as a preview.
 * Any other month: the whole calendar is open to replay.
 */
export function unlockedThrough(now: Date = new Date()): number {
  const month = now.getMonth();
  if (month === 11) return Math.min(DAY_COUNT, now.getDate());
  if (month === 10) return 1;
  return DAY_COUNT;
}

/** The door a returning player should land on: today's if unopened, else the earliest open unsolved one. */
export function suggestedDay(unlocked: number, solved: ReadonlySet<number>): number {
  if (!solved.has(unlocked)) return unlocked;
  for (let d = 1; d <= unlocked; d++) if (!solved.has(d)) return d;
  return unlocked;
}

// ---------------------------------------------------------------- stars

export function starsFor(moves: number, par: number, hints: number): number {
  if (hints === 0 && moves <= par + Math.ceil(par * 0.25)) return 3;
  if (hints <= 1 && moves <= par * 2 + 2) return 2;
  return 1;
}

// ---------------------------------------------------------------- lights (candles)

export type LightsPuzzle = { kind: "lights"; n: number; start: boolean[]; presses: number[]; par: number };

export function pressLights(n: number, state: readonly boolean[], i: number): boolean[] {
  const next = state.slice();
  const r = Math.floor(i / n);
  const c = i % n;
  const flip = (rr: number, cc: number) => {
    if (rr >= 0 && rr < n && cc >= 0 && cc < n) next[rr * n + cc] = !next[rr * n + cc];
  };
  flip(r, c);
  flip(r - 1, c);
  flip(r + 1, c);
  flip(r, c - 1);
  flip(r, c + 1);
  return next;
}

export const lightsSolved = (state: readonly boolean[]): boolean => state.every(Boolean);

function makeLights(day: number): LightsPuzzle {
  const t = tierForDay(day);
  const n = [3, 3, 4, 4, 5, 5][t];
  const k = [3, 4, 5, 6, 7, 8][t];
  const rng = mulberry32(seedForDay(day));
  for (;;) {
    const presses = shuffle(Array.from({ length: n * n }, (_, i) => i), rng).slice(0, k).sort((a, b) => a - b);
    let state: boolean[] = Array(n * n).fill(true);
    for (const p of presses) state = pressLights(n, state, p);
    if (state.filter((x) => !x).length >= Math.min(4, n * n - 1)) return { kind: "lights", n, start: state, presses, par: k };
  }
}

/** A cell that is still part of a solution, given which cells the player has pressed an odd number of times. */
export function lightsHint(p: LightsPuzzle, pressedOdd: readonly boolean[]): number {
  const need = new Set(p.presses);
  for (let i = 0; i < pressedOdd.length; i++) {
    if (!pressedOdd[i]) continue;
    if (need.has(i)) need.delete(i);
    else need.add(i);
  }
  const first = [...need].sort((a, b) => a - b)[0];
  return first ?? -1;
}

// ---------------------------------------------------------------- slide (picture tiles)

export type SlidePuzzle = { kind: "slide"; n: number; start: number[]; trail: number[]; par: number };

/** tiles[pos] = tile id; id n*n-1 is the gap. */
export const slideSolved = (tiles: readonly number[]): boolean => tiles.every((v, i) => v === i);

export function slideNeighbours(n: number, pos: number): number[] {
  const r = Math.floor(pos / n);
  const c = pos % n;
  const out: number[] = [];
  if (r > 0) out.push(pos - n);
  if (r < n - 1) out.push(pos + n);
  if (c > 0) out.push(pos - 1);
  if (c < n - 1) out.push(pos + 1);
  return out;
}

/** Moves the tile at `pos` into the gap if they touch. Returns the same array when it cannot move. */
export function slideTile(n: number, tiles: readonly number[], pos: number): readonly number[] {
  const gap = tiles.indexOf(n * n - 1);
  if (!slideNeighbours(n, gap).includes(pos)) return tiles;
  const next = tiles.slice();
  next[gap] = tiles[pos];
  next[pos] = n * n - 1;
  return next;
}

/** Keeps a path of gap positions back to the solved board; the hint is to retrace it. */
export function pushTrail(trail: readonly number[], gapTo: number): number[] {
  if (trail.length >= 2 && trail[trail.length - 2] === gapTo) return trail.slice(0, -1);
  return [...trail, gapTo];
}

export function slideHint(trail: readonly number[]): number {
  return trail.length >= 2 ? trail[trail.length - 2] : -1;
}

function manhattan(n: number, tiles: readonly number[]): number {
  let h = 0;
  for (let i = 0; i < tiles.length; i++) {
    const v = tiles[i];
    if (v === n * n - 1) continue;
    h += Math.abs(Math.floor(v / n) - Math.floor(i / n)) + Math.abs((v % n) - (i % n));
  }
  return h;
}

/** Optimal move count by IDA* (used for the 3×3 boards only). */
export function slideOptimal(n: number, start: readonly number[], limit = 40): number {
  const tiles = start.slice();
  let gap = tiles.indexOf(n * n - 1);
  let bound = manhattan(n, tiles);
  const search = (g: number, prev: number, h: number): number => {
    const f = g + h;
    if (f > bound) return f;
    if (h === 0) return -1;
    let min = Infinity;
    for (const nb of slideNeighbours(n, gap)) {
      if (nb === prev) continue;
      const v = tiles[nb];
      const before = Math.abs(Math.floor(v / n) - Math.floor(nb / n)) + Math.abs((v % n) - (nb % n));
      const after = Math.abs(Math.floor(v / n) - Math.floor(gap / n)) + Math.abs((v % n) - (gap % n));
      const old = gap;
      tiles[old] = v;
      tiles[nb] = n * n - 1;
      gap = nb;
      const res = search(g + 1, old, h - before + after);
      gap = old;
      tiles[nb] = v;
      tiles[old] = n * n - 1;
      if (res === -1) return -1;
      if (res < min) min = res;
    }
    return min;
  };
  while (bound <= limit) {
    const res = search(0, -1, manhattan(n, tiles));
    if (res === -1) return bound;
    bound = res;
  }
  return limit;
}

function makeSlide(day: number): SlidePuzzle {
  const t = tierForDay(day);
  const n = [3, 3, 3, 4, 4, 4][t];
  const steps = [16, 22, 30, 50, 70, 90][t];
  const rng = mulberry32(seedForDay(day));
  for (;;) {
    let tiles: readonly number[] = Array.from({ length: n * n }, (_, i) => i);
    let trail = [n * n - 1];
    let prev = -1;
    for (let s = 0; s < steps; s++) {
      const gap = tiles.indexOf(n * n - 1);
      const options = slideNeighbours(n, gap).filter((p) => p !== prev);
      const pick = options[Math.floor(rng() * options.length)];
      tiles = slideTile(n, tiles, pick);
      trail = pushTrail(trail, pick);
      prev = gap;
    }
    if (manhattan(n, tiles) < n * 2) continue;
    const par = n === 3 ? slideOptimal(n, tiles) : trail.length - 1;
    return { kind: "slide", n, start: tiles.slice(), trail, par };
  }
}

// ---------------------------------------------------------------- garland (rotate wires)

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export type GarlandPuzzle = { kind: "garland"; w: number; h: number; source: number; solution: number[]; start: number[]; par: number };

export const rotateMask = (m: number): number => ((m << 1) | (m >> 3)) & 15;

function rotationsTo(from: number, to: number): number {
  let m = from;
  for (let k = 0; k < 4; k++) {
    if (m === to) return k;
    m = rotateMask(m);
  }
  return -1;
}

function stepTo(w: number, h: number, i: number, dir: number): number {
  const r = Math.floor(i / w);
  const c = i % w;
  if (dir === N) return r > 0 ? i - w : -1;
  if (dir === S) return r < h - 1 ? i + w : -1;
  if (dir === E) return c < w - 1 ? i + 1 : -1;
  return c > 0 ? i - 1 : -1;
}
const OPP: Record<number, number> = { [N]: S, [S]: N, [E]: W, [W]: E };
const DIRS = [N, E, S, W];

/** Cells powered from the source through wires that meet end to end. */
export function litCells(p: Pick<GarlandPuzzle, "w" | "h" | "source">, state: readonly number[]): Set<number> {
  const seen = new Set([p.source]);
  const queue = [p.source];
  while (queue.length) {
    const i = queue.shift() as number;
    for (const d of DIRS) {
      if (!(state[i] & d)) continue;
      const j = stepTo(p.w, p.h, i, d);
      if (j < 0 || seen.has(j) || !(state[j] & OPP[d])) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  return seen;
}

export function garlandSolved(p: GarlandPuzzle, state: readonly number[]): boolean {
  for (let i = 0; i < state.length; i++) {
    for (const d of DIRS) {
      if (!(state[i] & d)) continue;
      const j = stepTo(p.w, p.h, i, d);
      if (j < 0 || !(state[j] & OPP[d])) return false;
    }
  }
  return litCells(p, state).size === state.length;
}

export function rotateCell(state: readonly number[], i: number): number[] {
  const next = state.slice();
  next[i] = rotateMask(next[i]);
  return next;
}

/** A cell that is not yet turned the way the answer has it, or -1. */
export function garlandHint(p: GarlandPuzzle, state: readonly number[]): number {
  for (let i = 0; i < state.length; i++) if (state[i] !== p.solution[i]) return i;
  return -1;
}

function makeGarland(day: number): GarlandPuzzle {
  const t = tierForDay(day);
  const size = day === DAY_COUNT ? 7 : [4, 4, 5, 5, 6, 6][t];
  const w = size;
  const h = size;
  const rng = mulberry32(seedForDay(day));
  const source = Math.floor(w / 2);
  for (;;) {
    const solution = Array(w * h).fill(0);
    const inTree = new Set([source]);
    const frontier: Array<[number, number]> = [];
    const addEdges = (i: number) => {
      for (const d of DIRS) {
        const j = stepTo(w, h, i, d);
        if (j >= 0 && !inTree.has(j)) frontier.push([i, d]);
      }
    };
    addEdges(source);
    while (inTree.size < w * h) {
      const k = Math.floor(rng() * frontier.length);
      const [i, d] = frontier[k];
      frontier.splice(k, 1);
      const j = stepTo(w, h, i, d);
      if (inTree.has(j)) continue;
      solution[i] |= d;
      solution[j] |= OPP[d];
      inTree.add(j);
      addEdges(j);
    }
    // crossroads make the board too easy to read; keep at most a couple
    if (solution.filter((m) => m === 15).length > Math.max(1, size - 4)) continue;
    const start = solution.map((m) => {
      let x = m;
      const turns = Math.floor(rng() * 4);
      for (let k = 0; k < turns; k++) x = rotateMask(x);
      return x;
    });
    const p0 = { kind: "garland" as const, w, h, source, solution, start, par: 0 };
    const wrong = start.filter((m, i) => m !== solution[i]).length;
    if (wrong < start.length * 0.55 || garlandSolved(p0, start)) continue;
    const par = start.reduce((sum, m, i) => sum + rotationsTo(m, solution[i]), 0);
    return { ...p0, par };
  }
}

// ---------------------------------------------------------------- sort (ornaments into jars)

export const SORT_CAP = 4;
export type SortPuzzle = { kind: "sort"; colors: number; start: number[][]; par: number };
export type SortMove = [from: number, to: number];

export function canPour(state: readonly (readonly number[])[], from: number, to: number): boolean {
  if (from === to) return false;
  const a = state[from];
  const b = state[to];
  if (!a.length || b.length >= SORT_CAP) return false;
  return !b.length || b[b.length - 1] === a[a.length - 1];
}

/** Pours the top run of one colour as far as it fits. */
export function pour(state: readonly (readonly number[])[], from: number, to: number): number[][] {
  const next = state.map((t) => t.slice());
  if (!canPour(state, from, to)) return next;
  const a = next[from];
  const b = next[to];
  const top = a[a.length - 1];
  while (a.length && a[a.length - 1] === top && b.length < SORT_CAP) b.push(a.pop() as number);
  return next;
}

export const sortSolved = (state: readonly (readonly number[])[]): boolean =>
  state.every((t) => t.length === 0 || (t.length === SORT_CAP && t.every((x) => x === t[0])));

const sortKey = (state: readonly (readonly number[])[]): string =>
  state.map((t) => t.join("")).sort().join("|");

/** Depth-first search with memo; returns a move list or null when none is found within the node budget. */
export function solveSort(start: readonly (readonly number[])[], budget = 60000): SortMove[] | null {
  const seen = new Set<string>();
  const path: SortMove[] = [];
  let nodes = 0;
  const dfs = (state: number[][]): boolean => {
    if (sortSolved(state)) return true;
    if (++nodes > budget) return false;
    const key = sortKey(state);
    if (seen.has(key)) return false;
    seen.add(key);
    const moves: Array<{ m: SortMove; score: number }> = [];
    for (let a = 0; a < state.length; a++) {
      const ta = state[a];
      if (!ta.length) continue;
      const uniform = ta.every((x) => x === ta[0]);
      if (uniform && ta.length === SORT_CAP) continue;
      let emptyTried = false;
      for (let b = 0; b < state.length; b++) {
        if (!canPour(state, a, b)) continue;
        if (!state[b].length) {
          if (uniform || emptyTried) continue; // moving a pure jar into an empty one changes nothing
          emptyTried = true;
        }
        const score = state[b].length ? 2 + state[b].length : 0;
        moves.push({ m: [a, b], score });
      }
    }
    moves.sort((x, y) => y.score - x.score);
    for (const { m } of moves) {
      path.push(m);
      if (dfs(pour(state, m[0], m[1]))) return true;
      path.pop();
      if (nodes > budget) return false;
    }
    return false;
  };
  return dfs(start.map((t) => t.slice())) ? path.slice() : null;
}

function makeSort(day: number): SortPuzzle {
  const t = tierForDay(day);
  const colors = [3, 4, 5, 5, 6, 7][t];
  const rng = mulberry32(seedForDay(day));
  for (;;) {
    const balls = shuffle(Array.from({ length: colors * SORT_CAP }, (_, i) => Math.floor(i / SORT_CAP)), rng);
    const start: number[][] = [];
    for (let c = 0; c < colors; c++) start.push(balls.slice(c * SORT_CAP, (c + 1) * SORT_CAP));
    start.push([], []);
    if (start.some((tube) => tube.length === SORT_CAP && tube.every((x) => x === tube[0]))) continue;
    // no jar may start with three of a kind on top: it gives the opening away
    if (start.some((tube) => tube.length === SORT_CAP && tube[1] === tube[2] && tube[2] === tube[3])) continue;
    const sol = solveSort(start);
    if (!sol) continue;
    return { kind: "sort", colors, start, par: sol.length };
  }
}

export function sortHint(state: readonly (readonly number[])[]): SortMove | null {
  const sol = solveSort(state, 40000);
  return sol && sol.length ? sol[0] : null;
}

// ---------------------------------------------------------------- doors

export type Puzzle = LightsPuzzle | SlidePuzzle | GarlandPuzzle | SortPuzzle;

const cache = new Map<number, Puzzle>();

export function puzzleForDay(day: number): Puzzle {
  const hit = cache.get(day);
  if (hit) return hit;
  const kind = kindForDay(day);
  const p = kind === "lights" ? makeLights(day) : kind === "slide" ? makeSlide(day) : kind === "garland" ? makeGarland(day) : makeSort(day);
  cache.set(day, p);
  return p;
}

// ---------------------------------------------------------------- progress

export type DayResult = { stars: number; moves: number };
export type Progress = Record<number, DayResult>;
export const PROGRESS_KEY = "oiyo:advent-puzzles:days:v1";

export function mergeResult(progress: Progress, day: number, result: DayResult): Progress {
  const old = progress[day];
  if (old && (old.stars > result.stars || (old.stars === result.stars && old.moves <= result.moves))) return progress;
  return { ...progress, [day]: result };
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const out: Progress = {};
    for (const [k, v] of Object.entries(obj)) {
      const day = Number(k);
      const r = v as Partial<DayResult> | null;
      if (!Number.isInteger(day) || day < 1 || day > DAY_COUNT || !r) continue;
      if (typeof r.stars !== "number" || typeof r.moves !== "number") continue;
      out[day] = { stars: Math.max(1, Math.min(3, Math.round(r.stars))), moves: Math.max(0, Math.round(r.moves)) };
    }
    return out;
  } catch {
    return {};
  }
}

export const totalStars = (progress: Progress): number => Object.values(progress).reduce((s, r) => s + r.stars, 0);

/** 5×5 emoji grid for the share text: 🌟 three stars, ⭐ solved, 🎁 open, 🔒 locked. */
export function calendarEmoji(progress: Progress, unlocked: number): string {
  const rows: string[] = [];
  for (let r = 0; r < 5; r++) {
    let row = "";
    for (let c = 0; c < 5; c++) {
      const d = r * 5 + c + 1;
      const res = progress[d];
      row += res ? (res.stars === 3 ? "🌟" : "⭐") : d <= unlocked ? "🎁" : "🔒";
    }
    rows.push(row);
  }
  return rows.join("\n");
}

export function buildShareText(
  template: { head: string; line: string; tag: string },
  day: number,
  result: DayResult,
  hints: number,
  progress: Progress,
  unlocked: number,
): string {
  const fillT = (s: string, ...a: Array<string | number>) => s.replace(/\{(\d+)\}/g, (_, i) => String(a[Number(i)] ?? ""));
  return [
    fillT(template.head, day),
    `${"★".repeat(result.stars)}${"☆".repeat(3 - result.stars)} ${fillT(template.line, result.moves, hints)}`,
    calendarEmoji(progress, unlocked),
    template.tag,
  ].join("\n");
}
