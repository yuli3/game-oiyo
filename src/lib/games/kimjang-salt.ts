/**
 * Kimjang Salt (김장 배추 절이기) — salt the halved cabbages just right for the winter kimchi.
 *
 * Every late autumn families gather for kimjang, and the first job is salting the cabbages. A halved
 * cabbage lies on the tray, split into patches. Each patch needs its own amount of salt: the thick white
 * stems near the core need much more than the thin green leaf tips. Hold and drag to sprinkle; salt falls
 * thickest right under your hand and a little onto the patches around it. A patch inside its band is well
 * salted; under it stays raw and stiff, over it turns too salty. When the clock for a cabbage runs out
 * (or you tap done) it is judged and the next one comes. Salt enough patches well to clear the stage.
 *
 * Pure and deterministic: cabbages are seeded per stage.
 */

export const KIMJANG_SLUG = "kimjang-salt";
export const STAGE_COUNT = 30;
export const COLS = 4;
export const ROWS = 5;
export const CELL = 60; // px
export const GRID_X = 60; // left edge of the grid on the 360 px field
export const GRID_Y = 130; // top edge
export const SPREAD = 34; // px: salt falls as exp(-(d/SPREAD)²) around the hand

export interface Cabbage { target: number[]; tol: number; time: number } // target per cell (row-major), band ±tol share, seconds
export interface KimjangStage {
  stage: number;
  rate: number; // salt per second right under the hand
  cabbages: Cabbage[];
  need: number;
  par: number;
}

export interface Tray {
  stage: KimjangStage;
  idx: number;
  salt: number[];
  t: number; // time on this cabbage
  total: number;
  hand: { x: number; y: number } | null;
  good: number;
  raw: number;
  salty: number;
  results: number[]; // good patches per finished cabbage
  over: boolean;
  won: boolean;
}

export const cellCenter = (i: number) => ({ x: GRID_X + ((i % COLS) + 0.5) * CELL, y: GRID_Y + (Math.floor(i / COLS) + 0.5) * CELL });
export const lo = (c: Cabbage, i: number) => c.target[i] * (1 - c.tol);
export const hi = (c: Cabbage, i: number) => c.target[i] * (1 + c.tol);

export function kernel(dx: number, dy: number): number {
  return Math.exp(-(dx * dx + dy * dy) / (SPREAD * SPREAD));
}

export function newTray(stage: KimjangStage): Tray {
  return { stage, idx: 0, salt: new Array(COLS * ROWS).fill(0), t: 0, total: 0, hand: null, good: 0, raw: 0, salty: 0, results: [], over: false, won: false };
}

export const current = (k: Tray): Cabbage => k.stage.cabbages[Math.min(k.idx, k.stage.cabbages.length - 1)];

/** Where the hand is (null when lifted). Salt only falls on the cabbage area. */
export function setHand(k: Tray, x: number | null, y = 0): void {
  k.hand = x === null ? null : { x, y };
}

export interface Judgement { good: number; raw: number; salty: number }

export function judge(c: Cabbage, salt: number[]): Judgement {
  const j = { good: 0, raw: 0, salty: 0 };
  salt.forEach((s, i) => {
    if (s < lo(c, i)) j.raw++;
    else if (s > hi(c, i)) j.salty++;
    else j.good++;
  });
  return j;
}

/** Finishes the cabbage on the tray now. */
export function done(k: Tray): Judgement | null {
  if (k.over) return null;
  const j = judge(current(k), k.salt);
  k.good += j.good;
  k.raw += j.raw;
  k.salty += j.salty;
  k.results.push(j.good);
  k.idx++;
  k.salt = new Array(COLS * ROWS).fill(0);
  k.t = 0;
  k.hand = null;
  if (k.idx >= k.stage.cabbages.length) {
    k.over = true;
    k.won = k.good >= k.stage.need;
  }
  return j;
}

export function stepTray(k: Tray, dt: number): Judgement | null {
  if (k.over) return null;
  k.t += dt;
  k.total += dt;
  if (k.hand) {
    const r = k.stage.rate * dt;
    for (let i = 0; i < k.salt.length; i++) {
      const c = cellCenter(i);
      k.salt[i] += r * kernel(k.hand.x - c.x, k.hand.y - c.y);
    }
  }
  if (k.t >= current(k).time) return done(k);
  return null;
}

export function starsFor(k: Tray): number {
  if (!k.won) return 0;
  if (k.good >= k.stage.par - 2) return 3;
  if (k.good >= Math.ceil((k.stage.need + k.stage.par) / 2)) return 2;
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

export interface PilotOpts {
  /** s between decisions */
  think?: number;
  /** px/s the hand travels between patches (lifted) */
  speed?: number;
  /** ± px the hand lands off the patch it aims at */
  aim?: number;
  /** s it takes to notice a patch is done and lift */
  lift?: number;
  seed?: number;
  /** "plan" aims at the patch furthest from its mark; "even" salts every patch the same; "idle" does nothing */
  mode?: "plan" | "even" | "idle";
}

/**
 * Autopilot: aims at the patch most short of the middle of its band, provided salting there won't push a
 * neighbour over its band; lifts while moving; taps done when nothing is left to fix.
 */
export function pilot(stage: KimjangStage, opts: PilotOpts = {}): Tray {
  const { think = 0.05, speed = 1200, aim = 0, lift = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed);
  const k = newTray(stage);
  const dt = 1 / 60;
  let pos = { x: 180, y: 480 };
  let goal: { x: number; y: number; cell: number } | null = null;
  let next = 0;
  let liftAt = -1;
  let evenCell = 0;
  while (!k.over && k.total < 900) {
    const c = current(k);
    const idx = k.idx;
    if (mode !== "idle" && k.t >= next) {
      next = k.t + think;
      if (mode === "even") {
        // the same dwell on every patch, regardless of what it needs
        const avg = c.target.reduce((s, v) => s + v, 0) / c.target.length;
        if (!goal || k.salt[goal.cell] >= avg) {
          if (evenCell >= COLS * ROWS) {
            done(k);
            evenCell = 0;
            goal = null;
            continue;
          }
          const cc = cellCenter(evenCell);
          goal = { ...cc, cell: evenCell++ };
        }
      } else {
        let best = -1;
        let score = 0.02;
        for (let i = 0; i < COLS * ROWS; i++) {
          const mid = c.target[i];
          const need = (mid - k.salt[i]) / mid;
          if (need <= score) continue;
          // salting here for a moment must not push any patch over its band
          const at = cellCenter(i);
          let safe = true;
          for (let j = 0; j < COLS * ROWS && safe; j++) {
            if (j === i) continue;
            const cj = cellCenter(j);
            const add = stage.rate * (think + lift + 0.05) * kernel(at.x - cj.x, at.y - cj.y);
            // patches already over can't be saved; only worry about spilling onto good ones
            if (add > 0.002 && k.salt[j] <= hi(c, j) && k.salt[j] + add > hi(c, j) * 0.97) safe = false;
          }
          if (!safe) continue;
          score = need;
          best = i;
        }
        // lift once the patch under the hand is at its mark (a beat late for a human)
        if (!goal) {
          if (best < 0) {
            done(k);
            continue;
          }
          const cc = cellCenter(best);
          goal = { x: cc.x + (rng() * 2 - 1) * aim, y: cc.y + (rng() * 2 - 1) * aim, cell: best };
        }
      }
    }
    // the patch under the hand is watched all the time: lift at the band's middle, a beat late for a human
    // (who allows for that beat by lifting a little early)
    if (mode === "plan" && goal && k.hand && liftAt < 0 && k.salt[goal.cell] + stage.rate * lift >= current(k).target[goal.cell]) liftAt = k.t + lift;
    if (liftAt >= 0 && k.t >= liftAt) {
      goal = null;
      liftAt = -1;
      next = k.t;
    }
    // move the hand: salt only falls once it has arrived
    if (goal) {
      const dx = goal.x - pos.x;
      const dy = goal.y - pos.y;
      const d = Math.hypot(dx, dy);
      if (d > 2) {
        const step = Math.min(d, speed * dt);
        pos = { x: pos.x + (dx / d) * step, y: pos.y + (dy / d) * step };
        setHand(k, null);
      } else setHand(k, goal.x, goal.y);
    } else setHand(k, null);
    stepTray(k, dt);
    if (k.idx !== idx) {
      goal = null;
      liftAt = -1;
      next = 0;
    }
  }
  return k;
}

function shape(stage: number) {
  return {
    cabbages: 2 + Math.floor(stage / 8),
    rate: 2.6 + stage * 0.07,
    tol: Math.max(0.14, 0.3 - stage * 0.006),
    spread: 0.25 + stage * 0.018, // how unevenly the patches differ from the leaf-to-stem trend
    time: Math.max(13, 20 - stage * 0.25),
  };
}

/** Human-like salters used to set the mark: a bit slow to decide and to lift, and not quite on target. */
export const HUMAN_SALTERS: PilotOpts[] = [1, 2, 3, 4].map((seed) => ({ think: 0.25, speed: 700, aim: 9, lift: 0.12, seed }));

export function buildStage(stage: number): KimjangStage {
  const sh = shape(stage);
  const rng = mulberry(61300 + stage * 41);
  const cabbages: Cabbage[] = Array.from({ length: sh.cabbages }, () => {
    const target: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        // leaf tips (top) need little, the thick stems by the core (bottom) much more
        const trend = 0.5 + (r / (ROWS - 1)) * 1.1;
        target.push(Math.max(0.3, trend * (1 + (rng() * 2 - 1) * sh.spread)));
      }
    }
    return { target, tol: sh.tol, time: sh.time };
  });
  const st: KimjangStage = { stage, rate: sh.rate, cabbages, need: 0, par: 0 };
  st.par = pilot(st).good;
  const human = HUMAN_SALTERS.map((o) => pilot(st, o).good).sort((a, b) => a - b);
  st.need = Math.max(Math.ceil(cabbages.length * COLS * ROWS * 0.2), Math.floor(human[0] * 0.85));
  return st;
}

export const KIMJANG_STAGES: KimjangStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
