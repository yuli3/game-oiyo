/**
 * 공기놀이 (Gonggi Toss) — an OIYO original take on the Korean five-stone game, for Seollal
 * afternoons on the warm floor. Flick up to toss the mother stone; while it is in the air, tap the
 * stones on the floor to scoop them up, then tap again to catch the mother stone as it comes back
 * down. Step 1 picks one stone per toss, step 2 two at a time, step 3 three then one, step 4 all four.
 * Later stages chain steps together, toss shorter, spread the stones wider and narrow the catch.
 */

import { mulberry } from "./pixel-kit";

export const GONGGI_SLUG = "gonggi-toss";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 560;
export const HAND = { x: 180, y: 470 };
export const PICK_R = 30; // tap this close to a stone to scoop it
export const LIVES = 3;
export const STEPS: number[][] = [[1, 1, 1, 1], [2, 2], [3, 1], [4]];

export interface GonggiLevel {
  stage: number;
  steps: number[]; // which 공기 steps (1..4) to play in order
  airMax: number; // longest toss in seconds
  airMin: number;
  window: number; // ± seconds around the landing to catch
  spread: number; // px radius the stones scatter over
  seed: number;
}

export interface Stone { x: number; y: number; taken: boolean; now?: boolean }

export type TapResult = "pick" | "catch" | "short" | "early" | "none";

export interface GonggiState {
  level: GonggiLevel;
  step: number; // index into level.steps
  round: number; // index into STEPS[step]
  stones: Stone[];
  flying: boolean;
  t: number; // time since toss
  air: number; // this toss's airtime
  picked: number; // stones scooped this toss
  lives: number;
  over: boolean;
  won: boolean;
  catches: number;
  time: number;
  scatter: number; // how many times stones were scattered (for seeding)
}

export function buildLevel(stage: number): GonggiLevel {
  const band = Math.floor(stage / 5);
  let steps: number[];
  if (stage < 4) steps = [stage + 1];
  else if (stage < 10) steps = [1 + (stage % 4), 1 + ((stage + 1) % 4)];
  else if (stage < 20) steps = [1 + (stage % 4), 1 + ((stage + 1) % 4), 1 + ((stage + 2) % 4)];
  else steps = [1, 2, 3, 4];
  return {
    stage,
    steps,
    airMax: Math.max(1.15, 1.55 - stage * 0.014),
    airMin: 0.55,
    window: Math.max(0.11, 0.2 - stage * 0.003),
    spread: Math.min(100, 56 + band * 9),
    seed: 4400 + stage * 29,
  };
}

export const LEVELS: GonggiLevel[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));

function scatter(s: GonggiState): void {
  const rng = mulberry(s.level.seed + s.scatter * 131);
  s.scatter++;
  const stones: Stone[] = [];
  for (let k = 0; k < 4; k++) {
    for (let tries = 0; tries < 60; tries++) {
      const a = rng() * Math.PI * 2;
      const r = 20 + rng() * s.level.spread;
      const x = 180 + Math.cos(a) * r;
      const y = 330 + Math.sin(a) * r * 0.55;
      if (stones.some((o) => Math.hypot(o.x - x, o.y - y) < PICK_R * 1.3) && tries < 59) continue;
      stones.push({ x, y, taken: false });
      break;
    }
  }
  s.stones = stones;
}

export function newGonggi(stage: number): GonggiState {
  const s: GonggiState = { level: LEVELS[stage], step: 0, round: 0, stones: [], flying: false, t: 0, air: 1, picked: 0, lives: LIVES, over: false, won: false, catches: 0, time: 0, scatter: 0 };
  scatter(s);
  return s;
}

/** Stones to scoop on this toss. */
export function need(s: GonggiState): number {
  return STEPS[s.level.steps[s.step] - 1][s.round];
}

/** Airtime from a flick speed (px/s): a harder flick throws higher. */
export function airFor(l: GonggiLevel, speed: number): number {
  return Math.max(l.airMin, Math.min(l.airMax, l.airMin + (speed / 1600) * (l.airMax - l.airMin)));
}

export function toss(s: GonggiState, air: number): boolean {
  if (s.over || s.flying) return false;
  s.flying = true;
  s.t = 0;
  s.air = air;
  s.picked = 0;
  for (const st of s.stones) st.now = false;
  return true;
}

/** Height of the mother stone above the hand (px) for drawing. */
export function motherY(s: GonggiState): number {
  if (!s.flying) return HAND.y;
  const u = s.t / s.air;
  const peak = Math.min(400, 260 * s.air * s.air);
  return HAND.y - peak * 4 * u * (1 - u);
}

function lose(s: GonggiState): void {
  s.lives--;
  s.flying = false;
  // dropped stones are put back down for another try of the same toss
  for (const st of s.stones) if (st.now) {
    st.taken = false;
    st.now = false;
  }
  s.picked = 0;
  if (s.lives <= 0) s.over = true;
}

export function stepGonggi(s: GonggiState, dt: number): "drop" | null {
  if (s.over) return null;
  s.time += dt;
  if (!s.flying) return null;
  s.t += dt;
  if (s.t > s.air + s.level.window) {
    lose(s);
    return "drop";
  }
  return null;
}

export function tap(s: GonggiState, x: number, y: number): TapResult {
  if (s.over || !s.flying) return "none";
  // scoop a stone if the tap is on one and more are needed
  if (s.picked < need(s)) {
    let best = -1;
    let bd = PICK_R;
    s.stones.forEach((st, i) => {
      if (st.taken) return;
      const d = Math.hypot(st.x - x, st.y - y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best >= 0) {
      s.stones[best].taken = true;
      s.stones[best].now = true;
      s.picked++;
      return "pick";
    }
  }
  // otherwise it is a grab for the mother stone
  if (s.t < s.air - s.level.window) {
    lose(s);
    return "early";
  }
  if (s.picked < need(s)) {
    lose(s);
    return "short";
  }
  s.flying = false;
  s.catches++;
  s.round++;
  if (s.round >= STEPS[s.level.steps[s.step] - 1].length) {
    s.round = 0;
    s.step++;
    if (s.step >= s.level.steps.length) {
      s.over = true;
      s.won = true;
      return "catch";
    }
    scatter(s);
  }
  return "catch";
}

/**
 * Autopilot for the tests: toss as high as allowed, scoop the nearest stones one tap at a time
 * (`tapGap` seconds per tap plus travel), then catch with ±`jitter` seconds of timing error.
 */
export function playAuto(stage: number, tapGap: number, jitter: number, seed: number): GonggiState {
  const s = newGonggi(stage);
  const rng = mulberry(seed);
  const dt = 1 / 120;
  for (let guard = 0; guard < 4000 && !s.over; guard++) {
    if (!s.flying) {
      for (let k = 0; k < 40; k++) stepGonggi(s, dt); // a breath between tosses
      toss(s, s.level.airMax);
    }
    let fx = HAND.x;
    let fy = HAND.y;
    let next = 0.18 + rng() * 0.05;
    const catchAt = s.air + (rng() - 0.5) * 2 * jitter;
    while (s.flying && !s.over) {
      stepGonggi(s, dt);
      if (!s.flying) break;
      if (s.picked < need(s)) {
        if (s.t >= next) {
          const st = s.stones.filter((o) => !o.taken).sort((a, b) => Math.hypot(a.x - fx, a.y - fy) - Math.hypot(b.x - fx, b.y - fy))[0];
          tap(s, st.x, st.y);
          next = s.t + tapGap * (0.8 + rng() * 0.4) + Math.hypot(st.x - fx, st.y - fy) / 1400;
          fx = st.x;
          fy = st.y;
        }
      } else if (s.t >= Math.max(catchAt, next)) {
        tap(s, HAND.x, 40);
      }
    }
  }
  return s;
}

export function starsFor(s: GonggiState): number {
  if (!s.won) return 0;
  return Math.max(1, s.lives);
}
