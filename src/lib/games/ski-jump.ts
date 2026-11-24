/**
 * 스키점프 (Ski Jump) — an OIYO original one-button ski-jumping game.
 * Hold to crouch into a tuck down the in-run, let go right at the end of the table to spring off,
 * then hold to lean forward over your skis and let go to sit up: keep your body angle inside the
 * green band and the air carries you, drift out of it and you drop. Tap just before touchdown for a
 * telemark landing (press again just before touchdown). Points are 60 for reaching the hill's K-point, 2 per metre past (or short of)
 * it, plus landing style. Hills grow from K70 to K140, with head and tail winds and gusts that push
 * your body angle around. Every hill's mark is set from an autopilot's jump.
 */

import { mulberry } from "./pixel-kit";

export const SKI_SLUG = "ski-jump";
export const STAGE_COUNT = 30;
export const G = 9.81;
export const BAND_C = 12; // best body angle (degrees)
export const BAND_W = 7; // half-width of the green band
export const POP_WINDOW = 0.14; // seconds either side of the lip that still give a spring
export const TELEMARK_WINDOW = 0.3; // tap this long before touchdown for a telemark
export const PX_PER_M = 6;

export interface Hill {
  stage: number;
  k: number; // K-point (m)
  inrun: number; // in-run length (m)
  gateSpeed: number; // in-run exit speed with a full tuck (m/s)
  wind: number; // m/s, + = headwind (more lift)
  gusts: number[]; // per-second drift of the body angle (deg/s), one entry per half second of flight
  goal: number; // points to clear
  par: number; // autopilot points
}

export type Phase = "inrun" | "flight" | "landed";
export type Landing = "" | "telemark" | "clean" | "fall";

export interface Jump {
  hill: Hill;
  phase: Phase;
  time: number; // seconds in the current phase
  s: number; // distance down the in-run (m)
  v: number; // in-run speed (m/s)
  tuckTime: number;
  x: number; // flight: metres from the lip
  y: number; // flight: metres above the lip
  vx: number;
  vy: number;
  alpha: number; // body angle (deg)
  holding: boolean;
  telemarkAt: number; // time of the landing tap (flight time), -1 none
  popQuality: number;
  landing: Landing;
  distance: number;
  points: number;
  over: boolean;
  won: boolean;
}

/** Height of the landing hill below the lip at x metres (negative = below). */
export function hillY(k: number, x: number): number {
  // a knoll, then a 35° landing slope that flattens past 1.3 K into the out-run
  const steep = Math.tan((35 * Math.PI) / 180);
  let y = -2.5;
  const step = 0.5;
  for (let t = 0; t < x; t += step) {
    const d = Math.min(step, x - t);
    const ramp = 1 - Math.exp(-t / (k * 0.18));
    const flat = t < k * 1.25 ? 1 : Math.max(0, 1 - (t - k * 1.25) / (k * 0.4));
    y -= steep * ramp * flat * d;
  }
  return y;
}

const hillCache = new Map<number, Float64Array>();
/** Tabulated hill (every 0.25 m) for fast lookups. */
export function groundAt(k: number, x: number): number {
  let t = hillCache.get(k);
  if (!t) {
    t = new Float64Array(Math.ceil((k * 2.2) / 0.25) + 2);
    for (let i = 0; i < t.length; i++) t[i] = hillY(k, i * 0.25);
    hillCache.set(k, t);
  }
  const f = Math.max(0, x / 0.25);
  const i = Math.min(t.length - 2, Math.floor(f));
  return t[i] + (t[i + 1] - t[i]) * Math.min(1, f - i);
}

export function newJump(hill: Hill): Jump {
  return { hill, phase: "inrun", time: 0, s: 0, v: 0, tuckTime: 0, x: 0, y: 0, vx: 0, vy: 0, alpha: 30, holding: false, telemarkAt: -1, popQuality: 0, landing: "", distance: 0, points: 0, over: false, won: false };
}

/** The one button: held down or not. */
export function hold(j: Jump, down: boolean): void {
  j.holding = down;
}

/**
 * The spring / landing input. On the in-run (the game calls it when you let go of a tuck) it springs
 * you off the table if the lip is close enough, otherwise you just stand up. In flight (every press)
 * it readies the telemark: the last press within TELEMARK_WINDOW before touchdown counts.
 */
export function tap(j: Jump): "pop" | "early" | "telemark" | null {
  if (j.over) return null;
  if (j.phase === "inrun") {
    const left = (j.hill.inrun - j.s) / Math.max(1, j.v);
    if (left > POP_WINDOW) return "early"; // too early: nothing happens yet, tap again
    takeoff(j, Math.max(0, 1 - left / POP_WINDOW));
    return "pop";
  }
  if (j.phase === "flight") {
    j.telemarkAt = j.time;
    return "telemark";
  }
  return null;
}

function takeoff(j: Jump, quality: number): void {
  j.popQuality = quality;
  const speed = j.v;
  const table = (-10 * Math.PI) / 180;
  j.vx = Math.cos(table) * speed;
  j.vy = Math.sin(table) * speed + 1.6 * quality;
  j.phase = "flight";
  j.time = 0;
  j.x = 0;
  j.y = 0;
  j.alpha = 28;
}

/** Share of gravity the air carries at a body angle (0.62 at the centre of the band). */
export function lift(alpha: number): number {
  const d = (alpha - BAND_C) / BAND_W;
  return 0.58 * Math.exp(-d * d * 0.5) + 0.04;
}

export interface JumpEvents { takeoff: boolean; landed: Landing | null; missedLip: boolean }

export function stepJump(j: Jump, dt: number): JumpEvents {
  const ev: JumpEvents = { takeoff: false, landed: null, missedLip: false };
  if (j.over) return ev;
  const h = j.hill;
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const sub = dt / n;
  for (let k = 0; k < n && !j.over; k++) {
    j.time += sub;
    if (j.phase === "inrun") {
      if (j.holding) j.tuckTime += sub;
      const tuck = j.holding ? 1 : 0.8;
      const vmax = h.gateSpeed * (tuck === 1 ? 1 : 0.85);
      j.v += (G * Math.sin((35 * Math.PI) / 180) * 0.9 * tuck + 0.4) * sub;
      j.v = Math.min(vmax, j.v);
      j.s += j.v * sub;
      if (j.s >= h.inrun) {
        // off the end of the table without a spring
        takeoff(j, 0);
        ev.takeoff = true;
        ev.missedLip = true;
      }
    } else if (j.phase === "flight") {
      // body angle: leaning forward while held, sitting up when not, pushed by gusts
      const gi = Math.min(h.gusts.length - 1, Math.floor(j.time * 2));
      j.alpha += ((j.holding ? -32 : 26) + h.gusts[gi]) * sub;
      j.alpha = Math.max(-5, Math.min(45, j.alpha));
      // lift as a share of gravity: most of it inside the green band, a little from a headwind
      const lf = lift(j.alpha) + h.wind * 0.012;
      j.vx -= 0.02 * j.vx * sub;
      j.vy += -G * (1 - lf) * sub;
      j.x += j.vx * sub;
      j.y += j.vy * sub;
      if (j.y <= groundAt(h.k, j.x)) {
        j.y = groundAt(h.k, j.x);
        j.distance = Math.round(j.x * 2) / 2;
        const off = Math.abs(j.alpha - BAND_C);
        const before = j.telemarkAt >= 0 ? j.time - j.telemarkAt : Infinity;
        j.landing = off > 16 ? "fall" : before <= TELEMARK_WINDOW ? "telemark" : "clean";
        const style = j.landing === "telemark" ? 20 : j.landing === "clean" ? 15 : 6;
        j.points = Math.round((60 + 2 * (j.distance - h.k) + style) * 10) / 10;
        j.phase = "landed";
        j.over = true;
        j.won = j.points >= h.goal;
        ev.landed = j.landing;
      }
    }
  }
  return ev;
}

export function starsFor(j: Jump): number {
  if (!j.won) return 0;
  if (j.points >= j.hill.goal + 14) return 3;
  if (j.points >= j.hill.goal + 6) return 2;
  return 1;
}

/** Seconds until the jumper meets the hill, assuming the current velocity and no lift (for the telemark). */
export function timeToLand(j: Jump): number {
  if (j.phase !== "flight") return Infinity;
  let x = j.x;
  let y = j.y;
  let vy = j.vy;
  const dt = 1 / 120;
  for (let t = 0; t < 8; t += dt) {
    vy -= G * 0.55 * dt;
    x += j.vx * dt;
    y += vy * dt;
    if (y <= groundAt(j.hill.k, x)) return t;
  }
  return 8;
}

/**
 * Autopilot: tucks the whole in-run, springs `popErr` seconds before the lip, holds its body angle at
 * `aim` degrees with on/off control (with `noise` deg of sloppiness) and taps `telemarkErr` seconds
 * before touchdown.
 */
export function pilot(hill: Hill, opts: { tuck?: boolean; popErr?: number; aim?: number; noise?: number; telemarkLead?: number; seed?: number } = {}): Jump {
  const { tuck = true, popErr = 0, aim = BAND_C, noise = 0, telemarkLead = 0.15, seed = 1 } = opts;
  const j = newJump(hill);
  const rng = mulberry(seed);
  const dt = 1 / 60;
  let wob = 0;
  let popped = false;
  while (!j.over && j.time < 30) {
    if (j.phase === "inrun") {
      hold(j, tuck);
      const left = (hill.inrun - j.s) / Math.max(1, j.v);
      // tap `popErr` seconds before the lip (0 = on the last frame before it)
      if (!popped && left <= popErr + dt) { tap(j); popped = true; }
    } else if (j.phase === "flight") {
      if (rng() < dt * 2) wob = (rng() - 0.5) * 2 * noise;
      hold(j, j.alpha > aim + wob);
      if (j.telemarkAt < 0) {
        // the autopilot looks one frame ahead with the real physics
        const probe = { ...j, hill } as Jump;
        let t = 0;
        while (!probe.over && t < telemarkLead) { stepJump(probe, 1 / 120); t += 1 / 120; }
        if (probe.over) tap(j);
      }
    }
    stepJump(j, dt);
  }
  return j;
}

export const GATE_C = 1.584; // in-run speed = GATE_C x K^0.59 (m/s), so a good jump lands near 1.15 K on every hill

/** A steady but human jumper, used to set each hill's mark. */
export const STEADY = { popErr: 0.04, noise: 3, telemarkLead: 0.2, seed: 3 };

function shape(stage: number) {
  const k = Math.round(70 + stage * 2.4);
  return {
    k,
    inrun: Math.round(60 + k * 0.6),
    gateSpeed: GATE_C * Math.pow(k, 0.59),
    wind: stage < 5 ? 0 : (stage % 3 === 0 ? -1 : 1) * (0.5 + (stage % 5) * 0.4),
    gust: stage < 8 ? 0 : Math.min(16, 5 + (stage - 8) * 0.5),
    frac: Math.min(0.9, 0.78 + stage * 0.005),
  };
}

export function buildHill(stage: number): Hill {
  const sh = shape(stage);
  const rng = mulberry(3300 + stage * 59);
  const gusts = Array.from({ length: 24 }, () => (rng() - 0.5) * 2 * sh.gust);
  const hill: Hill = { stage, k: sh.k, inrun: sh.inrun, gateSpeed: sh.gateSpeed, wind: sh.wind, gusts, goal: 0, par: 0 };
  hill.par = pilot(hill).points;
  // the mark comes from a steady but human jump: a little early off the lip, a wobbly body angle
  const steady = pilot(hill, STEADY);
  hill.goal = Math.round(steady.points * sh.frac);
  return hill;
}

export const HILLS: Hill[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildHill(i));
