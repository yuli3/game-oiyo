/**
 * Tug of War (줄다리기) — the great rope pull of Jeongwol Daeboreum: pull when they slip.
 *
 * The other village pulls in waves: a heave ("Yeongcha!") and then a slack while they reset their
 * grip, and they shout just before every heave. Hold to pull: in their slack that hauls the rope your
 * way, but pulling into a heave yanks your team off its feet. Let go and your team digs in and braces,
 * which holds a slack and only gives a little to a heave. Haul the flag past your line before the time
 * is up, and never let it cross theirs.
 * Pure and deterministic: the other team's rhythm is seeded per stage.
 */

export const TUG_SLUG = "tug-of-war";
export const STAGE_COUNT = 30;
export const PULL = 1.2; // force while pulling
export const YANKED = 0; // force while pulling into a heave (the team loses its footing)
export const BRACE = 0.65; // force while bracing
export const MOVE = 0.25; // rope travel per unit of net force per second (1 = from the middle to a line)
export const WARN = 0.35; // s of warning shout before each heave

export interface Wave { start: number; heave: number } // heave starts at `start` and lasts `heave` s
export interface TugStage {
  stage: number;
  slackF: number; // their force while resetting
  heaveF: number; // their force in a heave (tuned per stage)
  waves: Wave[];
  limit: number; // s
  par: number;
}

export interface Tug {
  stage: TugStage;
  t: number;
  x: number; // -1 their line .. 1 your line
  holding: boolean;
  over: boolean;
  won: boolean;
}

export type Phase = "slack" | "warn" | "heave";

export function phaseAt(stage: TugStage, t: number): Phase {
  for (const w of stage.waves) {
    if (t < w.start - WARN) return "slack";
    if (t < w.start) return "warn";
    if (t < w.start + w.heave) return "heave";
  }
  return "slack";
}

export function theirForce(stage: TugStage, t: number): number {
  return phaseAt(stage, t) === "heave" ? stage.heaveF : stage.slackF;
}

export function yourForce(g: Tug): number {
  if (!g.holding) return BRACE;
  return phaseAt(g.stage, g.t) === "heave" ? YANKED : PULL;
}

export function newTug(stage: TugStage): Tug {
  return { stage, t: 0, x: 0, holding: false, over: false, won: false };
}

export function stepTug(g: Tug, dt: number): boolean {
  if (g.over) return false;
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / n;
  for (let k = 0; k < n; k++) {
    const net = yourForce(g) - theirForce(g.stage, g.t);
    g.x += net * MOVE * h;
    g.t += h;
    if (g.x >= 1) {
      g.over = true;
      g.won = true;
      return true;
    }
    if (g.x <= -1 || g.t >= g.stage.limit) {
      g.over = true;
      g.won = false;
      return true;
    }
  }
  return false;
}

export function starsFor(g: Tug): number {
  if (!g.won) return 0;
  const left = (g.stage.limit - g.t) / g.stage.limit;
  if (left >= 0.1) return 3;
  if (left >= 0.05) return 2;
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
  /** "read" pulls in their slack and braces from the warning shout; the rest are bad habits */
  mode?: "read" | "always" | "never" | "beat";
  /** for "beat": hold and rest this many seconds each, ignoring them */
  beat?: number;
}

/** Autopilot: pulls while they reset, braces from the warning shout until the heave is over. */
export function pilot(stage: TugStage, opts: PilotOpts = {}): Tug {
  const { lag = 0, mode = "read", beat = 1 } = opts;
  const g = newTug(stage);
  const dt = 1 / 60;
  const seen: boolean[] = [];
  const delay = Math.round(lag / dt);
  while (!g.over) {
    const want = mode === "always" ? true : mode === "never" ? false : mode === "beat" ? Math.floor(g.t / beat) % 2 === 0 : phaseAt(stage, g.t) === "slack";
    seen.push(want);
    g.holding = seen.length > delay ? seen[seen.length - 1 - delay] : false;
    stepTug(g, dt);
  }
  return g;
}

function shape(stage: number) {
  return {
    slackF: 0.6 + stage * 0.003,
    slackLo: Math.max(0.7, 1.3 - stage * 0.018),
    slackHi: Math.max(1.1, 1.9 - stage * 0.022),
    heaveLo: 0.6,
    heaveHi: 0.9 + stage * 0.008,
  };
}

export function buildStage(stage: number): TugStage {
  const sh = shape(stage);
  const rng = mulberry(6100 + stage * 13);
  const waves: Wave[] = [];
  let t = 1.4;
  while (t < 200) {
    const heave = sh.heaveLo + rng() * (sh.heaveHi - sh.heaveLo);
    waves.push({ start: t, heave });
    t += heave + sh.slackLo + rng() * (sh.slackHi - sh.slackLo);
  }
  const st: TugStage = { stage, slackF: sh.slackF, heaveF: 1, waves, limit: 200, par: 0 };
  // their heave is as strong as it can be while a human who reacts 0.2 s late still wins in the
  // stage's target time (18 s on stage 1, 32.5 s on stage 30)
  const target = 18 + stage * 0.5;
  let lo = 0.7;
  let hi = 3;
  for (let i = 0; i < 30; i++) {
    st.heaveF = (lo + hi) / 2;
    const r = pilot(st, { lag: 0.2 });
    if (r.won && r.t <= target) lo = st.heaveF;
    else hi = st.heaveF;
  }
  st.heaveF = Math.round(lo * 1000) / 1000;
  st.par = pilot(st).t;
  st.limit = Math.round(pilot(st, { lag: 0.2 }).t * 1.15 * 10) / 10;
  return st;
}

export const TUG_STAGES: TugStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
