/**
 * Avalanche Rescue (눈사태 구조) — follow the beeps, find them, dig fast.
 *
 * An avalanche has buried skiers wearing transceivers. You carry the searching transceiver: it beeps
 * faster the closer you are to the nearest buried signal and shows an arrow toward it, but far away the
 * arrow wavers. Hold anywhere on the snow to walk there; hold on the rescuer to dig. Digging only helps
 * right on top of someone (within 1.5 m); dig them out and the transceiver picks up the next signal.
 * Find everyone before the air in the snow runs out.
 *
 * Pure and deterministic: the burials and the arrow's wavering are seeded per stage.
 */

export const RESCUE_SLUG = "avalanche-rescue";
export const STAGE_COUNT = 30;
export const WALK = 3.2; // m/s
export const DIG_REACH = 1.5; // m: digging here reaches the buried skier
export const DIG_RATE = 1; // m of snow per second of digging
export const RANGE = 60; // m: the transceiver hears this far

export interface Burial { x: number; y: number; depth: number }
export interface RescueStage {
  stage: number;
  w: number; // field size (m)
  h: number;
  start: { x: number; y: number };
  buried: Burial[];
  noise: number; // arrow wobble (radians) at 30 m; it shrinks as you get closer
  limit: number; // s of air
  par: number;
  seed: number;
}

export interface Rescue {
  stage: RescueStage;
  t: number;
  x: number;
  y: number;
  found: boolean[];
  dug: number; // m dug at the current spot
  digging: boolean;
  target: { x: number; y: number } | null;
  wobble: number; // current arrow error (radians)
  wobbleT: number;
  rng: number;
  over: boolean;
  won: boolean;
}

function nextRand(r: Rescue): number {
  r.rng = (r.rng + 0x6d2b79f5) >>> 0;
  let t = r.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function newRescue(stage: RescueStage, seed = stage.seed): Rescue {
  return { stage, t: 0, x: stage.start.x, y: stage.start.y, found: stage.buried.map(() => false), dug: 0, digging: false, target: null, wobble: 0, wobbleT: 0, rng: seed >>> 0, over: false, won: false };
}

/** The nearest buried skier not yet found, and how far (m), or null when none is in range. */
export function nearest(r: Rescue): { i: number; dist: number } | null {
  let best: { i: number; dist: number } | null = null;
  r.stage.buried.forEach((b, i) => {
    if (r.found[i]) return;
    const d = Math.hypot(b.x - r.x, b.y - r.y);
    if (d <= RANGE && (!best || d < best.dist)) best = { i, dist: d };
  });
  return best;
}

/** What the transceiver shows: distance (m, rounded down to the half metre) and arrow bearing (radians). */
export function reading(r: Rescue): { dist: number; bearing: number } | null {
  const n = nearest(r);
  if (!n) return null;
  const b = r.stage.buried[n.i];
  return { dist: Math.floor(n.dist * 2) / 2, bearing: Math.atan2(b.y - r.y, b.x - r.x) + r.wobble };
}

/** Seconds between beeps: quick when close, slow far away. */
export function beepGap(dist: number): number {
  return 0.12 + Math.min(1.2, dist * 0.03);
}

export function walkTo(r: Rescue, x: number, y: number): void {
  if (r.over) return;
  r.digging = false;
  r.target = { x: Math.max(0, Math.min(r.stage.w, x)), y: Math.max(0, Math.min(r.stage.h, y)) };
}

export function dig(r: Rescue): void {
  if (r.over) return;
  r.target = null;
  r.digging = true;
}

export function stop(r: Rescue): void {
  r.target = null;
  r.digging = false;
}

export type RescueEvent = "found" | "end" | null;

export function stepRescue(r: Rescue, dt: number): RescueEvent {
  if (r.over) return null;
  r.t += dt;
  // the arrow wavers: a new error every 0.4 s, larger the further away
  if ((r.wobbleT -= dt) <= 0) {
    const n = nearest(r);
    const scale = n ? Math.min(1.6, n.dist / 30) : 1;
    r.wobble = (nextRand(r) - 0.5) * 2 * r.stage.noise * scale;
    r.wobbleT = 0.4;
  }
  let ev: RescueEvent = null;
  if (r.target) {
    const dx = r.target.x - r.x;
    const dy = r.target.y - r.y;
    const d = Math.hypot(dx, dy);
    const step = WALK * dt;
    if (d <= step) {
      r.x = r.target.x;
      r.y = r.target.y;
      r.target = null;
    } else {
      r.x += (dx / d) * step;
      r.y += (dy / d) * step;
    }
    r.dug = 0;
  } else if (r.digging) {
    const n = nearest(r);
    if (n && n.dist <= DIG_REACH) {
      r.dug += DIG_RATE * dt;
      if (r.dug >= r.stage.buried[n.i].depth) {
        r.found[n.i] = true;
        r.dug = 0;
        r.digging = false;
        ev = "found";
      }
    } else r.dug = Math.min(r.dug + DIG_RATE * dt, 0.5); // just a hole in the wrong place
  }
  if (r.found.every(Boolean)) {
    r.over = true;
    r.won = true;
    return "end";
  }
  if (r.t >= r.stage.limit) {
    r.over = true;
    r.won = false;
    return "end";
  }
  return ev;
}

export function starsFor(r: Rescue): number {
  if (!r.won) return 0;
  const left = (r.stage.limit - r.t) / r.stage.limit;
  if (left >= 0.2) return 3;
  if (left >= 0.1) return 2;
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
  /** s between reading the transceiver and acting on it */
  react?: number;
  /** m walked along the arrow before reading it again */
  leg?: number;
  /** "follow" walks the arrow; "grid" sweeps the field in strips; "dig" digs where it stands */
  mode?: "follow" | "grid" | "dig";
  seed?: number;
}

/**
 * Autopilot: climbs the slide until a signal comes in, then reads the arrow, walks a short leg along it
 * (shorter as the beeps quicken), and digs once the distance reads 1 m or less.
 */
export function pilot(stage: RescueStage, opts: PilotOpts = {}): Rescue {
  const { react = 0, leg = 6, mode = "follow", seed = stage.seed } = opts;
  const r = newRescue(stage, seed);
  const dt = 1 / 30;
  let wait = 0;
  let gridI = 0;
  while (!r.over && r.t < 900) {
    if (mode === "dig") {
      if (!r.digging) dig(r);
    } else if (mode === "grid") {
      if (!r.target && !r.digging) {
        const n = nearest(r);
        if (n && n.dist <= DIG_REACH) dig(r);
        else {
          // strips 8 m apart, alternating direction, ignoring the arrow
          const strip = Math.floor(gridI / 2);
          const x = Math.min(stage.w, 4 + strip * 8);
          const y = gridI % 4 < 2 ? (gridI % 2 === 0 ? 0 : stage.h) : gridI % 2 === 0 ? stage.h : 0;
          walkTo(r, x, y);
          gridI++;
        }
      }
    } else if (!r.target && !r.digging) {
      if ((wait -= dt) <= 0) {
        const rd = reading(r);
        if (rd) {
          if (rd.dist <= 1) dig(r);
          else {
            const l = Math.min(leg, Math.max(0.6, rd.dist * 0.6));
            walkTo(r, r.x + Math.cos(rd.bearing) * l, r.y + Math.sin(rd.bearing) * l);
          }
        } else walkTo(r, stage.w / 2, Math.min(stage.h, r.y + 10)); // no signal yet: climb the slide until one comes in
        wait = react;
      }
    }
    stepRescue(r, dt);
  }
  return r;
}

function shape(stage: number) {
  return {
    w: 50 + stage * 0.8,
    h: 70 + stage * 1.2,
    count: 1 + Math.floor(stage / 6),
    depth: 1 + stage * 0.04,
    noise: 0.35 + stage * 0.018,
  };
}

export function buildStage(stage: number): RescueStage {
  const sh = shape(stage);
  const rng = mulberry(9100 + stage * 41);
  const buried: Burial[] = [];
  for (let i = 0; i < sh.count; i++) {
    buried.push({ x: 6 + rng() * (sh.w - 12), y: 20 + rng() * (sh.h - 26), depth: sh.depth * (0.8 + rng() * 0.4) });
  }
  const st: RescueStage = { stage, w: sh.w, h: sh.h, start: { x: sh.w / 2, y: 2 }, buried, noise: sh.noise, limit: 9999, par: 0, seed: 9200 + stage * 13 };
  st.par = pilot(st).t;
  // the air lasts for a human who reacts 0.5 s late and walks 8 m legs, plus a fifth
  let worst = 0;
  for (const seed of [3, 7, 11, 19]) worst = Math.max(worst, pilot(st, { react: 0.5, leg: 8, seed }).t);
  st.limit = Math.round(worst * 1.2);
  return st;
}

export const RESCUE_STAGES: RescueStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
