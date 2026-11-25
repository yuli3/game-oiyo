/**
 * Boba Pins (버블티 핀 뽑기) — an OIYO original pull-the-pin puzzle (2026-11-25).
 *
 * A bubble-tea machine keeps its pearls behind golden pins. Tap a pin to pull it out and whatever it held falls. Brown
 * sugar pearls are ready to serve; plain white pearls turn brown the moment a brown one touches them, but a white pearl
 * that reaches the cup spoils the drink, and so does a chili flake. Pearls that roll into the side bins are wasted.
 * Fill the cup with every pearl, all of them brown, pulling as few pins as you can.
 *
 * Pure and deterministic: pearls fall cell by cell on an 18 × 28 grid (fall, slide, roll toward a drop), scanned in a
 * fixed order. Every stage is laid out from a seed per stage and kept only when a search finds the pins to pull.
 */

export const BOBA_SLUG = "boba-pins";
export const STAGE_COUNT = 30;
export const COLS = 18;
export const ROWS = 28;
export const CELL = 20;
export const CUP_TOP = 15; // the cup: the centre columns from this row down
export const ROLL = 7; // how far along a floor a pearl looks for a drop

export const EMPTY = 0;
export const WALL = 1;
export const PIN = 2;
export const PLAIN = 3;
export const BROWN = 4;
export const CHILI = 5;

export interface BobaStage {
  stage: number;
  /** the starting grid, row by row (COLS × ROWS) */
  grid: number[];
  /** each pin's cells (indices into the grid) */
  pins: number[][];
  /** the pins to pull, in order */
  plan: number[];
  par: number;
}

export interface Machine {
  stage: BobaStage;
  grid: number[];
  pulled: boolean[];
  pulls: number;
  steps: number;
  settled: boolean;
  over: boolean;
  won: boolean;
  /** why it was lost: a white pearl or chili in the cup, or pearls in a bin */
  why: "" | "plain" | "chili" | "spill";
}

export const at = (r: number, c: number) => r * COLS + c;
export const isCup = (r: number, c: number) => r >= CUP_TOP && r < ROWS - 1 && c >= 4 && c <= 13;
export const isBin = (c: number) => c === 1 || c === 2 || c === 15 || c === 16;
const isGrain = (v: number) => v === PLAIN || v === BROWN || v === CHILI;

export function newMachine(stage: BobaStage): Machine {
  return { stage, grid: stage.grid.slice(), pulled: stage.pins.map(() => false), pulls: 0, steps: 0, settled: true, over: false, won: false, why: "" };
}

/** Pulls pin k: its cells open. */
export function pull(m: Machine, k: number): boolean {
  if (m.over || k < 0 || k >= m.stage.pins.length || m.pulled[k]) return false;
  m.pulled[k] = true;
  m.pulls++;
  for (const i of m.stage.pins[k]) if (m.grid[i] === PIN) m.grid[i] = EMPTY;
  m.settled = false;
  return true;
}

/** The pin at a cell (or −1). */
export function pinAt(m: Machine, r: number, c: number): number {
  const i = at(r, c);
  return m.stage.pins.findIndex((cells, k) => !m.pulled[k] && cells.includes(i));
}

/** One tick: every grain falls, slides or rolls once (bottom row first), then brown spreads to touching white. */
export function step(m: Machine): boolean {
  if (m.over) return false;
  const g = m.grid;
  const moved = new Uint8Array(g.length);
  let changed = false;
  const lr = m.steps % 2 === 0;
  for (let r = ROWS - 2; r >= 0; r--) {
    for (let j = 0; j < COLS; j++) {
      const c = lr ? j : COLS - 1 - j;
      const i = at(r, c);
      const v = g[i];
      if (!isGrain(v) || moved[i]) continue;
      const go = (to: number) => {
        g[to] = v;
        g[i] = EMPTY;
        moved[to] = 1;
        changed = true;
      };
      if (g[at(r + 1, c)] === EMPTY) {
        go(at(r + 1, c));
        continue;
      }
      const dirs = lr ? [-1, 1] : [1, -1];
      let done = false;
      for (const d of dirs) {
        const cc = c + d;
        if (cc < 0 || cc >= COLS) continue;
        if (g[at(r, cc)] === EMPTY && g[at(r + 1, cc)] === EMPTY) {
          go(at(r + 1, cc));
          done = true;
          break;
        }
      }
      if (done) continue;
      // roll along the floor toward the nearest drop
      let best = 0;
      let bestK = ROLL + 1;
      for (const d of dirs) {
        for (let k = 1; k <= ROLL; k++) {
          const cc = c + d * k;
          if (cc < 0 || cc >= COLS || g[at(r, cc)] !== EMPTY) break;
          if (g[at(r + 1, cc)] === EMPTY) {
            if (k < bestK) {
              bestK = k;
              best = d;
            }
            break;
          }
        }
      }
      if (best !== 0) go(at(r, c + best));
    }
  }
  // brown spreads to the white pearls it touches
  const turn: number[] = [];
  for (let i = 0; i < g.length; i++) {
    if (g[i] !== PLAIN) continue;
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    if ((r > 0 && g[i - COLS] === BROWN) || (r < ROWS - 1 && g[i + COLS] === BROWN) || (c > 0 && g[i - 1] === BROWN) || (c < COLS - 1 && g[i + 1] === BROWN)) turn.push(i);
  }
  for (const i of turn) g[i] = BROWN;
  if (turn.length) changed = true;
  m.steps++;
  m.settled = !changed;
  judge(m);
  return changed;
}

function judge(m: Machine): void {
  let pearls = 0;
  let served = 0;
  for (let i = 0; i < m.grid.length; i++) {
    const v = m.grid[i];
    if (!isGrain(v)) continue;
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    if (v !== CHILI) pearls++;
    if (isCup(r, c)) {
      if (v === CHILI) return lose(m, "chili");
      if (v === PLAIN) return lose(m, "plain");
      served++;
    }
    if (v !== CHILI && isBin(c)) return lose(m, "spill");
  }
  if (m.settled && served === pearls) {
    m.over = true;
    m.won = true;
  }
}

function lose(m: Machine, why: Machine["why"]): void {
  m.over = true;
  m.why = why;
}

/** Runs until nothing moves (or it's over). */
export function settle(m: Machine, cap = 800): void {
  for (let n = 0; n < cap && !m.over; n++) if (!step(m)) break;
}

export function starsFor(m: Machine): number {
  if (!m.won) return 0;
  if (m.pulls <= m.stage.par) return 3;
  if (m.pulls <= m.stage.par + 1) return 2;
  return 1;
}

export function countOf(m: Machine, v: number): number {
  return m.grid.filter((x) => x === v).length;
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

export interface PullerOpts {
  seed?: number;
  /** plan: the stage's pins; careful: never a pin whose pull spoils the drink straight away; random: any pin */
  mode?: "plan" | "careful" | "random";
}

function clone(m: Machine): Machine {
  return { ...m, grid: m.grid.slice(), pulled: m.pulled.slice() };
}

/** Plays a stage, letting everything settle after each pull. */
export function pilot(st: BobaStage, opts: PullerOpts = {}): Machine {
  const { seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 2659 + 53);
  const m = newMachine(st);
  settle(m);
  if (mode === "plan") {
    for (const k of st.plan) {
      if (m.over) break;
      pull(m, k);
      settle(m);
    }
    return m;
  }
  let guard = 0;
  while (!m.over && guard++ < 40) {
    const left = st.pins.map((_, k) => k).filter((k) => !m.pulled[k]);
    if (!left.length) break;
    let choices = left;
    if (mode === "careful") {
      // look at what each pin would do, and leave the ones that spoil the drink at once
      const safe = left.filter((k) => {
        const c = clone(m);
        pull(c, k);
        settle(c);
        return !(c.over && !c.won);
      });
      const winning = safe.filter((k) => {
        const c = clone(m);
        pull(c, k);
        settle(c);
        return c.won;
      });
      choices = winning.length ? winning : safe.length ? safe : left;
    }
    pull(m, choices[Math.floor(rng() * choices.length)]);
    settle(m);
  }
  if (!m.over) m.over = true;
  return m;
}

/** Finds the fewest pulls that fill the cup (null if none). */
export function solve(st: BobaStage): number[] | null {
  const root = newMachine(st);
  settle(root);
  let best: number[] | null = null;
  const go = (m: Machine, path: number[]) => {
    if (best && path.length >= best.length) return;
    for (let k = 0; k < st.pins.length; k++) {
      if (m.pulled[k]) continue;
      const c = clone(m);
      pull(c, k);
      settle(c);
      if (c.won) {
        if (!best || path.length + 1 < best.length) best = [...path, k];
        continue;
      }
      if (c.over) continue;
      go(c, [...path, k]);
    }
  };
  go(root, []);
  return best;
}

type Content = "S" | "P" | "C" | "E";
interface Chamber {
  lane: 0 | 1;
  top: number;
  floor: number;
  what: Content;
  side: boolean;
}

const LANES: Array<{ c0: number; c1: number; side: number }> = [
  { c0: 4, c1: 8, side: 3 },
  { c0: 10, c1: 13, side: 14 },
];

/** Lays out the machine: walls, chambers with their pins, and the grains in them. */
export function layout(chambers: Chamber[], longPins: boolean, fill: number, rng: () => number): { grid: number[]; pins: number[][] } {
  const g = new Array(COLS * ROWS).fill(EMPTY);
  for (let r = 0; r < ROWS; r++) {
    g[at(r, 0)] = WALL;
    g[at(r, COLS - 1)] = WALL;
  }
  for (let c = 0; c < COLS; c++) {
    g[at(0, c)] = WALL;
    g[at(ROWS - 1, c)] = WALL;
  }
  // the bins either side and the wall between the lanes, down to the shaft
  for (let r = 1; r < ROWS - 1; r++) {
    g[at(r, 3)] = WALL;
    g[at(r, 14)] = WALL;
  }
  for (let r = 1; r <= 13; r++) g[at(r, 9)] = WALL;
  const pins: number[][] = [];
  const floorPin = new Map<string, number>();
  for (const ch of chambers) {
    const ln = LANES[ch.lane];
    const cells: number[] = [];
    for (let c = ln.c0; c <= ln.c1; c++) cells.push(at(ch.floor, c));
    const key = String(ch.floor);
    if (longPins && floorPin.has(key)) {
      // one long pin under both lanes, through the wall between them
      const k = floorPin.get(key) as number;
      pins[k].push(...cells, at(ch.floor, 9));
    } else {
      floorPin.set(key, pins.length);
      pins.push(cells);
    }
    if (ch.side) {
      const side: number[] = [];
      for (let r = ch.top; r < ch.floor; r++) side.push(at(r, ln.side));
      pins.push(side);
    }
    // the grains, packed from the floor up
    const w = ln.c1 - ln.c0 + 1;
    const rows = ch.floor - ch.top;
    const n = ch.what === "E" ? 0 : Math.max(w, Math.round(w * rows * fill * (0.85 + rng() * 0.3)));
    let placed = 0;
    for (let r = ch.floor - 1; r >= ch.top && placed < n; r--) {
      for (let c = ln.c0; c <= ln.c1 && placed < n; c++) {
        g[at(r, c)] = ch.what === "S" ? BROWN : ch.what === "P" ? PLAIN : CHILI;
        placed++;
      }
    }
  }
  for (const cells of pins) for (const i of cells) g[i] = PIN;
  return { grid: g, pins };
}

const RECIPES_EASY: Content[][] = [["S"], ["C"], ["E"]];
const RECIPES: Content[][] = [["S"], ["C"], ["S", "P"], ["P", "S"], ["C", "S"], ["S", "C"], ["E", "S"], ["S", "E"]];

function shape(stage: number) {
  return {
    recipes: stage < 3 ? RECIPES_EASY : RECIPES,
    side: stage < 2 ? 0.5 : 0.7, // chance a chamber has a side pin
    long: stage >= 8 ? 0.6 : 0,
    minPar: stage < 4 ? 1 : stage < 12 ? 2 : 3,
    fill: 0.55,
  };
}

export function buildStage(stage: number): BobaStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 600; attempt++) {
    const rng = mulberry(691000 + stage * 457 + attempt * 7919);
    const chambers: Chamber[] = [];
    let browns = 0;
    for (const lane of [0, 1] as const) {
      const recipe = sh.recipes[Math.floor(rng() * sh.recipes.length)];
      const geo = recipe.length === 1 ? [{ top: 3, floor: 10 }] : [{ top: 1, floor: 6 }, { top: 7, floor: 12 }];
      recipe.forEach((what, k) => {
        if (what === "S") browns++;
        // a chili chamber with a way out to the bin, otherwise sometimes a side pin as a trap
        const side = what === "C" ? rng() < 0.8 : rng() < sh.side;
        chambers.push({ lane, top: geo[k].top, floor: geo[k].floor, what, side });
      });
    }
    if (!browns) continue;
    const { grid, pins } = layout(chambers, rng() < sh.long, sh.fill, rng);
    const st: BobaStage = { stage, grid, pins, plan: [], par: 0 };
    const plan = solve(st);
    if (!plan || plan.length < sh.minPar) continue;
    st.plan = plan;
    st.par = plan.length;
    if (!pilot(st).won) continue;
    // a careful player always gets there; pulling at random mostly spoils it
    if ([1, 2, 3, 4, 5, 6, 7, 8].some((seed) => !pilot(st, { mode: "careful", seed }).won)) continue;
    const rwins = Array.from({ length: 30 }, (_, k) => k + 1).filter((seed) => pilot(st, { mode: "random", seed }).won).length;
    if (rwins > (stage < 3 ? 12 : stage < 8 ? 6 : 3)) continue;
    if (stage >= 3 && [1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`boba-pins stage ${stage + 1}: no fair machine`);
}

/** The 30 machines, built once by scripts/build-boba-pins-stages.ts (searching the pins takes a while, too slow for a page). */
export { BOBA_STAGES } from "./boba-pins-stages";
