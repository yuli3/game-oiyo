/**
 * 팽이 씨름 (Spin Sumo) — an OIYO original one-button top-fighting game.
 * Hold to charge while the aim arrow sweeps around your top, let go to dash.
 * Knock the other top out of the ring or outlast its spin. 12 arenas against the
 * computer, or two players on one phone (each takes a half of the screen).
 */
import { mulberry32 } from "./daily";

export const SUMO_SLUG = "spin-sumo";
export const ARENA_COUNT = 12;
export const TOP_R = 17;
export const ROUND_LIMIT = 40; // seconds; then the ring starts to shrink
export const WINS_NEEDED = 2; // best of three

export interface Bumper { x: number; y: number; r: number }
export interface Pit { x: number; y: number; r: number }

export interface Arena {
  id: string;
  radius: number;
  friction: number; // velocity decay per second
  bumpers: Bumper[];
  pits: Pit[];
  wind: number; // constant push along +x (px/s²)
  swirl: number; // tangential drift (px/s²)
  shrink: number; // px per second from the start
  cpu: { tolerance: number; delay: number; charge: number; dodge: number };
}

export const ARENAS: readonly Arena[] = [
  { id: "yard", radius: 160, friction: 1.1, bumpers: [], pits: [], wind: 0, swirl: 0, shrink: 0, cpu: { tolerance: 0.55, delay: 0.9, charge: 0.45, dodge: 0 } },
  { id: "crocks", radius: 160, friction: 1.1, bumpers: [{ x: -70, y: 0, r: 22 }, { x: 70, y: 0, r: 22 }], pits: [], wind: 0, swirl: 0, shrink: 0, cpu: { tolerance: 0.45, delay: 0.8, charge: 0.5, dodge: 0.1 } },
  { id: "pond", radius: 160, friction: 0.35, bumpers: [], pits: [], wind: 0, swirl: 0, shrink: 0, cpu: { tolerance: 0.4, delay: 0.75, charge: 0.5, dodge: 0.15 } },
  { id: "mat", radius: 125, friction: 1.1, bumpers: [], pits: [], wind: 0, swirl: 0, shrink: 0, cpu: { tolerance: 0.35, delay: 0.7, charge: 0.55, dodge: 0.2 } },
  { id: "pillars", radius: 165, friction: 1.0, bumpers: [{ x: -60, y: -60, r: 18 }, { x: 60, y: -60, r: 18 }, { x: -60, y: 60, r: 18 }, { x: 60, y: 60, r: 18 }], pits: [], wind: 0, swirl: 0, shrink: 0, cpu: { tolerance: 0.32, delay: 0.65, charge: 0.6, dodge: 0.25 } },
  { id: "shrinking", radius: 170, friction: 1.0, bumpers: [], pits: [], wind: 0, swirl: 0, shrink: 2.2, cpu: { tolerance: 0.3, delay: 0.6, charge: 0.6, dodge: 0.3 } },
  { id: "windy", radius: 160, friction: 0.9, bumpers: [], pits: [], wind: 26, swirl: 0, shrink: 0, cpu: { tolerance: 0.28, delay: 0.55, charge: 0.62, dodge: 0.3 } },
  { id: "holes", radius: 165, friction: 1.0, bumpers: [], pits: [{ x: -55, y: -20, r: 20 }, { x: 55, y: 20, r: 20 }], wind: 0, swirl: 0, shrink: 0, cpu: { tolerance: 0.26, delay: 0.5, charge: 0.65, dodge: 0.35 } },
  { id: "icepillars", radius: 165, friction: 0.35, bumpers: [{ x: -75, y: 0, r: 20 }, { x: 75, y: 0, r: 20 }], pits: [], wind: 0, swirl: 0, shrink: 0, cpu: { tolerance: 0.24, delay: 0.45, charge: 0.68, dodge: 0.4 } },
  { id: "turntable", radius: 165, friction: 0.9, bumpers: [], pits: [], wind: 0, swirl: 34, shrink: 0, cpu: { tolerance: 0.22, delay: 0.4, charge: 0.7, dodge: 0.45 } },
  { id: "iceshrink", radius: 175, friction: 0.4, bumpers: [], pits: [], wind: 0, swirl: 0, shrink: 2.6, cpu: { tolerance: 0.2, delay: 0.35, charge: 0.72, dodge: 0.5 } },
  { id: "champion", radius: 175, friction: 0.8, bumpers: [{ x: 0, y: 0, r: 16 }], pits: [{ x: -80, y: 50, r: 18 }, { x: 80, y: -50, r: 18 }], wind: 0, swirl: 18, shrink: 1.6, cpu: { tolerance: 0.18, delay: 0.3, charge: 0.75, dodge: 0.55 } },
];

export interface Top {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number; // 1 = full, 0 = topples
  angle: number; // aim arrow angle (radians)
  charging: number; // seconds held, 0 when not holding
  out: boolean;
  wobble: number;
}

export interface World {
  arena: number;
  tops: [Top, Top];
  time: number;
  radius: number;
  rng: number; // seed for the cpu
  cpuWait: number;
}

export type Hold = [boolean, boolean];

export interface StepEvents { dash: number[]; hit: number; out: number[] }

export const AIM_SPEED = Math.PI * 2 * 0.7; // radians per second while holding
/** Power swings 0 → 1 → 0 every POWER_PERIOD seconds while you hold. */
export const POWER_PERIOD = 1.3;
export const MIN_DASH = 80;
export const MAX_DASH = 300;

export function newRound(arena: number, seed = 1): World {
  const a = ARENAS[Math.max(0, Math.min(ARENA_COUNT - 1, arena))];
  const d = a.radius * 0.55;
  const rng = mulberry32(seed * 977 + arena);
  const top = (y: number, angle: number): Top => ({ x: (rng() - 0.5) * 24, y, vx: 0, vy: 0, spin: 1, angle: angle + (rng() - 0.5) * 0.6, charging: 0, out: false, wobble: 0 });
  return { arena, tops: [top(d, -Math.PI / 2), top(-d, Math.PI / 2)], time: 0, radius: a.radius, rng: seed, cpuWait: 0 };
}

export function arenaOf(w: World): Arena {
  return ARENAS[w.arena];
}

/** Power of a dash released after holding for `held` seconds (a 0→1→0 swing). */
export function powerOf(held: number): number {
  const phase = (held / (POWER_PERIOD / 2)) % 2;
  return phase <= 1 ? phase : 2 - phase;
}

export function dashSpeed(power: number): number {
  return MIN_DASH + (MAX_DASH - MIN_DASH) * Math.max(0, Math.min(1, power));
}

/** Advances the world. `hold[i]` is whether player i is holding their button. */
export function step(w: World, hold: Hold, dt: number): { world: World; events: StepEvents } {
  const a = arenaOf(w);
  const events: StepEvents = { dash: [], hit: 0, out: [] };
  if (w.tops.some((t) => t.out)) return { world: w, events };
  const time = w.time + dt;
  const radius = Math.max(70, a.radius - a.shrink * time - (time > ROUND_LIMIT ? (time - ROUND_LIMIT) * 6 : 0));
  const tops = w.tops.map((t) => ({ ...t })) as [Top, Top];
  tops.forEach((t, i) => {
    if (hold[i]) {
      if (t.charging === 0) t.charging = 0.0001;
      t.charging += dt;
      t.angle += AIM_SPEED * dt;
    } else if (t.charging > 0) {
      const sp = dashSpeed(powerOf(t.charging));
      t.vx += Math.cos(t.angle) * sp;
      t.vy += Math.sin(t.angle) * sp;
      t.spin -= 0.035;
      t.charging = 0;
      events.dash.push(i);
    }
    // forces
    t.vx += a.wind * dt;
    if (a.swirl) {
      const r = Math.hypot(t.x, t.y) || 1;
      t.vx += (-t.y / r) * a.swirl * dt;
      t.vy += (t.x / r) * a.swirl * dt;
    }
    const decay = Math.exp(-a.friction * dt);
    t.vx *= decay;
    t.vy *= decay;
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    t.spin -= dt * 0.012;
    t.wobble = Math.max(0, t.wobble - dt * 2);
  });
  // top vs top
  const [p, q] = tops;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < TOP_R * 2 && dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = TOP_R * 2 - dist;
    const mp = 1 + Math.max(0, p.spin);
    const mq = 1 + Math.max(0, q.spin);
    p.x -= nx * overlap * (mq / (mp + mq));
    p.y -= ny * overlap * (mq / (mp + mq));
    q.x += nx * overlap * (mp / (mp + mq));
    q.y += ny * overlap * (mp / (mp + mq));
    const rel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
    if (rel > 0) {
      const e = 1.15; // springy tops
      const j = ((1 + e) * rel) / (1 / mp + 1 / mq);
      p.vx -= (j / mp) * nx;
      p.vy -= (j / mp) * ny;
      q.vx += (j / mq) * nx;
      q.vy += (j / mq) * ny;
      p.spin -= rel * 0.00018 * (mq / mp);
      q.spin -= rel * 0.00018 * (mp / mq);
      p.wobble = q.wobble = 0.5;
      events.hit = rel;
    }
  }
  // bumpers
  for (const t of tops) {
    for (const b of a.bumpers) {
      const bx = t.x - b.x;
      const by = t.y - b.y;
      const d = Math.hypot(bx, by);
      if (d < b.r + TOP_R && d > 0) {
        const nx = bx / d;
        const ny = by / d;
        t.x = b.x + nx * (b.r + TOP_R);
        t.y = b.y + ny * (b.r + TOP_R);
        const vn = t.vx * nx + t.vy * ny;
        if (vn < 0) {
          t.vx -= 1.7 * vn * nx;
          t.vy -= 1.7 * vn * ny;
          events.hit = Math.max(events.hit, -vn);
          t.wobble = 0.4;
        }
      }
    }
  }
  tops.forEach((t, i) => {
    const off = Math.hypot(t.x, t.y) > radius + TOP_R * 0.2;
    const pit = a.pits.some((h) => Math.hypot(t.x - h.x, t.y - h.y) < h.r - 2);
    if (off || pit || t.spin <= 0) { t.out = true; events.out.push(i); }
  });
  return { world: { ...w, tops, time, radius, cpuWait: Math.max(0, w.cpuWait - dt) }, events };
}

/** Index of the round winner, -1 for none yet, 2 for a double knockout. */
export function roundWinner(w: World): number {
  const [a, b] = w.tops;
  if (a.out && b.out) return 2;
  if (a.out) return 1;
  if (b.out) return 0;
  return -1;
}

function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * The computer's button for player `me`. It holds, then lets go when the arrow points
 * where it wants to go (at the rival, or back to the middle near the edge) and the
 * power swing is close to the dash length it needs on this floor.
 */
export function cpuHold(w: World, me: 0 | 1, skill = arenaOf(w).cpu): { hold: boolean; wait: number } {
  const a = arenaOf(w);
  const self = w.tops[me];
  const foe = w.tops[1 - me];
  if (self.charging === 0) {
    if (w.cpuWait > 0) return { hold: false, wait: w.cpuWait };
    return { hold: true, wait: 0 };
  }
  const rng = mulberry32(Math.floor(w.time * 7) * 31 + w.rng + me);
  const fromCenter = Math.hypot(self.x, self.y);
  let want: number;
  let travel: number;
  if (fromCenter > w.radius * 0.6 && rng() < 0.35 + skill.dodge) {
    want = Math.atan2(-self.y, -self.x);
    travel = fromCenter * 0.7;
  } else {
    want = Math.atan2(foe.y - self.y, foe.x - self.x);
    travel = Math.hypot(foe.x - self.x, foe.y - self.y) + 15 + 35 * skill.charge;
  }
  // never plan a dash that would carry it over the rim on its own
  const ux = Math.cos(want);
  const uy = Math.sin(want);
  const b = self.x * ux + self.y * uy;
  const c = self.x * self.x + self.y * self.y - w.radius * w.radius;
  const toEdge = -b + Math.sqrt(Math.max(0, b * b - c));
  travel = Math.min(travel, toEdge - 30 - (a.wind + a.swirl) * 0.6);
  for (let d = 10; d < travel; d += 8) {
    const px = self.x + ux * d;
    const py = self.y + uy * d;
    if ([...a.pits, ...a.bumpers].some((h) => Math.hypot(px - h.x, py - h.y) < h.r + TOP_R + 6)) { travel = d - 16; break; }
  }
  // distance covered by a dash is speed / friction
  const needed = (travel * a.friction - MIN_DASH) / (MAX_DASH - MIN_DASH);
  const target = Math.max(0.05, Math.min(1, needed));
  const aligned = Math.abs(angleDiff(self.angle, want)) < skill.tolerance;
  const powered = Math.abs(powerOf(self.charging) - target) < 0.12 + skill.tolerance * 0.3;
  if (aligned && powered) return { hold: false, wait: skill.delay * (0.6 + rng() * 0.8) };
  if (self.charging > POWER_PERIOD * 4) return { hold: false, wait: skill.delay };
  return { hold: true, wait: 0 };
}

export interface MatchScore { wins: [number, number] }

export function matchOver(score: MatchScore): number {
  if (score.wins[0] >= WINS_NEEDED) return 0;
  if (score.wins[1] >= WINS_NEEDED) return 1;
  return -1;
}
