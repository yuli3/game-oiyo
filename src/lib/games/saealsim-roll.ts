/**
 * Saealsim Roll (새알심 빚기) — roll round rice balls for winter-solstice red bean porridge.
 *
 * On Dongji, the longest night, Korean families eat patjuk, red bean porridge, with little round
 * glutinous-rice balls (saealsim, "bird's-egg hearts") in it. Roll each lump of dough by drawing
 * circles with your finger: circles at a steady pace round it off; whirl too fast and the dough cracks
 * and crumbles; scrub back and forth or crawl too slowly and nothing happens. A round ball drops into
 * the pot and the next lump is ready. Roll the stage's count before the porridge boils over.
 *
 * The game reads only the finger's path: how fast its direction of travel is turning (turns per
 * second). Pure and deterministic, so the vitest proofs drive the same rules as the quick play and
 * the Unity port.
 */

export const SAEALSIM_SLUG = "saealsim-roll";
export const STAGE_COUNT = 30;
export const SMOOTH = 0.15; // s: the turning rate is averaged over about this long
export const MIN_SPEED = 60; // px/s: slower than this does not roll
export const ROLL_RATE = 0.8; // roundness per second in the band
export const CRACK_RATE = 1.6; // crack per second per turn/s over the band
export const CRACK_EASE = 0.6; // crack healed per second while not over the band
export const CRUMBLE_COST = 0; // a crumbled lump is simply lost (time is the cost)

export interface SaealsimStage {
  stage: number;
  lo: number; // turns per second
  hi: number;
  need: number;
  limit: number; // s
  par: number;
}

export interface Dough {
  stage: SaealsimStage;
  t: number;
  round: number; // 0..1 this ball
  crack: number; // 0..1 this ball
  rate: number; // smoothed turns per second
  lastAng: number | null;
  done: number;
  crumbled: number;
  over: boolean;
  won: boolean;
}

export type DoughEvent = "ball" | "crumble" | "end" | null;

export function newDough(stage: SaealsimStage): Dough {
  return { stage, t: 0, round: 0, crack: 0, rate: 0, lastAng: null, done: 0, crumbled: 0, over: false, won: false };
}

/** Lifting the finger breaks the stroke: the next move starts fresh. */
export function lift(d: Dough): void {
  d.lastAng = null;
}

/**
 * One frame of finger travel (dx, dy in px). The turning rate is how fast the direction of travel
 * turns; a straight scrub back and forth flips it by half a turn at once, which counts as nothing.
 */
export function stepDough(d: Dough, dx: number, dy: number, dt: number): DoughEvent {
  if (d.over || dt <= 0) return null;
  d.t += dt;
  const speed = Math.hypot(dx, dy) / dt;
  let turn = 0;
  if (speed >= MIN_SPEED) {
    const ang = Math.atan2(dy, dx);
    if (d.lastAng !== null) {
      let da = ang - d.lastAng;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      // a near-reversal is a scrub, not a turn
      if (Math.abs(da) < (Math.PI * 2) / 3) turn = Math.abs(da) / (2 * Math.PI) / dt;
    }
    d.lastAng = ang;
  } else d.lastAng = null;
  const k = Math.min(1, dt / SMOOTH);
  d.rate += (turn - d.rate) * k;
  let ev: DoughEvent = null;
  const { lo, hi } = d.stage;
  if (d.rate > hi) d.crack += CRACK_RATE * (d.rate - hi) * dt;
  else {
    d.crack = Math.max(0, d.crack - CRACK_EASE * dt);
    if (d.rate >= lo) d.round += ROLL_RATE * dt;
  }
  if (d.crack >= 1) {
    d.crumbled++;
    d.round = 0;
    d.crack = 0;
    ev = "crumble";
  } else if (d.round >= 1) {
    d.done++;
    d.round = 0;
    d.crack = 0;
    ev = "ball";
  }
  if (d.done >= d.stage.need) {
    d.over = true;
    d.won = true;
    return "end";
  }
  if (d.t >= d.stage.limit) {
    d.over = true;
    d.won = false;
    return "end";
  }
  return ev;
}

export function starsFor(d: Dough): number {
  if (!d.won) return 0;
  const left = (d.stage.limit - d.t) / d.stage.limit;
  if (left >= 0.15 && d.crumbled === 0) return 3;
  if (left >= 0.07) return 2;
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
  /** circles per second the finger aims for (default: the middle of the band) */
  pace?: number;
  /** ± share the pace drifts, redrawn every 0.4 s */
  drift?: number;
  /** circle radius in px */
  radius?: number;
  /** scrub back and forth along a line instead of circling */
  scrub?: boolean;
  /** s between balls (lifting and finding the next lump) */
  gap?: number;
  seed?: number;
}

/** Autopilot: draws circles at a pace (with drift), lifting briefly between balls. */
export function pilot(stage: SaealsimStage, opts: PilotOpts = {}): Dough {
  const { pace = (stage.lo + stage.hi) / 2, drift = 0, radius = 50, scrub = false, gap = 0.25, seed = 1 } = opts;
  const rng = mulberry(seed);
  const d = newDough(stage);
  const dt = 1 / 60;
  let phase = 0;
  let f = pace;
  let redraw = 0;
  let pause = 0.3;
  let px = radius;
  let py = 0;
  while (!d.over && d.t < 600) {
    if ((redraw -= dt) <= 0) {
      f = pace * (1 + (rng() - 0.5) * 2 * drift);
      redraw = 0.4;
    }
    if (pause > 0) {
      pause -= dt;
      lift(d);
      stepDough(d, 0, 0, dt);
      continue;
    }
    phase += 2 * Math.PI * f * dt;
    const nx = scrub ? radius * Math.sin(phase) : radius * Math.cos(phase);
    const ny = scrub ? 0 : radius * Math.sin(phase);
    const ev = stepDough(d, nx - px, ny - py, dt);
    px = nx;
    py = ny;
    if (ev === "ball" || ev === "crumble") pause = gap;
  }
  return d;
}

function shape(stage: number) {
  const centre = 1.6 + stage * 0.02;
  const half = Math.max(0.28, 0.6 - stage * 0.011);
  return { lo: centre - half, hi: centre + half, need: 4 + Math.floor(stage / 3) };
}

export function buildStage(stage: number): SaealsimStage {
  const sh = shape(stage);
  const st: SaealsimStage = { stage, lo: sh.lo, hi: sh.hi, need: sh.need, limit: 999, par: 0 };
  st.par = pilot(st).t;
  // the limit leaves room for a human whose pace drifts ±25 % and who takes 0.5 s between balls
  let worst = 0;
  for (const seed of [3, 7, 11, 19]) worst = Math.max(worst, pilot(st, { drift: 0.25, gap: 0.5, seed }).t);
  st.limit = Math.round(worst * 1.12 * 10) / 10;
  return st;
}

export const SAEALSIM_STAGES: SaealsimStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
