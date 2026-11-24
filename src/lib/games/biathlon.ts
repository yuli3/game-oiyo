/**
 * Biathlon (바이애슬론) — ski hard, then calm your heart and shoot.
 *
 * Hold to push on the skis: you go faster but your heart rate climbs. Let go to glide and it eases.
 * At the range the skier stops and the sight sways: a slow sway with the breath, plus a tremor that
 * grows with the heart rate. Tap to fire when the sight is on the target. Each miss sends you round a
 * penalty loop. Waiting at the range calms the heart, but the clock keeps running. Beat the rival.
 *
 * The tremor is seeded noise, so a run is deterministic for a given stage and seed, and the vitest
 * proofs, the React quick play and the Unity port share these rules.
 */

export const BIATHLON_SLUG = "biathlon";
export const STAGE_COUNT = 30;
export const SHOTS = 5;
export const REST = 70; // bpm
export const MAX_HR = 195;
export const PUSH = 3.0; // m/s² while holding
export const DRAG = 0.25; // per second
export const GLIDE = 0.4; // m/s² lost while gliding
export const HR_UP = 8; // bpm per second while pushing
export const HR_EASE = 0.18; // share per second the heart eases toward rest while gliding
export const HR_EASE_RANGE = 0.3; // faster while standing still at the range
export const PENALTY = 10; // seconds per miss (the penalty loop)
export const SWAY_W = 2.2; // rad/s of the slow sway
export const BREATH_W = 1.3; // rad/s of the breathing bob
export const TREMOR_TAU = 0.25; // s
export const AIM_TIME = 0.6; // s at the range before the first shot can be fired

export interface BiathlonStage {
  stage: number;
  legs: number; // ski legs; there is a range between each pair
  leg: number; // metres per leg
  radius: number; // target radius (px)
  goal: number; // rival time (s)
  par: number;
  seed: number;
}

export type Phase = "ski" | "range" | "done";

export interface Racer {
  stage: BiathlonStage;
  t: number;
  phase: Phase;
  leg: number; // current leg index
  d: number; // metres into this leg
  v: number;
  hr: number;
  pushing: boolean;
  shot: number; // shots fired at this range
  hits: number;
  misses: number;
  penalty: number; // seconds of penalty loop still to ski
  rangeT: number; // seconds at this range
  tx: number; // tremor offsets
  ty: number;
  rng: number; // tremor rng state
  over: boolean;
  won: boolean;
  lastShot: null | { hit: boolean; x: number; y: number };
}

export type RaceEvent = "range" | "hit" | "miss" | "leave" | "finish" | null;

function nextRand(r: Racer): number {
  r.rng = (r.rng + 0x6d2b79f5) >>> 0;
  let t = r.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A standard normal draw from the racer's own seeded stream. */
function gauss(r: Racer): number {
  const u = Math.max(1e-9, nextRand(r));
  const v = nextRand(r);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function newRacer(stage: BiathlonStage, seed = stage.seed): Racer {
  return { stage, t: 0, phase: "ski", leg: 0, d: 0, v: 0, hr: REST + 20, pushing: false, shot: 0, hits: 0, misses: 0, penalty: 0, rangeT: 0, tx: 0, ty: 0, rng: seed >>> 0, over: false, won: false, lastShot: null };
}

/** Sway amplitude (px) and tremor strength (px/√s) for a heart rate. */
export const swayFor = (hr: number) => 2 + 0.2 * (hr - REST);
export const tremorFor = (hr: number) => 0.35 * Math.max(0, hr - REST) + 0.6 * Math.max(0, hr - 120);

/** Where the sight is now, relative to the target's centre (px). */
export function sight(r: Racer): { x: number; y: number } {
  const a = swayFor(r.hr);
  return { x: a * Math.sin(SWAY_W * r.rangeT) + r.tx, y: 4 * Math.sin(BREATH_W * r.rangeT + 0.7) + r.ty };
}

export function setPush(r: Racer, on: boolean): void {
  r.pushing = on && r.phase === "ski";
}

/** A tap at the range fires one shot. */
export function fire(r: Racer): RaceEvent {
  if (r.over || r.phase !== "range" || r.rangeT < AIM_TIME) return null;
  const s = sight(r);
  const hit = Math.hypot(s.x, s.y) <= r.stage.radius;
  r.lastShot = { hit, x: s.x, y: s.y };
  r.shot++;
  if (hit) r.hits++;
  else {
    r.misses++;
    r.penalty += PENALTY;
  }
  if (r.shot >= SHOTS) {
    r.phase = "ski";
    r.leg++;
    r.d = 0;
    r.shot = 0;
  }
  return hit ? "hit" : "miss";
}

export function stepRacer(r: Racer, dt: number): RaceEvent {
  if (r.over) return null;
  let ev: RaceEvent = null;
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / n;
  for (let k = 0; k < n && !r.over; k++) {
    r.t += h;
    if (r.phase === "range") {
      r.rangeT += h;
      r.hr = REST + (r.hr - REST) * Math.exp(-HR_EASE_RANGE * h);
      // tremor: mean-reverting noise that grows with the heart rate
      const sig = tremorFor(r.hr);
      r.tx += (-r.tx / TREMOR_TAU) * h + sig * Math.sqrt(h) * gauss(r);
      r.ty += (-r.ty / TREMOR_TAU) * h + sig * 0.6 * Math.sqrt(h) * gauss(r);
      continue;
    }
    // skiing (the penalty loop is skied at the same pace before the leg goes on)
    if (r.pushing) {
      r.v += (PUSH - DRAG * r.v) * h;
      r.hr = Math.min(MAX_HR, r.hr + HR_UP * h);
    } else {
      r.v = Math.max(0, r.v - (GLIDE + DRAG * r.v) * h);
      r.hr = REST + (r.hr - REST) * Math.exp(-HR_EASE * h);
    }
    if (r.penalty > 0) {
      r.penalty = Math.max(0, r.penalty - h);
      continue;
    }
    r.d += r.v * h;
    if (r.d >= r.stage.leg) {
      if (r.leg >= r.stage.legs - 1) {
        r.over = true;
        r.phase = "done";
        r.won = r.stage.goal > 0 && r.t <= r.stage.goal;
        return "finish";
      }
      r.phase = "range";
      r.pushing = false;
      r.v = 0;
      r.rangeT = 0;
      r.tx = 0;
      r.ty = 0;
      ev = "range";
    }
  }
  return ev;
}

export function starsFor(r: Racer): number {
  if (!r.won) return 0;
  if (r.t <= r.stage.goal * 0.95) return 3;
  if (r.t <= r.stage.goal * 0.975) return 2;
  return 1;
}

export interface PilotOpts {
  /** coast once the heart passes this, push again below `cap - 12` */
  cap?: number;
  /** wait at the range until the heart is at or below this */
  calm?: number;
  /** fire when the sight is within this share of the radius */
  aim?: number;
  /** frames between seeing the sight on target and the shot */
  lag?: number;
  /** fire as soon as allowed, wherever the sight is */
  spray?: boolean;
  seed?: number;
}

/** Autopilot: pushes up to a heart-rate cap, calms down at the range, fires when the sight is on. */
export function pilot(stage: BiathlonStage, opts: PilotOpts = {}): Racer {
  const { cap = 160, calm = 92, aim = 0.55, lag = 1, spray = false, seed = stage.seed } = opts;
  const r = newRacer(stage, seed);
  const dt = 1 / 60;
  let pending = -1;
  let push = true;
  while (!r.over && r.t < 600) {
    if (r.phase === "ski") {
      if (r.hr >= cap) push = false;
      else if (r.hr <= cap - 12) push = true;
      setPush(r, push);
    } else if (r.phase === "range") {
      if (pending > 0) {
        pending--;
        if (pending === 0) {
          fire(r);
          pending = -1;
        }
      } else if (r.rangeT >= AIM_TIME) {
        const s = sight(r);
        const on = Math.hypot(s.x, s.y) <= stage.radius * aim;
        if (spray || (r.hr <= calm && on)) {
          if (lag <= 0) fire(r);
          else pending = lag;
        }
      }
    }
    stepRacer(r, dt);
  }
  return r;
}

function shape(stage: number) {
  return {
    legs: stage < 15 ? 2 : 3,
    leg: 130 + (stage % 15) * 5,
    radius: Math.max(6, 10 - stage * 0.14),
  };
}

export function buildStage(stage: number): BiathlonStage {
  const sh = shape(stage);
  const st: BiathlonStage = { stage, legs: sh.legs, leg: sh.leg, radius: sh.radius, goal: 0, par: 0, seed: 1000 + stage * 7 };
  st.par = pilot(st, { lag: 0 }).t;
  // the rival is a steady human (a 100 ms reaction, the same plan): the median of six such runs,
  // plus room for one penalty loop
  const times = [11, 23, 37, 41, 53, 67].map((seed) => pilot(st, { lag: 6, seed }).t).sort((a, b) => a - b);
  st.goal = Math.round(((times[2] + times[3]) / 2) * 1.03 * 10 + PENALTY * 10) / 10;
  return st;
}

export const BIATHLON_STAGES: BiathlonStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
