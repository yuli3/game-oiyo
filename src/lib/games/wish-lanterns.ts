/**
 * 소원등 날리기 (Wish Lanterns) — an OIYO original for the first full moon of 2027.
 * Paper lanterns rise one after another from the village. You cannot touch them: swipe across the
 * night sky to make a puff of wind that nudges every lantern near your swipe. Steer them through the
 * gaps between power lines, past pine branches and flocks of birds, and up to the moon. Blow too hard
 * and the little flame goes out. Every lantern that makes it becomes a star in the final sky.
 */

import { mulberry } from "./pixel-kit";

export const LANTERN_SLUG = "wish-lanterns";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 600;
export const LANTERN_R = 11;
const GUST_R = 84;
const PUSH_TAU = 0.9;
export const FLAME_OUT = 240;
const GUST_MAX = 150;

export interface Vec { x: number; y: number }
export interface Seg { a: Vec; b: Vec; kind: "wire" | "branch" }
export interface Bird { y: number; x0: number; speed: number; r: number; span: number }

export interface LanternLevel {
  stage: number;
  count: number;
  need: number;
  interval: number; // seconds between launches
  rise: number; // px/s upward
  wind: number; // steady breeze px/s (+ right)
  gust: number; // amplitude of the slow wind swing
  launchX: number[];
  segs: Seg[];
  birds: Bird[];
}

export type LanternFate = "flying" | "home" | "burnt" | "out" | "lost";

export interface Lantern { x: number; y: number; px: number; py: number; fate: LanternFate; age: number; id: number }

export interface Sky {
  level: LanternLevel;
  time: number;
  launched: number;
  lanterns: Lantern[];
  home: number;
  over: boolean;
  won: boolean;
}

function wireRow(y: number, gapX: number, gap: number, sag = 8): Seg[] {
  const out: Seg[] = [];
  const left = gapX - gap / 2;
  const right = gapX + gap / 2;
  if (left > 0) out.push({ a: { x: -4, y }, b: { x: left, y: y + sag }, kind: "wire" });
  if (right < FIELD_W) out.push({ a: { x: right, y: y + sag }, b: { x: FIELD_W + 4, y }, kind: "wire" });
  return out;
}

export function buildLevel(stage: number): LanternLevel {
  const rng = mulberry(7300 + stage * 59);
  const band = Math.floor(stage / 5);
  const k = stage % 5;
  const segs: Seg[] = [];
  const birds: Bird[] = [];
  const count = Math.min(10, 5 + Math.floor(stage / 4));
  const need = Math.max(3, Math.round(count * (0.6 + band * 0.04)));
  const interval = Math.max(1.5, 2.6 - stage * 0.035);
  const rise = 44 + stage * 0.6;
  let wind = 0;
  let gust = 0;
  const side = rng() < 0.5 ? -1 : 1;
  const gapFor = (base: number) => Math.max(70, base - k * 6);
  // gaps are chained bottom to top so each one is reachable from the last, allowing for the breeze
  let lastGap = 180;
  let lastY = FIELD_H;
  const gx = (y?: number) => {
    const rowY = y ?? lastY - 120;
    const drift = (wind * (lastY - rowY)) / rise;
    let x = Math.max(70, Math.min(FIELD_W - 70, lastGap + drift * 0.6 + (rng() - 0.5) * 140));
    // after the very first stage, never leave a gap straight above the launch spot
    if (band === 0 && stage > 0 && Math.abs(x - 180) < 70) x = 180 + (x < 180 ? -84 : 84);
    lastGap = x;
    lastY = rowY;
    return x;
  };

  if (band === 0) {
    segs.push(...wireRow(300 - k * 10, gx(300 - k * 10), gapFor(150)));
    if (k >= 3) segs.push(...wireRow(170, gx(170), gapFor(150)));
  } else if (band === 1) {
    wind = side * (8 + k * 3);
    segs.push(...wireRow(380, gx(380), gapFor(130)));
    segs.push(...wireRow(220, gx(220), gapFor(130)));
  } else if (band === 2) {
    gust = 14 + k * 2;
    segs.push(...wireRow(330, gx(330), gapFor(120)));
    // pine branches reaching in from the sides
    segs.push({ a: { x: -4, y: 470 }, b: { x: 90 + k * 6, y: 440 }, kind: "branch" });
    segs.push({ a: { x: FIELD_W + 4, y: 250 }, b: { x: FIELD_W - 100 - k * 6, y: 226 }, kind: "branch" });
    birds.push({ y: 150, x0: rng() * FIELD_W, speed: 50 + k * 6, r: 10, span: 3 });
  } else if (band === 3) {
    wind = side * 12;
    gust = 18;
    segs.push(...wireRow(420, gx(420), gapFor(115)));
    segs.push(...wireRow(300, gx(300), gapFor(115)));
    segs.push(...wireRow(180, gx(180), gapFor(115)));
    if (k >= 2) birds.push({ y: 240, x0: rng() * FIELD_W, speed: -(55 + k * 5), r: 10, span: 2 });
  } else if (band === 4) {
    gust = 22;
    segs.push(...wireRow(400, gx(400), gapFor(110)));
    segs.push({ a: { x: -4, y: 300 }, b: { x: 120, y: 280 }, kind: "branch" });
    segs.push({ a: { x: FIELD_W + 4, y: 300 }, b: { x: FIELD_W - 120, y: 280 }, kind: "branch" });
    birds.push({ y: 200, x0: rng() * FIELD_W, speed: 60 + k * 5, r: 10, span: 3 });
    birds.push({ y: 120, x0: rng() * FIELD_W, speed: -(50 + k * 5), r: 10, span: 2 });
  } else {
    wind = side * (10 + k * 2);
    gust = 22;
    segs.push(...wireRow(440, gx(440), gapFor(110)));
    segs.push(...wireRow(320, gx(320), gapFor(110)));
    segs.push({ a: { x: side < 0 ? -4 : FIELD_W + 4, y: 230 }, b: { x: side < 0 ? 110 : FIELD_W - 110, y: 210 }, kind: "branch" });
    birds.push({ y: 160, x0: rng() * FIELD_W, speed: 60 + k * 4, r: 10, span: 3 });
    if (k >= 2) birds.push({ y: 90, x0: rng() * FIELD_W, speed: -(55 + k * 4), r: 10, span: 2 });
  }
  const launchX = Array.from({ length: count }, (_, i) => (band === 0 ? 180 : 100 + ((i * 97 + Math.floor(rng() * 60)) % 160)));
  return { stage, count, need, interval, rise, wind, gust, launchX, segs, birds };
}

export const LEVELS: LanternLevel[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));

export function newSky(stage: number): Sky {
  return { level: LEVELS[stage], time: 0, launched: 0, lanterns: [], home: 0, over: false, won: false };
}

export function windAt(l: LanternLevel, y: number, t: number): number {
  return l.wind + l.gust * Math.sin(t * 0.7 + y * 0.012);
}

export function birdPos(b: Bird, t: number): Vec {
  const span = FIELD_W + 80;
  let x = (b.x0 + b.speed * t) % span;
  if (x < 0) x += span;
  return { x: x - 40, y: b.y + Math.sin(t * 3 + b.x0) * 6 };
}

function distToSeg(p: Vec, s: Seg): number {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len2 = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2));
  return Math.hypot(p.x - (s.a.x + dx * t), p.y - (s.a.y + dy * t));
}

/** Does a point (a lantern centre) touch anything at time t? */
export function hits(l: LanternLevel, p: Vec, t: number): boolean {
  for (const s of l.segs) if (distToSeg(p, s) < LANTERN_R + (s.kind === "wire" ? 2 : 5)) return true;
  for (const b of l.birds) {
    const q = birdPos(b, t);
    for (let k = 0; k < b.span; k++) if (Math.hypot(p.x - (q.x - k * 16), p.y - q.y) < LANTERN_R + b.r) return true;
  }
  return false;
}

/**
 * A swipe from `a` to `b` lasting `seconds` pushes every flying lantern near the stroke along it.
 * Pass the same `once` set for every piece of one long swipe so a lantern is pushed once per swipe.
 * Returns how many lanterns felt it.
 */
export function applyGust(s: Sky, a: Vec, b: Vec, seconds: number, once?: Set<number>): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return 0;
  const speed = len / Math.max(0.03, seconds);
  const power = Math.min(GUST_MAX, speed * 0.22);
  const ux = dx / len;
  const uy = dy / len;
  let felt = 0;
  for (const ln of s.lanterns) {
    if (ln.fate !== "flying") continue;
    const d = distToSeg(ln, { a, b, kind: "wire" });
    if (d > GUST_R || once?.has(ln.id)) continue;
    once?.add(ln.id);
    const f = power * (1 - d / GUST_R);
    ln.px += ux * f;
    ln.py += uy * f;
    felt++;
  }
  return felt;
}

export interface SkyEvents { launched: boolean; home: number; burnt: number; out: number }

export function stepSky(s: Sky, dt: number): SkyEvents {
  const ev: SkyEvents = { launched: false, home: 0, burnt: 0, out: 0 };
  if (s.over) return ev;
  const l = s.level;
  s.time += dt;
  if (s.launched < l.count && s.time >= 0.6 + s.launched * l.interval) {
    s.lanterns.push({ x: l.launchX[s.launched], y: FIELD_H + 6, px: 0, py: 0, fate: "flying", age: 0, id: s.launched });
    s.launched++;
    ev.launched = true;
  }
  const decay = Math.exp(-dt / PUSH_TAU);
  for (const ln of s.lanterns) {
    if (ln.fate === "out") {
      // a dark lantern drifts down and away
      ln.y += 60 * dt;
      ln.age += dt;
      if (ln.y > FIELD_H + 30) ln.fate = "lost";
      continue;
    }
    if (ln.fate !== "flying") continue;
    ln.age += dt;
    if (Math.hypot(ln.px, ln.py) > FLAME_OUT) {
      ln.fate = "out";
      ev.out++;
      continue;
    }
    const vx = windAt(l, ln.y, s.time) + ln.px;
    const vy = -l.rise + ln.py;
    ln.x += vx * dt;
    ln.y += vy * dt;
    ln.px *= decay;
    ln.py *= decay;
    if (ln.y < -LANTERN_R) {
      ln.fate = "home";
      s.home++;
      ev.home++;
      continue;
    }
    if (ln.x < -LANTERN_R || ln.x > FIELD_W + LANTERN_R || ln.y > FIELD_H + 40) {
      ln.fate = "lost";
      continue;
    }
    if (hits(l, ln, s.time)) {
      ln.fate = "burnt";
      ev.burnt++;
    }
  }
  const pending = s.launched < l.count || s.lanterns.some((x) => x.fate === "flying" || x.fate === "out");
  const lostAll = s.lanterns.filter((x) => x.fate !== "home" && x.fate !== "flying").length > l.count - l.need;
  if (lostAll) {
    s.over = true;
    s.won = false;
  } else if (!pending) {
    s.over = true;
    s.won = s.home >= l.need;
  } else if (s.home >= l.need && s.launched >= l.count && !s.lanterns.some((x) => x.fate === "flying")) {
    s.over = true;
    s.won = true;
  }
  return ev;
}

export function starsFor(home: number, l: LanternLevel): number {
  if (home >= l.count) return 3;
  if (home >= l.need + Math.ceil((l.count - l.need) / 2)) return 2;
  return 1;
}

/** Will this lantern hit something in the next `horizon` seconds if left alone? */
export function forecast(s: Sky, ln: Lantern, extraPx: number, horizon = 1.6, step = 0.05): boolean {
  const l = s.level;
  let x = ln.x;
  let y = ln.y;
  let px = ln.px + extraPx;
  let py = ln.py;
  const decay = Math.exp(-step / PUSH_TAU);
  for (let t = 0; t < horizon; t += step) {
    x += (windAt(l, y, s.time + t) + px) * step;
    y += (-l.rise + py) * step;
    px *= decay;
    py *= decay;
    if (y < -LANTERN_R) return false;
    if (x < LANTERN_R || x > FIELD_W - LANTERN_R) return true;
    if (hits(l, { x, y }, s.time + t)) return true;
  }
  return false;
}

function timeToHit(s: Sky, ln: Lantern, extraPx: number): number {
  for (let h = 0.25; h <= 4; h += 0.25) if (forecast(s, ln, extraPx, h)) return h;
  return 5;
}

/**
 * Test pilot: when a lantern is heading for trouble, swipe sideways through it toward the side whose
 * forecast is clear. Returns the gust it chose, or null.
 */
export function pilotGust(s: Sky): null | { a: Vec; b: Vec; seconds: number } {
  for (const ln of s.lanterns) {
    if (ln.fate !== "flying" || ln.y > FIELD_H - 10) continue;
    if (!forecast(s, ln, 0, 3)) continue;
    let best: null | { dir: number; push: number } = null;
    for (const push of [30, 60, 90, 120, 150]) {
      for (const dir of [-1, 1]) {
        if (Math.hypot(ln.px + dir * push, ln.py) > FLAME_OUT - 30) continue;
        if (!forecast(s, ln, dir * push, 3)) {
          best = { dir, push };
          break;
        }
      }
      if (best) break;
    }
    if (!best) {
      // nothing clears in one puff: push hard toward the side that buys the most time
      let bestT = -1;
      for (const dir of [-1, 1]) {
        if (Math.hypot(ln.px + dir * 120, ln.py) > FLAME_OUT - 30) continue;
        const t = timeToHit(s, ln, dir * 120);
        if (t > bestT) {
          bestT = t;
          best = { dir, push: 120 };
        }
      }
      if (!best || bestT <= timeToHit(s, ln, 0)) continue;
    }
    // a short horizontal stroke through the lantern; speed sets the push
    const len = 40;
    const seconds = (len * 0.22) / best.push;
    return { a: { x: ln.x - best.dir * len * 0.5, y: ln.y }, b: { x: ln.x + best.dir * len * 0.5, y: ln.y }, seconds };
  }
  return null;
}
