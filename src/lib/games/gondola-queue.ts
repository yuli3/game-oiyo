/**
 * Gondola Queue (곤돌라 줄서기) — an OIYO original colour queue puzzle (2026-11-25).
 *
 * Hikers in coloured jackets crowd a mountain station; gondolas come up one at a time, each a colour, each seating
 * three. Tap a hiker with a clear way out to the platform (the top edge): one in the gondola's colour climbs aboard,
 * any other waits on the bench. A full gondola leaves, the next arrives, and waiting hikers of its colour hop on.
 * Five on the bench and the station jams. Send every hiker up the mountain.
 *
 * Pure and deterministic: every crowd and gondola order is seeded per stage. Each crowd can be sent up without the
 * bench at all, so a careful eye is rewarded; tapping at random jams it.
 */

export const GONDOLA_SLUG = "gondola-queue";
export const STAGE_COUNT = 30;
export const COLS = 6;
export const SEATS = 3;
export const BENCH = 5;
export const COLOURS = 6;
export const EMPTY = -1;
export const ROCK = -2;

export interface GondolaStage {
  stage: number;
  rows: number;
  grid: number[]; // row-major, rows × COLS: a colour, EMPTY or ROCK
  gondolas: number[]; // colours in arrival order
  par: number; // the fullest the bench gets for a careful player (three stars at or under it)
}

export interface Station {
  stage: GondolaStage;
  grid: number[];
  next: number; // index of the gondola at the platform
  aboard: number;
  bench: number[];
  peak: number;
  taps: number;
  over: boolean;
  won: boolean;
}

export const newStation = (stage: GondolaStage): Station => ({ stage, grid: stage.grid.slice(), next: 0, aboard: 0, bench: [], peak: 0, taps: 0, over: false, won: false });

const neighbours = (i: number, rows: number) => {
  const r = Math.floor(i / COLS);
  const c = i % COLS;
  const out: number[] = [];
  if (r > 0) out.push(i - COLS);
  if (r < rows - 1) out.push(i + COLS);
  if (c > 0) out.push(i - 1);
  if (c < COLS - 1) out.push(i + 1);
  return out;
};

/** Whether a hiker at i has a clear way to the platform: it is on the top row, or empty cells lead there. */
export function canLeave(grid: number[], rows: number, i: number): boolean {
  if (grid[i] < 0) return false;
  if (i < COLS) return true;
  const seen = new Set([i]);
  const q = [i];
  while (q.length) {
    const c = q.shift() as number;
    for (const n of neighbours(c, rows)) {
      if (seen.has(n) || grid[n] !== EMPTY) continue;
      if (n < COLS) return true;
      seen.add(n);
      q.push(n);
    }
  }
  return false;
}

export const leavers = (s: Station) => s.grid.map((_, i) => i).filter((i) => canLeave(s.grid, s.stage.rows, i));
export const current = (s: Station) => (s.next < s.stage.gondolas.length ? s.stage.gondolas[s.next] : -1);

export type TapResult = "boarded" | "benched" | "departed" | "blocked" | null;

function board(s: Station): boolean {
  let left = false;
  while (s.aboard >= SEATS) {
    s.aboard = 0;
    s.next++;
    left = true;
    const c = current(s);
    if (c < 0) break;
    // waiting hikers of the new colour hop on
    while (s.aboard < SEATS) {
      const k = s.bench.indexOf(c);
      if (k < 0) break;
      s.bench.splice(k, 1);
      s.aboard++;
    }
  }
  return left;
}

export function tap(s: Station, i: number): TapResult {
  if (s.over) return null;
  if (!canLeave(s.grid, s.stage.rows, i)) return "blocked";
  const colour = s.grid[i];
  s.grid[i] = EMPTY;
  s.taps++;
  let res: TapResult;
  if (colour === current(s)) {
    s.aboard++;
    res = board(s) ? "departed" : "boarded";
  } else {
    s.bench.push(colour);
    res = "benched";
  }
  s.peak = Math.max(s.peak, s.bench.length);
  if (s.next >= s.stage.gondolas.length) {
    s.over = true;
    s.won = true;
  } else if (s.bench.length >= BENCH) s.over = true;
  return res;
}

export function starsFor(s: Station): number {
  if (!s.won) return 0;
  if (s.peak <= s.stage.par) return 3;
  if (s.peak <= s.stage.par + 1) return 2;
  return 1;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates, the only shuffle used here. */
function shuffle<T>(xs: T[], rng: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The hiker a sensible player taps next. */
export function nextTap(s: Station, rng: () => number, slip = 0): number {
  const out = leavers(s);
  if (!out.length) return -1;
  if (rng() < slip) return out[Math.floor(rng() * out.length)];
  const c = current(s);
  const match = out.find((i) => s.grid[i] === c);
  if (match !== undefined) return match;
  const after = s.stage.gondolas[s.next + 1] ?? -1;
  // a tap that frees a hiker of the gondola's colour, best if the tapped one rides the next gondola
  const opens = (i: number) => {
    const g = s.grid.slice();
    g[i] = EMPTY;
    return g.some((x, j) => x === c && canLeave(g, s.stage.rows, j));
  };
  const score = (i: number) => (opens(i) ? 4 : 0) + (s.grid[i] === after ? 2 : 0) + (s.bench.includes(s.grid[i]) ? 1 : 0);
  return out.slice().sort((a, b) => score(b) - score(a) || a - b)[0];
}

export interface TapperOpts {
  /** chance per tap of tapping any free hiker without thinking */
  slip?: number;
  seed?: number;
  /** "plan" plays to the gondolas; "random" taps any hiker who can leave */
  mode?: "plan" | "random";
}

export function pilot(st: GondolaStage, opts: TapperOpts = {}): Station {
  const { slip = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 6733 + 59);
  const s = newStation(st);
  while (!s.over) {
    let i: number;
    if (mode === "random") {
      const out = leavers(s);
      i = out.length ? out[Math.floor(rng() * out.length)] : -1;
    } else i = nextTap(s, rng, slip);
    if (i < 0) break;
    tap(s, i);
  }
  return s;
}

function shape(stage: number) {
  return {
    rows: Math.min(8, 4 + Math.floor(stage / 6)),
    colours: Math.min(COLOURS, 3 + Math.floor(stage / 6)),
    rocks: stage < 4 ? 0 : Math.min(4, 1 + Math.floor((stage - 4) / 8)),
    empties: stage < 8 ? 2 : 1, // spaces left on purpose (besides the rest after whole gondolas)
    swaps: Math.floor(stage * 0.8), // colours swapped between hikers near in order: they need the bench
  };
}

/** Human-like tappers: they plan for the gondola but tap without thinking about one time in ten. */
export const HUMAN_TAPPERS: TapperOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ slip: 0.1, seed }));

export function layout(stage: number, attempt: number): GondolaStage | null {
  const sh = shape(stage);
  const rng = mulberry(441000 + stage * 281 + attempt * 7919);
  const rows = sh.rows;
  const grid = new Array(rows * COLS).fill(0);
  // rocks stay off the top row
  const lower = shuffle(Array.from({ length: (rows - 1) * COLS }, (_, k) => k + COLS), rng);
  for (const i of lower.slice(0, sh.rocks)) grid[i] = ROCK;
  const people = grid.map((_, i) => i).filter((i) => grid[i] !== ROCK);
  const count = Math.floor((people.length - sh.empties) / SEATS) * SEATS;
  // leave the extra spaces in the top rows so the crowd can move from the start
  const spare = people.length - count;
  const tops = shuffle(people.filter((i) => i < COLS * 2), rng).slice(0, spare);
  for (const i of tops) grid[i] = EMPTY;
  // an order the hikers could leave in, one free hiker at a time
  const g = grid.slice();
  const order: number[] = [];
  while (order.length < count) {
    const free = g.map((_, i) => i).filter((i) => g[i] >= 0 && canLeave(g, rows, i));
    if (!free.length) return null;
    const i = free[Math.floor(rng() * free.length)];
    order.push(i);
    g[i] = EMPTY;
  }
  const palette = shuffle(Array.from({ length: COLOURS }, (_, k) => k), rng).slice(0, sh.colours);
  const gondolas: number[] = [];
  for (let k = 0; k < count / SEATS; k++) {
    // no two gondolas of one colour in a row, so the colours keep changing
    let c = palette[Math.floor(rng() * palette.length)];
    if (gondolas.length && c === gondolas[gondolas.length - 1]) c = palette[(palette.indexOf(c) + 1) % palette.length];
    gondolas.push(c);
  }
  const colourAt = order.map((_, k) => gondolas[Math.floor(k / SEATS)]);
  for (let k = 0; k < sh.swaps; k++) {
    const a = Math.floor(rng() * colourAt.length);
    const b = Math.min(colourAt.length - 1, a + 1 + Math.floor(rng() * 6));
    [colourAt[a], colourAt[b]] = [colourAt[b], colourAt[a]];
  }
  order.forEach((i, k) => (grid[i] = colourAt[k]));
  return { stage, rows, grid, gondolas, par: 0 };
}

export function buildStage(stage: number): GondolaStage {
  for (let attempt = 0; attempt < 400; attempt++) {
    const st = layout(stage, attempt);
    if (!st) continue;
    if (HUMAN_TAPPERS.some((o) => !pilot(st, o).won)) continue;
    const careful = [1, 2, 3].map((seed) => pilot(st, { seed }));
    if (careful.some((r) => !r.won)) continue;
    st.par = Math.max(...careful.map((r) => r.peak)) + (stage < 6 ? 1 : 0);
    if (stage >= 2 && [1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`gondola-queue stage ${stage + 1}: no fair station`);
}

export const GONDOLA_STAGES: GondolaStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
