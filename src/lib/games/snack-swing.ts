/**
 * Snack Swing (간식 그네) — an OIYO original rope-snipping physics puzzle (2026-11-25).
 *
 * A cookie hangs from a few ropes over a hungry hamster. Tap a rope to snip it: the cookie swings on whatever ropes
 * are left, and drops when the last one goes. Time the snips so it lands in the hamster's mouth, picking up the three
 * sparkles on the way and keeping clear of the thorns.
 *
 * Pure and deterministic: fixed 1/120 s steps, every stage built from a planned run of snips (seeded per stage), so
 * each stage can always be done. Field px, y pointing down.
 */

export const SNACK_SLUG = "snack-swing";
export const STAGE_COUNT = 30;
export const GRAVITY = 900;
export const SNACK_R = 14;
export const MOUTH_R = 24;
export const SPARKLE_R = 20;
export const THORN_R = 16;
export const DT = 1 / 120;
export const TAP_R = 18; // how close a tap has to be to a rope to snip it

export interface Rope { ax: number; ay: number; len: number }
export interface SnackStage {
  stage: number;
  start: [number, number];
  ropes: Rope[];
  mouth: [number, number];
  sparkles: Array<[number, number]>;
  thorns: Array<[number, number]>;
  plan: Array<{ t: number; rope: number }>; // snips that work
}

export interface Swing {
  stage: SnackStage;
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  cut: boolean[];
  got: boolean[];
  sparkles: number;
  over: boolean;
  won: boolean;
}

export function newSwing(stage: SnackStage): Swing {
  return { stage, t: 0, x: stage.start[0], y: stage.start[1], vx: 0, vy: 0, cut: stage.ropes.map(() => false), got: stage.sparkles.map(() => false), sparkles: 0, over: false, won: false };
}

/** Snips rope k. */
export function snip(s: Swing, k: number): boolean {
  if (s.over || k < 0 || k >= s.cut.length || s.cut[k]) return false;
  s.cut[k] = true;
  return true;
}

/** Distance from (px, py) to the segment a–b. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l = dx * dx + dy * dy;
  const k = l === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
}

/** The rope a tap at (x, y) would snip (the nearest within reach), or −1. */
export function ropeAt(s: Swing, x: number, y: number): number {
  let best = -1;
  let bestD = TAP_R;
  s.stage.ropes.forEach((r, k) => {
    if (s.cut[k]) return;
    const d = segDist(x, y, r.ax, r.ay, s.x, s.y);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  });
  return best;
}

export type StepEvent = { sparkle: boolean };

export function step(s: Swing): StepEvent {
  const ev: StepEvent = { sparkle: false };
  if (s.over) return ev;
  s.t += DT;
  s.vy += GRAVITY * DT;
  s.x += s.vx * DT;
  s.y += s.vy * DT;
  // ropes are taut at most their length: pull back inside and drop the outward speed
  for (let pass = 0; pass < 3; pass++) {
    s.stage.ropes.forEach((r, k) => {
      if (s.cut[k]) return;
      const dx = s.x - r.ax;
      const dy = s.y - r.ay;
      const d = Math.hypot(dx, dy);
      if (d <= r.len || d === 0) return;
      const nx = dx / d;
      const ny = dy / d;
      s.x = r.ax + nx * r.len;
      s.y = r.ay + ny * r.len;
      const out = s.vx * nx + s.vy * ny;
      if (out > 0) {
        s.vx -= out * nx;
        s.vy -= out * ny;
      }
    });
  }
  // a little air drag so swings settle
  s.vx *= 0.9995;
  s.vy *= 0.9995;
  s.stage.sparkles.forEach(([x, y], k) => {
    if (s.got[k] || Math.hypot(s.x - x, s.y - y) > SPARKLE_R + SNACK_R * 0.5) return;
    s.got[k] = true;
    s.sparkles++;
    ev.sparkle = true;
  });
  const [mx, my] = s.stage.mouth;
  if (Math.hypot(s.x - mx, s.y - my) < MOUTH_R) {
    s.over = true;
    s.won = true;
  } else if (s.stage.thorns.some(([x, y]) => Math.hypot(s.x - x, s.y - y) < THORN_R + SNACK_R) || s.y > 620 || s.x < -40 || s.x > 400 || s.t > 30) s.over = true;
  return ev;
}

export function starsFor(s: Swing): number {
  if (!s.won) return 0;
  return Math.max(1, s.sparkles);
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface SnipperOpts {
  /** spread (seconds) of each snip's timing */
  timing?: number;
  seed?: number;
  mode?: "plan" | "random";
}

/** Plays a stage: the plan's snips (with a timing spread), or snips at random. */
export function pilot(st: SnackStage, opts: SnipperOpts = {}): Swing {
  const { timing = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 3373 + 29);
  const s = newSwing(st);
  const snips = mode === "random" ? st.ropes.map((_, k) => ({ t: 0.3 + rng() * 3, rope: k })).sort((a, b) => a.t - b.t) : st.plan.map((p) => ({ t: Math.max(0.05, p.t + gauss(rng) * timing), rope: p.rope })).sort((a, b) => a.t - b.t);
  let k = 0;
  while (!s.over) {
    while (k < snips.length && s.t >= snips[k].t) snip(s, snips[k++].rope);
    step(s);
  }
  return s;
}

function shape(stage: number) {
  return {
    ropes: stage < 2 ? 1 : stage < 12 ? 2 : 3,
    thorns: stage < 6 ? 0 : Math.min(4, 1 + Math.floor((stage - 6) / 6)),
  };
}

/** Human-like snippers: each snip a few hundredths of a second early or late. */
export const HUMAN_SNIPPERS: SnipperOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ timing: 0.05, seed }));

/** Records a run's path, every step. */
function trace(st: SnackStage, plan: Array<{ t: number; rope: number }>): Array<[number, number, number]> {
  const s = newSwing({ ...st, mouth: [-999, -999], sparkles: [], thorns: [], plan });
  const path: Array<[number, number, number]> = [];
  let k = 0;
  while (!s.over) {
    while (k < plan.length && s.t >= plan[k].t) snip(s, plan[k++].rope);
    step(s);
    path.push([s.t, s.x, s.y]);
  }
  return path;
}

export function buildStage(stage: number): SnackStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 400; attempt++) {
    const rng = mulberry(651000 + stage * 433 + attempt * 7919);
    const start: [number, number] = [Math.round(110 + rng() * 140), Math.round(170 + rng() * 60)];
    const ropes: Rope[] = [];
    for (let k = 0; k < sh.ropes; k++) {
      const ax = Math.round(30 + rng() * 300);
      const ay = Math.round(70 + rng() * 60);
      const len = Math.round(Math.hypot(start[0] - ax, start[1] - ay) * (k === 0 ? 1 : 1 + rng() * 0.25));
      if (len < 60 || len > 300) continue;
      ropes.push({ ax, ay, len });
    }
    if (ropes.length < sh.ropes) continue;
    // the plan: snip the ropes one by one, a little apart; the first ones let it swing, the last lets it drop
    const order = ropes.map((_, k) => k);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    let t = 0.6 + rng() * 0.6;
    const plan = order.map((rope) => {
      const p = { t: Math.round(t * 100) / 100, rope };
      t += 0.5 + rng() * 1.2;
      return p;
    });
    const base: SnackStage = { stage, start, ropes, mouth: [0, 0], sparkles: [], thorns: [], plan };
    const path = trace(base, plan);
    // the hamster sits where the cookie falls through the lower part of the screen, after the last snip
    const lastT = plan[plan.length - 1].t;
    const fall = path.find(([pt, , py]) => pt > lastT + 0.15 && py > 420 && py < 500);
    if (!fall) continue;
    const mouth: [number, number] = [Math.round(fall[1]), Math.round(fall[2])];
    if (mouth[0] < 40 || mouth[0] > 320) continue;
    // three sparkles along the way: the cookie's path, spread out in time
    const until = path.filter(([pt]) => pt < fall[0] - 0.1);
    if (until.length < 60) continue;
    const sparkles: Array<[number, number]> = [0.3, 0.6, 0.85].map((q) => {
      const p = until[Math.floor(until.length * q)];
      return [Math.round(p[1]), Math.round(p[2])] as [number, number];
    });
    if (sparkles.some(([x, y]) => Math.hypot(x - mouth[0], y - mouth[1]) < 60)) continue;
    // thorns away from the planned path, where a badly timed snip may send the cookie
    const thorns: Array<[number, number]> = [];
    let g = 0;
    while (thorns.length < sh.thorns && g++ < 200) {
      const x = Math.round(30 + rng() * 300);
      const y = Math.round(220 + rng() * 260);
      if (path.some(([, px, py]) => Math.hypot(px - x, py - y) < THORN_R + SNACK_R + 34)) continue;
      if (Math.hypot(x - mouth[0], y - mouth[1]) < 70) continue;
      thorns.push([x, y]);
    }
    if (thorns.length < sh.thorns) continue;
    const st: SnackStage = { stage, start, ropes, mouth, sparkles, thorns, plan };
    const planned = pilot(st, { mode: "plan" });
    if (!planned.won || planned.sparkles < 3) continue;
    if (HUMAN_SNIPPERS.some((o) => !pilot(st, o).won)) continue;
    // snipping at random times almost never feeds the hamster
    if (Array.from({ length: 30 }, (_, k) => k + 1).filter((seed) => pilot(st, { mode: "random", seed }).won).length > (stage < 6 ? 3 : 1)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`snack-swing stage ${stage + 1}: no fair set-up`);
}

export const SNACK_STAGES: SnackStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
