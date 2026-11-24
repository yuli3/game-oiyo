/**
 * Ice Climb (빙벽 등반) — swing, bite, pull up a frozen waterfall before the sun softens it.
 *
 * Hold to wind up an ice-axe swing; the power meter rises and falls while you hold. Let go to strike
 * the ice above you. Each patch wants its own strength: thin blue ice shatters under a hard swing,
 * hard grey ice needs a full one, and firm white ice sits in between. A swing inside the patch's band
 * bites and you climb a step; too soft glances off; too hard shatters the ice and you slip a step.
 * Reach the top before time runs out. Pure and deterministic.
 */

export const CLIMB_SLUG = "ice-climb";
export const STAGE_COUNT = 30;
export const RECOVER = 0.25; // s after a swing before the next wind-up
export type Ice = 0 | 1 | 2; // 0 thin, 1 firm, 2 hard
export const ICE_BANDS: Array<[number, number]> = [
  [0.15, 0.45],
  [0.38, 0.72],
  [0.65, 0.95],
];

export interface ClimbStage {
  stage: number;
  rise: number; // s for the meter to go from 0 to full
  narrow: number; // 0..1 share the bands shrink toward their centres
  wall: Ice[]; // the patch for each step
  limit: number; // s
  par: number;
}

export interface Climber {
  stage: ClimbStage;
  t: number;
  step: number;
  holding: boolean;
  hold: number;
  recover: number;
  bites: number;
  shatters: number;
  glances: number;
  over: boolean;
  won: boolean;
}

export type SwingResult = "bite" | "glance" | "shatter" | null;

export function band(stage: ClimbStage, ice: Ice): [number, number] {
  const [lo, hi] = ICE_BANDS[ice];
  const c = (lo + hi) / 2;
  const w = ((hi - lo) / 2) * (1 - stage.narrow);
  return [c - w, c + w];
}

/** The meter rises to full over `rise` seconds of holding, then falls back, and so on. */
export function powerFor(stage: ClimbStage, hold: number): number {
  const u = (hold / stage.rise) % 2;
  return u <= 1 ? u : 2 - u;
}

export function newClimber(stage: ClimbStage): Climber {
  return { stage, t: 0, step: 0, holding: false, hold: 0, recover: 0, bites: 0, shatters: 0, glances: 0, over: false, won: false };
}

export function press(c: Climber): boolean {
  if (c.over || c.holding || c.recover > 0) return false;
  c.holding = true;
  c.hold = 0;
  return true;
}

export function release(c: Climber): SwingResult {
  if (c.over || !c.holding) return null;
  c.holding = false;
  c.recover = RECOVER;
  const p = powerFor(c.stage, c.hold);
  const [lo, hi] = band(c.stage, c.stage.wall[c.step]);
  if (p < lo) {
    c.glances++;
    return "glance";
  }
  if (p > hi) {
    c.shatters++;
    c.step = Math.max(0, c.step - 1);
    return "shatter";
  }
  c.bites++;
  c.step++;
  if (c.step >= c.stage.wall.length) {
    c.over = true;
    c.won = c.t <= c.stage.limit;
  }
  return "bite";
}

/** Advances the clock; returns true on the frame time runs out. */
export function stepClimber(c: Climber, dt: number): boolean {
  if (c.over) return false;
  c.t += dt;
  if (c.holding) c.hold += dt;
  c.recover = Math.max(0, c.recover - dt);
  if (c.t >= c.stage.limit && c.stage.limit > 0) {
    c.over = true;
    c.won = false;
    c.holding = false;
    return true;
  }
  return false;
}

export function starsFor(c: Climber): number {
  if (!c.won) return 0;
  const left = (c.stage.limit - c.t) / c.stage.limit;
  if (left >= 0.18) return 3;
  if (left >= 0.09) return 2;
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
  /** s of timing error (uniform ±) on each release */
  noise?: number;
  /** s from the end of recovery to the next press */
  react?: number;
  /** always swing to this power instead of reading the ice */
  fixed?: number;
  seed?: number;
}

/** Autopilot: winds up to the middle of the patch's band on the rising meter and lets go. */
export function pilot(stage: ClimbStage, opts: PilotOpts = {}): Climber {
  const { noise = 0, react = 0, fixed, seed = 1 } = opts;
  const rng = mulberry(seed);
  const c = newClimber(stage);
  const dt = 1 / 120;
  let wait = react;
  let target = 0;
  while (!c.over && c.t < 600) {
    if (!c.holding) {
      if (c.recover <= 0) {
        wait -= dt;
        if (wait <= 0 && press(c)) {
          const [lo, hi] = band(stage, stage.wall[c.step]);
          const p = fixed ?? (lo + hi) / 2;
          target = p * stage.rise + (rng() - 0.5) * 2 * noise;
        }
      }
    } else if (c.hold >= target) {
      release(c);
      wait = react;
    }
    stepClimber(c, dt);
  }
  return c;
}

function shape(stage: number) {
  return {
    rise: 0.8 - stage * 0.009,
    narrow: Math.min(0.42, stage * 0.0145),
    steps: 12 + Math.floor(stage / 2),
  };
}

export function buildStage(stage: number): ClimbStage {
  const sh = shape(stage);
  const rng = mulberry(4100 + stage * 31);
  // every wall mixes all three kinds of ice; later walls switch kind more often
  const wall: Ice[] = [];
  let cur: Ice = 1;
  for (let i = 0; i < sh.steps; i++) {
    if (i < 3) cur = i as Ice;
    else if (rng() < 0.45 + stage * 0.012) cur = ((cur + 1 + Math.floor(rng() * 2)) % 3) as Ice;
    wall.push(cur);
  }
  const st: ClimbStage = { stage, rise: sh.rise, narrow: sh.narrow, wall, limit: 999, par: 0 };
  st.par = pilot(st).t;
  // the limit leaves room for a steady human: 40 ms timing error, 0.2 s to react
  let worst = 0;
  for (const seed of [3, 7, 11, 19, 23, 29]) worst = Math.max(worst, pilot(st, { noise: 0.04, react: 0.2, seed }).t);
  st.limit = Math.round(worst * 1.12 * 10) / 10;
  return st;
}

export const CLIMB_STAGES: ClimbStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
