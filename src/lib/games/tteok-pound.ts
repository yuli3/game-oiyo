/**
 * 떡메치기 (Rice Cake Pounding) — an OIYO original timing game for Seollal.
 * Hold to lift the mallet, let go to bring it down on the rice dough. Your partner's hand dives in
 * to fold the dough between strikes: pound only after the hand is fully out, and only after a fold.
 * Later partners get quicker, change rhythm, and hover above the dough as a fake-out. Two players can share one phone:
 * one pounds, one folds, and nobody wants a mallet on the hand.
 */

import { mulberry } from "./pixel-kit";

export const TTEOK_SLUG = "tteok-pound";
export const RAISE_TIME = 0.45; // seconds to lift the mallet all the way
export const SAFE_POS = 0.7; // hand position (0 = in the dough, 1 = away) that is safe to strike
export const HAND_SPEED = 6; // positions per second
export const MIN_LIFT = 0.15;
export const WEAK_LIFT = 0.4;
export const PERFECT_WINDOW = 0.22;

export interface StageSpec { target: number; delay: number; stay: number; jitter: number; fake: number; snap: number; hearts: number; limit: number }

function specFor(i: number): StageSpec {
  const t = i / 29;
  const target = 8 + Math.floor(i / 2);
  const delay = 0.38 - t * 0.2;
  const stay = 0.95 - t * 0.45;
  const fake = i < 8 ? 0 : Math.min(0.4, 0.1 + (i - 8) * 0.015);
  const snap = i < 15 ? 0 : Math.min(0.4, 0.12 + (i - 15) * 0.02); // chance of a very short fold
  return {
    target,
    delay,
    stay,
    jitter: Math.min(0.3, 0.04 + i * 0.009),
    fake,
    snap,
    hearts: 3,
    limit: Math.ceil(target * (delay + stay + 0.9 + fake * 0.6) + 6),
  };
}

export const STAGE_COUNT = 30;
export const STAGES: readonly StageSpec[] = Array.from({ length: STAGE_COUNT }, (_, i) => specFor(i));

interface Cue { at: number; to: number }

export interface Mortar {
  stage: number;
  twoPlayer: boolean;
  time: number;
  lift: number; // 0..1 mallet height
  holding: boolean;
  falling: { at: number; power: number } | null; // landing time of a released strike
  hand: number; // 0 = folding in the dough, 1 = away
  handTarget: number;
  turnerHolding: boolean;
  folded: boolean; // a fold happened since the last good pound
  outAt: number; // when the hand last crossed SAFE_POS on the way out
  cues: Cue[];
  pounds: number;
  perfects: number;
  combo: number;
  bestCombo: number;
  ouches: number;
  hearts: number;
  over: boolean;
  won: boolean;
  rand: () => number;
}

export type StrikeResult = "perfect" | "good" | "weak" | "unfolded" | "ouch";
export interface MortarEvents { strike: StrikeResult | null; fold: boolean }

export function newMortar(stage: number, seed: number, twoPlayer = false): Mortar {
  const m: Mortar = {
    stage, twoPlayer, time: 0, lift: 0, holding: false, falling: null, hand: 1, handTarget: 1, turnerHolding: false,
    folded: false, outAt: -1, cues: [], pounds: 0, perfects: 0, combo: 0, bestCombo: 0, ouches: 0, hearts: STAGES[stage].hearts,
    over: false, won: false, rand: mulberry(seed),
  };
  if (!twoPlayer) schedule(m, 0.6);
  return m;
}

/** Plan the partner's next fold, starting `wait` seconds from now. */
function schedule(m: Mortar, wait: number): void {
  const sp = STAGES[m.stage];
  const j = () => (m.rand() - 0.5) * 2 * sp.jitter;
  const cues: Cue[] = [];
  let t = m.time + Math.max(0.08, wait + j() * 0.5);
  cues.push({ at: t, to: 0 });
  const stay = m.rand() < sp.snap ? 0.22 : Math.max(0.3, sp.stay + j());
  if (m.rand() < sp.fake) {
    // hover just above the dough, then dive back in: not safe yet
    const half = stay * 0.5;
    cues.push({ at: t + half, to: 0.42 });
    cues.push({ at: t + half + 0.28, to: 0 });
    t += 0.28;
  }
  t += stay;
  cues.push({ at: t, to: 1 });
  m.cues = cues;
}

export function pressMallet(m: Mortar): void {
  if (m.over || m.falling) return;
  m.holding = true;
}

export function releaseMallet(m: Mortar): void {
  if (!m.holding) return;
  m.holding = false;
  if (m.over || m.lift < MIN_LIFT) return;
  m.falling = { at: m.time + fallTime(m.lift), power: m.lift };
}

export function fallTime(lift: number): number {
  return 0.08 + 0.14 * lift;
}

/** Two players: the folder holds to put the hand in the dough. */
export function setTurner(m: Mortar, holding: boolean): void {
  m.turnerHolding = holding;
}

function strike(m: Mortar, power: number): StrikeResult {
  if (m.hand < SAFE_POS) {
    m.ouches += 1;
    m.hearts -= 1;
    m.combo = 0;
    m.handTarget = 1;
    m.hand = Math.max(m.hand, 0.5);
    m.folded = false;
    if (!m.twoPlayer) schedule(m, 0.9);
    return "ouch";
  }
  if (power < WEAK_LIFT) return "weak";
  if (!m.folded) {
    m.combo = 0;
    if (!m.twoPlayer) schedule(m, STAGES[m.stage].delay);
    return "unfolded";
  }
  m.folded = false;
  m.pounds += 1;
  const perfect = m.outAt >= 0 && m.time - m.outAt <= PERFECT_WINDOW;
  if (perfect) m.perfects += 1;
  m.combo += 1;
  m.bestCombo = Math.max(m.bestCombo, m.combo);
  if (!m.twoPlayer) schedule(m, STAGES[m.stage].delay);
  return perfect ? "perfect" : "good";
}

export function stepMortar(m: Mortar, dt: number): MortarEvents {
  const ev: MortarEvents = { strike: null, fold: false };
  if (m.over) return ev;
  m.time += dt;
  if (m.holding) m.lift = Math.min(1, m.lift + dt / RAISE_TIME);
  else if (!m.falling) m.lift = Math.max(0, m.lift - dt * 3);
  if (m.falling) {
    const left = m.falling.at - m.time;
    m.lift = Math.max(0, Math.min(m.lift, (left / fallTime(m.falling.power)) * m.falling.power));
  }

  // hand
  if (m.twoPlayer) m.handTarget = m.turnerHolding ? 0 : 1;
  else {
    while (m.cues.length && m.cues[0].at <= m.time) m.handTarget = m.cues.shift()!.to;
  }
  const before = m.hand;
  const step = HAND_SPEED * dt;
  m.hand = m.hand < m.handTarget ? Math.min(m.handTarget, m.hand + step) : Math.max(m.handTarget, m.hand - step);
  if (m.hand <= 0.05 && !m.folded) {
    m.folded = true;
    ev.fold = true;
  }
  if (before < SAFE_POS && m.hand >= SAFE_POS) m.outAt = m.time;

  if (m.falling && m.time >= m.falling.at) {
    const power = m.falling.power;
    m.falling = null;
    m.lift = 0;
    ev.strike = strike(m, power);
  }

  const sp = STAGES[m.stage];
  if (m.hearts <= 0) {
    m.over = true;
    m.won = false;
  } else if (m.pounds >= sp.target) {
    m.over = true;
    m.won = true;
  } else if (!m.twoPlayer && m.time >= sp.limit) {
    m.over = true;
    m.won = false;
  }
  return ev;
}

/** Hand position at time `at` if nothing changes (used by the cheating test pilot). */
export function handAt(m: Mortar, at: number): number {
  let pos = m.hand;
  let target = m.handTarget;
  const cues = [...m.cues];
  const dt = 1 / 240;
  for (let t = m.time; t < at; t += dt) {
    while (cues.length && cues[0].at <= t) target = cues.shift()!.to;
    pos = pos < target ? Math.min(target, pos + HAND_SPEED * dt) : Math.max(target, pos - HAND_SPEED * dt);
  }
  return pos;
}

export function starsFor(m: Pick<Mortar, "won" | "ouches" | "perfects" | "pounds">): 0 | 1 | 2 | 3 {
  if (!m.won) return 0;
  if (m.ouches === 0 && m.perfects * 2 >= m.pounds) return 3;
  return m.ouches <= 1 ? 2 : 1;
}
