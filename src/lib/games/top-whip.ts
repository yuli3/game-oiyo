/**
 * 팽이치기 (Top Whip) — an OIYO original ice-pond game for the Seollal holidays.
 * A wooden top spins on the frozen pond. Swipe across it to lash it with the whip: the lash spins
 * it up and sends it sliding the way you swiped. Steer it through the flag gates in order and into
 * the warm circle by the bonfire before it runs out of spin. Later ponds add snow drifts that eat
 * spin, rocks, holes in the ice, wind, and kids on sleds crossing the pond.
 */

import { mulberry } from "./pixel-kit";

export const WHIP_SLUG = "top-whip";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 560;
export const TOP_R = 13;
export const REACH = 26; // how close to the top a swipe must pass to hit it
export const ICE_MU = 0.42; // sliding friction on clear ice (per second)
export const SNOW_MU = 2.6;
export const POST_R = 6;
export const MAX_KICK = 330;
export const COOLDOWN = 0.25;

export interface Circle { x: number; y: number; r: number }
export interface Gate { ax: number; ay: number; bx: number; by: number }
export interface Sled { y: number; r: number; x0: number; x1: number; speed: number; phase: number }

export interface WhipLevel {
  stage: number;
  start: { x: number; y: number };
  gates: Gate[];
  home: Circle;
  rocks: Circle[];
  holes: Circle[];
  drifts: Circle[];
  sleds: Sled[];
  wind: { x: number; y: number };
  decay: number; // spin lost per second on ice
  path: Array<{ x: number; y: number }>; // the line the level was built around (gate centres, then home)
}

export interface Top {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number; // 0..1, the top falls over at 0
  angle: number; // drawing only
}

export type WhipEnd = null | "home" | "fell" | "hole";

export interface WhipState {
  level: WhipLevel;
  top: Top;
  next: number; // index of the next gate to pass (gates.length = head for home)
  time: number;
  whips: number;
  cool: number;
  end: WhipEnd;
  lastHit: number; // time of the last bump (for sound/drawing)
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function crosses(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const o = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  return o(ax, ay, bx, by, cx, cy) !== o(ax, ay, bx, by, dx, dy) && o(cx, cy, dx, dy, ax, ay) !== o(cx, cy, dx, dy, bx, by);
}

export function gateCentre(g: Gate): { x: number; y: number } {
  return { x: (g.ax + g.bx) / 2, y: (g.ay + g.by) / 2 };
}

export function buildLevel(stage: number): WhipLevel {
  const band = Math.floor(stage / 5);
  const nGates = Math.min(7, 2 + Math.floor(stage / 4));
  const gateHalf = Math.max(24, 40 - stage * 0.6);
  for (let attempt = 0; ; attempt++) {
    const rng = mulberry(5200 + stage * 53 + attempt * 997);
    const start = { x: 180, y: 500 };
    const path: Array<{ x: number; y: number }> = [start];
    let ok = true;
    for (let g = 0; g <= nGates; g++) {
      let placed = false;
      for (let t = 0; t < 40 && !placed; t++) {
        const x = 50 + rng() * 260;
        const y = 60 + rng() * 420;
        const prev = path[path.length - 1];
        const d = Math.hypot(x - prev.x, y - prev.y);
        if (d < 110 || d > 300) continue;
        if (path.some((p) => Math.hypot(p.x - x, p.y - y) < 80)) continue;
        // keep the route from folding back across itself
        let cross = false;
        for (let k = 1; k < path.length - 1; k++) if (crosses(path[k - 1].x, path[k - 1].y, path[k].x, path[k].y, prev.x, prev.y, x, y)) cross = true;
        if (cross) continue;
        path.push({ x, y });
        placed = true;
      }
      if (!placed) ok = false;
    }
    if (!ok) continue;
    const gates: Gate[] = [];
    for (let g = 1; g <= nGates; g++) {
      const a = path[g - 1];
      const c = path[g];
      const b = path[g + 1];
      // the gate faces the leg that leads into it, so the top crosses it head-on
      void b;
      const hl = Math.hypot(c.x - a.x, c.y - a.y) || 1;
      const hx = (c.x - a.x) / hl;
      const hy = (c.y - a.y) / hl;
      gates.push({ ax: c.x - hy * gateHalf, ay: c.y + hx * gateHalf, bx: c.x + hy * gateHalf, by: c.y - hx * gateHalf });
    }
    const last = path[path.length - 1];
    const home = { x: last.x, y: last.y, r: Math.max(26, 40 - stage * 0.45) };
    const clear = (x: number, y: number, r: number, pad: number) => {
      for (let k = 1; k < path.length; k++) if (segDist(x, y, path[k - 1].x, path[k - 1].y, path[k].x, path[k].y) < r + pad) return false;
      for (const g of gates) if (Math.hypot(g.ax - x, g.ay - y) < r + 16 || Math.hypot(g.bx - x, g.by - y) < r + 16) return false;
      return x - r > 8 && x + r < FIELD_W - 8 && y - r > 8 && y + r < FIELD_H - 8;
    };
    const place = (count: number, rMin: number, rMax: number, pad: number, list: Circle[], others: Circle[]) => {
      for (let t = 0; t < 200 && list.length < count; t++) {
        const r = rMin + rng() * (rMax - rMin);
        const x = 20 + rng() * (FIELD_W - 40);
        const y = 20 + rng() * (FIELD_H - 40);
        if (!clear(x, y, r, pad)) continue;
        if ([...list, ...others].some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 8)) continue;
        list.push({ x, y, r });
      }
    };
    const rocks: Circle[] = [];
    const holes: Circle[] = [];
    const drifts: Circle[] = [];
    if (band >= 1) place(Math.min(5, 1 + band), 12, 20, 26, rocks, []);
    if (band >= 2) place(Math.min(4, band - 1), 26, 44, 4, drifts, rocks);
    if (band >= 3) place(Math.min(3, band - 2), 14, 22, 34, holes, [...rocks, ...drifts]);
    const wind = band >= 4 ? { x: (stage % 2 ? -1 : 1) * (14 + (stage % 5) * 4), y: 0 } : { x: 0, y: 0 };
    const sleds: Sled[] = [];
    if (band >= 5) {
      // a sled crosses the pond between two route legs
      const k = 1 + Math.floor(rng() * (path.length - 2));
      const y = (path[k].y + path[k + 1].y) / 2;
      sleds.push({ y, r: 16, x0: 30, x1: FIELD_W - 30, speed: 0.9 + (stage % 5) * 0.12, phase: rng() * Math.PI * 2 });
    }
    return { stage, start, gates, home, rocks, holes, drifts, sleds, wind, decay: 0.1 + stage * 0.0045, path };
  }
}

export const LEVELS: WhipLevel[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));

export function newWhip(stage: number): WhipState {
  const level = LEVELS[stage];
  return { level, top: { x: level.start.x, y: level.start.y, vx: 0, vy: 0, spin: 0.8, angle: 0 }, next: 0, time: 0, whips: 0, cool: 0, end: null, lastHit: -1 };
}

export function sledX(s: Sled, t: number): number {
  return s.x0 + (s.x1 - s.x0) * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
}

/**
 * A swipe from (x0,y0) to (x1,y1) that took `dt` seconds. If it passes close to the top, the top
 * is lashed: it spins up and slides off the way the swipe went, faster for a quicker swipe.
 */
export function whip(s: WhipState, x0: number, y0: number, x1: number, y1: number, dt: number): boolean {
  if (s.end || s.cool > 0) return false;
  const t = s.top;
  if (segDist(t.x, t.y, x0, y0, x1, y1) > REACH) return false;
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 12) return false;
  const speed = Math.max(150, Math.min(1800, len / Math.max(0.03, dt)));
  const kick = Math.min(MAX_KICK, 50 + speed * 0.19);
  t.vx = t.vx * 0.35 + ((x1 - x0) / len) * kick;
  t.vy = t.vy * 0.35 + ((y1 - y0) / len) * kick;
  t.spin = Math.min(1, t.spin + 0.1 + speed * 0.00008);
  s.whips++;
  s.cool = COOLDOWN;
  return true;
}

function bounceCircle(t: Top, c: Circle, rest: number): boolean {
  const dx = t.x - c.x;
  const dy = t.y - c.y;
  const d = Math.hypot(dx, dy);
  const min = c.r + TOP_R;
  if (d >= min || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  t.x = c.x + nx * min;
  t.y = c.y + ny * min;
  const vn = t.vx * nx + t.vy * ny;
  if (vn < 0) {
    t.vx -= (1 + rest) * vn * nx;
    t.vy -= (1 + rest) * vn * ny;
  }
  return true;
}

export function stepWhip(s: WhipState, dt: number): void {
  if (s.end) return;
  const L = s.level;
  const sub = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / sub;
  for (let k = 0; k < sub && !s.end; k++) {
    const t = s.top;
    s.time += h;
    s.cool = Math.max(0, s.cool - h);
    const onSnow = L.drifts.some((d) => Math.hypot(d.x - t.x, d.y - t.y) < d.r);
    const mu = onSnow ? SNOW_MU : ICE_MU;
    t.vx += L.wind.x * h;
    t.vy += L.wind.y * h;
    const f = Math.exp(-mu * h);
    t.vx *= f;
    t.vy *= f;
    const px = t.x;
    const py = t.y;
    t.x += t.vx * h;
    t.y += t.vy * h;
    t.spin -= (L.decay + (onSnow ? 0.3 : 0)) * h;
    t.angle += (6 + t.spin * 26) * h;
    // pond banks
    if (t.x < TOP_R) { t.x = TOP_R; t.vx = Math.abs(t.vx) * 0.55; s.lastHit = s.time; }
    if (t.x > FIELD_W - TOP_R) { t.x = FIELD_W - TOP_R; t.vx = -Math.abs(t.vx) * 0.55; s.lastHit = s.time; }
    if (t.y < TOP_R) { t.y = TOP_R; t.vy = Math.abs(t.vy) * 0.55; s.lastHit = s.time; }
    if (t.y > FIELD_H - TOP_R) { t.y = FIELD_H - TOP_R; t.vy = -Math.abs(t.vy) * 0.55; s.lastHit = s.time; }
    const fresh = s.time - s.lastHit > 0.3; // one knock per bump, not one per frame of contact
    for (const r of L.rocks) if (bounceCircle(t, r, 0.6)) { if (fresh) t.spin -= 0.05; s.lastHit = s.time; }
    for (const g of L.gates) {
      if (bounceCircle(t, { x: g.ax, y: g.ay, r: POST_R }, 0.5)) s.lastHit = s.time;
      if (bounceCircle(t, { x: g.bx, y: g.by, r: POST_R }, 0.5)) s.lastHit = s.time;
    }
    for (const sl of L.sleds) {
      if (bounceCircle(t, { x: sledX(sl, s.time), y: sl.y, r: sl.r }, 0.9)) { if (fresh) t.spin -= 0.05; s.lastHit = s.time; }
    }
    const g = L.gates[s.next];
    if (g && crosses(px, py, t.x, t.y, g.ax, g.ay, g.bx, g.by)) s.next++;
    if (L.holes.some((o) => Math.hypot(o.x - t.x, o.y - t.y) < o.r)) {
      s.end = "hole";
      break;
    }
    if (s.next >= L.gates.length && Math.hypot(L.home.x - t.x, L.home.y - t.y) < L.home.r - 4) {
      s.end = "home";
      break;
    }
    if (t.spin <= 0) {
      t.spin = 0;
      s.end = "fell";
    }
  }
}

/** The point the pilot (and the hint arrow) heads for next: the middle of the next gate, then home. */
export function aimPoint(s: WhipState): { x: number; y: number } {
  const L = s.level;
  const g = L.gates[s.next];
  if (!g) return { x: L.home.x, y: L.home.y };
  return gateCentre(g);
}

/**
 * Autopilot used by the tests and the price of 3 stars: lash the top straight at the next aim
 * point with just enough speed to coast there, again whenever it drifts off line, slows down or
 * runs low on spin. Returns a swipe or null.
 */
export function pilotSwipe(s: WhipState): null | { x0: number; y0: number; x1: number; y1: number; dt: number } {
  if (s.end || s.cool > 0) return null;
  const t = s.top;
  const a = aimPoint(s);
  const dx = a.x - t.x;
  const dy = a.y - t.y;
  const dist = Math.hypot(dx, dy) || 1;
  const sp = Math.hypot(t.vx, t.vy);
  const through = s.next < s.level.gates.length ? 40 : 0; // coast on through a gate
  const want = Math.min(MAX_KICK - 10, ICE_MU * (dist + through) * 1.1 + 40);
  const offLine = sp > 1 ? (t.vx * dx + t.vy * dy) / (sp * dist) : 0;
  const coast = sp / ICE_MU;
  const need = sp < 25 || (dist > 30 && offLine < 0.94) || coast < dist * 0.8 || t.spin < 0.3;
  if (!need) return null;
  // the kick keeps 35% of the current slide, so swipe along the difference
  let kx = (dx / dist) * want - t.vx * 0.35;
  let ky = (dy / dist) * want - t.vy * 0.35;
  const kl = Math.hypot(kx, ky) || 1;
  const kick = Math.min(MAX_KICK, kl);
  kx /= kl;
  ky /= kl;
  // invert kick = 50 + speed * 0.19 with a 60px swipe
  const speed = Math.max(150, (kick - 50) / 0.19);
  const len = 60;
  return { x0: t.x - kx * len * 0.5, y0: t.y - ky * len * 0.5, x1: t.x + kx * len * 0.5, y1: t.y + ky * len * 0.5, dt: len / speed };
}

/** Seconds the autopilot needs; 3 stars for finishing within a little over that. */
export function parTime(stage: number): number {
  const s = newWhip(stage);
  for (let i = 0; i < 60 * 120 && !s.end; i++) {
    const w = pilotSwipe(s);
    if (w) whip(s, w.x0, w.y0, w.x1, w.y1, w.dt);
    stepWhip(s, 1 / 60);
  }
  return Math.round(s.time * 10) / 10;
}

export function starsFor(time: number, par: number): number {
  if (time <= par * 1.6 + 3) return 3;
  if (time <= par * 2.6 + 6) return 2;
  return 1;
}
