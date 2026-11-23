/**
 * 얼음 돌 밀기 (Pond Stones) — an OIYO original winter-pond physics game.
 * Pull back on the stone and let go to slide it across the frozen pond toward the rings. Tap the stone
 * first to give it a spin so it curls left or right as it slows. While it slides, rub the ice in front
 * of it with your finger: rubbed ice is slicker, so the stone goes further and curls less.
 * Solo stages ask you to end with enough of your stones closer to the centre than any red stone,
 * dodging guard stones, rocks frozen in the ice and patches of snow. Duo mode is one phone, two
 * players, four stones each.
 */

import { mulberry } from "./pixel-kit";

export const POND_SLUG = "pond-stones";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 600;
export const STONE_R = 12;
export const HOUSE = { x: 180, y: 150, rings: [60, 38, 16] as const };
export const HOG_Y = 330; // a stone must get past this line or it is taken off
export const START = { x: 180, y: 548 };
export const MU = 60; // ice friction (px/s²)
const MU_SWEPT = 36;
const SNOW_MU = 170;
const CURL = 18;
export const V_MIN = 120;
export const V_MAX = 430;

export interface Vec { x: number; y: number }
export interface Circle { x: number; y: number; r: number }
export interface Rect { x0: number; y0: number; x1: number; y1: number }
export type Spin = -1 | 0 | 1;
export type Mode = "solo" | "duo";

export interface Stone { x: number; y: number; vx: number; vy: number; team: 0 | 1; spin: Spin; alive: boolean }

export interface Level {
  stage: number;
  stones: number; // how many you may throw
  need: number; // how many of your stones must count
  reds: Vec[];
  rocks: Circle[];
  snow: Rect[];
}

export interface Pond {
  level: Level;
  mode: Mode;
  stones: Stone[];
  thrown: [number, number];
  turn: 0 | 1;
  active: number; // index of the stone in motion, -1 when everything is still
  sweeping: boolean;
  time: number;
  over: boolean;
  won: boolean;
}

function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

export function buildLevel(stage: number): Level {
  const rng = mulberry(4100 + stage * 97);
  const band = Math.floor(stage / 5);
  const k = stage % 5;
  const reds: Vec[] = [];
  const rocks: Circle[] = [];
  const snow: Rect[] = [];
  let stones = 3;
  let need = 1;
  const side = rng() < 0.5 ? -1 : 1;
  if (band === 0) {
    // warm-ups: plain ice, then one new thing at a time
    if (k === 1) stones = 2;
    if (k === 2) rocks.push({ x: 180 + side * 54, y: 300, r: 13 });
    if (k === 3) {
      stones = 4;
      need = 2;
    }
    if (k === 4) snow.push({ x0: 0, y0: 380, x1: FIELD_W, y1: 404 });
  } else if (band === 1) {
    // guards right in front of the rings: curl around them
    reds.push({ x: 180 + side * (4 + k * 3), y: 262 + rng() * 20 });
    if (k >= 3) reds.push({ x: 180 - side * 34, y: 236 + rng() * 16 });
  } else if (band === 2) {
    // a red sits near the button: knock it out or draw inside it
    reds.push({ x: 180 + side * (10 + rng() * 14), y: HOUSE.y + 8 + rng() * 14 });
    if (k >= 2) reds.push({ x: 180 - side * (34 + rng() * 10), y: HOUSE.y - 20 + rng() * 30 });
    if (k >= 4) reds.push({ x: 180 + side * 30, y: 284 });
  } else if (band === 3) {
    stones = 4;
    need = 2;
    snow.push({ x0: 0, y0: 360 - k * 6, x1: FIELD_W, y1: 400 });
    reds.push({ x: 180 - side * (14 + rng() * 10), y: HOUSE.y + 26 + rng() * 10 });
  } else if (band === 4) {
    stones = 4;
    need = 2;
    rocks.push({ x: 180 + side * (22 + k * 2), y: 300, r: 14 });
    if (k >= 2) rocks.push({ x: 180 - side * 70, y: 250, r: 12 });
    reds.push({ x: 180 - side * 6, y: HOUSE.y + 30 + rng() * 8 });
  } else {
    stones = 5;
    need = 2 + (k >= 2 ? 1 : 0);
    snow.push({ x0: 0, y0: 380, x1: FIELD_W, y1: 410 + k * 4 });
    rocks.push({ x: 180 + side * 40, y: 290, r: 13 });
    reds.push({ x: 180 + side * 8, y: 264 + rng() * 14 });
    reds.push({ x: 180 - side * (18 + rng() * 10), y: HOUSE.y + 14 + rng() * 12 });
    if (k >= 4) reds.push({ x: 180 + side * 30, y: HOUSE.y - 18 });
  }
  return { stage, stones, need, reds, rocks, snow };
}

export const LEVELS: Level[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));

export const DUO_LEVEL: Level = { stage: -1, stones: 4, need: 0, reds: [], rocks: [], snow: [] };

export function newPond(stage: number, mode: Mode = "solo"): Pond {
  const level = mode === "duo" ? DUO_LEVEL : LEVELS[stage];
  const stones: Stone[] = level.reds.map((r) => ({ x: r.x, y: r.y, vx: 0, vy: 0, team: 1, spin: 0, alive: true }));
  return { level, mode, stones, thrown: [0, 0], turn: 0, active: -1, sweeping: false, time: 0, over: false, won: false };
}

export function stonesLeft(p: Pond, team: 0 | 1 = p.turn): number {
  return p.level.stones - p.thrown[team];
}

/** Initial speed for a pull of 0..1. */
export function speedFor(power: number): number {
  return V_MIN + Math.max(0, Math.min(1, power)) * (V_MAX - V_MIN);
}

/** Where a stone would stop on plain ice going straight, for the aiming guide. */
export function straightStop(angle: number, power: number): Vec {
  const v = speedFor(power);
  const d = (v * v) / (2 * MU);
  return { x: START.x + Math.sin(angle) * d, y: START.y - Math.cos(angle) * d };
}

export function canThrow(p: Pond): boolean {
  return !p.over && p.active === -1 && stonesLeft(p) > 0;
}

/** angle 0 = straight up the pond, positive = to the right. */
export function throwStone(p: Pond, angle: number, power: number, spin: Spin): boolean {
  if (!canThrow(p)) return false;
  const v = speedFor(power);
  p.stones.push({ x: START.x, y: START.y, vx: Math.sin(angle) * v, vy: -Math.cos(angle) * v, team: p.turn, spin, alive: true });
  p.thrown[p.turn]++;
  p.active = p.stones.length - 1;
  return true;
}

export function setSweep(p: Pond, on: boolean): void {
  p.sweeping = on;
}

function distToButton(s: Stone): number {
  return Math.hypot(s.x - HOUSE.x, s.y - HOUSE.y);
}

/** Stones of `team` in the rings that sit closer to the centre than every stone of the other team. */
export function scoreFor(p: Pond, team: 0 | 1): number {
  const inHouse = p.stones.filter((s) => s.alive && distToButton(s) <= HOUSE.rings[0] + STONE_R);
  const other = inHouse.filter((s) => s.team !== team).map(distToButton);
  const best = other.length ? Math.min(...other) : Infinity;
  return inHouse.filter((s) => s.team === team && distToButton(s) < best).length;
}

export interface PondEvents { hit: boolean; out: boolean; stopped: boolean; rock: boolean }

export function stepPond(p: Pond, dt: number): PondEvents {
  const ev: PondEvents = { hit: false, out: false, stopped: false, rock: false };
  if (p.over || p.active === -1) return ev;
  p.time += dt;
  const sub = 3;
  const h = dt / sub;
  for (let it = 0; it < sub; it++) {
    for (let i = 0; i < p.stones.length; i++) {
      const s = p.stones[i];
      if (!s.alive) continue;
      const v = Math.hypot(s.vx, s.vy);
      if (v <= 0) continue;
      const thrown = i === p.active;
      const swept = thrown && p.sweeping;
      const onSnow = p.level.snow.some((r) => inRect(r, s.x, s.y));
      const mu = onSnow ? (swept ? MU : SNOW_MU) : swept ? MU_SWEPT : MU;
      const nv = Math.max(0, v - mu * h);
      let ux = s.vx / v;
      let uy = s.vy / v;
      if (s.spin && nv > 0) {
        // curl grows as the stone slows; sweeping straightens it
        const k = (s.spin * CURL * (swept ? 0.45 : 1) * h) / Math.max(nv, 40);
        const nx = ux - uy * k;
        const ny = uy + ux * k;
        const n = Math.hypot(nx, ny);
        ux = nx / n;
        uy = ny / n;
      }
      s.vx = ux * nv;
      s.vy = uy * nv;
      s.x += s.vx * h;
      s.y += s.vy * h;
      if (s.x < STONE_R || s.x > FIELD_W - STONE_R || s.y < STONE_R || s.y > FIELD_H + STONE_R) {
        s.alive = false;
        s.vx = 0;
        s.vy = 0;
        ev.out = true;
        continue;
      }
      for (const r of p.level.rocks) {
        const dx = s.x - r.x;
        const dy = s.y - r.y;
        const d = Math.hypot(dx, dy);
        const min = r.r + STONE_R;
        if (d < min && d > 0) {
          const nx = dx / d;
          const ny = dy / d;
          s.x = r.x + nx * min;
          s.y = r.y + ny * min;
          const dot = s.vx * nx + s.vy * ny;
          if (dot < 0) {
            s.vx = (s.vx - 2 * dot * nx) * 0.7;
            s.vy = (s.vy - 2 * dot * ny) * 0.7;
            ev.rock = true;
          }
        }
      }
    }
    // stone on stone: equal masses, nearly elastic
    for (let i = 0; i < p.stones.length; i++) {
      const a = p.stones[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < p.stones.length; j++) {
        const b = p.stones[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= STONE_R * 2 || d === 0) continue;
        const nx = dx / d;
        const ny = dy / d;
        const push = (STONE_R * 2 - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel > 0) {
          const imp = rel * 0.95;
          a.vx -= imp * nx;
          a.vy -= imp * ny;
          b.vx += imp * nx;
          b.vy += imp * ny;
          ev.hit = true;
        }
      }
    }
  }
  const moving = p.stones.some((s) => s.alive && Math.hypot(s.vx, s.vy) > 0.5);
  if (!moving) {
    for (const s of p.stones) {
      s.vx = 0;
      s.vy = 0;
      // stones that never got past the line are taken off, except the solo guards already there
      if (s.alive && s.y > HOG_Y && s === p.stones[p.active]) s.alive = false;
    }
    p.active = -1;
    p.sweeping = false;
    ev.stopped = true;
    settle(p);
  }
  return ev;
}

function settle(p: Pond): void {
  if (p.mode === "solo") {
    if (scoreFor(p, 0) >= p.level.need) {
      p.over = true;
      p.won = true;
    } else if (stonesLeft(p, 0) <= 0) {
      p.over = true;
    }
    return;
  }
  const next: 0 | 1 = p.turn === 0 ? 1 : 0;
  if (stonesLeft(p, next) > 0) p.turn = next;
  else if (stonesLeft(p, p.turn) <= 0) {
    p.over = true;
    p.won = scoreFor(p, 0) > 0 || scoreFor(p, 1) > 0;
  }
}

/** Duo result: 0 or 1 for the team that scored, -1 for a blank end. */
export function duoWinner(p: Pond): -1 | 0 | 1 {
  const a = scoreFor(p, 0);
  const b = scoreFor(p, 1);
  return a > 0 ? 0 : b > 0 ? 1 : -1;
}

/** Run a throw to the end (for tests and the solver). */
export function simulateThrow(p: Pond, angle: number, power: number, spin: Spin, sweep: boolean, dt = 1 / 60): void {
  if (!throwStone(p, angle, power, spin)) return;
  setSweep(p, sweep);
  for (let i = 0; i < 4000 && p.active !== -1; i++) {
    stepPond(p, dt);
    if (p.active !== -1) setSweep(p, sweep);
  }
}

export function clonePond(p: Pond): Pond {
  return { ...p, thrown: [p.thrown[0], p.thrown[1]], stones: p.stones.map((s) => ({ ...s })) };
}

export function starsFor(used: number, level: Level): number {
  const spare = level.stones - used;
  if (spare >= 1 || used <= level.need) return 3;
  return used <= level.stones ? 2 : 1;
}
