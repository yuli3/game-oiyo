/**
 * Carton Flip (우유팩 플립) — an OIYO original flip-and-land game (2026-11-25).
 *
 * A little milk carton stands on the kitchen counter. Pull back and let go to flick it up: it always flies toward the
 * next shelf, tumbling end over end at its own steady spin — the harder the flick, the higher it goes and the longer it
 * spins. Land it upright on each shelf in turn, all the way to the top of the fridge. A carton that comes down on its
 * side costs a heart.
 *
 * Pure and deterministic: fixed 1/240 s steps, every stage's shelves seeded per stage and checked to leave a window of
 * flicks that land. Field px, y pointing down.
 */

export const CARTON_SLUG = "carton-flip";
export const STAGE_COUNT = 30;
export const GRAVITY = 1400;
export const CARTON_W = 26;
export const CARTON_H = 44;
export const MIN_POWER = 300;
export const MAX_POWER = 900;
export const UPRIGHT = 0.36; // radians either side of upright that still stands
export const HEARTS = 3;
export const DT = 1 / 240;

export interface Shelf { x0: number; x1: number; y: number }
export interface CartonStage {
  stage: number;
  shelves: Shelf[]; // shelf 0 is where it starts; land on each of the others in turn
  spin: number; // radians per second it tumbles
  plan: number[]; // a flick power that lands on each shelf from the one before
}

export interface Kitchen {
  stage: CartonStage;
  on: number; // the shelf it stands on
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number; // angle, 0 upright
  w: number;
  flying: boolean;
  hearts: number;
  flicks: number;
  over: boolean;
  won: boolean;
}

const standAt = (sh: Shelf): [number, number] => [(sh.x0 + sh.x1) / 2, sh.y - CARTON_H / 2];

export function newKitchen(stage: CartonStage): Kitchen {
  const [x, y] = standAt(stage.shelves[0]);
  return { stage, on: 0, x, y, vx: 0, vy: 0, a: 0, w: 0, flying: false, hearts: HEARTS, flicks: 0, over: false, won: false };
}

/** Seconds a carton thrown up at `vy` px/s from height y0 takes to come down to height y1 (−1 if it can't reach). */
export function airTime(vy: number, y0: number, y1: number): number {
  // y(t) = y0 − vy t + g t² / 2 = y1 → the later root
  const a = GRAVITY / 2;
  const b = -vy;
  const c = y0 - y1;
  const d = b * b - 4 * a * c;
  if (d < 0) return -1;
  return (-b + Math.sqrt(d)) / (2 * a);
}

/** Flicks the carton up with `power` px/s; it is aimed so it comes down over the next shelf's middle. */
export function flick(k: Kitchen, power: number): boolean {
  if (k.over || k.flying) return false;
  const p = Math.max(MIN_POWER, Math.min(MAX_POWER, power));
  const next = k.stage.shelves[k.on + 1];
  const tx = (next.x0 + next.x1) / 2;
  const t = airTime(p, k.y + CARTON_H / 2, next.y);
  // too weak to reach the shelf: it still goes that way, and falls short
  const flight = t > 0 ? t : (2 * p) / GRAVITY;
  k.vx = (tx - k.x) / flight;
  k.vy = -p;
  k.w = (tx >= k.x ? 1 : -1) * k.stage.spin;
  k.flying = true;
  k.flicks++;
  return true;
}

const wrap = (a: number) => {
  let v = a % (2 * Math.PI);
  if (v > Math.PI) v -= 2 * Math.PI;
  if (v < -Math.PI) v += 2 * Math.PI;
  return v;
};

export type StepEvent = { landed: boolean; crashed: boolean };

export function step(k: Kitchen): StepEvent {
  const ev: StepEvent = { landed: false, crashed: false };
  if (k.over || !k.flying) return ev;
  const prevBottom = k.y + CARTON_H / 2;
  k.vy += GRAVITY * DT;
  k.x += k.vx * DT;
  k.y += k.vy * DT;
  k.a += k.w * DT;
  const next = k.stage.shelves[k.on + 1];
  const bottom = k.y + CARTON_H / 2;
  if (k.vy > 0 && prevBottom <= next.y && bottom >= next.y && k.x >= next.x0 - 2 && k.x <= next.x1 + 2) {
    if (Math.abs(wrap(k.a)) <= UPRIGHT) {
      // stands: settle upright on the shelf
      k.on++;
      const [x, y] = [k.x, next.y - CARTON_H / 2];
      Object.assign(k, { x, y, vx: 0, vy: 0, a: 0, w: 0, flying: false });
      ev.landed = true;
      if (k.on === k.stage.shelves.length - 1) {
        k.over = true;
        k.won = true;
      }
      return ev;
    }
    crash(k, ev);
    return ev;
  }
  if (k.y > 640 || k.x < -60 || k.x > 420) crash(k, ev);
  return ev;
}

function crash(k: Kitchen, ev: StepEvent): void {
  ev.crashed = true;
  k.hearts--;
  const [x, y] = standAt(k.stage.shelves[k.on]);
  Object.assign(k, { x, y, vx: 0, vy: 0, a: 0, w: 0, flying: false });
  if (k.hearts <= 0) k.over = true;
}

/** Runs a flick to its end; true if it landed. */
export function runFlick(k: Kitchen, power: number): boolean {
  if (!flick(k, power)) return false;
  for (let n = 0; n < 8 / DT; n++) {
    const ev = step(k);
    if (ev.landed) return true;
    if (ev.crashed) return false;
  }
  crash(k, { landed: false, crashed: false });
  return false;
}

export function starsFor(k: Kitchen): number {
  return k.won ? k.hearts : 0;
}

/** The flick powers (every 2 px/s) that land on the next shelf from shelf `from`. */
export function landingPowers(st: CartonStage, from: number): number[] {
  const out: number[] = [];
  for (let p = MIN_POWER; p <= MAX_POWER; p += 2) {
    const k = newKitchen(st);
    k.on = from;
    const [x, y] = standAt(st.shelves[from]);
    k.x = x;
    k.y = y;
    if (runFlick(k, p)) out.push(p);
  }
  return out;
}

/** The middle of the widest run of landing powers (and its half width). */
export function bestPower(st: CartonStage, from: number): { power: number; half: number } {
  const ps = landingPowers(st, from);
  let best = { power: 0, half: -1 };
  let i = 0;
  while (i < ps.length) {
    let j = i;
    while (j + 1 < ps.length && ps[j + 1] - ps[j] === 2) j++;
    const half = (ps[j] - ps[i]) / 2;
    if (half > best.half) best = { power: (ps[i] + ps[j]) / 2, half };
    i = j + 1;
  }
  return best;
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

export interface FlickerOpts {
  /** spread of the flick's strength (share) */
  power?: number;
  seed?: number;
  mode?: "plan" | "random";
}

export function pilot(st: CartonStage, opts: FlickerOpts = {}): Kitchen {
  const { power = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 2851 + 43);
  const k = newKitchen(st);
  let guard = 0;
  while (!k.over && guard++ < 100) {
    const p = mode === "random" ? MIN_POWER + rng() * (MAX_POWER - MIN_POWER) : st.plan[k.on] * (1 + gauss(rng) * power);
    runFlick(k, p);
  }
  return k;
}

function shape(stage: number) {
  return {
    shelves: Math.min(9, 4 + Math.floor(stage / 5)), // 3 landings up to 8
    spin: (2 * Math.PI) / Math.max(0.6, 0.8 - stage * 0.006), // one tumble in 0.8 s, quicker later on
    minHalf: stage < 5 ? 24 : stage < 15 ? 20 : 16, // half width of the landing window, in px/s of flick
  };
}

/** Human-like flickers: about 2.5 % off in strength. */
export const HUMAN_FLICKERS: FlickerOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ power: 0.025, seed }));

export function buildStage(stage: number): CartonStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 400; attempt++) {
    const rng = mulberry(661000 + stage * 439 + attempt * 7919);
    const shelves: Shelf[] = [{ x0: 20, x1: 120, y: 500 }];
    const plan: number[] = [];
    let ok = true;
    for (let k = 1; k < sh.shelves && ok; k++) {
      // the next shelf, somewhere across and a little up or down, kept on screen
      let found = false;
      for (let tries = 0; tries < 30 && !found; tries++) {
        const prev = shelves[k - 1];
        const w = Math.round(70 + rng() * 40 - Math.min(30, stage));
        const goRight = (prev.x0 + prev.x1) / 2 < 180 ? rng() < 0.85 : rng() < 0.15;
        const gap = 40 + rng() * 120;
        const x0 = Math.round(goRight ? prev.x1 + gap : prev.x0 - gap - w);
        const y = Math.round(Math.max(160, Math.min(520, prev.y - 40 + (rng() * 2 - 1) * 70)));
        if (x0 < 8 || x0 + w > 352) continue;
        const cand: Shelf = { x0, x1: x0 + w, y };
        const st: CartonStage = { stage, shelves: [...shelves, cand], spin: sh.spin, plan: [] };
        const b = bestPower(st, k - 1);
        if (b.half < sh.minHalf) continue;
        shelves.push(cand);
        plan.push(b.power);
        found = true;
      }
      if (!found) ok = false;
    }
    if (!ok) continue;
    const st: CartonStage = { stage, shelves, spin: sh.spin, plan };
    const planned = pilot(st, { mode: "plan" });
    if (!planned.won || planned.hearts < HEARTS) continue;
    if (HUMAN_FLICKERS.some((o) => !pilot(st, o).won)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`carton-flip stage ${stage + 1}: no fair kitchen`);
}

export const CARTON_STAGES: CartonStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
