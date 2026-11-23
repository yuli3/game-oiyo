/**
 * 널뛰기 (Neol Jump) — an OIYO original rhythm-and-steer game about the Seollal seesaw jump.
 * You and a friend stand on the two ends of a long board. When one lands, the other flies up.
 * Tap right as someone lands to put your weight into it: a well-timed tap sends the next jump higher,
 * a late or missing tap lets it fade. While you are in the air, drag sideways to steer through the
 * lucky charms floating above the village wall, then come back down onto your end of the board.
 */

import { mulberry } from "./pixel-kit";

export const NEOL_SLUG = "neol-jump";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 600;
export const BOARD_Y = 500; // board top (screen y at height 0, camera at rest)
export const LEFT_X = 92; // the player's end
export const RIGHT_X = 268; // the friend's end
export const GRAVITY = 1200;
export const REST = 0.9;
export const MIN_V = 330;
export const MAX_V = 1400;
export const PERFECT = 0.06; // seconds either side of a landing
export const GOOD = 0.14;
export const BONUS_PERFECT = 150;
export const BONUS_GOOD = 70;
export const STEER_SPEED = 240;
export const CHARM_R = 20;
export const PLAYER_R = 12;

export interface Charm { x: number; h: number; got: boolean }
export interface Bird { h: number; x0: number; speed: number }

export interface NeolLevel {
  stage: number;
  charms: Array<{ x: number; h: number }>;
  jumps: number; // player jumps allowed
  zone: number; // half-width of the landing spot on the player's end
  wind: number; // px/s² sideways while in the air
  birds: Bird[];
  falls: number; // falls allowed before the stage is lost
}

export type Quality = "perfect" | "good" | "miss";
export type Who = "player" | "friend";

export interface Neol {
  level: NeolLevel;
  time: number;
  charms: Charm[];
  air: Who | null; // who is in the air (null while the board waits for a tap)
  h: number; // height of whoever is in the air
  vy: number;
  px: number; // player x
  pvx: number;
  steer: number | null; // target x while dragging
  pending: null | { launch: Who; at: number; base: number };
  lastTap: number;
  jumps: number;
  falls: number;
  fallen: number; // seconds left of the fall animation (>0 while lying in the snow)
  apex: number; // highest the player has been
  streak: number; // perfect taps in a row
  over: boolean;
  won: boolean;
}

export function buildLevel(stage: number): NeolLevel {
  const rng = mulberry(5200 + stage * 71);
  const band = Math.floor(stage / 5);
  const n = Math.min(8, 3 + Math.floor(stage / 5));
  const top = 100 + stage * 20;
  const charms: Array<{ x: number; h: number }> = [];
  for (let i = 0; i < n; i++) {
    const h = Math.round(50 + ((top - 50) * (i + 1)) / n + (rng() - 0.5) * 16);
    const spread = stage < 3 ? 0 : Math.min(90, 20 + stage * 3);
    const side = i % 2 ? 1 : -1;
    const x = Math.round(LEFT_X + side * spread * (0.4 + rng() * 0.6));
    charms.push({ x: Math.max(24, Math.min(FIELD_W - 24, x)), h });
  }
  const wind = band >= 3 ? (stage % 2 ? -1 : 1) * (24 + (stage - 15) * 3) : 0;
  const birds: Bird[] = [];
  if (band >= 2) {
    birds.push({ h: Math.round(top * 0.55), x0: rng() * FIELD_W, speed: (rng() < 0.5 ? -1 : 1) * (60 + stage * 2) });
    if (band >= 4) birds.push({ h: Math.round(top * 0.85), x0: rng() * FIELD_W, speed: (rng() < 0.5 ? -1 : 1) * (70 + stage * 2) });
  }
  return {
    stage,
    charms,
    jumps: n * 2 + 3,
    zone: Math.max(16, 26 - stage * 0.35),
    wind,
    birds,
    falls: 3,
  };
}

export const LEVELS: NeolLevel[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));

export function newNeol(stage: number): Neol {
  const level = LEVELS[stage];
  return {
    level,
    time: 0,
    charms: level.charms.map((c) => ({ ...c, got: false })),
    air: null,
    h: 0,
    vy: 0,
    px: LEFT_X,
    pvx: 0,
    steer: null,
    // the friend starts with a little hop; your first tap launches you
    pending: { launch: "player", at: Infinity, base: MIN_V },
    lastTap: -Infinity,
    jumps: 0,
    falls: 0,
    fallen: 0,
    apex: 0,
    streak: 0,
    over: false,
    won: false,
  };
}

export function quality(dt: number): Quality {
  const a = Math.abs(dt);
  return a <= PERFECT ? "perfect" : a <= GOOD ? "good" : "miss";
}

export function apexOf(v: number): number {
  return (v * v) / (2 * GRAVITY);
}

/** Bird x at a time. Birds wrap around the screen. */
export function birdX(b: Bird, time: number): number {
  const span = FIELD_W + 80;
  return ((((b.x0 + b.speed * time + 40) % span) + span) % span) - 40;
}

export interface NeolEvents { launched: null | { who: Who; q: Quality }; landed: boolean; fell: boolean; charm: number; bird: boolean }

function launch(s: Neol, who: Who, base: number, q: Quality, ev: NeolEvents): void {
  const bonus = q === "perfect" ? BONUS_PERFECT : q === "good" ? BONUS_GOOD : 0;
  s.streak = q === "perfect" ? s.streak + 1 : 0;
  s.air = who;
  s.vy = Math.min(MAX_V, Math.max(MIN_V, base + bonus));
  s.h = 0;
  s.pending = null;
  if (who === "player") {
    s.jumps++;
    s.pvx = 0;
  }
  ev.launched = { who, q };
}

/** A tap: it counts for the landing nearest to it (just before or just after). */
export function tap(s: Neol): NeolEvents {
  const ev: NeolEvents = { launched: null, landed: false, fell: false, charm: 0, bird: false };
  if (s.over || s.fallen > 0) return ev;
  const p = s.pending;
  if (p) {
    if (p.at === Infinity) {
      // the very first jump of a stage (or after a fall) starts on a tap
      launch(s, p.launch, p.base, "good", ev);
      return ev;
    }
    launch(s, p.launch, p.base, quality(s.time - p.at), ev);
    return ev;
  }
  s.lastTap = s.time;
  return ev;
}

export function setSteer(s: Neol, x: number | null): void {
  s.steer = x === null ? null : Math.max(16, Math.min(FIELD_W - 16, x));
}

export function stepNeol(s: Neol, dt: number): NeolEvents {
  const ev: NeolEvents = { launched: null, landed: false, fell: false, charm: 0, bird: false };
  if (s.over) return ev;
  const l = s.level;
  s.time += dt;
  if (s.fallen > 0) {
    s.fallen -= dt;
    if (s.fallen <= 0) {
      s.fallen = 0;
      s.px = LEFT_X;
      s.pending = { launch: "player", at: Infinity, base: MIN_V };
    }
    return ev;
  }
  const p = s.pending;
  if (p && p.at !== Infinity && s.time - p.at > GOOD) launch(s, p.launch, p.base, "miss", ev);
  if (!s.air) return ev;

  const prevH = s.h;
  s.vy -= GRAVITY * dt;
  s.h += s.vy * dt;
  if (s.air === "player") {
    s.apex = Math.max(s.apex, s.h);
    // steering pulls toward the finger, wind pushes
    if (s.steer !== null) {
      const want = Math.max(-STEER_SPEED, Math.min(STEER_SPEED, (s.steer - s.px) * 8));
      s.pvx += (want - s.pvx) * Math.min(1, dt * 10);
    } else s.pvx *= Math.max(0, 1 - dt * 2);
    s.pvx += l.wind * dt;
    s.px = Math.max(10, Math.min(FIELD_W - 10, s.px + s.pvx * dt));
    for (const c of s.charms) {
      if (!c.got && Math.hypot(c.x - s.px, c.h - s.h) < CHARM_R + PLAYER_R) {
        c.got = true;
        ev.charm++;
      }
    }
    for (const b of l.birds) {
      const bx = birdX(b, s.time);
      if (Math.abs(bx - s.px) < 18 && Math.abs(b.h - s.h) < 16 && Math.sign(prevH - b.h) !== Math.sign(s.h - b.h)) {
        s.pvx += Math.sign(b.speed) * 260;
        s.vy = Math.min(s.vy, 0);
        ev.bird = true;
      }
    }
  }
  if (s.h <= 0 && s.vy < 0) {
    const vLand = -s.vy;
    const who = s.air;
    s.air = null;
    s.h = 0;
    s.vy = 0;
    if (who === "player" && Math.abs(s.px - LEFT_X) > l.zone) {
      s.falls++;
      s.fallen = 1.2;
      s.streak = 0;
      ev.fell = true;
    } else {
      if (who === "player") s.px = LEFT_X + (s.px - LEFT_X) * 0.5;
      ev.landed = true;
      const next: Who = who === "player" ? "friend" : "player";
      s.pending = { launch: next, at: s.time, base: vLand * REST };
      // a tap just before the landing counts too
      if (s.time - s.lastTap <= GOOD) {
        const q = quality(s.time - s.lastTap);
        s.lastTap = -Infinity;
        launch(s, next, vLand * REST, q, ev);
      }
    }
  }
  if (s.charms.every((c) => c.got)) {
    s.over = true;
    s.won = true;
  } else if (s.falls >= l.falls || (s.jumps >= l.jumps && s.air !== "player" && s.fallen <= 0)) {
    s.over = true;
    s.won = false;
  }
  return ev;
}

export function starsFor(s: Neol): number {
  const left = s.level.jumps - s.jumps;
  if (s.falls === 0 && left >= s.level.jumps * 0.3) return 3;
  return s.falls <= 1 ? 2 : 1;
}

/** When the body in the air will land, measured from now. */
export function timeToLand(s: Neol): number {
  if (!s.air) return 0;
  return (s.vy + Math.sqrt(s.vy * s.vy + 2 * GRAVITY * Math.max(0, s.h))) / GRAVITY;
}

/**
 * Test pilot for one frame: decides where to steer and whether to tap now. `offset` is the pilot's
 * timing error in seconds (negative = early).
 */
export function pilotFrame(s: Neol, plan: { tapAt: number | null }, offset: number): void {
  if (s.over || s.fallen > 0) return;
  if (s.pending && s.pending.at === Infinity) {
    tap(s);
    plan.tapAt = null;
    return;
  }
  if (s.air && plan.tapAt === null) plan.tapAt = s.time + timeToLand(s) + offset;
  if (plan.tapAt !== null && s.time >= plan.tapAt) {
    tap(s);
    plan.tapAt = null;
  }
  if (s.air === "player") {
    const apex = s.vy > 0 ? s.h + apexOf(s.vy) : s.h;
    const t = timeToLand(s);
    const home = Math.abs(s.px - LEFT_X) / STEER_SPEED + 0.22;
    let target = LEFT_X;
    if (t > home) {
      const cands = s.charms.filter((c) => !c.got && c.h <= apex - 4 && (s.vy > 0 ? c.h >= s.h - 10 : c.h <= s.h + 10));
      cands.sort((a, b) => Math.abs(a.h - s.h) - Math.abs(b.h - s.h));
      const c = cands[0];
      if (c && Math.abs(c.x - LEFT_X) / STEER_SPEED + 0.2 < t) target = c.x;
    }
    setSteer(s, target - s.level.wind * 0.02);
  } else setSteer(s, null);
}
