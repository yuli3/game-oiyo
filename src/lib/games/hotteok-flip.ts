/**
 * 호떡 뒤집기 (Hotteok Flip) — an OIYO original winter street-food physics game.
 * Hotteok sizzle on the griddle. Flick one upward with your finger: flick near its edge and it spins,
 * flick near the middle and it just hops. Land it upside down when the bottom has turned golden, then,
 * once both sides are golden, flick it again to toss it onto the plate. Burn a side, land it on its
 * edge so the sugar syrup bursts out, or send it off the griddle, and that one is ruined.
 */

export const HOTTEOK_SLUG = "hotteok-flip";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 600;
export const HALF_W = 32;
export const THICK = 12;
export const SURFACE = 470; // griddle top (y)
export const GRAVITY = 1400;
export const GOLDEN = 1; // doneness where a side turns golden
export const GOLDEN_END = 1.5; // past this it is getting dark but still fine
export const BURNT = 1.8;
const SPLAT_DEG = 55;
const LAUNCH_MAX = 760;

export interface HotteokLevel {
  stage: number;
  slots: number[]; // x positions on the griddle
  count: number; // hotteok to serve
  rate: number; // doneness per second on the griddle
  hot: number; // index of a hot slot (cooks 1.5×) or -1
  pan: [number, number]; // griddle x range
  lives: number; // ruined hotteok allowed before the stage is lost
}

export type Fate = "cooking" | "air" | "served" | "ruined";

export interface Hotteok {
  id: number;
  slot: number;
  x: number;
  y: number;
  angle: number; // 0 = side 0 down
  vx: number;
  vy: number;
  spin: number;
  cook: [number, number];
  fate: Fate;
  why: "" | "burnt" | "splat" | "dropped";
  t: number; // time in the current fate
}

export interface Griddle {
  level: HotteokLevel;
  time: number;
  cakes: Hotteok[];
  spawned: number;
  served: number;
  ruined: number;
  over: boolean;
  won: boolean;
}

export function buildLevel(stage: number): HotteokLevel {
  const slotsN = stage < 6 ? 1 : stage < 16 ? 2 : 3;
  const pan: [number, number] = [Math.min(70, 30 + stage * 1.5), Math.max(290, 330 - stage * 1.5)];
  const span = pan[1] - pan[0];
  const slots = Array.from({ length: slotsN }, (_, i) => Math.round(pan[0] + (span * (i + 0.5)) / slotsN));
  return {
    stage,
    slots,
    count: 3 + Math.floor(stage / 3),
    rate: 0.24 + stage * 0.008,
    hot: stage >= 20 ? stage % slotsN : -1,
    pan,
    lives: 3,
  };
}

export const LEVELS: HotteokLevel[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));

function spawn(g: Griddle, slot: number): void {
  const x = g.level.slots[slot];
  g.cakes.push({ id: g.spawned, slot, x, y: SURFACE - THICK / 2, angle: 0, vx: 0, vy: 0, spin: 0, cook: [0, 0], fate: "cooking", why: "", t: 0 });
  g.spawned++;
}

export function newGriddle(stage: number): Griddle {
  const g: Griddle = { level: LEVELS[stage], time: 0, cakes: [], spawned: 0, served: 0, ruined: 0, over: false, won: false };
  for (let s = 0; s < g.level.slots.length && g.spawned < g.level.count; s++) spawn(g, s);
  return g;
}

/** Which side is touching the griddle (0 or 1) for a resting angle. */
export function downSide(angle: number): 0 | 1 {
  const a = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.abs(a - Math.PI) < Math.PI / 2 ? 1 : 0;
}

export function isGolden(v: number): boolean {
  return v >= GOLDEN && v < BURNT;
}

export function readyToServe(h: Hotteok): boolean {
  return isGolden(h.cook[0]) && isGolden(h.cook[1]);
}

export type FlickResult = "none" | "served" | "flipped";

/**
 * Flick a resting hotteok. `offset` is where the finger was, from -1 (left edge) to 1 (right edge);
 * `vx`/`vy` is the finger's speed in px/s (vy negative = upward).
 */
export function flick(g: Griddle, id: number, offset: number, vx: number, vy: number): FlickResult {
  const h = g.cakes.find((c) => c.id === id);
  if (!h || h.fate !== "cooking" || g.over) return "none";
  if (vy > -120) return "none";
  if (readyToServe(h)) {
    h.fate = "served";
    h.t = 0;
    g.served++;
    return "served";
  }
  const up = Math.min(LAUNCH_MAX, -vy * 0.55);
  h.vy = -up;
  h.vx = Math.max(-160, Math.min(160, vx * 0.25));
  h.spin = -Math.max(-1, Math.min(1, offset)) * up * 0.022;
  h.fate = "air";
  h.t = 0;
  return "flipped";
}

export interface GriddleEvents { landed: number; ruined: number; served: number; spawned: number }

export function stepGriddle(g: Griddle, dt: number): GriddleEvents {
  const ev: GriddleEvents = { landed: 0, ruined: 0, served: 0, spawned: 0 };
  if (g.over) return ev;
  g.time += dt;
  const l = g.level;
  for (const h of g.cakes) {
    h.t += dt;
    if (h.fate === "cooking") {
      const side = downSide(h.angle);
      h.cook[side] += l.rate * (h.slot === l.hot ? 1.5 : 1) * dt;
      if (h.cook[side] >= BURNT) {
        h.fate = "ruined";
        h.why = "burnt";
        h.t = 0;
        g.ruined++;
        ev.ruined++;
      }
    } else if (h.fate === "air") {
      h.vy += GRAVITY * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.angle += h.spin * dt;
      if (h.vy > 0 && h.y >= SURFACE - THICK / 2) {
        h.y = SURFACE - THICK / 2;
        const a = ((h.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const flat = Math.abs(a - Math.PI) < Math.PI / 2 ? Math.PI : a > Math.PI ? 2 * Math.PI : 0;
        const dev = (Math.abs(a - flat) * 180) / Math.PI;
        h.angle = flat === Math.PI ? Math.PI : 0;
        h.vx = 0;
        h.vy = 0;
        h.spin = 0;
        h.t = 0;
        if (h.x < l.pan[0] || h.x > l.pan[1]) {
          h.fate = "ruined";
          h.why = "dropped";
          g.ruined++;
          ev.ruined++;
        } else if (dev > SPLAT_DEG) {
          h.fate = "ruined";
          h.why = "splat";
          g.ruined++;
          ev.ruined++;
        } else {
          h.fate = "cooking";
          ev.landed++;
        }
      }
    }
  }
  // freed slots get a fresh hotteok
  for (let s = 0; s < l.slots.length; s++) {
    const busy = g.cakes.some((h) => h.slot === s && (h.fate === "cooking" || h.fate === "air"));
    if (!busy && g.spawned < l.count) {
      spawn(g, s);
      ev.spawned++;
    }
  }
  ev.served = g.served;
  if (g.ruined >= l.lives) {
    g.over = true;
    g.won = false;
  } else if (g.served + g.ruined >= l.count && !g.cakes.some((h) => h.fate === "cooking" || h.fate === "air")) {
    g.over = true;
    g.won = g.served >= l.count - (l.lives - 1);
  }
  return ev;
}

export function starsFor(g: Griddle): number {
  return g.ruined === 0 ? 3 : g.ruined === 1 ? 2 : 1;
}

/**
 * Test pilot: serve when both sides are golden, flip when the bottom is a nice gold, using a flick
 * that lands upside down (edge offset 0.8, upward finger speed `speed`).
 */
export function pilotMoves(g: Griddle, speed = 640, aim = 1.2): Array<{ id: number; offset: number; vx: number; vy: number }> {
  const out: Array<{ id: number; offset: number; vx: number; vy: number }> = [];
  for (const h of g.cakes) {
    if (h.fate !== "cooking") continue;
    if (readyToServe(h)) {
      out.push({ id: h.id, offset: 0, vx: 0, vy: -500 });
      continue;
    }
    const side = downSide(h.angle);
    if (h.cook[side] >= aim) out.push({ id: h.id, offset: 0.8, vx: 0, vy: -speed });
  }
  return out;
}
