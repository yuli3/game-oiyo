/**
 * Sleepy Windows (잠드는 창문) — an OIYO original lights-out puzzle (2026-11-25).
 *
 * It's bedtime in a block of flats, but some windows are still lit. Tap a window and its light flips — and so do the
 * lights of the neighbours above, below, left and right. Put every window to sleep within the taps.
 *
 * Pure and deterministic: every block is made by tapping a dark block at random, so each can be put to sleep.
 */

export const WINDOWS_SLUG = "sleepy-windows";
export const STAGE_COUNT = 30;

export interface WindowsStage {
  stage: number;
  cols: number;
  rows: number;
  lit: boolean[]; // row-major
  par: number; // taps a careful player needs (three stars at or under)
  limit: number; // taps on offer
}

export interface Block {
  stage: WindowsStage;
  lit: boolean[];
  taps: number;
  over: boolean;
  won: boolean;
}

export const newBlock = (stage: WindowsStage): Block => ({ stage, lit: stage.lit.slice(), taps: 0, over: false, won: false });

/** Flips a window and its four neighbours (in place). */
export function flip(lit: boolean[], cols: number, rows: number, i: number): void {
  const r = Math.floor(i / cols);
  const c = i % cols;
  lit[i] = !lit[i];
  if (r > 0) lit[i - cols] = !lit[i - cols];
  if (r < rows - 1) lit[i + cols] = !lit[i + cols];
  if (c > 0) lit[i - 1] = !lit[i - 1];
  if (c < cols - 1) lit[i + 1] = !lit[i + 1];
}

export const litCount = (b: Block) => b.lit.filter(Boolean).length;

export function tap(b: Block, i: number): boolean {
  if (b.over || i < 0 || i >= b.lit.length) return false;
  flip(b.lit, b.stage.cols, b.stage.rows, i);
  b.taps++;
  if (!b.lit.some(Boolean)) {
    b.over = true;
    b.won = true;
  } else if (b.taps >= b.stage.limit) b.over = true;
  return true;
}

export function starsFor(b: Block): number {
  if (!b.won) return 0;
  if (b.taps <= b.stage.par) return 3;
  if (b.taps <= Math.ceil(b.stage.par * 1.5) + 1) return 2;
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

/** The fewest taps that put a block to sleep (tries every set of top-row taps, then chases each row down). */
export function fewestTaps(lit: boolean[], cols: number, rows: number): number {
  let best = Infinity;
  for (let mask = 0; mask < 1 << cols; mask++) {
    const l = lit.slice();
    let n = 0;
    for (let c = 0; c < cols; c++)
      if (mask & (1 << c)) {
        flip(l, cols, rows, c);
        n++;
      }
    for (let r = 1; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (l[(r - 1) * cols + c]) {
          flip(l, cols, rows, r * cols + c);
          n++;
        }
    if (!l.some(Boolean)) best = Math.min(best, n);
  }
  return best;
}

export interface SleeperOpts {
  /** "chase": a player who knows the chase-down trick (turn off each row from the row below, then the light-chasing
   *  table for the top row); "plan": the fewest taps; "random": anything */
  mode?: "chase" | "plan" | "random";
  /** chance per tap of tapping the wrong window next to the right one */
  slip?: number;
  seed?: number;
}

/** A careful player's taps: the fewest (found row by row). */
export function plan(lit: boolean[], cols: number, rows: number): number[] {
  let best: number[] | null = null;
  for (let mask = 0; mask < 1 << cols; mask++) {
    const l = lit.slice();
    const taps: number[] = [];
    for (let c = 0; c < cols; c++)
      if (mask & (1 << c)) {
        flip(l, cols, rows, c);
        taps.push(c);
      }
    for (let r = 1; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (l[(r - 1) * cols + c]) {
          flip(l, cols, rows, r * cols + c);
          taps.push(r * cols + c);
        }
    if (!l.some(Boolean) && (!best || taps.length < best.length)) best = taps;
  }
  return best ?? [];
}

export function pilot(st: WindowsStage, opts: SleeperOpts = {}): Block {
  const { mode = "chase", slip = 0, seed = 1 } = opts;
  const rng = mulberry(seed * 4243 + 97);
  const b = newBlock(st);
  const { cols, rows } = st;
  const press = (i: number) => {
    if (b.over) return;
    let k = i;
    if (rng() < slip) {
      // a near miss: the window beside it
      const r = Math.floor(i / cols);
      const c = i % cols;
      const near = [r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1, c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1].filter((x) => x >= 0);
      k = near[Math.floor(rng() * near.length)];
    }
    tap(b, k);
  };
  if (mode === "random") {
    while (!b.over && b.taps < 2000) tap(b, Math.floor(rng() * cols * rows));
    return b;
  }
  if (mode === "plan") {
    for (const i of plan(b.lit, cols, rows)) press(i);
    // after a slip, plan again from where things stand
    let guard = 0;
    while (!b.over && guard++ < 10) for (const i of plan(b.lit, cols, rows)) press(i);
    return b;
  }
  // chase: turn off each row from the row below; if the bottom row is still lit, look up which top-row windows that
  // pattern calls for (the light-chasing table), tap them, and chase down again
  const chase = () => {
    for (let r = 1; r < rows && !b.over; r++)
      for (let c = 0; c < cols && !b.over; c++) if (b.lit[(r - 1) * cols + c]) press(r * cols + c);
  };
  chase();
  let guard = 0;
  while (!b.over && guard++ < 20) {
    const top = plan(b.lit, cols, rows).filter((i) => i < cols);
    if (!top.length) {
      chase();
      continue;
    }
    for (const c of top) press(c);
    chase();
  }
  return b;
}

function shape(stage: number) {
  return {
    cols: stage < 4 ? 3 : stage < 12 ? 4 : 5,
    rows: stage < 4 ? 3 : stage < 8 ? 4 : stage < 20 ? 5 : 6,
    presses: Math.min(12, 2 + Math.floor(stage / 3)),
  };
}

/** Human-like players: they know the chase-down trick but tap the window beside the right one about one time in fifteen. */
export const HUMAN_SLEEPERS: SleeperOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ mode: "chase", slip: 0.07, seed }));

export function buildStage(stage: number): WindowsStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry(511000 + stage * 337 + attempt * 7919);
    const lit = new Array(sh.cols * sh.rows).fill(false);
    for (const i of shuffle(lit.map((_, k) => k), rng).slice(0, sh.presses)) flip(lit, sh.cols, sh.rows, i);
    if (lit.filter(Boolean).length < 2) continue;
    const par = fewestTaps(lit, sh.cols, sh.rows);
    const st: WindowsStage = { stage, cols: sh.cols, rows: sh.rows, lit, par, limit: 9999 };
    const runs = HUMAN_SLEEPERS.map((o) => pilot(st, o));
    if (runs.some((r) => !r.won)) continue;
    st.limit = Math.max(...runs.map((r) => r.taps)) + (stage < 5 ? 6 : 5);
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`sleepy-windows stage ${stage + 1}: no fair block`);
}

export const WINDOWS_STAGES: WindowsStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
