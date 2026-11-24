/**
 * Sell the Heat (더위팔기) — the Daeboreum-morning quick draw: call "buy my heat!" before they do.
 *
 * On the morning of Jeongwol Daeboreum, Koreans play deowi-palgi: call a friend's name, and if they
 * answer, shout "Buy my summer heat!" and the coming summer's heat is theirs. Here neighbours lean out
 * of five windows. When one turns your way and raises a hand, they are about to call you: tap them
 * first to sell your heat. If they call first, you have bought theirs. Some only turn to look and turn
 * away again (no raised hand); tapping them is rude and counts against you, as does tapping a window
 * nobody is calling from. Sell enough heat by the end of the morning.
 *
 * Pure and deterministic: each stage's morning is seeded.
 */

export const HEAT_SLUG = "sell-the-heat";
export const STAGE_COUNT = 30;
export const WINDOWS = 5;

export interface Turn {
  win: number; // window 0..4
  at: number; // s: they turn your way
  real: boolean; // a real caller raises a hand; a looker just looks
  tell: number; // s after turning that the hand goes up (real callers only)
  call: number; // s after turning that they call you (real) or turn away (looker)
}

export interface HeatStage {
  stage: number;
  turns: Turn[];
  length: number; // s of morning
  need: number; // net heat sold to clear the stage
  par: number;
}

export interface Morning {
  stage: HeatStage;
  t: number;
  state: Array<"done" | "pending">; // per turn
  sold: number;
  bought: number;
  rude: number;
  over: boolean;
  won: boolean;
}

export type TapResult = "sold" | "rude" | "late" | null;

export function newMorning(stage: HeatStage): Morning {
  return { stage, t: 0, state: stage.turns.map(() => "pending"), sold: 0, bought: 0, rude: 0, over: false, won: false };
}

/** The turn showing at a window now (turned toward you and not yet resolved), if any. */
export function activeAt(m: Morning, win: number): number {
  for (let i = 0; i < m.stage.turns.length; i++) {
    const tr = m.stage.turns[i];
    if (tr.win === win && m.state[i] === "pending" && m.t >= tr.at && m.t < tr.at + tr.call) return i;
  }
  return -1;
}

/** Whether the raised-hand tell is showing for turn i. */
export function handUp(m: Morning, i: number): boolean {
  const tr = m.stage.turns[i];
  return tr.real && m.t >= tr.at + tr.tell;
}

export function score(m: Morning): number {
  return m.sold - m.bought - m.rude;
}

export function tap(m: Morning, win: number): TapResult {
  if (m.over) return null;
  const i = activeAt(m, win);
  if (i < 0) {
    m.rude++;
    return "rude";
  }
  const tr = m.stage.turns[i];
  m.state[i] = "done";
  if (!tr.real) {
    m.rude++;
    return "rude";
  }
  m.sold++;
  return "sold";
}

export interface MorningEvents { bought: number[]; turnedAway: number[]; end: boolean }

export function stepMorning(m: Morning, dt: number): MorningEvents {
  const ev: MorningEvents = { bought: [], turnedAway: [], end: false };
  if (m.over) return ev;
  m.t += dt;
  for (let i = 0; i < m.stage.turns.length; i++) {
    const tr = m.stage.turns[i];
    if (m.state[i] === "pending" && m.t >= tr.at + tr.call) {
      m.state[i] = "done";
      if (tr.real) {
        m.bought++;
        ev.bought.push(i);
      } else ev.turnedAway.push(i);
    }
  }
  if (m.t >= m.stage.length) {
    m.over = true;
    m.won = score(m) >= m.stage.need;
    ev.end = true;
  }
  return ev;
}

export function starsFor(m: Morning): number {
  if (!m.won) return 0;
  const total = m.stage.turns.filter((t) => t.real).length;
  const s = score(m);
  if (s >= total) return 3;
  if (s >= m.stage.need + Math.ceil((total - m.stage.need) / 2)) return 2;
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
  /** s from the hand going up to the tap (reaction), plus up to `jitter` s more */
  react?: number;
  jitter?: number;
  /** "read" waits for the hand; "any" taps whoever turns; "never" never taps; "spam" taps windows at random */
  mode?: "read" | "any" | "never" | "spam";
  seed?: number;
}

/** Autopilot: taps a neighbour once their hand goes up, after a reaction time. */
export function pilot(stage: HeatStage, opts: PilotOpts = {}): Morning {
  const { react = 0.1, jitter = 0, mode = "read", seed = 1 } = opts;
  const rng = mulberry(seed);
  const m = newMorning(stage);
  const dt = 1 / 60;
  const planned = new Map<number, number>(); // turn index -> time to tap
  let spamT = 0;
  while (!m.over) {
    for (let w = 0; w < WINDOWS; w++) {
      const i = activeAt(m, w);
      if (i < 0 || planned.has(i)) continue;
      const tr = stage.turns[i];
      if (mode === "read" && tr.real && handUp(m, i)) planned.set(i, m.t + react + rng() * jitter);
      if (mode === "any") planned.set(i, m.t + react + rng() * jitter);
    }
    for (const [i, at] of planned) {
      if (at <= m.t && m.state[i] === "pending") {
        tap(m, stage.turns[i].win);
        planned.set(i, Infinity);
      }
    }
    if (mode === "spam" && (spamT -= dt) <= 0) {
      tap(m, Math.floor(rng() * WINDOWS));
      spamT = 0.4;
    }
    stepMorning(m, dt);
  }
  return m;
}

function shape(stage: number) {
  return {
    count: 10 + Math.floor(stage / 2),
    gap: Math.max(0.55, 1.5 - stage * 0.03), // s between turns
    lookerShare: 0.35 + stage * 0.004,
    tell: 0.25 + stage * 0.006, // s before the hand goes up
    window: Math.max(0.6, 1.1 - stage * 0.017), // s from hand up to the call
  };
}

export function buildStage(stage: number): HeatStage {
  const sh = shape(stage);
  const rng = mulberry(8100 + stage * 37);
  const turns: Turn[] = [];
  let t = 1;
  const busyUntil = new Array(WINDOWS).fill(0);
  // exactly this share of the turns are lookers (never the first two), dealt with a Fisher–Yates shuffle
  const deck: boolean[] = Array.from({ length: sh.count - 2 }, (_, i) => i >= Math.round(sh.count * sh.lookerShare));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  for (let k = 0; k < sh.count; k++) {
    // a window not already showing someone
    let win = Math.floor(rng() * WINDOWS);
    for (let tries = 0; tries < WINDOWS && busyUntil[win] > t; tries++) win = (win + 1) % WINDOWS;
    const real = k < 2 ? true : deck[k - 2];
    const tell = sh.tell * (0.8 + rng() * 0.4);
    const call = real ? tell + sh.window * (0.9 + rng() * 0.2) : tell + 0.2 + rng() * 0.5;
    turns.push({ win, at: t, real, tell: real ? tell : 0, call });
    busyUntil[win] = t + call + 0.2;
    t += sh.gap * (0.6 + rng() * 0.8);
  }
  const length = Math.ceil(t + 2);
  const st: HeatStage = { stage, turns, length, need: 0, par: 0 };
  const total = turns.filter((x) => x.real).length;
  // the mark: four fifths of the real callers, net of any slips
  st.need = Math.max(2, Math.ceil(total * 0.8));
  st.par = score(pilot(st));
  return st;
}

export const HEAT_STAGES: HeatStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
