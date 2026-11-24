/**
 * Window Plant (창가 화분) — an OIYO original idle game for the strip beside your work (2026-11-24).
 *
 * A pot on the windowsill next to your screen. The sun crosses the window over the day, the soil slowly dries,
 * and now and then a little green bug lands on a leaf. Leave it be and glance over now and then: water it when
 * the soil looks dry (not when it is still wet — soggy roots rot), turn the pot to face the sun, and flick off any
 * bug before it nibbles. The plant grows while you work. Make it reach the day's height by evening.
 *
 * Pure and deterministic: every day's weather, sun and bugs are seeded per stage.
 */

export const PLANT_SLUG = "window-plant";
export const STAGE_COUNT = 30;
export const WATER = 0.35; // a watering adds this much moisture
export const BUG_LIFE = 9; // s a bug sits before it starts to nibble

export interface PlantStage {
  stage: number;
  day: number; // s from morning to evening
  dry: number; // moisture lost per s in full sun (less in shade)
  clouds: Array<[number, number]>; // cloudy spells [from, to] (no sun, slow drying)
  bugs: number[]; // when a bug lands
  target: number; // height to reach by evening
  par: number;
}

export interface Plant {
  stage: PlantStage;
  t: number;
  moisture: number; // 0 dry … 1 soaked
  facing: -1 | 1; // which side of the window the leaves face
  height: number;
  soggy: number; // s spent waterlogged (rots)
  bugs: Array<{ at: number; gone: boolean }>;
  waterings: number;
  over: boolean;
  won: boolean;
}

export function newPlant(stage: PlantStage): Plant {
  return { stage, t: 0, moisture: 0.6, facing: 1, height: 0, soggy: 0, bugs: stage.bugs.map((at) => ({ at, gone: false })), waterings: 0, over: false, won: false };
}

/** Where the sun is across the window: −1 morning side … +1 evening side. */
export const sunAt = (st: PlantStage, t: number) => -1 + (2 * Math.min(t, st.day)) / st.day;
export const cloudy = (st: PlantStage, t: number) => st.clouds.some(([a, b]) => t >= a && t < b);

/** How much light the leaves catch: facing the sun's side helps; clouds dim it. */
export function light(p: Plant): number {
  const s = sunAt(p.stage, p.t);
  const facingSun = p.facing * s > 0 || Math.abs(s) < 0.15;
  return (cloudy(p.stage, p.t) ? 0.35 : 1) * (facingSun ? 1 : 0.35);
}

/** Bugs on the leaves now (landed, not flicked off). */
export const bugsOn = (p: Plant) => p.bugs.filter((b) => !b.gone && b.at <= p.t);

export type Act = "water" | "turn" | "bug";

export function act(p: Plant, what: Act): boolean {
  if (p.over) return false;
  if (what === "water") {
    p.moisture = Math.min(1.2, p.moisture + WATER);
    p.waterings++;
    return true;
  }
  if (what === "turn") {
    p.facing = p.facing === 1 ? -1 : 1;
    return true;
  }
  const b = bugsOn(p)[0];
  if (!b) return false;
  b.gone = true;
  return true;
}

/** Growth rate now: light × how happy the roots are; a nibbling bug or rot holds it back. */
export function growthRate(p: Plant): number {
  const m = p.moisture;
  const roots = m < 0.15 ? -0.3 : m < 0.3 ? 0.4 : m <= 0.85 ? 1 : 0.3;
  const nibble = bugsOn(p).filter((b) => p.t - b.at > BUG_LIFE).length;
  const rot = p.soggy > 6 ? 0.4 : 1;
  return light(p) * roots * rot * Math.max(0, 1 - nibble * 0.45);
}

export function stepPlant(p: Plant, dt: number): boolean {
  if (p.over) return false;
  p.t += dt;
  const sunny = !cloudy(p.stage, p.t);
  p.moisture = Math.max(0, p.moisture - p.stage.dry * dt * (sunny ? 1 : 0.45));
  if (p.moisture > 0.95) p.soggy += dt;
  else p.soggy = Math.max(0, p.soggy - dt * 0.5);
  p.height += growthRate(p) * dt;
  if (p.height >= p.stage.target) {
    p.over = true;
    p.won = true;
    return true;
  }
  if (p.t >= p.stage.day) {
    p.over = true;
    return true;
  }
  return false;
}

export function starsFor(p: Plant): number {
  if (!p.won) return 0;
  if (p.t <= p.stage.par * 1.08) return 3;
  if (p.t <= (p.stage.par + p.stage.day) / 2) return 2;
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

export interface CarerOpts {
  /** seconds between glances at the plant */
  glance?: number;
  /** water when the soil is below this */
  thirsty?: number;
  seed?: number;
  /** "care" tends the plant sensibly; "neglect" never does anything; "drown" waters at every glance; "random" acts at random */
  mode?: "care" | "neglect" | "drown" | "random";
}

export function pilot(stage: PlantStage, opts: CarerOpts = {}): Plant {
  const { glance = 1, thirsty = 0.4, seed = 1, mode = "care" } = opts;
  const rng = mulberry(seed * 1607 + 9);
  const p = newPlant(stage);
  const dt = 1 / 10;
  let next = glance * rng();
  while (!p.over) {
    if (p.t >= next) {
      if (mode === "care") {
        if (p.moisture < thirsty) act(p, "water");
        const s = sunAt(stage, p.t);
        if (Math.abs(s) > 0.2 && p.facing * s < 0) act(p, "turn");
        while (bugsOn(p).length) act(p, "bug");
      } else if (mode === "drown") act(p, "water");
      else if (mode === "random") act(p, shuffle(["water", "turn", "bug"] as Act[], rng)[0]);
      next = p.t + glance * (0.7 + rng() * 0.6);
    }
    stepPlant(p, dt);
  }
  return p;
}

function shape(stage: number) {
  return {
    day: 90 + stage * 2,
    dry: 0.012 + stage * 0.0006,
    clouds: Math.floor(stage / 5),
    bugs: 2 + Math.floor(stage / 3),
  };
}

/** Human-like carers used to set the height: they glance over every ten seconds or so while working. */
export const HUMAN_CARERS: CarerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ glance: 10, thirsty: 0.4, seed }));

export function buildStage(stage: number): PlantStage {
  const sh = shape(stage);
  const rng = mulberry(251000 + stage * 167);
  const clouds: Array<[number, number]> = [];
  for (let k = 0; k < sh.clouds; k++) {
    const from = Math.round(10 + rng() * (sh.day - 30));
    clouds.push([from, from + Math.round(8 + rng() * 10)]);
  }
  const bugs = Array.from({ length: sh.bugs }, () => Math.round(5 + rng() * (sh.day - 15))).sort((a, b) => a - b);
  const st: PlantStage = { stage, day: sh.day, dry: sh.dry, clouds, bugs, target: Infinity, par: sh.day };
  const heights = HUMAN_CARERS.map((o) => pilot(st, o).height).sort((a, b) => a - b);
  st.target = Math.round(heights[1] * 0.92 * 10) / 10;
  st.par = Math.ceil(pilot(st).t);
  return st;
}

export const PLANT_STAGES: PlantStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
