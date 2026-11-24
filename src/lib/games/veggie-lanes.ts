/**
 * Veggie Lanes (텃밭 방어선) — an OIYO original lane defense (2026-11-25).
 *
 * Snails, slugs and beetles creep across a five-row vegetable patch toward the shed. Morning dew falls from the sky
 * and dewflowers make more; spend it to plant along the rows: radish shooters fire seeds down their row, pumpkins
 * soak up bites, and a chili pepper bursts on everything around it. A pest that reaches the shed ends the day; hold
 * out until the last wave is gone.
 *
 * Pure and deterministic: every day's pests, their rows and their timing are seeded per stage.
 */

export const LANES_SLUG = "veggie-lanes";
export const STAGE_COUNT = 30;
export const ROWS = 5;
export const COLS = 8;
export const SKY_DEW = 25;
export const SKY_EVERY = 8;
export const START_DEW = 75;

export type PlantKind = 0 | 1 | 2 | 3; // dewflower, radish shooter, pumpkin, chili
export interface PlantSpec { cost: number; hp: number; recharge: number }
export const PLANTS: PlantSpec[] = [
  { cost: 50, hp: 100, recharge: 4 }, // dewflower: +25 dew every 7 s
  { cost: 100, hp: 100, recharge: 5 }, // radish shooter: a 20-damage seed every 1.5 s down its row
  { cost: 50, hp: 600, recharge: 15 }, // pumpkin: soaks up bites
  { cost: 125, hp: 100, recharge: 20 }, // chili: bursts after 0.8 s, 300 damage to every pest within a cell and a half, rows either side too
];
export type PestKind = 0 | 1 | 2; // snail, beetle, slug
export interface PestSpec { hp: number; speed: number; bite: number }
export const PESTS: PestSpec[] = [
  { hp: 120, speed: 0.22, bite: 25 },
  { hp: 300, speed: 0.18, bite: 30 },
  { hp: 80, speed: 0.42, bite: 20 },
];

export interface Spawn { t: number; row: number; kind: PestKind }
export interface LaneStage {
  stage: number;
  spawns: Spawn[];
  hpScale: number;
  locked: PlantKind[]; // plants not yet on offer
}

export interface Plant { kind: PlantKind; row: number; col: number; hp: number; timer: number }
export interface Pest { kind: PestKind; row: number; x: number; hp: number; max: number; eating: boolean }
export interface Seed { row: number; x: number }

export interface Garden {
  stage: LaneStage;
  t: number;
  dew: number;
  plants: Plant[];
  pests: Pest[];
  seeds: Seed[];
  next: number; // next spawn index
  skyT: number;
  ready: number[]; // seconds until each plant can be planted again
  lost: number; // dewflowers and shooters eaten
  over: boolean;
  won: boolean;
}

export function newGarden(stage: LaneStage): Garden {
  return { stage, t: 0, dew: START_DEW, plants: [], pests: [], seeds: [], next: 0, skyT: 0, ready: [0, 0, 0, 0], lost: 0, over: false, won: false };
}

export const plantAt = (g: Garden, row: number, col: number) => g.plants.find((p) => p.row === row && p.col === col);

export function canPlant(g: Garden, kind: PlantKind, row: number, col: number): boolean {
  return !g.over && !g.stage.locked.includes(kind) && row >= 0 && row < ROWS && col >= 0 && col < COLS && !plantAt(g, row, col) && g.dew >= PLANTS[kind].cost && g.ready[kind] <= 0;
}

export function plant(g: Garden, kind: PlantKind, row: number, col: number): boolean {
  if (!canPlant(g, kind, row, col)) return false;
  g.dew -= PLANTS[kind].cost;
  g.ready[kind] = PLANTS[kind].recharge;
  g.plants.push({ kind, row, col, hp: PLANTS[kind].hp, timer: kind === 0 ? 4 : kind === 1 ? 0.5 : kind === 3 ? 0.8 : 0 });
  return true;
}

export interface StepEvents { shots: number; burst: Array<{ row: number; col: number }>; eaten: number; dew: number; killed: number }

export function step(g: Garden, dt: number): StepEvents {
  const ev: StepEvents = { shots: 0, burst: [], eaten: 0, dew: 0, killed: 0 };
  if (g.over) return ev;
  const st = g.stage;
  g.t += dt;
  for (let k = 0; k < 4; k++) g.ready[k] = Math.max(0, g.ready[k] - dt);
  g.skyT += dt;
  if (g.skyT >= SKY_EVERY) {
    g.skyT -= SKY_EVERY;
    g.dew += SKY_DEW;
    ev.dew += SKY_DEW;
  }
  while (g.next < st.spawns.length && st.spawns[g.next].t <= g.t) {
    const s = st.spawns[g.next++];
    const hp = Math.round(PESTS[s.kind].hp * st.hpScale);
    g.pests.push({ kind: s.kind, row: s.row, x: COLS + 0.4, hp, max: hp, eating: false });
  }
  // plants act
  for (const p of g.plants) {
    p.timer -= dt;
    if (p.timer > 0) continue;
    if (p.kind === 0) {
      g.dew += 25;
      ev.dew += 25;
      p.timer += 7;
    } else if (p.kind === 1) {
      if (g.pests.some((e) => e.row === p.row && e.x > p.col)) {
        g.seeds.push({ row: p.row, x: p.col + 0.6 });
        ev.shots++;
      }
      p.timer += 1.5;
    } else if (p.kind === 3) {
      for (const e of g.pests) if (Math.abs(e.row - p.row) <= 1 && Math.abs(e.x - (p.col + 0.5)) <= 1.5) e.hp -= 300;
      ev.burst.push({ row: p.row, col: p.col });
      p.hp = 0;
    }
  }
  // seeds fly and hit the first pest in their row
  for (const s of g.seeds) s.x += 6 * dt;
  g.seeds = g.seeds.filter((s) => {
    if (s.x > COLS + 1) return false;
    const target = g.pests.find((e) => e.row === s.row && e.hp > 0 && Math.abs(e.x - s.x) < 0.3);
    if (target) {
      target.hp -= 20;
      return false;
    }
    return true;
  });
  // pests creep or eat what's in their cell
  for (const e of g.pests) {
    if (e.hp <= 0) continue;
    const col = Math.floor(e.x);
    const food = g.plants.find((p) => p.row === e.row && p.col === col && p.hp > 0);
    e.eating = !!food;
    if (food) food.hp -= PESTS[e.kind].bite * dt;
    else e.x -= PESTS[e.kind].speed * dt;
  }
  const before = g.pests.length;
  g.pests = g.pests.filter((e) => e.hp > 0);
  ev.killed = before - g.pests.length;
  const alive = g.plants.length;
  for (const p of g.plants) if (p.hp <= 0 && (p.kind === 0 || p.kind === 1)) g.lost++;
  g.plants = g.plants.filter((p) => p.hp > 0);
  ev.eaten = alive - g.plants.length;
  if (g.pests.some((e) => e.x < 0)) {
    g.over = true;
    g.won = false;
  } else if (g.next >= st.spawns.length && !g.pests.length) {
    g.over = true;
    g.won = true;
  }
  return ev;
}

export function starsFor(g: Garden): number {
  if (!g.won) return 0;
  if (g.lost === 0) return 3;
  if (g.lost <= 3) return 2;
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

export interface GardenerOpts {
  /** seconds between the player's decisions */
  react?: number;
  /** how many dewflowers the player grows before anything else */
  flowers?: number;
  seed?: number;
  /** "tend" plants where pests come; "random" plants anything anywhere */
  mode?: "tend" | "random";
}

/** The next planting a sensible gardener makes, or null to wait. */
export function nextPlanting(g: Garden, flowers: number): { kind: PlantKind; row: number; col: number } | null {
  const st = g.stage;
  const has = (k: PlantKind) => !st.locked.includes(k);
  const shooters = (row: number) => g.plants.filter((p) => p.row === row && p.kind === 1).length;
  const threat = (row: number) => g.pests.filter((e) => e.row === row).reduce((s, e) => s + e.hp, 0);
  const free = (row: number, from: number, to: number) => {
    for (let c = from; c <= to; c++) if (!plantAt(g, row, c)) return c;
    return -1;
  };
  // an emergency: a chili on a pest close to the shed, else a pumpkin in front of it
  const close = g.pests.filter((e) => e.x < 2.6).sort((a, b) => a.x - b.x)[0];
  if (close) {
    const col = Math.max(0, Math.floor(close.x));
    if (has(3) && canPlant(g, 3, close.row, col)) return { kind: 3, row: close.row, col };
    for (let c = col; c >= 0; c--) if (has(2) && canPlant(g, 2, close.row, c)) return { kind: 2, row: close.row, col: c };
  }
  // a row under attack without enough shooters
  const rows = Array.from({ length: ROWS }, (_, r) => r).sort((a, b) => threat(b) - shooters(b) * 200 - (threat(a) - shooters(a) * 200));
  for (const r of rows) {
    const need = Math.ceil(threat(r) / 220);
    if (threat(r) > 0 && shooters(r) < Math.max(1, need)) {
      const c = free(r, 1, 4);
      if (c >= 0 && canPlant(g, 1, r, c)) return { kind: 1, row: r, col: c };
      if (c >= 0) return null; // save up for it
    }
  }
  // a pumpkin in front of the shooters of a busy row
  for (const r of rows) {
    if (!has(2) || threat(r) < 200 || g.plants.some((p) => p.row === r && p.kind === 2)) continue;
    const front = Math.max(-1, ...g.plants.filter((p) => p.row === r && p.kind === 1).map((p) => p.col)) + 1;
    if (front > 0 && front < COLS && canPlant(g, 2, r, front)) return { kind: 2, row: r, col: front };
  }
  // dewflowers along the back
  const flowersNow = g.plants.filter((p) => p.kind === 0).length;
  if (flowersNow < flowers) {
    for (let k = 0; k < ROWS; k++) {
      const r = (k * 2) % ROWS;
      if (canPlant(g, 0, r, 0)) return { kind: 0, row: r, col: 0 };
    }
  }
  // one shooter in every row, then a second
  for (const want of [1, 2])
    for (let r = 0; r < ROWS; r++)
      if (shooters(r) < want) {
        const c = free(r, 1, 4);
        if (c >= 0 && canPlant(g, 1, r, c)) return { kind: 1, row: r, col: c };
        if (c >= 0) return null;
      }
  return null;
}

export function pilot(st: LaneStage, opts: GardenerOpts = {}): Garden {
  const { react = 0.6, flowers = 5, seed = 1, mode = "tend" } = opts;
  const rng = mulberry(seed * 6151 + 43);
  const g = newGarden(st);
  const dt = 1 / 20;
  let next = 0.5;
  while (!g.over && g.t < 600) {
    if (g.t >= next) {
      next = g.t + react * (0.75 + rng() * 0.5) * (mode === "random" ? 2 : 1);
      if (mode === "random") {
        const kind = Math.floor(rng() * 4) as PlantKind;
        plant(g, kind, Math.floor(rng() * ROWS), Math.floor(rng() * COLS));
      } else {
        const p = nextPlanting(g, flowers);
        if (p) plant(g, p.kind, p.row, p.col);
      }
    }
    step(g, dt);
  }
  return g;
}

function shape(stage: number) {
  return {
    count: 8 + Math.floor(stage * 1.3),
    length: 70 + stage * 3, // seconds of pests
    beetles: Math.min(0.35, stage * 0.015),
    slugs: stage < 6 ? 0 : Math.min(0.3, (stage - 5) * 0.015),
    locked: (stage < 2 ? [2, 3] : stage < 5 ? [3] : []) as PlantKind[],
  };
}

/** Human-like gardeners: a decision every 0.6–0.9 s, four to five dewflowers before building up. */
export const HUMAN_GARDENERS: GardenerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ react: 0.75, flowers: seed % 2 ? 4 : 5, seed }));

function layout(stage: number, attempt: number, hpScale: number): LaneStage {
  const sh = shape(stage);
  const rng = mulberry(401000 + stage * 257 + attempt * 7919);
  const spawns: Spawn[] = [];
  // a trickle, then thicker, then the last wave all at once
  for (let k = 0; k < sh.count; k++) {
    const frac = k / sh.count;
    const t = 18 + Math.pow(frac, 0.8) * sh.length;
    const r = rng();
    const kind: PestKind = r < sh.beetles ? 1 : r < sh.beetles + sh.slugs ? 2 : 0;
    spawns.push({ t: Math.round(t * 10) / 10, row: Math.floor(rng() * ROWS), kind });
  }
  const wave = 3 + Math.floor(stage / 6);
  const rows = shuffle([0, 1, 2, 3, 4], rng);
  for (let k = 0; k < wave; k++) spawns.push({ t: 18 + sh.length + 8 + k * 0.6, row: rows[k % ROWS], kind: k % 3 === 2 && stage > 4 ? 1 : 0 });
  spawns.sort((a, b) => a.t - b.t);
  return { stage, spawns, hpScale, locked: sh.locked };
}

/** Finds the toughest pests human-like gardeners all hold, then eases them off; random planting must lose. */
export function buildStage(stage: number): LaneStage {
  const scales = [2.2, 1.9, 1.65, 1.45, 1.3, 1.15, 1.0, 0.9, 0.8, 0.7];
  const ease = stage < 5 ? 0.7 : stage < 15 ? 0.8 : 0.85;
  for (let attempt = 0; attempt < 20; attempt++) {
    for (const s of scales) {
      const st = layout(stage, attempt, s);
      if (HUMAN_GARDENERS.some((o) => !pilot(st, o).won)) continue;
      const easy = layout(stage, attempt, Math.round(s * ease * 100) / 100);
      if ([1, 2, 3].some((seed) => pilot(easy, { mode: "random", seed }).won)) break;
      if (HUMAN_GARDENERS.some((o) => !pilot(easy, o).won)) continue;
      return easy;
    }
  }
  throw new Error(`veggie-lanes stage ${stage + 1}: no fair day`);
}

/** The 30 days, each worked out the first time it is asked for. */
export const LANE_STAGES: LaneStage[] = [];
const built: LaneStage[] = [];
for (let i = 0; i < STAGE_COUNT; i++) Object.defineProperty(LANE_STAGES, i, { enumerable: true, get: () => (built[i] ??= buildStage(i)) });
