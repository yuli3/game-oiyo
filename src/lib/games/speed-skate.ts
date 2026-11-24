/**
 * Speed Skate (스피드스케이팅) — a long-track race on a 400 m oval, one stroke per tap.
 *
 * Tap the left or right half of the screen to push with that leg. On the straights you alternate
 * legs (left, right, left…); in the curves you cross over and push with the right leg every time.
 * A stroke gives the most speed when it lands on the stage's cadence after the last one; too early
 * or too late is a weak push, and the wrong leg is a wobble that costs speed. Beat the rival's time.
 *
 * Everything here is pure and deterministic, so the vitest proofs can drive the same rules the
 * React quick play and the Unity main game use.
 */

export const SKATE_SLUG = "speed-skate";
export const STAGE_COUNT = 30;
export const LAP = 400;
export const STRAIGHT = 100; // each straight and each curve is 100 m
export const VMAX = 16; // m/s, pushes fade toward this
export const PUSH = 3.5; // m/s gained by a perfect stroke from a standstill
export const DRAG = 0.012; // air drag per (m/s)^2
export const FRICTION = 0.2; // ice friction, m/s per second
export const WOBBLE = 0.85; // speed kept after a wrong-leg stroke
export const MIN_GAP = 0.16; // strokes closer than this are a stumble

export type Seg = "straight" | "curve";
export type Side = -1 | 1; // -1 left leg, 1 right leg
export type StrokeResult = "perfect" | "good" | "weak" | "wrong" | null;

export interface SkateRace {
  stage: number;
  length: number; // metres
  cadence: number; // ideal seconds between strokes
  window: number; // seconds: how fast a stroke's quality falls off the cadence
  goal: number; // the rival's time (s)
  par: number; // a perfect skater's time
}

export interface Skater {
  race: SkateRace;
  t: number;
  d: number;
  v: number;
  last: 0 | Side;
  since: number;
  strokes: number;
  perfects: number;
  wobbles: number;
  over: boolean;
  won: boolean;
  finish: number;
}

export function segAt(d: number): Seg {
  const m = ((d % LAP) + LAP) % LAP;
  return m < STRAIGHT || (m >= 2 * STRAIGHT && m < 3 * STRAIGHT) ? "straight" : "curve";
}

/** The leg a stroke should use now: alternate on the straights, right leg in the curves. */
export function rightLeg(s: Skater): Side {
  if (segAt(s.d) === "curve") return 1;
  return s.last === -1 ? 1 : -1;
}

export function legOk(s: Skater, side: Side): boolean {
  if (segAt(s.d) === "curve") return side === 1;
  return s.last === 0 || side !== s.last;
}

export function newSkater(race: SkateRace): Skater {
  return { race, t: 0, d: 0, v: 0, last: 0, since: 10, strokes: 0, perfects: 0, wobbles: 0, over: false, won: false, finish: 0 };
}

/** 0..1: how well a stroke after `since` seconds hits the cadence. */
export function quality(race: SkateRace, since: number): number {
  if (since < MIN_GAP) return 0;
  const e = (since - race.cadence) / race.window;
  return Math.exp(-e * e);
}

export function stroke(s: Skater, side: Side): StrokeResult {
  if (s.over) return null;
  if (!legOk(s, side)) {
    s.v *= WOBBLE;
    s.wobbles++;
    s.since = 0;
    s.last = side;
    return "wrong";
  }
  // the first push from the line always counts as a full one
  const q = s.strokes === 0 ? 1 : quality(s.race, s.since);
  s.v += PUSH * q * Math.max(0, 1 - s.v / VMAX);
  s.since = 0;
  s.last = side;
  s.strokes++;
  if (q > 0.8) {
    s.perfects++;
    return "perfect";
  }
  return q > 0.4 ? "good" : "weak";
}

/** Advances the race; returns true on the frame the skater crosses the line. */
export function stepSkater(s: Skater, dt: number): boolean {
  if (s.over) return false;
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / n;
  for (let k = 0; k < n; k++) {
    s.t += h;
    s.since += h;
    s.v = Math.max(0, s.v - (DRAG * s.v * s.v + FRICTION) * h);
    const pd = s.d;
    s.d += s.v * h;
    if (s.d >= s.race.length) {
      const f = s.v > 0 ? (s.race.length - pd) / (s.v * h) : 1;
      s.finish = s.t - h + h * Math.min(1, Math.max(0, f));
      s.over = true;
      s.won = s.race.goal > 0 && s.finish <= s.race.goal;
      return true;
    }
  }
  return false;
}

export function starsFor(s: Skater): number {
  if (!s.won) return 0;
  if (s.finish <= s.race.goal * 0.97) return 3;
  if (s.finish <= s.race.goal * 0.985) return 2;
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
  /** seconds of timing error (uniform ±) on each stroke */
  noise?: number;
  seed?: number;
  /** ignore the curves and just alternate legs */
  alternateOnly?: boolean;
  /** stroke on a fixed beat instead of the stage's cadence */
  beat?: number;
}

/** Autopilot: strokes on the cadence with the right leg (plus optional human error). */
export function pilot(race: SkateRace, opts: PilotOpts = {}): Skater {
  const { noise = 0, seed = 1, alternateOnly = false, beat } = opts;
  const rng = mulberry(seed);
  const s = newSkater(race);
  const dt = 1 / 60;
  const gap = () => (beat ?? race.cadence) + (rng() - 0.5) * 2 * noise;
  let wait = 0; // first push straight off the line
  while (!s.over && s.t < 400) {
    if (s.since >= wait || s.strokes === 0) {
      const side: Side = alternateOnly ? (s.last === -1 ? 1 : -1) : rightLeg(s);
      stroke(s, side);
      wait = gap();
    }
    stepSkater(s, dt);
  }
  return s;
}

function shape(stage: number) {
  return {
    length: 300 + stage * 20,
    cadence: 0.56 - stage * 0.004,
    window: Math.max(0.075, 0.13 - stage * 0.002),
    slack: Math.max(1.025, 1.06 - stage * 0.0012),
  };
}

export function buildRace(stage: number): SkateRace {
  const sh = shape(stage);
  const race: SkateRace = { stage, length: sh.length, cadence: sh.cadence, window: sh.window, goal: 0, par: 0 };
  race.par = pilot(race).finish;
  // the rival skates like a steady human: on the cadence give or take 35 ms
  const steady = pilot(race, { noise: 0.035, seed: 7 }).finish;
  race.goal = Math.round(steady * sh.slack * 100) / 100;
  return race;
}

export const RACES: SkateRace[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildRace(i));
