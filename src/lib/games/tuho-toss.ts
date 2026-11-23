/**
 * 투호 던지기 (Tuho Toss) — an OIYO original take on the Seollal arrow-pitching game.
 * Pull back from anywhere on the screen and let go: the arrow flies in an arc. Drop it into the
 * pot's mouth for 1 point or into one of the two little ears beside the neck for 2. Hit the rim and
 * it clatters off. Later stages add wind, a folding screen in the way, a low beam overhead and a pot
 * that slides on a little cart.
 */

import { mulberry } from "./pixel-kit";

export const TUHO_SLUG = "tuho-toss";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 600;
export const GROUND = 520;
export const HAND = { x: 46, y: 430 };
export const GRAVITY = 900;
export const PULL_SCALE = 4.6;
export const PULL_MAX = 140; // px of pull that gives the strongest throw
export const RIM_R = 4;
export const EAR_W = 10;
export const NECK_H = 26; // neck height below the mouth
export const BODY_PAD = 26; // how much wider than the mouth the body is

export interface Rect { x: number; y: number; w: number; h: number }

export interface TuhoLevel {
  stage: number;
  potX: number; // centre of the pot at rest
  mouthY: number; // y of the mouth line
  mouthW: number;
  ears: boolean;
  arrows: number;
  need: number; // points to clear
  wind: number; // px/s² sideways (negative = toward the player)
  screen: Rect | null; // folding screen standing between player and pot
  beam: Rect | null; // low ceiling beam
  slide: number; // px the cart slides either way (0 = still)
  slideSpeed: number; // radians per second of the slide
}

export type ArrowFate = "flying" | "in" | "ear" | "miss";

export interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  fate: ArrowFate;
  bounced: number;
  t: number;
  rest: number; // seconds since it stopped (for drawing)
  dx: number; // offset inside the pot it landed in (for drawing)
}

export interface Throwing {
  level: TuhoLevel;
  time: number;
  arrows: Arrow[];
  thrown: number;
  points: number;
  over: boolean;
  won: boolean;
}

export function buildLevel(stage: number): TuhoLevel {
  const rng = mulberry(4100 + stage * 37);
  const band = Math.floor(stage / 5);
  const k = stage % 5;
  const potX = Math.round(Math.min(290, 200 + stage * 3 + rng() * 18));
  const mouthW = Math.max(22, Math.round(34 - stage * 0.42));
  const mouthY = 438;
  const arrows = stage < 10 ? 5 : stage < 20 ? 6 : 7;
  const ears = stage >= 3;
  const need = Math.min(arrows - 2, 2 + Math.floor(stage / 6));
  let wind = 0;
  if (band >= 2) wind = (k % 2 ? -1 : 1) * (40 + band * 12 + k * 6);
  let screen: Rect | null = null;
  if (band === 3 || band === 5) screen = { x: Math.round(potX * 0.55), y: 360 - k * 8, w: 14, h: GROUND - (360 - k * 8) };
  let beam: Rect | null = null;
  if (band === 4 || (band === 5 && k >= 3)) beam = { x: 110, y: 150 + k * 10, w: 140, h: 16 };
  const slide = band >= 4 ? 18 + k * 4 : 0;
  const slideSpeed = slide ? 0.9 + k * 0.12 : 0;
  return { stage, potX, mouthY, mouthW, ears, arrows, need, wind, screen, beam, slide, slideSpeed };
}

export const LEVELS: TuhoLevel[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));

export function newThrowing(stage: number): Throwing {
  return { level: LEVELS[stage], time: 0, arrows: [], thrown: 0, points: 0, over: false, won: false };
}

/** Pot centre at a moment in time (it slides on a cart in later stages). */
export function potXAt(l: TuhoLevel, time: number): number {
  return l.potX + (l.slide ? Math.sin(time * l.slideSpeed) * l.slide : 0);
}

/** Ear openings (centre x, top y) for a pot centred at `px`. */
export function earsAt(l: TuhoLevel, px: number): Array<{ x: number; y: number }> {
  if (!l.ears) return [];
  const off = l.mouthW / 2 + 15;
  return [
    { x: px - off, y: l.mouthY + 14 },
    { x: px + off, y: l.mouthY + 14 },
  ];
}

export function launchVelocity(pullX: number, pullY: number): { vx: number; vy: number } {
  const len = Math.hypot(pullX, pullY);
  const k = len > PULL_MAX ? PULL_MAX / len : 1;
  return { vx: -pullX * k * PULL_SCALE, vy: -pullY * k * PULL_SCALE };
}

/** Throw with a launch velocity. Returns false when no arrow is left or one is still flying. */
export function throwArrow(s: Throwing, vx: number, vy: number): boolean {
  if (s.over || s.thrown >= s.level.arrows || s.arrows.some((a) => a.fate === "flying")) return false;
  if (Math.hypot(vx, vy) < 60) return false;
  s.arrows.push({ x: HAND.x, y: HAND.y, vx, vy, angle: Math.atan2(vy, vx), fate: "flying", bounced: 0, t: 0, rest: 0, dx: 0 });
  s.thrown++;
  return true;
}

function inside(r: Rect | null, x: number, y: number): boolean {
  return !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export interface TuhoEvents { scored: number; ear: boolean; rim: boolean; miss: boolean }

const SUB = 1 / 240;

function stepArrow(s: Throwing, a: Arrow, dt: number, ev: TuhoEvents): void {
  const l = s.level;
  let left = dt;
  while (left > 1e-9 && a.fate === "flying") {
    const h = Math.min(SUB, left);
    left -= h;
    const time = s.time - left;
    const px = potXAt(l, time);
    const prevY = a.y;
    a.vx += l.wind * h;
    a.vy += GRAVITY * h;
    a.x += a.vx * h;
    a.y += a.vy * h;
    a.t += h;
    a.angle = Math.atan2(a.vy, a.vx);
    // ears first: small upward tubes beside the neck
    for (const e of earsAt(l, px)) {
      if (a.vy > 0 && prevY < e.y && a.y >= e.y && Math.abs(a.x - e.x) < EAR_W / 2 - 1) {
        a.fate = "ear";
        a.dx = a.x - px;
        s.points += 2;
        ev.scored += 2;
        ev.ear = true;
        return;
      }
    }
    // the mouth
    const half = l.mouthW / 2;
    if (a.vy > 0 && prevY < l.mouthY && a.y >= l.mouthY && Math.abs(a.x - px) < half - RIM_R) {
      a.fate = "in";
      a.dx = a.x - px;
      s.points += 1;
      ev.scored += 1;
      return;
    }
    // rims: the two lips of the mouth bounce the arrow away
    for (const rx of [px - half, px + half]) {
      const dx = a.x - rx;
      const dy = a.y - l.mouthY;
      const d = Math.hypot(dx, dy);
      if (d < RIM_R + 1.5 && a.bounced < 6) {
        const nx = dx / (d || 1);
        const ny = dy / (d || 1);
        const dot = a.vx * nx + a.vy * ny;
        if (dot < 0) {
          a.vx = (a.vx - 2 * dot * nx) * 0.45;
          a.vy = (a.vy - 2 * dot * ny) * 0.45 - 40;
          a.bounced++;
          ev.rim = true;
        }
      }
    }
    // the pot: a narrow neck under the mouth (ears sit beside it), then a round body
    const neck = a.y > l.mouthY + 4 && a.y < l.mouthY + NECK_H && Math.abs(a.x - px) < half + 4;
    const body = a.y >= l.mouthY + NECK_H && a.y < GROUND && Math.abs(a.x - px) < half + BODY_PAD;
    if (neck || body) {
      const w = neck ? half + 4 : half + BODY_PAD;
      a.vx = (a.x < px ? -1 : 1) * Math.max(40, Math.abs(a.vx) * 0.35);
      a.vy = -Math.abs(a.vy) * 0.2;
      a.x = px + (a.x < px ? -w - 1 : w + 1);
      a.bounced++;
      ev.rim = true;
    }
    if (inside(l.screen, a.x, a.y)) {
      a.vx = -Math.abs(a.vx) * 0.25;
      a.vy = Math.abs(a.vy) * 0.2;
      a.x = (l.screen as Rect).x - 1;
      a.bounced++;
      ev.rim = true;
    }
    if (inside(l.beam, a.x, a.y)) {
      const b = l.beam as Rect;
      a.vy = Math.abs(a.vy) * 0.3;
      a.vx *= 0.6;
      a.y = b.y + b.h + 1;
      a.bounced++;
      ev.rim = true;
    }
    if (a.y >= GROUND || a.x > FIELD_W + 30 || a.x < -30 || a.y > FIELD_H) {
      a.y = Math.min(a.y, GROUND);
      a.fate = "miss";
      ev.miss = true;
      return;
    }
  }
}

export function stepThrowing(s: Throwing, dt: number): TuhoEvents {
  const ev: TuhoEvents = { scored: 0, ear: false, rim: false, miss: false };
  if (s.over) return ev;
  s.time += dt;
  for (const a of s.arrows) {
    if (a.fate === "flying") stepArrow(s, a, dt, ev);
    else a.rest += dt;
  }
  const flying = s.arrows.some((a) => a.fate === "flying");
  if (!flying && s.points >= s.level.need) {
    s.over = true;
    s.won = true;
  } else if (!flying && s.thrown >= s.level.arrows) {
    s.over = true;
    s.won = false;
  }
  return ev;
}

/** Stars: clearing with arrows to spare. */
export function starsFor(s: Throwing): number {
  const spare = s.level.arrows - s.thrown;
  return spare >= 2 ? 3 : spare >= 1 ? 2 : 1;
}

/** Simulate one throw on a copy and report where it ends up. */
export function simulateThrow(s: Throwing, vx: number, vy: number, horizon = 4): ArrowFate {
  const copy: Throwing = { level: s.level, time: s.time, arrows: [], thrown: 0, points: 0, over: false, won: false };
  throwArrow(copy, vx, vy);
  const a = copy.arrows[0];
  const ev: TuhoEvents = { scored: 0, ear: false, rim: false, miss: false };
  for (let t = 0; t < horizon && a.fate === "flying"; t += 1 / 60) {
    copy.time += 1 / 60;
    stepArrow(copy, a, 1 / 60, ev);
  }
  return a.fate;
}

/**
 * Test pilot: search pulls for a throw that lands (preferring the mouth, which is wider), as a player
 * aiming with the pull-back would. Returns the launch velocity or null.
 */
export function pilotThrow(s: Throwing, preferEar = false): { vx: number; vy: number } | null {
  let best: { vx: number; vy: number; score: number } | null = null;
  for (let ang = 20; ang <= 80; ang += 1.5) {
    for (let pull = 50; pull <= PULL_MAX; pull += 2) {
      const r = (ang * Math.PI) / 180;
      const { vx, vy } = launchVelocity(-Math.cos(r) * pull, Math.sin(r) * pull);
      const fate = simulateThrow(s, vx, vy);
      if (fate === "in" || fate === "ear") {
        // robustness: neighbours also score
        let ok = 0;
        for (const [da, dp] of [[-1, 0], [1, 0], [0, -1.5], [0, 1.5]]) {
          const r2 = ((ang + da) * Math.PI) / 180;
          const v2 = launchVelocity(-Math.cos(r2) * (pull + dp), Math.sin(r2) * (pull + dp));
          const f2 = simulateThrow(s, v2.vx, v2.vy);
          if (f2 === "in" || f2 === "ear") ok++;
        }
        const score = ok * 10 + (fate === "ear" ? (preferEar ? 30 : -5) : 0);
        if (!best || score > best.score) best = { vx, vy, score };
      }
    }
  }
  return best ? { vx: best.vx, vy: best.vy } : null;
}
