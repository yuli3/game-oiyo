/**
 * Bridge Walk (다리밟기) — cross the frosty bridges of the first full moon without falling in.
 *
 * On the night of Jeongwol Daeboreum people walked across bridges so their legs would stay strong
 * all year (twelve bridges, one for each month). Our walker crosses icy village bridges in the moonlight and keeps
 * walking on their own; you keep them upright. They tip like an upside-down pendulum, and gusts of
 * wind and slick patches of ice push them over. Drag left or right from where you touched to lean the
 * other way: a small drag is a small correction. Over-correct and you tip the other way; lean too far
 * and you fall in. Reach the far bank.
 *
 * Pure and deterministic: the wind is seeded per stage.
 */

export const BRIDGE_SLUG = "bridge-walk";
export const STAGE_COUNT = 30;
export const FALL = 0.62; // radians of lean that tips the walker off
export const DAMP = 1.2; // the walker's own damping (per second)
export const U_MAX = 6; // strongest correction (rad/s²) at full drag
export const DRAG_FULL = 70; // px of drag for a full correction
export const SPEED = 1.4; // m/s walking pace

export interface Gust { at: number; len: number; push: number } // starts at `at` s, lasts `len` s, push in rad/s²
export interface Ice { from: number; to: number } // metres along the walk where the planks are icy
export interface BridgeStage {
  stage: number;
  length: number; // m to walk
  gravity: number; // how fast a lean grows (rad/s² per rad)
  iceGravity: number; // on icy planks
  gusts: Gust[];
  ice: Ice[];
}

export interface Walker {
  stage: BridgeStage;
  t: number;
  x: number; // metres walked
  lean: number; // radians, + to the right
  spin: number; // lean rate
  push: number; // current correction (rad/s²) from the drag
  maxLean: number;
  sumLean: number;
  over: boolean;
  won: boolean;
  fell: boolean;
}

export function onIce(stage: BridgeStage, x: number): boolean {
  return stage.ice.some((i) => x >= i.from && x < i.to);
}

export function windAt(stage: BridgeStage, t: number): number {
  let w = 0;
  for (const g of stage.gusts) {
    if (t >= g.at && t < g.at + g.len) w += g.push * Math.sin((Math.PI * (t - g.at)) / g.len);
  }
  return w;
}

export function newWalker(stage: BridgeStage): Walker {
  return { stage, t: 0, x: 0, lean: 0.02, spin: 0, push: 0, maxLean: 0, sumLean: 0, over: false, won: false, fell: false };
}

/** Sets the correction from how far the finger is dragged from where it touched (px, + right). */
export function setDrag(w: Walker, dx: number): void {
  // dragging right leans the walker left (like shifting your weight against the tip)
  w.push = -U_MAX * Math.max(-1, Math.min(1, dx / DRAG_FULL));
}

export function stepWalker(w: Walker, dt: number): boolean {
  if (w.over) return false;
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / n;
  for (let k = 0; k < n; k++) {
    const g = onIce(w.stage, w.x) ? w.stage.iceGravity : w.stage.gravity;
    const a = g * Math.sin(w.lean) - DAMP * w.spin + w.push + windAt(w.stage, w.t);
    w.spin += a * h;
    w.lean += w.spin * h;
    w.t += h;
    w.x += SPEED * h;
    w.maxLean = Math.max(w.maxLean, Math.abs(w.lean));
    w.sumLean += Math.abs(w.lean) * h;
    if (Math.abs(w.lean) > FALL) {
      w.over = true;
      w.fell = true;
      return true;
    }
    if (w.x >= w.stage.length) {
      w.over = true;
      w.won = true;
      return true;
    }
  }
  return false;
}

/** Stars for a steady walk: the average lean over the crossing. */
export function starsFor(w: Walker): number {
  if (!w.won) return 0;
  const avg = w.sumLean / Math.max(1e-6, w.t);
  if (avg <= 0.09) return 3;
  if (avg <= 0.14) return 2;
  return 1;
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

export interface PilotOpts {
  /** s between what the pilot sees and what its finger does */
  lag?: number;
  /** drag px per radian of lean, and per rad/s of lean rate */
  kp?: number;
  kd?: number;
  /** ± share of error on each correction, redrawn every 0.25 s */
  wobble?: number;
  /** "pd" balances; "none" never drags; "bang" slams full left or right */
  mode?: "pd" | "none" | "bang";
  seed?: number;
}

/** Autopilot: drags against the lean and how fast it is growing, seen `lag` seconds late. */
export function pilot(stage: BridgeStage, opts: PilotOpts = {}): Walker {
  const { lag = 0, kp = 260, kd = 90, wobble = 0, mode = "pd", seed = 1 } = opts;
  const rng = mulberry(seed);
  const w = newWalker(stage);
  const dt = 1 / 60;
  const seen: number[] = [];
  const delay = Math.round(lag / dt);
  let err = 0;
  let redraw = 0;
  while (!w.over && w.t < 600) {
    if ((redraw -= dt) <= 0) {
      err = (rng() - 0.5) * 2 * wobble;
      redraw = 0.25;
    }
    let dx = 0;
    if (mode === "pd") dx = (kp * w.lean + kd * w.spin) * (1 + err);
    else if (mode === "bang") dx = w.lean > 0 ? DRAG_FULL : -DRAG_FULL;
    seen.push(dx);
    setDrag(w, seen.length > delay ? seen[seen.length - 1 - delay] : 0);
    stepWalker(w, dt);
  }
  return w;
}

function shape(stage: number) {
  return {
    length: 30 + stage * 1.2,
    gravity: 2.5 + stage * 0.07,
    iceExtra: 1 + stage * 0.04,
    gustEvery: Math.max(1.6, 3.4 - stage * 0.06),
    gustPush: 1.8 + stage * 0.09,
    icePatches: 1 + Math.floor(stage / 5),
  };
}

function layout(stage: number, gustScale: number): BridgeStage {
  const sh = shape(stage);
  const rng = mulberry(7100 + stage * 29);
  const gusts: Gust[] = [];
  const total = sh.length / SPEED;
  let t = 1.5;
  while (t < total) {
    const side = rng() < 0.5 ? -1 : 1;
    gusts.push({ at: t, len: 0.6 + rng() * 0.9, push: side * sh.gustPush * gustScale * (0.6 + rng() * 0.6) });
    t += sh.gustEvery * (0.7 + rng() * 0.6);
  }
  const ice: Ice[] = [];
  for (let i = 0; i < sh.icePatches; i++) {
    const from = 4 + ((i + rng() * 0.6) * (sh.length - 8)) / sh.icePatches;
    ice.push({ from, to: Math.min(sh.length - 1, from + 2 + rng() * 2.5) });
  }
  return { stage, length: sh.length, gravity: sh.gravity, iceGravity: sh.gravity + sh.iceExtra, gusts, ice };
}

const humanWins = (st: BridgeStage) => [3, 7, 11, 19, 23, 29].every((seed) => pilot(st, { lag: 0.18, wobble: 0.3, seed }).won);

export function buildStage(stage: number): BridgeStage {
  // the wind is as strong as the stage asks for, but never so strong that a human balancing 0.18 s
  // late (and ±30 % off on each correction) falls in; then 10 % gentler than that edge for room
  if (humanWins(layout(stage, 1))) return layout(stage, 1);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (humanWins(layout(stage, mid))) lo = mid;
    else hi = mid;
  }
  return layout(stage, lo * 0.9);
}

export const BRIDGE_STAGES: BridgeStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
