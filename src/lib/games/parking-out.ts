/**
 * Parking Out (주차장 탈출) — an OIYO original traffic-escape puzzle (2026-11-24).
 *
 * Morning, and the car park is jammed. Every car can only drive straight ahead, the way it is facing. Tap a car and
 * it drives forward until it leaves the car park — or, if another car is in the way, it bumps it and stops where it
 * was. Three bumps and the attendant sends you away. Work out the order and get every car out.
 *
 * Pure and deterministic: every car park is seeded per stage.
 */

export const PARKING_SLUG = "parking-out";
export const STAGE_COUNT = 30;
export const MAX_BUMPS = 3;
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

/** A car: its rear square, which way it faces (0 up, 1 right, 2 down, 3 left), and its length in squares. */
export interface Car { x: number; y: number; dir: number; len: number; colour: number }
export interface ParkingStage {
  stage: number;
  w: number;
  h: number;
  cars: Car[];
  pillars: number[]; // squares (y × w + x) nothing can pass
  par: number; // seconds a quick solver takes
}

export interface Lot {
  stage: ParkingStage;
  out: boolean[];
  bumps: number;
  t: number;
  over: boolean;
  won: boolean;
}

export const newLot = (stage: ParkingStage): Lot => ({ stage, out: stage.cars.map(() => false), bumps: 0, t: 0, over: false, won: false });

/** The squares a car covers, rear to front. */
export function squares(c: Car): Array<[number, number]> {
  return Array.from({ length: c.len }, (_, k) => [c.x + DX[c.dir] * k, c.y + DY[c.dir] * k] as [number, number]);
}

function occupancy(st: ParkingStage, out: boolean[], except = -1): Set<number> {
  const occ = new Set<number>(st.pillars);
  st.cars.forEach((c, i) => {
    if (out[i] || i === except) return;
    for (const [x, y] of squares(c)) occ.add(y * st.w + x);
  });
  return occ;
}

/** The car in the way if this car drove ahead now (−1 for a pillar), or null if its road out is clear. */
export function blocker(st: ParkingStage, out: boolean[], i: number): number | null {
  const c = st.cars[i];
  const occ = occupancy(st, out, i);
  let [x, y] = squares(c)[c.len - 1];
  for (;;) {
    x += DX[c.dir];
    y += DY[c.dir];
    if (x < 0 || y < 0 || x >= st.w || y >= st.h) return null;
    if (occ.has(y * st.w + x)) {
      const j = st.cars.findIndex((d, k) => !out[k] && k !== i && squares(d).some(([a, b]) => a === x && b === y));
      return j;
    }
  }
}

export const canLeave = (st: ParkingStage, out: boolean[], i: number) => !out[i] && blocker(st, out, i) === null;

export type TapResult = "out" | "bump" | null;

export function tap(l: Lot, i: number): TapResult {
  if (l.over || i < 0 || i >= l.out.length || l.out[i]) return null;
  if (canLeave(l.stage, l.out, i)) {
    l.out[i] = true;
    if (l.out.every(Boolean)) {
      l.over = true;
      l.won = true;
    }
    return "out";
  }
  l.bumps++;
  if (l.bumps >= MAX_BUMPS) l.over = true;
  return "bump";
}

export function tick(l: Lot, dt: number): void {
  if (!l.over) l.t += dt;
}

export function starsFor(l: Lot): number {
  if (!l.won) return 0;
  if (l.bumps === 0 && l.t <= l.stage.par) return 3;
  if (l.bumps <= 1) return 2;
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

/** Fisher–Yates, the only shuffle used here. */
function shuffle<T>(xs: T[], rng: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Rounds needed to clear the lot taking every free car each round (the depth of the jam), or Infinity if it locks. */
export function depth(st: ParkingStage): number {
  const out = st.cars.map(() => false);
  let rounds = 0;
  while (!out.every(Boolean)) {
    const free = st.cars.map((_, i) => i).filter((i) => canLeave(st, out, i));
    if (!free.length) return Infinity;
    for (const i of free) out[i] = true;
    rounds++;
  }
  return rounds;
}

export interface DriverOpts {
  /** chance of tapping a car without checking its road first */
  rash?: number;
  /** seconds to look over the lot before each tap */
  look?: number;
  seed?: number;
  /** "think" taps a car whose road is clear; "random" taps any car */
  mode?: "think" | "random";
}

export function pilot(st: ParkingStage, opts: DriverOpts = {}): Lot {
  const { rash = 0, look = 1, seed = 1, mode = "think" } = opts;
  const rng = mulberry(seed * 4567 + 11);
  const l = newLot(st);
  for (let guard = 0; guard < 500 && !l.over; guard++) {
    const left = st.cars.map((_, i) => i).filter((i) => !l.out[i]);
    const free = left.filter((i) => canLeave(st, l.out, i));
    let pick: number;
    if (mode === "random" || rng() < rash || !free.length) pick = shuffle(left, rng)[0];
    else pick = shuffle(free, rng)[0];
    tick(l, look * (0.7 + rng() * 0.6) * (1 + left.length / 20));
    tap(l, pick);
  }
  return l;
}

function shape(stage: number) {
  return {
    size: stage < 6 ? 5 : stage < 14 ? 6 : stage < 22 ? 7 : 8,
    fill: Math.min(0.72, 0.45 + stage * 0.01),
    minDepth: 2 + Math.floor(stage / 7),
    pillars: Math.floor(stage / 6),
  };
}

function layout(stage: number, attempt: number): ParkingStage {
  const sh = shape(stage);
  const rng = mulberry(261000 + stage * 173 + attempt * 7919);
  const w = sh.size;
  const h = sh.size;
  const taken = new Set<number>();
  const pillars: number[] = [];
  for (let k = 0; k < sh.pillars; k++) {
    const p = Math.floor(rng() * w * h);
    if (!taken.has(p)) {
      taken.add(p);
      pillars.push(p);
    }
  }
  const cars: Car[] = [];
  const target = Math.floor(w * h * sh.fill);
  let filled = 0;
  for (let tries = 0; tries < 400 && filled < target; tries++) {
    const len = rng() < 0.75 ? 2 : 3;
    const dir = Math.floor(rng() * 4);
    const x = Math.floor(rng() * w);
    const y = Math.floor(rng() * h);
    const car: Car = { x, y, dir, len, colour: Math.floor(rng() * 8) };
    const sq = squares(car);
    if (sq.some(([a, b]) => a < 0 || b < 0 || a >= w || b >= h || taken.has(b * w + a))) continue;
    // never park a car facing straight into the one ahead of it, nose to nose
    for (const [a, b] of sq) taken.add(b * w + a);
    cars.push(car);
    filled += len;
  }
  return { stage, w, h, cars, pillars, par: 0 };
}

/** Human-like drivers used to check a lot: they look a moment before each tap and slip now and then. */
export const HUMAN_DRIVERS: DriverOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ rash: 0.04, look: 1.2, seed }));

/** Parks cars until the lot can be cleared, is deep enough for the stage, and human-like drivers clear it. */
export function buildStage(stage: number): ParkingStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 2000; attempt++) {
    const st = layout(stage, attempt);
    const d = depth(st);
    if (!Number.isFinite(d) || d < sh.minDepth) continue;
    if (HUMAN_DRIVERS.filter((o) => pilot(st, o).won).length < 5) continue;
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    st.par = Math.ceil(pilot(st, { look: 1.2 }).t * 1.1);
    return st;
  }
  throw new Error(`parking-out stage ${stage + 1}: no fair lot`);
}

export const PARKING_STAGES: ParkingStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
