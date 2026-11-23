/**
 * 부럼 깨기 (Bureom Crack) — an OIYO original take on the first-full-moon custom of cracking nuts.
 * On Daeboreum morning you crack hard nuts with your teeth for strong teeth and a year without boils.
 * Press and hold to bite down; the pressure climbs faster the harder you bite. Let go inside the
 * nut's crack band: too soft and the shell holds, too hard and the nut turns to crumbs. Peanuts,
 * chestnuts, walnuts, ginkgo and pine nuts each crack differently, and a sneaky pebble or two hides
 * among them: swipe those away instead of biting.
 */

import { mulberry } from "./pixel-kit";

export const BUREOM_SLUG = "bureom-crack";
export const STAGE_COUNT = 30;
export const HEARTS = 3;

export type NutKind = 0 | 1 | 2 | 3 | 4 | 5; // peanut, chestnut, walnut, ginkgo, pine nut, pebble
export const PEBBLE: NutKind = 5;

/** Crack band for each nut (pressure 0..1). */
export const BANDS: Array<[number, number]> = [
  [0.3, 0.56], // peanut
  [0.46, 0.7], // chestnut
  [0.62, 0.84], // walnut
  [0.36, 0.52], // ginkgo
  [0.2, 0.33], // pine nut
  [0, 0], // pebble
];

export interface Nut { kind: NutKind; lo: number; hi: number; rate: number }

export interface BureomLevel {
  stage: number;
  need: number;
  nuts: Nut[];
}

export type BiteResult = "crack" | "perfect" | "soft" | "crush" | "ouch" | "toss" | "waste";

export interface BureomState {
  level: BureomLevel;
  index: number;
  pressure: number;
  biting: boolean;
  hearts: number;
  cracked: number;
  perfect: number;
  over: boolean;
  won: boolean;
  time: number;
}

export function buildLevel(stage: number): BureomLevel {
  const rng = mulberry(7300 + stage * 59);
  const need = Math.min(14, 5 + Math.floor(stage / 3));
  const kinds = Math.min(5, 2 + Math.floor(stage / 4));
  const pebbles = stage < 7 ? 0 : Math.min(4, 1 + Math.floor((stage - 7) / 6));
  const spare = 3;
  const nuts: Nut[] = [];
  for (let k = 0; k < need + spare; k++) {
    const kind = Math.floor(rng() * kinds) as NutKind;
    const [lo, hi] = BANDS[kind];
    const shift = stage >= 23 ? (rng() - 0.5) * 0.1 : 0; // later shells differ nut to nut
    const rate = (0.5 + stage * 0.017) * (stage >= 10 ? 0.85 + rng() * 0.3 : 1);
    nuts.push({ kind, lo: lo + shift, hi: hi + shift, rate });
  }
  for (let k = 0; k < pebbles; k++) {
    const at = 1 + Math.floor(rng() * (nuts.length - 1));
    nuts.splice(at, 0, { kind: PEBBLE, lo: 0, hi: 0, rate: 0.5 + stage * 0.017 });
  }
  return { stage, need, nuts };
}

export const LEVELS: BureomLevel[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));

export function newBureom(stage: number): BureomState {
  return { level: LEVELS[stage], index: 0, pressure: 0, biting: false, hearts: HEARTS, cracked: 0, perfect: 0, over: false, won: false, time: 0 };
}

export function current(s: BureomState): Nut | null {
  return s.level.nuts[s.index] ?? null;
}

/** Pressure climbs faster the harder you already bite. */
export function pressureRate(n: Nut, p: number): number {
  return n.rate * (0.5 + 1.5 * p);
}

export function bite(s: BureomState): void {
  if (s.over || !current(s)) return;
  s.biting = true;
  s.pressure = 0;
}

function next(s: BureomState): void {
  s.index++;
  s.pressure = 0;
  s.biting = false;
  if (s.cracked >= s.level.need) {
    s.over = true;
    s.won = true;
    return;
  }
  // out of hearts, or not enough real nuts left to reach the goal
  const left = s.level.nuts.slice(s.index).filter((n) => n.kind !== PEBBLE).length;
  if (s.hearts <= 0 || left < s.level.need - s.cracked) s.over = true;
}

/** Let go: judge the bite. */
export function release(s: BureomState): BiteResult | null {
  const n = current(s);
  if (s.over || !n || !s.biting) return null;
  s.biting = false;
  const p = s.pressure;
  let r: BiteResult;
  if (n.kind === PEBBLE) {
    if (p < 0.12) {
      s.pressure = 0;
      return "soft";
    }
    s.hearts--;
    r = "ouch";
  } else if (p < n.lo) {
    s.pressure = 0;
    return "soft"; // the shell held; bite again
  } else if (p > n.hi) {
    s.hearts--;
    r = "crush";
  } else {
    s.cracked++;
    const mid = (n.lo + n.hi) / 2;
    const half = (n.hi - n.lo) / 2;
    if (Math.abs(p - mid) <= half * 0.4) {
      s.perfect++;
      r = "perfect";
    } else r = "crack";
  }
  next(s);
  return r;
}

/** Swipe the nut off the tray: right for a pebble, a waste for a real nut. */
export function toss(s: BureomState): BiteResult | null {
  const n = current(s);
  if (s.over || !n) return null;
  const r: BiteResult = n.kind === PEBBLE ? "toss" : "waste";
  next(s);
  return r;
}

/** Advance time; biting past the top of the gauge crushes the nut on its own. */
export function stepBureom(s: BureomState, dt: number): BiteResult | null {
  if (s.over) return null;
  s.time += dt;
  const n = current(s);
  if (!s.biting || !n) return null;
  s.pressure += pressureRate(n, s.pressure) * dt;
  if (s.pressure >= 1) {
    s.pressure = 1;
    return release(s);
  }
  return null;
}

/** Seconds of holding to reach pressure `p`. */
export function timeTo(n: Nut, p: number): number {
  // dp/dt = r(0.5 + 1.5p)  ->  t = ln((0.5 + 1.5p) / 0.5) / (1.5 r)
  return Math.log((0.5 + 1.5 * p) / 0.5) / (1.5 * n.rate);
}

/** Autopilot for the tests: aim for the middle of the band, letting go `jitter` seconds off at random. */
export function playAuto(stage: number, jitter: number, seed: number): BureomState {
  const s = newBureom(stage);
  const rng = mulberry(seed);
  for (let guard = 0; guard < 200 && !s.over; guard++) {
    const n = current(s)!;
    if (n.kind === PEBBLE) {
      toss(s);
      continue;
    }
    bite(s);
    const hold = Math.max(0, timeTo(n, (n.lo + n.hi) / 2) + (rng() + rng() + rng() - 1.5) * 2 * jitter);
    const dt = 1 / 120;
    let t = 0;
    let done = false;
    while (t < hold) {
      if (stepBureom(s, dt)) {
        done = true;
        break;
      }
      t += dt;
    }
    if (!done) release(s);
  }
  return s;
}

export function starsFor(s: BureomState): number {
  if (!s.won) return 0;
  if (s.hearts === HEARTS && s.perfect * 2 >= s.cracked) return 3;
  if (s.hearts >= 2) return 2;
  return 1;
}
