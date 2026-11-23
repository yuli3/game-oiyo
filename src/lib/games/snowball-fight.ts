/**
 * 눈싸움 (Snowball Fight) — an OIYO original winter throwing game.
 * Pull back and let go to lob snowballs up the hill at kids who pop up from behind their snow walls.
 * You only stand up while aiming, so every throw is a risk: their snowballs chip away at your own wall,
 * and once it is gone you get hit even while ducking. Walls are made of snow blocks that crumble where
 * they are hit. Two players can also share one phone, each with a fort on their own side.
 */

import { mulberry } from "./pixel-kit";

export const SNOWBALL_SLUG = "snowball-fight";
export const FIELD_W = 360;
export const FIELD_H = 600;
export const BLOCK = 6;
export const GRAVITY = 620;
export const MAX_SPEED = 680;
const BALL_R = 4;

export interface Kid {
  x: number; // centre
  feet: number; // y of the feet
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  // enemies: peek cycle
  up: boolean;
  timer: number;
  upTime: number;
  downTime: number;
  throwAt: number; // seconds into the "up" phase to throw, -1 = already thrown
  aim: number; // enemy accuracy noise (px of landing spread)
  hitFlash: number;
  side: 0 | 1; // 0 = player team (left), 1 = right
}

export interface Ball { x: number; y: number; vx: number; vy: number; side: 0 | 1; alive: boolean }

export interface Field {
  stage: number;
  twoPlayer: boolean;
  time: number;
  wind: number;
  ground: number[]; // ground y per BLOCK column
  snow: Uint8Array; // destructible blocks, cols × rows
  cols: number;
  rows: number;
  players: Kid[]; // 1 (solo) or 2 (two players)
  enemies: Kid[];
  balls: Ball[];
  aiming: [boolean, boolean];
  cooldown: [number, number];
  over: boolean;
  winner: 0 | 1 | null;
  rand: () => number;
}

export interface StageSpec { enemies: number; hp: number; wind: number; upTime: number; downTime: number; aim: number; hearts: number }

function specFor(i: number): StageSpec {
  const band = Math.floor(i / 5);
  const k = i % 5;
  return {
    enemies: Math.min(5, 1 + Math.floor((i + 1) / 4)),
    hp: band >= 3 && k === 4 ? 2 : 1,
    wind: band === 0 ? 0 : (band % 2 ? 1 : -1) * (20 + band * 12 + k * 4),
    upTime: Math.max(1.35, 2.6 - i * 0.045),
    downTime: Math.max(1.5, 2.6 - i * 0.04),
    aim: Math.max(32, 58 - i),
    hearts: i >= 15 ? 4 : 3,
  };
}

export const STAGE_COUNT = 30;
export const STAGES: readonly StageSpec[] = Array.from({ length: STAGE_COUNT }, (_, i) => specFor(i));

export const PLAYER_X = 46;
export const HAND_DY = 36; // throw from this far above the feet

function idx(f: Pick<Field, "cols">, c: number, r: number): number {
  return r * f.cols + c;
}

export function isSnow(f: Field, x: number, y: number): boolean {
  const c = Math.floor(x / BLOCK);
  const r = Math.floor(y / BLOCK);
  if (c < 0 || r < 0 || c >= f.cols || r >= f.rows) return false;
  return f.snow[idx(f, c, r)] === 1;
}

export function groundAt(f: Pick<Field, "ground">, x: number): number {
  const c = Math.max(0, Math.min(f.ground.length - 1, Math.floor(x / BLOCK)));
  return f.ground[c];
}

function wall(f: Field, x0: number, x1: number, top: number): void {
  for (let c = Math.floor(x0 / BLOCK); c <= Math.floor(x1 / BLOCK); c++) {
    if (c < 0 || c >= f.cols) continue;
    const g = f.ground[c];
    for (let y = top; y < g; y += BLOCK) {
      const r = Math.floor(y / BLOCK);
      if (r >= 0 && r < f.rows) f.snow[idx(f, c, r)] = 1;
    }
  }
}

function makeKid(x: number, feet: number, side: 0 | 1, hp: number): Kid {
  return { x, feet, w: 20, h: 44, hp, maxHp: hp, up: false, timer: 0, upTime: 2, downTime: 2, throwAt: -1, aim: 30, hitFlash: 0, side };
}

export function newField(stage: number, seed: number, twoPlayer = false): Field {
  const cols = Math.ceil(FIELD_W / BLOCK);
  const rows = Math.ceil(FIELD_H / BLOCK);
  const rand = mulberry(seed);
  const layout = mulberry(5000 + stage * 97); // the hill and forts are fixed per stage
  const f: Field = {
    stage, twoPlayer, time: 0, wind: 0, ground: [], snow: new Uint8Array(cols * rows), cols, rows,
    players: [], enemies: [], balls: [], aiming: [false, false], cooldown: [0, 0], over: false, winner: null, rand,
  };
  if (twoPlayer) {
    // a flat yard with a bump in the middle
    for (let c = 0; c < cols; c++) {
      const x = c * BLOCK;
      const bump = Math.max(0, 40 - Math.abs(x - FIELD_W / 2) * 0.5);
      f.ground.push(Math.round((540 - bump) / BLOCK) * BLOCK);
    }
    f.players = [makeKid(PLAYER_X, groundAt(f, PLAYER_X), 0, 3), makeKid(FIELD_W - PLAYER_X, groundAt(f, FIELD_W - PLAYER_X), 1, 3)];
    wall(f, PLAYER_X + 18, PLAYER_X + 40, groundAt(f, PLAYER_X) - 36);
    wall(f, FIELD_W - PLAYER_X - 40, FIELD_W - PLAYER_X - 18, groundAt(f, FIELD_W - PLAYER_X) - 36);
    return f;
  }
  const sp = STAGES[stage];
  f.wind = sp.wind;
  // hill: flat at the player's spot, then rising terraces to the right
  const n = sp.enemies;
  const steps: Array<{ x0: number; y: number }> = [];
  const rise = 150 + Math.min(130, stage * 6);
  for (let k = 0; k < n; k++) {
    const x0 = 120 + ((FIELD_W - 120) * k) / n + layout() * 10;
    const y = 540 - (rise * (k + 1)) / n + (layout() - 0.5) * 20;
    steps.push({ x0, y });
  }
  for (let c = 0; c < cols; c++) {
    const x = c * BLOCK + BLOCK / 2;
    let y = 540;
    for (const s of steps) if (x >= s.x0) y = s.y;
    f.ground.push(Math.round(y / BLOCK) * BLOCK);
  }
  f.players = [makeKid(PLAYER_X, groundAt(f, PLAYER_X), 0, sp.hearts)];
  wall(f, PLAYER_X + 18, PLAYER_X + 46, groundAt(f, PLAYER_X) - 36);
  steps.forEach((s, k) => {
    const nextX = k + 1 < steps.length ? steps[k + 1].x0 : FIELD_W;
    const ex = Math.min(nextX - 14, s.x0 + 30 + layout() * Math.max(0, nextX - s.x0 - 50));
    const feet = groundAt(f, ex);
    const e = makeKid(ex, feet, 1, sp.hp);
    e.upTime = sp.upTime * (0.8 + layout() * 0.4);
    e.downTime = sp.downTime * (0.7 + layout() * 0.6);
    e.timer = layout() * e.downTime;
    e.aim = sp.aim;
    f.enemies.push(e);
    // a low wall in front (left) of each enemy: hides it when ducking, clear shot over it when up
    wall(f, ex - 28, ex - 16, feet - 30);
  });
  return f;
}

/** Hit box of a kid; standing kids are taller than ducking ones. */
export function kidBox(k: Kid, standing: boolean): { x0: number; y0: number; x1: number; y1: number } {
  const h = standing ? k.h : 26;
  return { x0: k.x - k.w / 2, y0: k.feet - h, x1: k.x + k.w / 2, y1: k.feet };
}

export function handOf(k: Kid): { x: number; y: number } {
  return { x: k.x + (k.side === 0 ? 10 : -10), y: k.feet - HAND_DY };
}

/** Velocity from a pull-back drag (dx, dy are finger minus press point). */
export function velocityFromDrag(dx: number, dy: number): { vx: number; vy: number } {
  const k = 4.2;
  let vx = -dx * k;
  let vy = -dy * k;
  const sp = Math.hypot(vx, vy);
  if (sp > MAX_SPEED) {
    vx *= MAX_SPEED / sp;
    vy *= MAX_SPEED / sp;
  }
  return { vx, vy };
}

export function setAiming(f: Field, who: 0 | 1, on: boolean): void {
  f.aiming[who] = on;
}

export function throwBall(f: Field, who: 0 | 1, vx: number, vy: number): boolean {
  if (f.over || f.cooldown[who] > 0) return false;
  const k = f.players[who];
  if (!k || k.hp <= 0) return false;
  const h = handOf(k);
  f.balls.push({ x: h.x, y: h.y, vx, vy, side: who, alive: true });
  f.cooldown[who] = 0.45;
  return true;
}

/** Predicted path for the aim guide (stops at the first wall/ground). */
export function predict(f: Field, x: number, y: number, vx: number, vy: number, seconds = 0.5): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    vx += f.wind * dt;
    vy += GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;
    if (y >= groundAt(f, x) || isSnow(f, x, y)) break;
    pts.push([x, y]);
  }
  return pts;
}

export interface FieldEvents { thrown: number; hitKid: Array<{ side: 0 | 1; who: number; x: number; y: number }>; splash: Array<{ x: number; y: number }>; peek: number }

function crumble(f: Field, x: number, y: number, radius = 2): void {
  const c0 = Math.floor(x / BLOCK);
  const r0 = Math.floor(y / BLOCK);
  for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
    if (dr * dr + dc * dc > radius * radius + 1) continue;
    const c = c0 + dc;
    const r = r0 + dr;
    if (c < 0 || r < 0 || c >= f.cols || r >= f.rows) continue;
    f.snow[idx(f, c, r)] = 0;
  }
}

/** Does the snow wall right in front of this kid still cover them while ducking? */
export function covered(f: Field, k: Kid): boolean {
  const dir = k.side === 0 ? 1 : -1;
  for (let dx = 12; dx <= 44; dx += BLOCK) {
    for (let y = k.feet - 24; y < k.feet - 2; y += BLOCK) if (isSnow(f, k.x + dir * dx, y)) return true;
  }
  return false;
}

function enemyThrow(f: Field, e: Kid): void {
  const target = f.players[0];
  const h = handOf(e);
  const tx = target.x + (f.rand() - 0.5) * e.aim * 2;
  const ty = target.feet - 26;
  // pick a lob time, solve for velocity (wind pushes along x)
  const T = 0.9 + f.rand() * 0.5;
  const vx = (tx - h.x - 0.5 * f.wind * T * T) / T;
  const vy = (ty - h.y - 0.5 * GRAVITY * T * T) / T;
  f.balls.push({ x: h.x, y: h.y, vx, vy, side: 1, alive: true });
}

export function stepField(f: Field, dt: number): FieldEvents {
  const ev: FieldEvents = { thrown: 0, hitKid: [], splash: [], peek: 0 };
  if (f.over) return ev;
  f.time += dt;
  f.cooldown = [Math.max(0, f.cooldown[0] - dt), Math.max(0, f.cooldown[1] - dt)];
  for (const k of [...f.players, ...f.enemies]) k.hitFlash = Math.max(0, k.hitFlash - dt);

  for (const e of f.enemies) {
    if (e.hp <= 0) continue;
    e.timer -= dt;
    if (e.timer <= 0) {
      e.up = !e.up;
      e.timer = e.up ? e.upTime : e.downTime;
      if (e.up) {
        e.throwAt = e.upTime * (0.35 + f.rand() * 0.4);
        ev.peek += 1;
      }
    }
    if (e.up && e.throwAt >= 0 && e.upTime - e.timer >= e.throwAt) {
      e.throwAt = -1;
      enemyThrow(f, e);
      ev.thrown += 1;
    }
  }

  const sub = 3;
  for (const b of f.balls) {
    if (!b.alive) continue;
    for (let s = 0; s < sub && b.alive; s++) {
      const h = dt / sub;
      b.vx += f.wind * h;
      b.vy += GRAVITY * h;
      b.x += b.vx * h;
      b.y += b.vy * h;
      if (b.x < -20 || b.x > FIELD_W + 20 || b.y > FIELD_H + 20) {
        b.alive = false;
        break;
      }
      // kids
      const targets = b.side === 0 ? (f.twoPlayer ? [f.players[1]] : f.enemies) : f.twoPlayer && b.side === 1 ? [f.players[0]] : f.players;
      targets.forEach((k, ki) => {
        if (!b.alive || k.hp <= 0) return;
        const standing = f.twoPlayer || b.side === 1 ? f.aiming[k.side] || !covered(f, k) : k.up;
        if (b.side === 0 && !f.twoPlayer && !k.up) return; // ducked enemies are hidden
        const box = kidBox(k, standing);
        if (b.x + BALL_R > box.x0 && b.x - BALL_R < box.x1 && b.y + BALL_R > box.y0 && b.y - BALL_R < box.y1) {
          b.alive = false;
          k.hp -= 1;
          k.hitFlash = 0.5;
          ev.hitKid.push({ side: k.side, who: f.twoPlayer ? k.side : ki, x: b.x, y: b.y });
          if (k.side === 1 && !f.twoPlayer && k.hp <= 0) k.up = true;
        }
      });
      if (!b.alive) break;
      if (isSnow(f, b.x, b.y)) {
        crumble(f, b.x, b.y);
        b.alive = false;
        ev.splash.push({ x: b.x, y: b.y });
        break;
      }
      if (b.y >= groundAt(f, b.x)) {
        b.alive = false;
        ev.splash.push({ x: b.x, y: groundAt(f, b.x) });
      }
    }
  }
  f.balls = f.balls.filter((b) => b.alive);

  if (f.twoPlayer) {
    if (f.players[0].hp <= 0) { f.over = true; f.winner = 1; }
    else if (f.players[1].hp <= 0) { f.over = true; f.winner = 0; }
  } else if (f.players[0].hp <= 0) {
    f.over = true;
    f.winner = 1;
  } else if (f.enemies.every((e) => e.hp <= 0)) {
    f.over = true;
    f.winner = 0;
  }
  return ev;
}

export function starsFor(heartsLeft: number, hearts: number): 0 | 1 | 2 | 3 {
  if (heartsLeft <= 0) return 0;
  if (heartsLeft >= hearts) return 3;
  return heartsLeft >= hearts - 1 ? 2 : 1;
}

/**
 * Searches for a clean throw (no wall or ground in the way) that would hit this enemy while it stands.
 * Used by the tests to prove every stage is winnable, and by nothing else.
 */
export function findShot(f: Field, enemy: Kid): { vx: number; vy: number } | null {
  const h = handOf(f.players[0]);
  const box = kidBox(enemy, true);
  for (let deg = 5; deg <= 80; deg += 1.5) {
    for (let sp = 200; sp <= MAX_SPEED; sp += 10) {
      const vx0 = Math.cos((deg * Math.PI) / 180) * sp;
      const vy0 = -Math.sin((deg * Math.PI) / 180) * sp;
      let x = h.x, y = h.y, vx = vx0, vy = vy0;
      for (let t = 0; t < 4; t += 1 / 180) {
        vx += f.wind / 180;
        vy += GRAVITY / 180;
        x += vx / 180;
        y += vy / 180;
        if (x > box.x0 - BALL_R && x < box.x1 + BALL_R && y > box.y0 - BALL_R && y < box.y1 + BALL_R) return { vx: vx0, vy: vy0 };
        if (x > FIELD_W + 20 || y > FIELD_H || isSnow(f, x, y) || y >= groundAt(f, x)) break;
      }
    }
  }
  return null;
}
