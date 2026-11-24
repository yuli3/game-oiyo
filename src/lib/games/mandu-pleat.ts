/**
 * Mandu Pleat (만두 빚기) — fill and pleat a tray of Seollal dumplings.
 *
 * Each dumpling is made in two moves. First hold to spoon filling onto the wrapper and let go inside
 * the marked band: too little and the dumpling is flat, too much and it bursts. Then fold it: a pinch
 * travels along the edge and every tap makes a pleat there. The pleats have to come at an even pace —
 * two too close together tear the wrapper, a stretch left too long stays open. A dumpling with the
 * right filling and an even, closed seam goes on the tray. Fill the tray to clear the stage.
 *
 * Pure and deterministic: every dumpling is seeded per stage.
 */

export const MANDU_SLUG = "mandu-pleat";
export const STAGE_COUNT = 30;
export const LEVEL_MAX = 1.25; // the spoon stops by itself here

export interface Dumpling {
  fillRate: number; // level per second while holding
  lo: number; // fill band
  hi: number;
  pleats: number; // equal stretches the edge is folded into (pleats - 1 taps)
  speed: number; // edge per second the pinch travels
  tol: number; // share of a stretch a gap may be off by
}

export interface ManduStage {
  stage: number;
  dumplings: Dumpling[];
  need: number;
  par: number;
}

export type Fault = "" | "flat" | "burst" | "tear" | "open";

export interface Kitchen {
  stage: ManduStage;
  idx: number;
  phase: "fill" | "pleat" | "done";
  level: number;
  holding: boolean;
  filled: boolean; // spoon used at least once on this dumpling
  pos: number; // pinch along the edge, 0..1
  taps: number[];
  results: Fault[];
  t: number;
  over: boolean;
  won: boolean;
}

export const gapOf = (d: Dumpling) => 1 / d.pleats;

export function good(k: Kitchen): number {
  return k.results.filter((r) => r === "").length;
}

export function newKitchen(stage: ManduStage): Kitchen {
  return { stage, idx: 0, phase: "fill", level: 0, holding: false, filled: false, pos: 0, taps: [], results: [], t: 0, over: false, won: false };
}

export const current = (k: Kitchen): Dumpling => k.stage.dumplings[Math.min(k.idx, k.stage.dumplings.length - 1)];

/** Judges a finished seam: every stretch between pleats (and to both ends) must be near an even share. */
export function judgeSeam(d: Dumpling, taps: number[]): Fault {
  const g = gapOf(d);
  const marks = [0, ...taps, 1];
  for (let i = 1; i < marks.length; i++) {
    const gap = marks[i] - marks[i - 1];
    if (gap < g * (1 - d.tol)) return "tear";
    if (gap > g * (1 + d.tol)) return "open";
  }
  return "";
}

function next(k: Kitchen, fault: Fault) {
  k.results.push(fault);
  k.idx++;
  k.level = 0;
  k.holding = false;
  k.filled = false;
  k.pos = 0;
  k.taps = [];
  if (k.idx >= k.stage.dumplings.length) {
    k.phase = "done";
    k.over = true;
    k.won = good(k) >= k.stage.need;
  } else k.phase = "fill";
}

export interface KitchenEvents { done: Fault | null; pleat: boolean; end: boolean }

/** Press down: starts spooning in the fill phase, makes a pleat in the pleat phase. */
export function press(k: Kitchen): KitchenEvents {
  const ev: KitchenEvents = { done: null, pleat: false, end: false };
  if (k.over) return ev;
  if (k.phase === "fill") {
    k.holding = true;
    k.filled = true;
  } else if (k.phase === "pleat") {
    k.taps.push(k.pos);
    ev.pleat = true;
    // one pleat too many is a tear straight away
    if (k.taps.length > current(k).pleats - 1) {
      ev.done = "tear";
      next(k, "tear");
      ev.end = k.over;
    }
  }
  return ev;
}

/** Let go: in the fill phase this settles the filling. */
export function release(k: Kitchen): KitchenEvents {
  const ev: KitchenEvents = { done: null, pleat: false, end: false };
  if (k.over || k.phase !== "fill" || !k.holding) return ev;
  k.holding = false;
  const d = current(k);
  if (k.level > d.hi) {
    ev.done = "burst";
    next(k, "burst");
  } else if (k.level < d.lo) {
    ev.done = "flat";
    next(k, "flat");
  } else {
    k.phase = "pleat";
    k.pos = 0;
  }
  ev.end = k.over;
  return ev;
}

export function stepKitchen(k: Kitchen, dt: number): KitchenEvents {
  const ev: KitchenEvents = { done: null, pleat: false, end: false };
  if (k.over) return ev;
  k.t += dt;
  const d = current(k);
  if (k.phase === "fill" && k.holding) {
    k.level = Math.min(LEVEL_MAX, k.level + d.fillRate * dt);
  } else if (k.phase === "pleat") {
    k.pos += d.speed * dt;
    if (k.pos >= 1) {
      k.pos = 1;
      const fault = judgeSeam(d, k.taps);
      ev.done = fault;
      next(k, fault);
    }
  }
  ev.end = k.over;
  return ev;
}

export function starsFor(k: Kitchen): number {
  if (!k.won) return 0;
  const n = k.stage.dumplings.length;
  if (good(k) === n) return 3;
  if (good(k) >= Math.min(n, k.stage.need + 1)) return 2;
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
  /** s between seeing the spoon reach the band's middle and letting go */
  lag?: number;
  /** ± s of wobble on each pleat, taken from the previous pleat (so it drifts) */
  jitter?: number;
  seed?: number;
  /** "even" keeps the pace; "rush" pleats twice as fast; "overfill" holds the spoon down; "idle" never pleats */
  mode?: "even" | "rush" | "overfill" | "idle";
}

/** Autopilot: lets go aiming at the band's middle, then pleats one even stretch after the last. */
export function pilot(stage: ManduStage, opts: PilotOpts = {}): Kitchen {
  const { lag = 0, jitter = 0, seed = 1, mode = "even" } = opts;
  const rng = mulberry(seed);
  const k = newKitchen(stage);
  const dt = 1 / 120;
  let letGoAt = -1;
  let nextTap = -1;
  let lastIdx = -1;
  while (!k.over && k.t < 600) {
    const d = current(k);
    if (k.idx !== lastIdx) {
      lastIdx = k.idx;
      letGoAt = -1;
      nextTap = -1;
    }
    if (k.phase === "fill") {
      if (!k.holding) press(k);
      else if (mode !== "overfill") {
        const mid = (d.lo + d.hi) / 2;
        if (letGoAt < 0 && k.level >= mid - d.fillRate * lag) letGoAt = k.t + lag + (rng() * 2 - 1) * lag * 0.3;
        if (letGoAt >= 0 && k.t >= letGoAt) release(k);
      } else if (k.level >= LEVEL_MAX) release(k);
    } else if (k.phase === "pleat" && mode !== "idle") {
      const beat = gapOf(d) / d.speed / (mode === "rush" ? 2 : 1);
      if (nextTap < 0) nextTap = k.t + beat + (rng() * 2 - 1) * jitter;
      if (k.t >= nextTap && k.taps.length < d.pleats - 1) {
        press(k);
        nextTap = k.t + beat + (rng() * 2 - 1) * jitter;
      }
    }
    stepKitchen(k, dt);
  }
  return k;
}

function shape(stage: number) {
  return {
    count: 5 + Math.floor(stage / 5),
    fillRate: 0.42 + stage * 0.012,
    band: Math.max(0.14, 0.26 - stage * 0.004),
    pleats: [4, 6] as const,
    speed: 0.2 + stage * 0.0075,
    tol: Math.max(0.3, 0.5 - stage * 0.007),
  };
}

/** Human-like cooks used to set the mark: a beat late on the spoon, a little uneven on the pleats. */
export const HUMAN_COOKS: PilotOpts[] = [1, 2, 3, 4, 5].map((seed) => ({ lag: 0.16, jitter: 0.06, seed }));

export function buildStage(stage: number): ManduStage {
  const sh = shape(stage);
  const rng = mulberry(52900 + stage * 37);
  const dumplings: Dumpling[] = Array.from({ length: sh.count }, () => {
    const mid = 0.55 + rng() * 0.3;
    const pleats = sh.pleats[0] + Math.floor(rng() * (sh.pleats[1] - sh.pleats[0] + 1)) + Math.floor(stage / 10);
    return {
      fillRate: sh.fillRate * (0.85 + rng() * 0.3),
      lo: mid - sh.band / 2,
      hi: mid + sh.band / 2,
      pleats,
      speed: sh.speed * (0.85 + rng() * 0.3),
      tol: sh.tol,
    };
  });
  const st: ManduStage = { stage, dumplings, need: dumplings.length, par: 0 };
  st.par = good(pilot(st));
  // the mark: the second-worst of five human-like cooks, less one dumpling of room
  const human = HUMAN_COOKS.map((o) => good(pilot(st, o))).sort((a, b) => a - b);
  st.need = Math.max(2, Math.min(dumplings.length - 1, human[1] - 1));
  return st;
}

export const MANDU_STAGES: ManduStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
