/**
 * 쥐불놀이 (Jwibul Spin) — an OIYO original take on the Korean first-full-moon fire game.
 * A child walks the dark winter paddies swinging a tin can of embers on a string. Drag to lead the
 * child; circle your finger and the can whirls around. Sweep the burning can through the dry grass
 * tufts to set them alight before the moon climbs too high, but keep it away from the haystacks
 * and straw roofs, and keep it whirling or the embers die. Every stage is checked by a scripted run.
 */

import { mulberry } from "./pixel-kit";

export const JWIBUL_SLUG = "jwibul-spin";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 560;
export const ROPE = 58;
export const TUFT_R = 16;
export const PIVOT_SPEED = 520; // the child walks at most this fast (px/s)
export const LIGHT_SPEED = 340; // the can must move this fast to light a tuft
export const EMBER_SPEED = 260; // below this the embers cool down

export interface Tuft { x: number; y: number; lit: boolean }
export interface Stack { x: number; y: number; r: number }

export interface JwibulLevel {
  stage: number;
  tufts: Array<{ x: number; y: number }>;
  stacks: Stack[];
  start: { x: number; y: number };
  wind: number; // extra spin lost per second to the night wind
  timeLimit: number;
  par: number; // scripted run's time
}

export interface JwibulState {
  level: JwibulLevel;
  pivot: { x: number; y: number };
  finger: null | { x: number; y: number };
  centre: { x: number; y: number }; // the finger's slow-moving middle: where the child walks
  fingerAngle: number | null;
  fingerSpin: number; // smoothed angular speed of the finger around the child (rad/s)
  angle: number; // the can's angle around the child
  omega: number; // its spin (rad/s)
  can: { x: number; y: number };
  speed: number;
  heat: number; // 0..1, the embers die at 0
  tufts: Tuft[];
  time: number;
  over: boolean;
  won: boolean;
  cause: "" | "stack" | "cold" | "time";
}

function inField(x: number, y: number, m = 0): boolean {
  return x > m && y > m && x < FIELD_W - m && y < FIELD_H - m;
}

export function newJwibul(level: JwibulLevel): JwibulState {
  const p = { ...level.start };
  return { level, pivot: p, finger: null, centre: { ...p }, fingerAngle: null, fingerSpin: 0, angle: Math.PI / 2, omega: 0, can: { x: p.x, y: p.y + ROPE }, speed: 0, heat: 1, tufts: level.tufts.map((t) => ({ ...t, lit: false })), time: 0, over: false, won: false, cause: "" };
}

/** Where the finger is (null when lifted). The child walks to the finger's middle; circling it spins the can. */
export function lead(s: JwibulState, x: number | null, y = 0): void {
  if (x === null) {
    s.finger = null;
    s.fingerAngle = null;
    s.fingerSpin = 0;
    return;
  }
  if (!s.finger) s.centre = { x: s.pivot.x, y: s.pivot.y };
  s.finger = { x: Math.max(4, Math.min(FIELD_W - 4, x)), y: Math.max(4, Math.min(FIELD_H - 4, y)) };
}

export type JwibulEvent = "light" | "stack" | "cold" | "time" | "win";

export function stepJwibul(s: JwibulState, dt: number): JwibulEvent[] {
  const ev: JwibulEvent[] = [];
  if (s.over) return ev;
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / n;
  // how fast the finger circles the child, measured once per frame and smoothed, so the
  // spin does not depend on how often the browser delivers pointer events
  const f0 = s.finger;
  if (f0 && Math.hypot(f0.x - s.pivot.x, f0.y - s.pivot.y) > 8) {
    const a = Math.atan2(f0.y - s.pivot.y, f0.x - s.pivot.x);
    if (s.fingerAngle !== null && dt > 0) {
      let da = a - s.fingerAngle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const raw = Math.max(-18, Math.min(18, da / dt));
      s.fingerSpin += (raw - s.fingerSpin) * Math.min(1, dt * 10);
    }
    s.fingerAngle = a;
  } else {
    s.fingerAngle = null;
    if (!f0) s.fingerSpin = 0;
  }
  const spin = s.fingerSpin;
  for (let k = 0; k < n && !s.over; k++) {
    s.time += h;
    const f = s.finger;
    if (f) {
      // the child walks toward the slow-moving middle of the finger's path
      s.centre.x += (f.x - s.centre.x) * Math.min(1, h * 2.5);
      s.centre.y += (f.y - s.centre.y) * Math.min(1, h * 2.5);
      const dx = s.centre.x - s.pivot.x;
      const dy = s.centre.y - s.pivot.y;
      const d = Math.hypot(dx, dy);
      const step = Math.min(d, PIVOT_SPEED * h);
      if (d > 0) {
        s.pivot.x += (dx / d) * step;
        s.pivot.y += (dy / d) * step;
      }
      // circling the finger around the child spins the can the same way
      if (Math.abs(spin) > Math.abs(s.omega) * 0.6 || Math.sign(spin) !== Math.sign(s.omega)) s.omega += (spin - s.omega) * Math.min(1, h * 4);
    }
    s.omega *= Math.exp(-(0.5 + s.level.wind) * h);
    s.angle += s.omega * h;
    s.can = { x: s.pivot.x + Math.cos(s.angle) * ROPE, y: s.pivot.y + Math.sin(s.angle) * ROPE };
    s.speed = Math.abs(s.omega) * ROPE;
    // embers glow while whirling and cool when slow
    if (s.speed >= EMBER_SPEED) s.heat = Math.min(1, s.heat + h * 0.6);
    else if (s.time > 2.5) s.heat -= h * (0.2 + s.level.stage * 0.004);
    if (s.heat <= 0) {
      s.heat = 0;
      s.over = true;
      s.cause = "cold";
      ev.push("cold");
      break;
    }
    if (s.speed >= LIGHT_SPEED) {
      for (const t of s.tufts) {
        if (t.lit) continue;
        if (Math.hypot(t.x - s.can.x, t.y - s.can.y) < TUFT_R + 6) {
          t.lit = true;
          ev.push("light");
        }
      }
    }
    for (const st of s.level.stacks) {
      if (Math.hypot(st.x - s.can.x, st.y - s.can.y) < st.r + 5) {
        s.over = true;
        s.cause = "stack";
        ev.push("stack");
        break;
      }
    }
    if (s.over) break;
    if (s.tufts.every((t) => t.lit)) {
      s.over = true;
      s.won = true;
      ev.push("win");
      break;
    }
    if (s.time > s.level.timeLimit) {
      s.over = true;
      s.cause = "time";
      ev.push("time");
    }
  }
  return ev;
}

const CELL = 10;
const GW = Math.ceil(FIELD_W / CELL);
const GH = Math.ceil(FIELD_H / CELL);

/** Cells where a whirling child can stand without the can sweeping a stack. */
function freeCells(level: JwibulLevel, clear: number): Uint8Array {
  const g = new Uint8Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const px = x * CELL + CELL / 2;
    const py = y * CELL + CELL / 2;
    if (!inField(px, py, 14)) continue;
    if (level.stacks.some((st) => Math.hypot(st.x - px, st.y - py) < st.r + clear)) continue;
    g[y * GW + x] = 1;
  }
  return g;
}

/** Breadth-first path over free cells from `a` to the nearest of `goals`. */
function route(g: Uint8Array, a: { x: number; y: number }, goals: Set<number>): Array<{ x: number; y: number }> | null {
  const start = Math.min(GH - 1, Math.max(0, Math.floor(a.y / CELL))) * GW + Math.min(GW - 1, Math.max(0, Math.floor(a.x / CELL)));
  const from = new Int32Array(GW * GH).fill(-2);
  from[start] = -1;
  const q = [start];
  for (let h = 0; h < q.length; h++) {
    const c = q[h];
    if (goals.has(c)) {
      const path: Array<{ x: number; y: number }> = [];
      for (let k = c; k !== -1; k = from[k]) path.push({ x: (k % GW) * CELL + CELL / 2, y: Math.floor(k / GW) * CELL + CELL / 2 });
      return path.reverse();
    }
    const cx = c % GW;
    const cy = Math.floor(c / GW);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const n = ny * GW + nx;
      if (from[n] !== -2 || (!g[n] && c !== start)) continue;
      from[n] = c;
      q.push(n);
    }
  }
  return null;
}

/**
 * Scripted player: it walks a centre point along a clear path to a spot one rope length from the
 * nearest unlit tuft and circles the finger around that centre. `jitter` (0..1) makes the circle
 * wobblier and the walk slower, like a human hand.
 */
export function playScript(level: JwibulLevel, jitter: number, seed: number, maxTime = 200): JwibulState {
  const s = newJwibul({ ...level, timeLimit: Math.min(level.timeLimit, maxTime) });
  const rng = mulberry(seed);
  const dt = 1 / 60;
  const R = 20 + jitter * 8;
  const omega = 9.5 - jitter * 2.5;
  const reach = ROPE + R * 0.4;
  const grid = freeCells(level, ROPE + 16);
  let phase = 0;
  const centre = { ...s.pivot };
  let path: Array<{ x: number; y: number }> = [];
  let goal: Tuft | null = null;
  let wob = 0;
  while (!s.over) {
    if (!goal || goal.lit) {
      // plan to the nearest reachable unlit tuft
      const left = s.tufts.filter((t) => !t.lit);
      const goals = new Map<number, Tuft>();
      for (const t of left) for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const x = t.x + Math.cos(a) * reach;
        const y = t.y + Math.sin(a) * reach;
        const gx = Math.floor(x / CELL);
        const gy = Math.floor(y / CELL);
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
        if (grid[gy * GW + gx] && !goals.has(gy * GW + gx)) goals.set(gy * GW + gx, t);
      }
      const p = route(grid, centre, new Set(goals.keys()));
      if (!p) break;
      const end = p[p.length - 1];
      goal = goals.get(Math.floor(end.y / CELL) * GW + Math.floor(end.x / CELL)) ?? null;
      path = p;
    }
    let walk = (150 - jitter * 40) * dt;
    while (walk > 0 && path.length) {
      const w = path[0];
      const d = Math.hypot(w.x - centre.x, w.y - centre.y);
      if (d <= walk) {
        centre.x = w.x;
        centre.y = w.y;
        walk -= d;
        path.shift();
      } else {
        centre.x += ((w.x - centre.x) / d) * walk;
        centre.y += ((w.y - centre.y) / d) * walk;
        walk = 0;
      }
    }
    if (!path.length && goal && !goal.lit) {
      // circle a little closer until the can catches the tuft
      const d = Math.hypot(goal.x - centre.x, goal.y - centre.y);
      if (d > ROPE * 0.8) {
        centre.x += ((goal.x - centre.x) / d) * 20 * dt;
        centre.y += ((goal.y - centre.y) / d) * 20 * dt;
      }
    }
    wob += (rng() - 0.5) * jitter * 4 * dt;
    phase += (omega + wob) * dt;
    lead(s, centre.x + Math.cos(phase) * R * (1 + (rng() - 0.5) * jitter * 0.3), centre.y + Math.sin(phase) * R);
    stepJwibul(s, dt);
  }
  return s;
}

function shape(stage: number): { tufts: number; stacks: number; wind: number; slack: number } {
  return {
    tufts: Math.min(10, 3 + Math.floor(stage / 4)),
    stacks: stage < 3 ? 0 : Math.min(5, 1 + Math.floor((stage - 3) / 5)),
    wind: stage >= 20 ? 0.15 + (stage - 20) * 0.04 : 0,
    slack: Math.max(1.45, 2.2 - stage * 0.025),
  };
}

export function buildLevel(stage: number): JwibulLevel {
  const sh = shape(stage);
  const rng = mulberry(5200 + stage * 53);
  for (let attempt = 0; attempt < 500; attempt++) {
    const stacks: Stack[] = [];
    for (let k = 0; k < sh.stacks; k++) {
      for (let tries = 0; tries < 50; tries++) {
        const st = { x: 50 + rng() * 260, y: 70 + rng() * 360, r: 16 + Math.floor(rng() * 8) };
        if (stacks.some((o) => Math.hypot(o.x - st.x, o.y - st.y) < 110)) continue;
        if (Math.hypot(st.x - 180, st.y - 480) < 120) continue;
        stacks.push(st);
        break;
      }
    }
    const tufts: Array<{ x: number; y: number }> = [];
    for (let k = 0; k < sh.tufts; k++) {
      for (let tries = 0; tries < 80; tries++) {
        const t = { x: 40 + rng() * 280, y: 50 + rng() * 380 };
        if (!inField(t.x, t.y, 30)) continue;
        if (tufts.some((o) => Math.hypot(o.x - t.x, o.y - t.y) < 60)) continue;
        if (stacks.some((o) => Math.hypot(o.x - t.x, o.y - t.y) < o.r + 46)) continue;
        tufts.push(t);
        break;
      }
    }
    if (tufts.length < sh.tufts) continue;
    const base: JwibulLevel = { stage, tufts, stacks, start: { x: 180, y: 480 }, wind: sh.wind, timeLimit: 999, par: 0 };
    // the stage is kept only if the scripted player clears it, steady and a little wobbly
    const run = playScript(base, 0, 1);
    if (!run.won) continue;
    if (![[0.3, 7], [0.5, 8], [0.6, 9]].every(([j, sd]) => playScript({ ...base, timeLimit: Math.ceil(run.time * sh.slack + 4) }, j, sd).won)) continue;
    const par = Math.ceil(run.time);
    return { ...base, par, timeLimit: Math.ceil(run.time * sh.slack + 4) };
  }
  throw new Error(`no jwibul level for stage ${stage}`);
}

const cache = new Map<number, JwibulLevel>();
/** Levels are checked by a scripted run, so build each one only when it is first played. */
export function levelFor(stage: number): JwibulLevel {
  let l = cache.get(stage);
  if (!l) {
    l = buildLevel(stage);
    cache.set(stage, l);
  }
  return l;
}

export function starsFor(s: JwibulState): number {
  if (!s.won) return 0;
  if (s.time <= s.level.par * 1.25 + 2) return 3;
  if (s.time <= s.level.par * 1.7 + 4) return 2;
  return 1;
}
