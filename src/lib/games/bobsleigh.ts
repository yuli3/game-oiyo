/**
 * Bobsleigh (봅슬레이) — ride high on the wall through every bend, but not so high you flip.
 *
 * The sled runs down an ice chute on its own. In each bend it should ride up the outer wall to a
 * height that grows with speed squared and the bend's tightness (the ideal line). Hold to steer up the
 * wall, let go to drop back down. Ride too low and the runners skid, scrubbing off speed; ride too far
 * above the line and the sled flips. Beat the rival's time. Pure and deterministic.
 */

export const BOB_SLUG = "bobsleigh";
export const STAGE_COUNT = 30;
export const GRAVITY = 1.25; // m/s² down the chute
export const DRAG = 0.0011; // per (m/s)²
export const CLIMB = 0.9; // wall height per second while holding
export const DROP = 1.6; // per second while not (gravity pulls it down the wall)
export const SKID_TOL = 0.12; // below the line by more than this skids
export const SKID = 0.9; // share of speed lost per second per unit of extra skid
export const MAX_LINE = 0.92;

export interface Bend { at: number; half: number; k: number } // centre (m), half-length (m), tightness
export interface BobTrack {
  stage: number;
  length: number;
  bends: Bend[];
  flip: number; // above the line by more than this flips the sled
  goal: number;
  par: number;
}

export interface Sled {
  track: BobTrack;
  t: number;
  s: number;
  v: number;
  h: number; // 0 bottom of the chute .. 1 top of the wall
  holding: boolean;
  skidT: number;
  over: boolean;
  won: boolean;
  flipped: boolean;
  finish: number;
}

/** Tightness of the chute at s (0 on the straights). */
export function curve(track: BobTrack, s: number): number {
  let c = 0;
  for (const b of track.bends) {
    const u = (s - b.at) / b.half;
    if (u > -1 && u < 1) c += b.k * Math.cos((u * Math.PI) / 2) ** 2;
  }
  return c;
}

/** The ideal height on the wall at s for speed v. */
export function lineAt(track: BobTrack, s: number, v: number): number {
  return Math.min(MAX_LINE, v * v * curve(track, s));
}

export function newSled(track: BobTrack): Sled {
  return { track, t: 0, s: 0, v: 8, h: 0, holding: false, skidT: 0, over: false, won: false, flipped: false, finish: 0 };
}

export type SledEvent = "flip" | "finish" | null;

export function stepSled(sl: Sled, dt: number): SledEvent {
  if (sl.over) return null;
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const hh = dt / n;
  for (let k = 0; k < n; k++) {
    sl.t += hh;
    sl.h = Math.max(0, Math.min(1, sl.h + (sl.holding ? CLIMB : -DROP) * hh));
    const line = lineAt(sl.track, sl.s, sl.v);
    const e = sl.h - line;
    if (e > sl.track.flip) {
      sl.over = true;
      sl.flipped = true;
      sl.won = false;
      return "flip";
    }
    let a = GRAVITY - DRAG * sl.v * sl.v;
    if (e < -SKID_TOL) {
      a -= SKID * (-e - SKID_TOL) * sl.v;
      sl.skidT += hh;
    }
    sl.v = Math.max(1, sl.v + a * hh);
    const ps = sl.s;
    sl.s += sl.v * hh;
    if (sl.s >= sl.track.length) {
      sl.finish = sl.t - hh + (hh * (sl.track.length - ps)) / (sl.s - ps);
      sl.over = true;
      sl.won = sl.track.goal > 0 && sl.finish <= sl.track.goal;
      return "finish";
    }
  }
  return null;
}

export function starsFor(sl: Sled): number {
  if (!sl.won) return 0;
  if (sl.finish <= sl.track.goal * 0.98) return 3;
  if (sl.finish <= sl.track.goal * 0.99) return 2;
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
  /** s between what the pilot sees and what its hand does */
  lag?: number;
  /** aim this far above the line */
  bias?: number;
  /** ± random error (wall height) on where it aims, redrawn every 0.3 s */
  wobble?: number;
  /** never steer, or always hold */
  mode?: "track" | "never" | "always";
  seed?: number;
}

/** Autopilot: holds while it is below the line (plus a small bias), as seen `lag` seconds ago. */
export function pilot(track: BobTrack, opts: PilotOpts = {}): Sled {
  const { lag = 0, bias = 0.04, wobble = 0, mode = "track", seed = 1 } = opts;
  const rng = mulberry(seed);
  const sl = newSled(track);
  const dt = 1 / 60;
  const seen: boolean[] = [];
  const delay = Math.round(lag / dt);
  let aimErr = 0;
  let redraw = 0;
  while (!sl.over && sl.t < 300) {
    if ((redraw -= dt) <= 0) {
      aimErr = (rng() - 0.5) * 2 * wobble;
      redraw = 0.3;
    }
    const want = sl.h < lineAt(track, sl.s, sl.v) + bias + aimErr;
    seen.push(want);
    sl.holding = mode === "always" ? true : mode === "never" ? false : seen.length > delay ? seen[seen.length - 1 - delay] : false;
    stepSled(sl, dt);
  }
  return sl;
}

function shape(stage: number) {
  return {
    length: 700 + stage * 18,
    bends: 4 + Math.floor(stage / 3),
    peakLo: 0.3 + stage * 0.006,
    peakHi: 0.55 + stage * 0.009,
    halfLo: Math.max(32, 44 - stage * 0.4),
    flip: 0.34 - stage * 0.0012,
  };
}

export function buildTrack(stage: number): BobTrack {
  const sh = shape(stage);
  const rng = mulberry(5100 + stage * 17);
  const bends: Bend[] = [];
  const room = (sh.length - 120) / sh.bends;
  for (let i = 0; i < sh.bends; i++) {
    const half = Math.min(sh.halfLo + rng() * 14, room / 2 - 4); // bends never overlap
    const at = 90 + i * room + half + rng() * Math.max(0, room - 2 * half - 10);
    const peak = sh.peakLo + rng() * (sh.peakHi - sh.peakLo);
    bends.push({ at, half, k: peak / 900 }); // the peak line at 30 m/s
  }
  const track: BobTrack = { stage, length: sh.length, bends, flip: sh.flip, goal: 0, par: 0 };
  track.par = pilot(track).finish;
  // the rival time leaves room for a steady human: 120 ms behind, aiming ±0.05 off the line
  let worst = 0;
  for (const seed of [3, 7, 11, 19]) {
    const r = pilot(track, { lag: 0.12, wobble: 0.05, bias: 0.02, seed });
    worst = Math.max(worst, r.flipped ? Infinity : r.finish);
  }
  track.goal = Math.round(worst * 1.03 * 100) / 100;
  return track;
}

export const BOB_TRACKS: BobTrack[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildTrack(i));
