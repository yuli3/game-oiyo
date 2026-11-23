/**
 * 제기차기 (Jegi Kick) — an OIYO original new-year physics game.
 * A feathered jegi floats down with heavy air drag; tap under it at the right moment to kick it back up.
 * Kicking where the jegi is falling on the foot's sweet spot gives a "perfect" straight kick; hitting it
 * off-centre sends it sideways. Stages add wind, magpies, an icy yard and finally two jegis at once.
 * Two-player mode turns it into a one-phone foot volley: let it land on your half and the other side scores.
 */

import { mulberry } from "./pixel-kit";

export const JEGI_SLUG = "jegi-kick";
export const FIELD_W = 360;
export const FIELD_H = 600;
export const GROUND_Y = 556;
export const FOOT_Y = 540;

const GRAVITY = 820;
const DRAG = 0.0042; // terminal speed ≈ sqrt(g/k) ≈ 440 px/s
const KID_SPEED = 560;
const ICE_ACCEL = 1500;
const SWING = 0.22;
const HIT_FROM = 0.02;
const HIT_TO = 0.17;
const RETAP = 0.1;

export interface StageSpec {
  target: number;
  wind: number; // max sideways push in px/s²
  magpies: number; // birds per minute
  ice: boolean;
  jegis: 1 | 2;
  night: boolean;
  floaty: number; // drag multiplier (2-jegi stages fall slower)
}

function spec(i: number): StageSpec {
  const band = Math.floor(i / 5);
  const k = i % 5;
  const base: StageSpec = { target: 0, wind: 0, magpies: 0, ice: false, jegis: 1, night: false, floaty: 1 };
  switch (band) {
    case 0: return { ...base, target: [5, 8, 10, 12, 15][k] };
    case 1: return { ...base, target: [10, 12, 14, 16, 20][k], wind: 60 + k * 25 };
    case 2: return { ...base, target: [12, 15, 18, 20, 25][k], wind: 50, magpies: 5 + k * 2 };
    case 3: return { ...base, target: [12, 15, 18, 20, 25][k], wind: 40 + k * 10, ice: true };
    case 4: return { ...base, target: [18, 20, 22, 25, 30][k], wind: 90 + k * 15, magpies: 8 + k * 2, night: true };
    default: return { ...base, target: [6, 8, 10, 12, 15][k], wind: k * 12, jegis: 2, night: k >= 3, floaty: 2.6 - k * 0.1 };
  }
}

export const STAGES: readonly StageSpec[] = Array.from({ length: 30 }, (_, i) => spec(i));
export const STAGE_COUNT = STAGES.length;

export interface Jegi { x: number; y: number; vx: number; vy: number; spin: number; down: boolean; lastKicker: number }
export interface Kid {
  x: number; vx: number; tx: number; minX: number; maxX: number;
  swing: number; // seconds since the kick began, or -1 when idle
  hitThisSwing: boolean;
  foot: -1 | 1; // which foot swings (alternates)
  fallen: number; // seconds left of the comic fall
}
export interface Bird { x: number; y: number; vx: number; flap: number }

export interface Yard {
  stage: number;
  twoPlayer: boolean;
  time: number;
  kids: Kid[];
  jegis: Jegi[];
  birds: Bird[];
  kicks: number; // total kicks (single player)
  perfects: number;
  over: boolean;
  score: [number, number]; // two-player points
  serveTimer: number;
  rand: () => number;
  windPhase: number;
}

export interface StepEvents { kicked: Array<{ kid: number; jegi: number; perfect: boolean }>; dropped: number[]; bird: number | null; point: 0 | 1 | null }

export const WIN_POINTS = 5;

function newKid(x: number, minX: number, maxX: number): Kid {
  return { x, vx: 0, tx: x, minX, maxX, swing: -1, hitThisSwing: false, foot: 1, fallen: 0 };
}

function serveJegi(y: Yard, x: number): Jegi {
  return { x, y: 120, vx: (y.rand() - 0.5) * 30, vy: 0, spin: 0, down: false, lastKicker: -1 };
}

export function newYard(stage: number, seed: number, twoPlayer = false): Yard {
  const y: Yard = {
    stage, twoPlayer, time: 0, kids: [], jegis: [], birds: [], kicks: 0, perfects: 0, over: false,
    score: [0, 0], serveTimer: 0, rand: mulberry(seed), windPhase: 0,
  };
  y.windPhase = y.rand() * Math.PI * 2;
  if (twoPlayer) {
    y.kids = [newKid(FIELD_W * 0.25, 20, FIELD_W / 2 - 14), newKid(FIELD_W * 0.75, FIELD_W / 2 + 14, FIELD_W - 20)];
    y.jegis = [serveJegi(y, y.rand() < 0.5 ? FIELD_W * 0.25 : FIELD_W * 0.75)];
  } else {
    y.kids = [newKid(FIELD_W / 2, 20, FIELD_W - 20)];
    const s = STAGES[stage];
    y.jegis = s.jegis === 2 ? [serveJegi(y, FIELD_W * 0.35), { ...serveJegi(y, FIELD_W * 0.65), y: -60 }] : [serveJegi(y, FIELD_W / 2)];
  }
  return y;
}

export function windAt(y: Yard): number {
  if (y.twoPlayer) return Math.sin(y.time * 0.4 + y.windPhase) * 40;
  const w = STAGES[y.stage].wind;
  return w * (0.65 * Math.sin(y.time * 0.45 + y.windPhase) + 0.35 * Math.sin(y.time * 1.3 + y.windPhase * 2));
}

/** Foot sweet spot during a swing: x offset from the kid and height. */
export function footAt(k: Kid): { x: number; y: number } | null {
  if (k.swing < HIT_FROM || k.swing > HIT_TO) return null;
  const t = (k.swing - HIT_FROM) / (HIT_TO - HIT_FROM);
  return { x: k.x + k.foot * 10, y: FOOT_Y - Math.sin(t * Math.PI) * 18 };
}

/** Tap: walk to x and kick. Returns the kid index that reacted. */
export function tapAt(y: Yard, x: number): number {
  let idx = 0;
  if (y.twoPlayer) idx = x < FIELD_W / 2 ? 0 : 1;
  const k = y.kids[idx];
  if (k.fallen > 0) return idx;
  k.tx = Math.max(k.minX, Math.min(k.maxX, x));
  if (k.swing < 0 || k.swing > RETAP) {
    k.swing = 0;
    k.hitThisSwing = false;
    k.foot = k.foot === 1 ? -1 : 1;
  }
  return idx;
}

/** Drag without a new kick: just walk. */
export function steerTo(y: Yard, idx: number, x: number): void {
  const k = y.kids[idx];
  k.tx = Math.max(k.minX, Math.min(k.maxX, x));
}

export function stepYard(y: Yard, dt: number): StepEvents {
  const ev: StepEvents = { kicked: [], dropped: [], bird: null, point: null };
  if (y.over) return ev;
  y.time += dt;
  const s = STAGES[y.stage];
  const ice = !y.twoPlayer && s.ice;
  const wind = windAt(y);

  y.kids.forEach((k) => {
    if (k.fallen > 0) {
      k.fallen = Math.max(0, k.fallen - dt);
      k.vx *= 0.9;
    } else if (ice) {
      const want = Math.max(-KID_SPEED, Math.min(KID_SPEED, (k.tx - k.x) * 6));
      const dv = want - k.vx;
      k.vx += Math.sign(dv) * Math.min(Math.abs(dv), ICE_ACCEL * dt);
    } else {
      const d = k.tx - k.x;
      k.vx = Math.sign(d) * Math.min(Math.abs(d) / dt, KID_SPEED);
    }
    k.x = Math.max(k.minX, Math.min(k.maxX, k.x + k.vx * dt));
    if (k.swing >= 0) {
      k.swing += dt;
      if (k.swing > SWING) k.swing = -1;
    }
  });

  y.jegis.forEach((j, ji) => {
    if (j.down) return;
    const sp = Math.hypot(j.vx, j.vy);
    const drag = DRAG * (y.twoPlayer ? 1 : s.floaty);
    j.vx += (wind - drag * sp * j.vx) * dt;
    j.vy += (GRAVITY - drag * sp * j.vy) * dt;
    j.x += j.vx * dt;
    j.y += j.vy * dt;
    j.spin += j.vx * dt * 0.02;
    if (j.x < 10) { j.x = 10; j.vx = Math.abs(j.vx) * 0.6; }
    if (j.x > FIELD_W - 10) { j.x = FIELD_W - 10; j.vx = -Math.abs(j.vx) * 0.6; }
    if (j.y < -200) j.y = -200;

    // kicks: only while falling
    if (j.vy > 0) {
      y.kids.forEach((k, ki) => {
        if (k.hitThisSwing || k.fallen > 0) return;
        const f = footAt(k);
        if (!f) return;
        const dx = j.x - f.x;
        const dy = j.y - f.y;
        if (Math.abs(dx) > 22 || dy < -22 || dy > 12) return;
        k.hitThisSwing = true;
        const perfect = Math.abs(dx) <= 8 && Math.abs(dy) <= 12;
        const power = perfect ? 760 : 640 - Math.min(120, Math.abs(dx) * 4);
        j.vy = -power;
        if (y.twoPlayer) {
          // foot volley: every kick carries the jegi toward the other half, off-centre hits add a curve
          j.vx = (ki === 0 ? 1 : -1) * (perfect ? 120 : 90) + dx * 4 + (y.rand() - 0.5) * 60;
        } else {
          j.vx = dx * (perfect ? 2 : 7) + (y.rand() - 0.5) * (perfect ? 16 : 110);
        }
        j.lastKicker = ki;
        ev.kicked.push({ kid: ki, jegi: ji, perfect });
        if (!y.twoPlayer) {
          y.kicks += 1;
          if (perfect) y.perfects += 1;
        }
      });
    }

    if (j.y >= GROUND_Y) {
      j.y = GROUND_Y;
      j.down = true;
      ev.dropped.push(ji);
      if (y.twoPlayer) {
        const side: 0 | 1 = j.x < FIELD_W / 2 ? 0 : 1;
        const winner: 0 | 1 = side === 0 ? 1 : 0;
        y.score[winner] += 1;
        y.kids[side].fallen = 0.9;
        ev.point = winner;
        if (y.score[winner] >= WIN_POINTS) y.over = true;
        else y.serveTimer = 1.1;
      } else {
        y.kids[0].fallen = 1.4;
        y.over = true;
      }
    }
  });

  // magpies glide across and bump the jegi
  if (!y.twoPlayer && s.magpies > 0 && y.rand() < (s.magpies / 60) * dt) {
    const fromLeft = y.rand() < 0.5;
    y.birds.push({ x: fromLeft ? -20 : FIELD_W + 20, y: 140 + y.rand() * 260, vx: (fromLeft ? 1 : -1) * (90 + y.rand() * 60), flap: 0 });
  }
  y.birds.forEach((b) => {
    b.x += b.vx * dt;
    b.flap += dt * 12;
    y.jegis.forEach((j) => {
      if (j.down) return;
      if (Math.abs(j.x - b.x) < 18 && Math.abs(j.y - b.y) < 12) {
        j.vx += b.vx * 1.4;
        j.vy = Math.min(j.vy, 0) - 60;
        ev.bird = 0;
        b.vx *= 1.6;
      }
    });
  });
  y.birds = y.birds.filter((b) => b.x > -40 && b.x < FIELD_W + 40);

  if (y.twoPlayer && y.serveTimer > 0) {
    y.serveTimer -= dt;
    if (y.serveTimer <= 0 && !y.over) {
      const last = ev.point ?? (y.score[0] >= y.score[1] ? 1 : 0);
      y.jegis = [serveJegi(y, last === 0 ? FIELD_W * 0.75 : FIELD_W * 0.25)];
    }
  }
  return ev;
}

export function stageCleared(y: Yard): boolean {
  return !y.twoPlayer && y.kicks >= STAGES[y.stage].target;
}

export function starsFor(kicks: number, target: number): 0 | 1 | 2 | 3 {
  if (kicks < target) return 0;
  if (kicks >= target * 2) return 3;
  if (kicks >= Math.ceil(target * 1.5)) return 2;
  return 1;
}

/**
 * A simple pilot used by the tests: aims under the jegi that will land first and taps
 * just before it reaches the foot. Returns the x it tapped at, or null.
 */
export function pilot(y: Yard, idx = 0, reactionNoise = 0): number | null {
  const k = y.kids[idx];
  let best: { t: number; x: number; j: Jegi } | null = null;
  for (const j of y.jegis) {
    if (j.down) continue;
    if (y.twoPlayer && (j.x < FIELD_W / 2 ? 0 : 1) !== idx && j.vy < 0) continue;
    // integrate a copy forward to the foot height
    let px = j.x, py = j.y, vx = j.vx, vy = j.vy, t = 0;
    const wind = windAt(y);
    const drag = DRAG * (y.twoPlayer ? 1 : STAGES[y.stage].floaty);
    while (t < 3 && !(vy > 0 && py >= FOOT_Y - 20)) {
      const sp = Math.hypot(vx, vy);
      vx += (wind - drag * sp * vx) / 60;
      vy += (GRAVITY - drag * sp * vy) / 60;
      px += vx / 60;
      py += vy / 60;
      px = Math.max(10, Math.min(FIELD_W - 10, px));
      t += 1 / 60;
    }
    if (!best || t < best.t) best = { t, x: px, j };
  }
  if (!best) return null;
  const aim = best.x + k.foot * 10 + reactionNoise;
  steerTo(y, idx, aim);
  if (best.t < 0.07 && k.swing < 0 && k.fallen <= 0) {
    k.swing = 0;
    k.hitThisSwing = false;
    k.foot = k.foot === 1 ? -1 : 1;
    return aim;
  }
  return null;
}
