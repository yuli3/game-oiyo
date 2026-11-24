/**
 * 복조리 배달 (Bokjori Run) — an OIYO original New Year's Eve delivery run.
 * On the last night of the old year, bokjori (lucky rice strainers) were tossed over the walls into
 * courtyards for the coming year's luck. You run down the alley on your own: hold the right side of
 * the screen to wind up a throw and let go to lob a bokjori over the wall into a yard. Houses with a
 * lit lantern asked for one; a dark house didn't, and a strainer there counts against you. Strainers
 * that hit the wall drop in the alley, ones that sail over the roof are lost. Tap the left side to jump
 * the dogs, or you stumble and drop a strainer. Every alley is kept only if an autopilot that plans
 * its throws (and a sloppy one) delivers enough.
 */

import { mulberry } from "./pixel-kit";

export const BOKJORI_SLUG = "bokjori-run";
export const STAGE_COUNT = 30;
export const VIEW_W = 360;
export const VIEW_H = 560;
export const GROUND_Y = 470; // screen y of the alley
export const RUNNER_SX = 70; // runner's screen x (the alley scrolls)
export const HAND_H = 40; // throws leave from this high
export const THROW_ANGLE = (72 * Math.PI) / 180;
export const CHARGE_TIME = 0.9; // seconds of holding for a full-power throw
export const GRAVITY = 900;
export const JUMP_V = 430;
export const RUN_G = 1400;
export const WALL_T = 8;
export const DOG_W = 30;

export interface House { wall: number; front: number; wallH: number; yard: number; houseH: number; wants: boolean } // front: depth of the wall or gate-house before the yard
export interface BokjoriLevel {
  stage: number;
  speed: number;
  houses: House[];
  dogs: number[];
  length: number;
  strainers: number;
  need: number;
}

export interface Strainer { x: number; y: number; vx: number; vy: number; spin: number; done: boolean; result: "" | "yard" | "wall" | "roof" | "alley"; house: number }

export interface Run {
  level: BokjoriLevel;
  time: number;
  x: number;
  y: number; // runner height
  vy: number;
  stumble: number;
  charging: boolean;
  charge: number; // seconds held
  left: number; // strainers in hand
  flying: Strainer[];
  delivered: boolean[]; // per house
  wrong: number;
  missed: number;
  bitten: number;
  over: boolean;
  won: boolean;
}

export const yardStart = (h: House) => h.wall + h.front;
export const yardEnd = (h: House) => h.wall + h.front + h.yard;

export function newRun(level: BokjoriLevel): Run {
  return { level, time: 0, x: 0, y: 0, vy: 0, stumble: 0, charging: false, charge: 0, left: level.strainers, flying: [], delivered: level.houses.map(() => false), wrong: 0, missed: 0, bitten: 0, over: false, won: false };
}

export function speedOf(r: Run): number {
  return r.level.speed * (r.stumble > 0 ? 0.5 : 1);
}

/** Wind-up strength 0..1 for a hold of t seconds. */
export const power = (t: number) => Math.min(1, t / CHARGE_TIME);

export function launchVelocity(runSpeed: number, p: number): { vx: number; vy: number } {
  const s = 150 + 330 * p;
  return { vx: runSpeed * 0.25 + Math.cos(THROW_ANGLE) * s, vy: Math.sin(THROW_ANGLE) * s };
}

export function jump(r: Run): boolean {
  if (r.over || r.y > 0) return false;
  r.vy = JUMP_V;
  return true;
}

export function startCharge(r: Run): void {
  if (r.over || r.left <= 0) return;
  r.charging = true;
  r.charge = 0;
}

export function release(r: Run): boolean {
  if (!r.charging) return false;
  r.charging = false;
  if (r.over || r.left <= 0) return false;
  const v = launchVelocity(speedOf(r), power(r.charge));
  r.flying.push({ x: r.x + 6, y: r.y + HAND_H, vx: v.vx, vy: v.vy, spin: 8 + power(r.charge) * 10, done: false, result: "", house: -1 });
  r.left--;
  return true;
}

export interface RunEvents { landed: Strainer[]; bitten: boolean; finish: boolean }

/** Moves one strainer a substep; returns true when it comes to rest. */
function stepStrainer(level: BokjoriLevel, s: Strainer, h: number): boolean {
  const px = s.x;
  s.vy -= GRAVITY * h;
  s.x += s.vx * h;
  s.y += s.vy * h;
  for (let i = 0; i < level.houses.length; i++) {
    const hs = level.houses[i];
    // the front wall: hit it below the top and it drops into the alley
    if (px < hs.wall && s.x >= hs.wall && s.y < hs.wallH) {
      s.x = hs.wall - 1;
      s.vx = -Math.abs(s.vx) * 0.2;
      s.house = -1;
      s.result = "wall";
    }
    // on top of a thick wall or gate-house roof: stuck up there
    if (s.result !== "wall" && s.x >= hs.wall && s.x <= hs.wall + hs.front && s.y <= hs.wallH && s.vy < 0) {
      s.y = hs.wallH;
      s.result = "roof";
      s.house = i;
      return true;
    }
    // the house front: it clatters off and drops into the yard; over the roof it is lost
    const face = yardEnd(hs);
    if (px < face && s.x >= face) {
      if (s.y < hs.houseH) {
        s.x = face - 2;
        s.vx = -Math.abs(s.vx) * 0.25;
      } else {
        s.result = "roof";
        s.house = i;
        return true;
      }
    }
  }
  if (s.y <= 0) {
    s.y = 0;
    if (s.result !== "wall") {
      const i = level.houses.findIndex((hs) => s.x >= yardStart(hs) && s.x <= yardEnd(hs));
      s.house = i;
      s.result = i >= 0 ? "yard" : "alley";
    }
    return true;
  }
  return false;
}

export function stepRun(r: Run, dt: number): RunEvents {
  const ev: RunEvents = { landed: [], bitten: false, finish: false };
  if (r.over) return ev;
  const l = r.level;
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / n;
  for (let k = 0; k < n && !r.over; k++) {
    r.time += h;
    if (r.charging) r.charge += h;
    r.stumble = Math.max(0, r.stumble - h);
    const px = r.x;
    r.x += speedOf(r) * h;
    if (r.y > 0 || r.vy > 0) {
      r.vy -= RUN_G * h;
      r.y += r.vy * h;
      if (r.y <= 0) { r.y = 0; r.vy = 0; }
    }
    for (const d of l.dogs) {
      if (px < d - DOG_W / 2 + 4 && r.x >= d - DOG_W / 2 + 4 && r.y < 22) {
        r.stumble = 0.7;
        r.bitten++;
        if (r.left > 0) r.left--;
        ev.bitten = true;
      }
    }
    for (const s of r.flying) {
      if (s.done) continue;
      if (stepStrainer(l, s, h)) {
        s.done = true;
        if (s.result === "yard") {
          const hs = l.houses[s.house];
          if (hs.wants && !r.delivered[s.house]) r.delivered[s.house] = true;
          else if (!hs.wants) r.wrong++;
          else r.missed++; // a second one into a yard already served
        } else r.missed++;
        ev.landed.push(s);
      }
    }
    if (r.x >= l.length && r.flying.every((s) => s.done)) {
      r.over = true;
      r.won = score(r) >= l.need;
      ev.finish = true;
    }
  }
  return ev;
}

export function score(r: Run): number {
  return r.delivered.filter(Boolean).length - r.wrong;
}

export function starsFor(r: Run): number {
  if (!r.won) return 0;
  const want = r.level.houses.filter((h) => h.wants).length;
  const got = r.delivered.filter(Boolean).length;
  if (got >= want && r.wrong === 0) return 3;
  if (got >= want - 1 && r.wrong === 0) return 2;
  return 1;
}

// ─── Autopilot ──────────────────────────────────────────────────────────────

/** Where a strainer thrown at power p from the runner at x (running at full speed, on the ground) ends up. */
export function landingFor(level: BokjoriLevel, x: number, p: number): Strainer {
  const v = launchVelocity(level.speed, p);
  const s: Strainer = { x: x + 6, y: HAND_H, vx: v.vx, vy: v.vy, spin: 0, done: false, result: "", house: -1 };
  for (let t = 0; t < 5; t += 1 / 240) if (stepStrainer(level, s, 1 / 240)) break;
  return s;
}

interface Plan { start: number; p: number; house: number }

/** How far ahead of the release point a throw at power p lands on open ground. */
function reach(speed: number, p: number): number {
  const v = launchVelocity(speed, p);
  // y(t) = HAND_H + vy t - g t^2 / 2 = 0
  const t = (v.vy + Math.sqrt(v.vy * v.vy + 2 * GRAVITY * HAND_H)) / GRAVITY;
  return 6 + v.vx * t;
}

/** The latest-starting throw (wind-up start x and power) that drops a strainer near the middle of house i's yard. */
export function planThrow(level: BokjoriLevel, fromX: number, i: number): Plan | null {
  const hs = level.houses[i];
  const mid = (yardStart(hs) + yardEnd(hs)) / 2;
  let best: Plan | null = null;
  for (let p = 0.05; p <= 1.0001; p += 0.0125) {
    const rx = mid - reach(level.speed, p);
    const start = rx - level.speed * p * CHARGE_TIME;
    // wind up after now, and let go well before reaching the wall
    if (start < fromX || rx > hs.wall - 50) continue;
    const s = landingFor(level, rx, p);
    if (s.result !== "yard" || s.house !== i || Math.abs(s.x - mid) > hs.yard * 0.35) continue;
    if (!best || start > best.start) best = { start, p, house: i };
  }
  return best;
}

/**
 * Plays an alley: jumps every dog, and for each house that wants a strainer winds up a planned throw.
 * `jitter` (0..1) adds human error: power off by up to ±8 % and releases up to 50 ms late.
 */
export function pilotRun(level: BokjoriLevel, jitter = 0, seed = 1, opts: { jumps?: boolean; fixedPower?: number; everyHouse?: boolean } = {}): Run {
  const { jumps = true, fixedPower, everyHouse = false } = opts;
  const r = newRun(level);
  const rng = mulberry(seed);
  const dt = 1 / 60;
  let plan: Plan | null = null;
  let target = 0;
  let releaseLate = 0;
  let pErr = 0;
  while (!r.over && r.time < 120) {
    // jump a dog that is close ahead
    if (jumps) for (const d of level.dogs) if (d - r.x > 0 && d - r.x < speedOf(r) * 0.22 + 14) jump(r);
    if (!r.charging) {
      while (target < level.houses.length && ((!everyHouse && !level.houses[target].wants) || r.delivered[target] || yardStart(level.houses[target]) < r.x + 30)) target++;
      if (target < level.houses.length) {
        if (!plan || plan.house !== target) {
          plan = fixedPower !== undefined ? { start: level.houses[target].wall - 160, p: fixedPower, house: target } : planThrow(level, r.x, target);
          pErr = (rng() - 0.5) * 2 * 0.08 * jitter;
          releaseLate = rng() * 0.05 * jitter;
          if (!plan) target++;
        }
        if (plan && r.x >= plan.start && r.y === 0 && r.left > 0) startCharge(r);
      }
    } else if (plan && r.charge >= plan.p * (1 + pErr) * CHARGE_TIME + releaseLate) {
      release(r);
      target++;
      plan = null;
    }
    stepRun(r, dt);
  }
  return r;
}

// ─── Alleys ─────────────────────────────────────────────────────────────────

function shape(stage: number) {
  return {
    houses: Math.min(12, 5 + Math.floor(stage / 4)),
    speed: 120 + stage * 3.5,
    dogs: stage < 3 ? 0 : Math.min(7, 1 + Math.floor((stage - 3) / 4)),
    dark: stage < 2 ? 0 : Math.min(0.4, 0.15 + stage * 0.01),
    spare: stage < 10 ? 2 : 1,
    slack: stage < 6 ? 2 : 1,
  };
}

export function buildLevel(stage: number): BokjoriLevel {
  const sh = shape(stage);
  const rng = mulberry(6600 + stage * 83);
  for (let attempt = 0; attempt < 300; attempt++) {
    const houses: House[] = [];
    let x = 260;
    for (let k = 0; k < sh.houses; k++) {
      const yard = Math.round(82 + rng() * 30 - Math.min(30, stage));
      const wallH = Math.round(46 + rng() * 22 + Math.min(16, stage * 0.6));
      const houseH = Math.round(wallH + 26 + rng() * 34);
      const wants = k === 0 || rng() > sh.dark;
      const front = stage < 4 ? WALL_T : Math.round(WALL_T + rng() * Math.min(40, 10 + stage * 1.5));
      houses.push({ wall: x, front, wallH, yard, houseH, wants });
      x += front + yard + 40 + Math.round(rng() * 90) + Math.round(sh.speed * 1.1);
    }
    const dogs: number[] = [];
    for (let k = 0; k < sh.dogs; k++) {
      for (let tries = 0; tries < 30; tries++) {
        const d = 200 + rng() * (x - 260);
        if (dogs.some((o) => Math.abs(o - d) < 140)) continue;
        dogs.push(Math.round(d));
        break;
      }
    }
    dogs.sort((a, b) => a - b);
    const want = houses.filter((h) => h.wants).length;
    const level: BokjoriLevel = { stage, speed: sh.speed, houses, dogs, length: x + 120, strainers: want + sh.spare, need: want - sh.slack };
    const run = pilotRun(level, 0, 1);
    if (!run.won || starsFor(run) < 3) continue;
    if (![[0.6, 7], [0.8, 13]].every(([j, sd]) => pilotRun(level, j, sd).won)) continue;
    return level;
  }
  throw new Error(`no bokjori alley for stage ${stage}`);
}

const cache = new Map<number, BokjoriLevel>();
/** Alleys are checked by the autopilot, so each one is built when it is first played. */
export function levelFor(stage: number): BokjoriLevel {
  let l = cache.get(stage);
  if (!l) {
    l = buildLevel(stage);
    cache.set(stage, l);
  }
  return l;
}
