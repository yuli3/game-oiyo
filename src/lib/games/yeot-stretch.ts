/**
 * Yeot Stretch (엿 늘이기) — pull warm rice taffy long, fold it, pull again, before it sets.
 *
 * The taffy hangs from a peg. Drag to the right to stretch it; let go once it reaches the fold
 * mark and it folds back onto the peg, doubling the strands. Warm taffy forgives a fast pull, but
 * the faster you stretch it *for its length*, the closer it comes to snapping: a short rope must be
 * pulled gently, a long one can be pulled fast. It cools all the time and gets stiffer with every
 * fold, and once it sets the round is over. Make the folds the stage asks for.
 *
 * Pure and deterministic, shared by the vitest proofs, the React quick play and the Unity port.
 */

export const YEOT_SLUG = "yeot-stretch";
export const STAGE_COUNT = 30;
export const L0 = 40; // px of taffy off the peg after a fold
export const LFOLD = 280; // px: let go past this to fold
export const SET_TEMP = 0.35; // the taffy sets below this
export const FOLD_STIFF = 0.965; // each fold leaves the taffy this much less stretchy
export const SMOOTH = 0.1; // s: the strain rate is averaged over about this long
export const WARN = 0.8; // share of the snap limit where the taffy starts to whiten and creak

export interface YeotStage {
  stage: number;
  rate: number; // snap limit of warm, unfolded taffy (stretch per second, 1/s)
  cool: number; // seconds for the heat to fall to 1/e
  need: number; // folds to make
  par: number; // folds a perfect puller makes
}

export interface Yeot {
  stage: YeotStage;
  t: number;
  len: number;
  strain: number; // smoothed stretch rate (1/s)
  grabbing: boolean;
  folds: number;
  over: boolean;
  won: boolean;
  snapped: boolean;
}

export type YeotEvent = "fold" | "snap" | "set" | null;

export function newYeot(stage: YeotStage): Yeot {
  return { stage, t: 0, len: L0, strain: 0, grabbing: false, folds: 0, over: false, won: false, snapped: false };
}

export const heat = (y: Yeot) => Math.exp(-y.t / y.stage.cool);

/** The stretch rate (1/s) that snaps the taffy right now. */
export function limit(y: Yeot): number {
  return y.stage.rate * Math.pow(heat(y), 0.7) * Math.pow(FOLD_STIFF, y.folds);
}

export function grab(y: Yeot): void {
  if (y.over) return;
  y.grabbing = true;
}

/** Letting go past the fold mark folds the taffy; earlier it just hangs where it is. */
export function letGo(y: Yeot): YeotEvent {
  if (y.over || !y.grabbing) return null;
  y.grabbing = false;
  y.strain = 0;
  if (y.len >= LFOLD) {
    y.folds++;
    y.len = L0;
    return "fold";
  }
  return null;
}

/**
 * One frame: `dx` is how far the hand moved right this frame (px). Moving left only lets the taffy
 * sag; it never shortens it.
 */
export function stepYeot(y: Yeot, dx: number, dt: number): YeotEvent {
  if (y.over) return null;
  y.t += dt;
  const pull = y.grabbing ? Math.max(0, dx) : 0;
  const rate = dt > 0 ? pull / dt / y.len : 0;
  const k = Math.min(1, dt / SMOOTH);
  y.strain += (rate - y.strain) * k;
  y.len = Math.min(LFOLD + 60, y.len + pull);
  if (y.strain > limit(y)) {
    y.over = true;
    y.snapped = true;
    y.won = false;
    return "snap";
  }
  if (heat(y) < SET_TEMP) {
    y.over = true;
    y.won = y.folds >= y.stage.need;
    return "set";
  }
  return null;
}

export function starsFor(y: Yeot): number {
  if (!y.won) return 0;
  if (y.folds >= y.stage.need + 2) return 3;
  if (y.folds >= y.stage.need + 1) return 2;
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

export interface PullOpts {
  /** pull at this share of the snap limit (the hand speed grows with the rope) */
  safety?: number;
  /** ± share of jitter on the pull speed each frame */
  jitter?: number;
  /** seconds to put the finger back down after a fold */
  regrab?: number;
  /** pull at a constant hand speed (px/s) instead */
  steadySpeed?: number;
  /** the fastest a finger drags (px/s) */
  handMax?: number;
  seed?: number;
}

/** Autopilot: stretches at a share of the snap limit, lets go at the mark, and grabs again. */
export function pilot(stage: YeotStage, opts: PullOpts = {}): Yeot {
  const { safety = 0.85, jitter = 0, regrab = 0.3, steadySpeed, handMax = 1600, seed = 1 } = opts;
  const rng = mulberry(seed);
  const y = newYeot(stage);
  const dt = 1 / 60;
  let wait = 0.2;
  while (!y.over && y.t < 120) {
    let dx = 0;
    if (!y.grabbing) {
      wait -= dt;
      if (wait <= 0) grab(y);
    } else if (y.len >= LFOLD) {
      letGo(y);
      wait = regrab;
    } else {
      const j = 1 + (rng() - 0.5) * 2 * jitter;
      const speed = steadySpeed ?? safety * j * limit(y) * y.len;
      dx = Math.min(handMax, speed) * dt;
    }
    stepYeot(y, dx, dt);
  }
  return y;
}

/** How close to the snap limit the reference human pulls on this stage. */
export const humanCare = (stage: number) => 0.55 + (0.25 * stage) / (STAGE_COUNT - 1);

function shape(stage: number) {
  return {
    rate: 3.2 - stage * 0.03,
    cool: 11 + stage * 0.2,
    care: humanCare(stage),
  };
}

export function buildStage(stage: number): YeotStage {
  const sh = shape(stage);
  const st: YeotStage = { stage, rate: sh.rate, cool: sh.cool, need: 0, par: 0 };
  st.par = pilot(st, { safety: 0.95 }).folds;
  // the mark is what the worst of eight humans makes; each pulls ever closer to the limit as the stages go on
  // (55 % of it on stage 1, 80 % on stage 30), ±15 % shaky, half a second to regrab
  let human = Infinity;
  for (const seed of [3, 9, 11, 13, 17, 19, 21, 25]) human = Math.min(human, pilot(st, { safety: sh.care, jitter: 0.15, regrab: 0.5, seed }).folds);
  st.need = Math.max(2, Math.min(human, st.par - 2));
  return st;
}

export const YEOT_STAGES: YeotStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
