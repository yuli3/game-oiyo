/**
 * Daljip Fire (달집태우기) — pack straw into the moon house so it blazes to the top as the full moon rises.
 *
 * On Jeongwol Daeboreum villagers build a daljip, a tall cone of pine branches and straw, and set it alight
 * the moment the first full moon of the year rises over the hill: the brighter and higher it burns, the
 * better the year. The cone you're given is mostly pine, which catches slowly; some of it is snow-damp and
 * slower still; and the night wind pushes the flames one way. You have a few bundles of dry straw. Tap cells
 * of the cone to pack straw there (tap again to take it out), then light the base. Fire races through straw.
 * Get the flames to the wish paper at the top before the moon has risen.
 *
 * Pure and deterministic: every daljip is seeded per stage. Fire spreads cell to cell like water through
 * pipes: each cell catches when its quickest burning neighbour reaches it (Dijkstra).
 */

export const DALJIP_SLUG = "daljip-fire";
export const STAGE_COUNT = 30;
export const COLS = 9;
export const ROWS = 12;
export const STRAW = 0.25; // s for fire to cross a straw cell
export const PINE = 1; // s for an ordinary pine cell
export const DAMP = 3; // s for a snow-damp one

export type Cell = "air" | "pine" | "damp";

export interface DaljipStage {
  stage: number;
  cells: Cell[]; // row-major, row 0 at the top
  pine: number[]; // per cell: its own pine time (pine cells vary a little)
  base: number; // cell the fire is lit at (bottom row)
  top: number; // the wish paper
  wind: number; // −1 blowing left … +1 blowing right
  straws: number;
  moonrise: number; // s from lighting
  par: number; // s the best packing takes
}

export const idx = (c: number, r: number) => r * COLS + c;
export const colOf = (i: number) => i % COLS;
export const rowOf = (i: number) => Math.floor(i / COLS);

/** Seconds for fire to cross into cell `to` from a neighbour, with straw where packed. */
export function crossTime(st: DaljipStage, from: number, to: number, straw: ReadonlySet<number>): number {
  const kind = st.cells[to];
  if (kind === "air") return Infinity;
  let base = straw.has(to) ? STRAW : kind === "damp" ? DAMP : st.pine[to];
  const dc = colOf(to) - colOf(from);
  const dr = rowOf(to) - rowOf(from);
  // flames climb readily and creep downward; the wind helps them along its way and holds them back against it
  if (dr < 0) base *= 0.8;
  else if (dr > 0) base *= 1.4;
  if (dc !== 0) base *= 1 - 0.4 * st.wind * dc;
  return base;
}

/** When each cell catches fire after lighting the base (Infinity if never). */
export function arrival(st: DaljipStage, straw: ReadonlySet<number>): number[] {
  const n = COLS * ROWS;
  const at = new Array(n).fill(Infinity);
  const done = new Array(n).fill(false);
  at[st.base] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && at[i] < Infinity && (u < 0 || at[i] < at[u])) u = i;
    if (u < 0) break;
    done[u] = true;
    const c = colOf(u);
    const r = rowOf(u);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cc = c + dc;
      const rr = r + dr;
      if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
      const v = idx(cc, rr);
      if (done[v]) continue;
      const t = at[u] + crossTime(st, u, v, straw);
      if (t < at[v]) at[v] = t;
    }
  }
  return at;
}

export const reachTop = (st: DaljipStage, straw: ReadonlySet<number>) => arrival(st, straw)[st.top];

export interface Yard {
  stage: DaljipStage;
  straw: Set<number>;
  lit: boolean;
  t: number; // s since lighting
  at: number[]; // arrival times once lit
  over: boolean;
  won: boolean;
}

export function newYard(stage: DaljipStage): Yard {
  return { stage, straw: new Set(), lit: false, t: 0, at: [], over: false, won: false };
}

/** Packs straw into a cell, or takes it out again. Only before lighting, only in the cone. */
export function toggleStraw(y: Yard, cell: number): "packed" | "removed" | "full" | null {
  if (y.lit || y.over || y.stage.cells[cell] === "air" || cell === y.stage.base) return null;
  if (y.straw.has(cell)) {
    y.straw.delete(cell);
    return "removed";
  }
  if (y.straw.size >= y.stage.straws) return "full";
  y.straw.add(cell);
  return "packed";
}

export function light(y: Yard): boolean {
  if (y.lit || y.over) return false;
  y.lit = true;
  y.at = arrival(y.stage, y.straw);
  return true;
}

/** Advances the burn; ends when the top catches (won if before moonrise) or the moon is up first. */
export function stepYard(y: Yard, dt: number): boolean {
  if (!y.lit || y.over) return false;
  y.t += dt;
  const top = y.at[y.stage.top];
  if (top <= y.stage.moonrise && y.t >= top) {
    y.over = true;
    y.won = true;
  } else if (y.t >= y.stage.moonrise && top > y.stage.moonrise) {
    y.over = true;
  }
  return y.over;
}

export const burning = (y: Yard, cell: number) => y.lit && y.at[cell] <= y.t;

export function starsFor(y: Yard): number {
  if (!y.won) return 0;
  const top = y.at[y.stage.top];
  if (top <= y.stage.par + 0.15) return 3;
  if (top <= (y.stage.par + y.stage.moonrise) / 2) return 2;
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

export const coneCells = (st: DaljipStage) => st.cells.flatMap((k, i) => (k !== "air" && i !== st.base ? [i] : []));

/** The cells on the quickest burning route to the top, base excluded. */
export function route(st: DaljipStage, straw: ReadonlySet<number>): number[] {
  const at = arrival(st, straw);
  const path: number[] = [];
  let v = st.top;
  let guard = 0;
  while (v !== st.base && guard++ < COLS * ROWS) {
    path.push(v);
    const c = colOf(v);
    const r = rowOf(v);
    let prev = -1;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cc = c + dc;
      const rr = r + dr;
      if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
      const u = idx(cc, rr);
      if (Math.abs(at[u] + crossTime(st, u, v, straw) - at[v]) < 1e-9) {
        prev = u;
        break;
      }
    }
    if (prev < 0) break;
    v = prev;
  }
  return path;
}

export interface PlanOpts {
  /** "best" tries every cell each time; "route" only looks along the current quickest route and sometimes
   * takes the second- or third-best; "straight" stacks straw up the middle; "random" packs anywhere */
  mode?: "best" | "route" | "straight" | "random";
  seed?: number;
}

/** A packing of straw by the given way of thinking. */
export function plan(st: DaljipStage, opts: PlanOpts = {}): Set<number> {
  const { mode = "best", seed = 1 } = opts;
  const rng = mulberry(seed);
  const straw = new Set<number>();
  if (mode === "random") {
    for (const c of shuffle(coneCells(st), rng).slice(0, st.straws)) straw.add(c);
    return straw;
  }
  if (mode === "straight") {
    const mid = colOf(st.base);
    for (let r = rowOf(st.base) - 1; r >= 0 && straw.size < st.straws; r--) if (st.cells[idx(mid, r)] !== "air") straw.add(idx(mid, r));
    return straw;
  }
  while (straw.size < st.straws) {
    const pool = mode === "best" ? coneCells(st) : route(st, straw);
    const scored = pool
      .filter((c) => !straw.has(c))
      .map((c) => {
        const s = new Set(straw);
        s.add(c);
        return { c, t: reachTop(st, s) };
      })
      .sort((a, b) => a.t - b.t);
    if (scored.length === 0) break;
    const pick = mode === "route" ? scored[Math.min(scored.length - 1, Math.floor(rng() * rng() * 3))] : scored[0];
    straw.add(pick.c);
  }
  return straw;
}

export function play(st: DaljipStage, straw: Set<number>): Yard {
  const y = newYard(st);
  for (const c of straw) toggleStraw(y, c);
  light(y);
  while (!y.over && y.t < 200) stepYard(y, 1 / 30);
  return y;
}

function shape(stage: number) {
  return {
    straws: 3 + Math.floor(stage / 8),
    damp: Math.min(20, 2 + Math.floor(stage * 0.6)),
    wind: Math.min(0.75, stage * 0.03),
  };
}

/** Human-like packers used to set the moonrise: they look along the fire's route, not at every cell. */
export const HUMAN_PACKERS: PlanOpts[] = [1, 2, 3, 4].map((seed) => ({ mode: "route" as const, seed }));

function layout(stage: number, attempt: number): DaljipStage {
  const sh = shape(stage);
  const rng = mulberry(111300 + stage * 83 + attempt * 7919);
  const cells: Cell[] = [];
  const pine: number[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      // a cone: one cell wide at the top, the full width at the bottom
      const half = (r / (ROWS - 1)) * ((COLS - 1) / 2);
      cells.push(Math.abs(c - (COLS - 1) / 2) <= half + 0.01 ? "pine" : "air");
      pine.push(PINE * (0.8 + rng() * 0.5));
    }
  const base = idx((COLS - 1) / 2, ROWS - 1);
  const top = idx((COLS - 1) / 2, 0);
  const inside = cells.flatMap((k, i) => (k === "pine" && i !== base && i !== top ? [i] : []));
  for (const c of shuffle(inside, rng).slice(0, sh.damp)) cells[c] = "damp";
  const wind = sh.wind * (rng() < 0.5 ? -1 : 1);
  return { stage, cells, pine, base, top, wind, straws: sh.straws, moonrise: 999, par: 0 };
}

/**
 * Builds the daljip and sets the moonrise just after the slowest human-like packer's fire reaches the top;
 * re-rolls one that stacking straw straight up the middle, or packing at random, would also beat.
 */
export function buildStage(stage: number): DaljipStage {
  for (let attempt = 0; attempt < 80; attempt++) {
    const st = layout(stage, attempt);
    if (!Number.isFinite(reachTop(st, new Set()))) continue;
    st.par = reachTop(st, plan(st));
    const human = Math.max(...HUMAN_PACKERS.map((o) => reachTop(st, plan(st, o))));
    st.moonrise = Math.ceil((human + 0.5) * 10) / 10;
    const naive = Math.min(reachTop(st, plan(st, { mode: "straight" })), reachTop(st, new Set()), ...[1, 2, 3].map((seed) => reachTop(st, plan(st, { mode: "random", seed }))));
    if (naive <= st.moonrise) continue;
    return st;
  }
  throw new Error(`daljip-fire stage ${stage + 1}: no fair daljip`);
}

export const DALJIP_STAGES: DaljipStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
