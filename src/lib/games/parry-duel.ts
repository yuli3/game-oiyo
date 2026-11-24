/**
 * Parry Duel (막기 결투) — an OIYO original turn-based duel with timed parries (2026-11-24).
 *
 * You and a rival take turns. On your turn you pick a move: a strike, a heavy blow or mending your wounds (the
 * last two cost focus). On the rival's turn they swing a combo at you, and every swing is shown coming: they
 * raise their weapon, and the blow lands a moment later. Tap as it lands. Tap right on the beat and you parry —
 * no damage, a quick counter and a point of focus. A little off and you block for a quarter of the damage. Miss
 * it, or tap too early and fumble, and the blow lands in full. Each rival has a few combos it repeats, so you
 * learn their rhythm; later rivals swing faster, feint with long wind-ups and leave a narrower beat.
 *
 * Pure and deterministic: every rival and its combos are seeded per stage.
 */

export const PARRY_SLUG = "parry-duel";
export const STAGE_COUNT = 30;
export const PLAYER_HP = 100;
export const FOCUS_MAX = 5;
export const FUMBLE = 0.35; // s you cannot parry after tapping at nothing
export const STRIKE = 8;
export const HEAVY = 18;
export const MEND = 16;
export const COUNTER = 2;

/** One swing: when it is raised (s from the combo's start), how long the wind-up is, and its damage. */
export interface Swing { at: number; windup: number; damage: number; feint: boolean }
export interface Rival {
  stage: number;
  hp: number;
  combos: Swing[][]; // repeated in order, one per rival turn
  perfect: number; // ± s for a parry
  good: number; // ± s for a block
  par: number; // rounds a sharp duellist needs
}

export const hitTime = (s: Swing) => s.at + s.windup;
export type Move = "strike" | "heavy" | "mend";
export const focusCost: Record<Move, number> = { strike: 0, heavy: 2, mend: 3 };

export type Phase = "choose" | "defend" | "done";
export interface Duel {
  rival: Rival;
  hp: number;
  foe: number;
  focus: number;
  round: number;
  phase: Phase;
  t: number; // s into the rival's combo
  swing: number; // next swing to resolve
  lockUntil: number;
  parries: number;
  blocks: number;
  hits: number;
  over: boolean;
  won: boolean;
}

export function newDuel(rival: Rival): Duel {
  return { rival, hp: PLAYER_HP, foe: rival.hp, focus: 0, round: 0, phase: "choose", t: 0, swing: 0, lockUntil: -1, parries: 0, blocks: 0, hits: 0, over: false, won: false };
}

export const combo = (d: Duel) => d.rival.combos[d.round % d.rival.combos.length];

/** Plays your move for this round; the rival's combo starts straight after. */
export function choose(d: Duel, mv: Move): boolean {
  if (d.over || d.phase !== "choose" || d.focus < focusCost[mv]) return false;
  d.focus -= focusCost[mv];
  if (mv === "strike") d.foe -= STRIKE;
  if (mv === "heavy") d.foe -= HEAVY;
  if (mv === "mend") d.hp = Math.min(PLAYER_HP, d.hp + MEND);
  if (d.foe <= 0) {
    d.foe = 0;
    d.over = true;
    d.won = true;
    d.phase = "done";
    return true;
  }
  d.phase = "defend";
  d.t = 0;
  d.swing = 0;
  d.lockUntil = -1;
  return true;
}

export type TapResult = "parry" | "block" | "fumble" | "locked" | null;

/** A tap during the rival's combo: judged against the next swing's landing. */
export function tap(d: Duel): TapResult {
  if (d.over || d.phase !== "defend") return null;
  if (d.t < d.lockUntil) return "locked";
  const sw = combo(d)[d.swing];
  if (!sw) return null;
  const off = Math.abs(d.t - hitTime(sw));
  if (off <= d.rival.perfect) {
    d.parries++;
    d.focus = Math.min(FOCUS_MAX, d.focus + 1);
    d.foe -= COUNTER;
    d.swing++;
    if (d.foe <= 0) finish(d, true);
    return "parry";
  }
  if (off <= d.rival.good) {
    d.blocks++;
    hurt(d, Math.ceil(sw.damage / 4));
    d.swing++;
    return "block";
  }
  d.lockUntil = d.t + FUMBLE;
  return "fumble";
}

function hurt(d: Duel, n: number): void {
  d.hp -= n;
  if (d.hp <= 0) {
    d.hp = 0;
    finish(d, false);
  }
}

function finish(d: Duel, won: boolean): void {
  d.over = true;
  d.won = won;
  d.phase = "done";
}

export interface DuelEvents { hit: boolean; turnOver: boolean }

export function stepDuel(d: Duel, dt: number): DuelEvents {
  const ev: DuelEvents = { hit: false, turnOver: false };
  if (d.over || d.phase !== "defend") return ev;
  d.t += dt;
  const c = combo(d);
  // a swing not parried or blocked by the end of its window lands in full
  while (!d.over && d.swing < c.length && d.t > hitTime(c[d.swing]) + d.rival.good) {
    d.hits++;
    hurt(d, c[d.swing].damage);
    d.swing++;
    ev.hit = true;
  }
  if (!d.over && d.swing >= c.length) {
    d.round++;
    d.phase = "choose";
    ev.turnOver = true;
  }
  return ev;
}

export function starsFor(d: Duel): number {
  if (!d.won) return 0;
  if (d.hits === 0 && d.round <= d.rival.par) return 3;
  if (d.hp >= PLAYER_HP / 2) return 2;
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

/** Fisher–Yates, the only shuffle used here. */
function shuffle<T>(xs: T[], rng: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** What a sensible duellist picks: mend when low, heavy when focus allows, otherwise strike. */
export function plan(d: Duel): Move {
  if (d.focus >= 3 && d.hp <= 45 && d.foe > HEAVY) return "mend";
  if (d.focus >= 2) return "heavy";
  return "strike";
}

export interface DuellistOpts {
  /** s of timing spread (standard deviation) on a tap */
  spread?: number;
  /** chance to be fooled by a feint into tapping where a normal wind-up would land */
  fooled?: number;
  seed?: number;
  /** "time" taps on the beat; "mash" taps every few tenths of a second; "early" taps as soon as a swing is raised */
  mode?: "time" | "mash" | "early";
}

/** Gaussian-ish (sum of four uniforms) in standard deviations. */
function gauss(rng: () => number): number {
  return ((rng() + rng() + rng() + rng() - 2) / Math.sqrt(4 / 12));
}

export function pilot(rival: Rival, opts: DuellistOpts = {}): Duel {
  const { spread = 0, fooled = 0, seed = 1, mode = "time" } = opts;
  const rng = mulberry(seed * 5323 + 9);
  const d = newDuel(rival);
  const dt = 1 / 120;
  let plannedFor = -1;
  let tapAt = Infinity;
  let mashAt = 0;
  while (!d.over && d.round < 200) {
    if (d.phase === "choose") {
      choose(d, plan(d));
      plannedFor = -1;
      mashAt = 0.1;
      continue;
    }
    const sw = combo(d)[d.swing];
    if (mode === "time" && sw && plannedFor !== d.swing) {
      plannedFor = d.swing;
      // a fooled duellist taps where an ordinary wind-up would have landed, then fumbles
      const base = sw.feint && rng() < fooled ? sw.at + sw.windup * 0.5 : hitTime(sw);
      tapAt = base + gauss(rng) * spread;
    }
    if (mode === "time" && d.t >= tapAt) {
      tapAt = Infinity;
      const r = tap(d);
      if (r === "fumble") {
        // fooled or early: try again on the real beat if there is still time
        const left = hitTime(sw) - d.t;
        if (left > FUMBLE) tapAt = hitTime(sw) + gauss(rng) * spread;
      }
    }
    if (mode === "mash" && d.t >= mashAt) {
      tap(d);
      mashAt = d.t + 0.25 + rng() * 0.1;
    }
    if (mode === "early" && sw && plannedFor !== d.swing) {
      plannedFor = d.swing;
      tapAt = sw.at + 0.15;
    }
    if (mode === "early" && d.t >= tapAt) {
      tapAt = Infinity;
      tap(d);
    }
    stepDuel(d, dt);
  }
  return d;
}

function shape(stage: number) {
  return {
    swings: Math.min(6, 2 + Math.floor(stage / 6)),
    windup: Math.max(0.42, 0.95 - stage * 0.018),
    gap: Math.max(0.25, 0.55 - stage * 0.01),
    perfect: Math.max(0.045, 0.075 - stage * 0.001),
    good: Math.max(0.09, 0.13 - stage * 0.0013),
    feint: stage < 5 ? 0 : Math.min(0.35, (stage - 4) * 0.02),
    damage: 10 + Math.floor(stage / 3),
  };
}

/** Human-like duellists used to check a rival: about 55 ms off the beat, fooled by half the feints. */
export const HUMAN_DUELLISTS: DuellistOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ spread: 0.055, fooled: 0.5, seed }));

export function buildStage(stage: number): Rival {
  const sh = shape(stage);
  const rng = mulberry(191000 + stage * 127);
  const combos: Swing[][] = [];
  for (let k = 0; k < 3; k++) {
    const n = Math.max(1, sh.swings - (k === 0 ? 1 : 0) + (k === 2 && stage > 10 ? 1 : 0));
    const swings: Swing[] = [];
    let at = 0.6;
    for (let i = 0; i < n; i++) {
      const feint = rng() < sh.feint;
      const windup = sh.windup * (feint ? 1.7 + rng() * 0.4 : 0.85 + rng() * 0.3);
      swings.push({ at, windup, damage: sh.damage + Math.floor(rng() * 4), feint });
      at += windup + sh.gap * (0.8 + rng() * 0.6);
    }
    combos.push(swings);
  }
  const rival: Rival = { stage, hp: 80 + stage * 8, combos: shuffle(combos, rng), perfect: sh.perfect, good: sh.good, par: 0 };
  // soften the rival's blows until most human-like duellists win
  for (let tries = 0; tries < 12; tries++) {
    const wins = HUMAN_DUELLISTS.filter((o) => pilot(rival, o).won).length;
    if (wins >= 7) break;
    for (const c of rival.combos) for (const sw of c) sw.damage = Math.max(4, sw.damage - 1);
  }
  rival.par = pilot(rival).round;
  return rival;
}

export const PARRY_STAGES: Rival[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
