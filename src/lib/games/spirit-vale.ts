/* ────────────────────────────────────────────────────────────────────────────
 * Spirit Vale — the rules and the world, with no renderer attached.
 *
 * This module owns three things and imports nothing from three.js, so it can be
 * unit-tested and so the arcade's other pages never pull it into a WebGL chunk:
 *
 *   1. The twelve spirits and the 오행 (Five Phases) matchup system.
 *   2. A deterministic heightmap — the SINGLE source of ground height, used by
 *      the terrain mesh, by prop placement, and by the walking player alike.
 *      Anything that needs "how high is the ground here" calls `terrainHeight`.
 *      Duplicating that in a shader would let the visual ground and the walkable
 *      ground drift apart, so we deliberately keep it on the CPU.
 *   3. Deterministic prop placement, so the same seed is the same valley on
 *      every device and every reload.
 *
 * On the matchup system: this is NOT a single "super effective" table. 오행 has
 * two independent cycles — 상생 (one phase feeds the next) and 상극 (one phase
 * overcomes another) — which together give five distinct relations between any
 * two elements instead of three. Feeding the element you attack makes you weaker
 * against it; being fed by it makes you stronger. That asymmetry is the whole
 * reason to build a collector on 오행 rather than on an invented type chart.
 * ────────────────────────────────────────────────────────────────────────── */

export type ElementId = "wood" | "fire" | "earth" | "metal" | "water";

/** Locale keys used across the arcade. Kept local to avoid a runtime import. */
export type SpiritLocale = "ko" | "en" | "ja" | "zh" | "fr" | "es";

/**
 * 상생 (generating): each phase feeds the next.
 * 木生火 → 火生土 → 土生金 → 金生水 → 水生木
 */
export const GENERATES: Record<ElementId, ElementId> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

/**
 * 상극 (overcoming): each phase controls another.
 * 木剋土 · 土剋水 · 水剋火 · 火剋金 · 金剋木
 */
export const OVERCOMES: Record<ElementId, ElementId> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};

export const ELEMENT_IDS: readonly ElementId[] = ["wood", "fire", "earth", "metal", "water"];

/** How an attacking element relates to the defending one. */
export type Matchup = "overcomes" | "overcomeBy" | "generates" | "generatedBy" | "neutral";

/**
 * Multipliers. `overcomes` and `overcomeBy` are reciprocal so the table stays
 * symmetric: whatever you gain attacking downhill you lose attacking uphill.
 */
export const MATCHUP_MULTIPLIER: Record<Matchup, number> = {
  overcomes: 1.6,
  overcomeBy: 0.625,
  generates: 0.8,
  generatedBy: 1.25,
  neutral: 1,
};

/**
 * Resolve attacker→defender. Order matters: 극 outranks 생, because a phase that
 * both feeds and is overcome by another is, in practice, being overcome. (No
 * such pair exists in the canonical cycles, but pinning the precedence keeps the
 * function total rather than relying on the data staying well-formed.)
 */
export function matchup(attacker: ElementId, defender: ElementId): Matchup {
  if (OVERCOMES[attacker] === defender) return "overcomes";
  if (OVERCOMES[defender] === attacker) return "overcomeBy";
  if (GENERATES[attacker] === defender) return "generates";
  if (GENERATES[defender] === attacker) return "generatedBy";
  return "neutral";
}

export function damageMultiplier(attacker: ElementId, defender: ElementId): number {
  return MATCHUP_MULTIPLIER[matchup(attacker, defender)];
}

/* ── The twelve spirits ────────────────────────────────────────────────────
 * Elements follow the traditional 지지(earthly branch) assignments rather than
 * anything invented here, which is why earth carries four spirits and the other
 * phases two each. Names are original coinages: CJK locales get their own, and
 * the Latin coinage is shared by en/fr/es the way proper nouns usually are.
 * ────────────────────────────────────────────────────────────────────────── */

export interface Spirit {
  id: string;
  /** Earthly-branch index 0–11 (子 = 0), so saju tooling can line up with this. */
  branch: number;
  element: ElementId;
  name: Record<SpiritLocale, string>;
  /** Base stats, deliberately flat for now — battle tuning comes with battles. */
  hp: number;
  attack: number;
  speed: number;
}

const latin = (n: string) => ({ en: n, fr: n, es: n });

export const SPIRITS: readonly Spirit[] = [
  {
    id: "dewvin", branch: 0, element: "water", hp: 42, attack: 11, speed: 15,
    name: { ko: "이슬쥐", ja: "露ネズミ", zh: "露鼠", ...latin("Dewvin") },
  },
  {
    id: "terrox", branch: 1, element: "earth", hp: 58, attack: 13, speed: 7,
    name: { ko: "흙소", ja: "土ウシ", zh: "土牛", ...latin("Terrox") },
  },
  {
    id: "verdatig", branch: 2, element: "wood", hp: 50, attack: 16, speed: 12,
    name: { ko: "푸른범", ja: "青トラ", zh: "青虎", ...latin("Verdatig") },
  },
  {
    id: "sproutle", branch: 3, element: "wood", hp: 40, attack: 10, speed: 16,
    name: { ko: "새싹토끼", ja: "芽ウサギ", zh: "芽兔", ...latin("Sproutle") },
  },
  {
    id: "geodrake", branch: 4, element: "earth", hp: 60, attack: 17, speed: 9,
    name: { ko: "뫼룡", ja: "山リュウ", zh: "山龙", ...latin("Geodrake") },
  },
  {
    id: "emberpent", branch: 5, element: "fire", hp: 44, attack: 15, speed: 13,
    name: { ko: "불꽃뱀", ja: "炎ヘビ", zh: "焰蛇", ...latin("Emberpent") },
  },
  {
    id: "pyrequine", branch: 6, element: "fire", hp: 48, attack: 16, speed: 17,
    name: { ko: "노을말", ja: "夕焼けウマ", zh: "霞马", ...latin("Pyrequine") },
  },
  {
    id: "loamram", branch: 7, element: "earth", hp: 52, attack: 12, speed: 10,
    name: { ko: "들양", ja: "野ヒツジ", zh: "野羊", ...latin("Loamram") },
  },
  {
    id: "chromape", branch: 8, element: "metal", hp: 46, attack: 14, speed: 15,
    name: { ko: "쇠잔나비", ja: "鉄ザル", zh: "铁猿", ...latin("Chromape") },
  },
  {
    id: "aurogal", branch: 9, element: "metal", hp: 43, attack: 15, speed: 12,
    name: { ko: "놋닭", ja: "真鍮ドリ", zh: "铜鸡", ...latin("Aurogal") },
  },
  {
    id: "cairnhound", branch: 10, element: "earth", hp: 54, attack: 14, speed: 11,
    name: { ko: "바위개", ja: "岩イヌ", zh: "岩犬", ...latin("Cairnhound") },
  },
  {
    id: "mirebore", branch: 11, element: "water", hp: 56, attack: 13, speed: 8,
    name: { ko: "물돼지", ja: "沼イノシシ", zh: "沼猪", ...latin("Mirebore") },
  },
];

export function spiritById(id: string): Spirit | undefined {
  return SPIRITS.find((s) => s.id === id);
}

export function spiritsOfElement(element: ElementId): Spirit[] {
  return SPIRITS.filter((s) => s.element === element);
}

/* ── Deterministic noise ───────────────────────────────────────────────────
 * A small integer hash and value-noise pair, written out rather than pulled from
 * a library so that the exact same numbers come out in tests, in placement, and
 * in the browser. No Math.random anywhere in world generation.
 * ────────────────────────────────────────────────────────────────────────── */

/** Deterministic 32-bit PRNG. Same seed → same sequence, forever. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smoothstep-interpolated value noise on the unit grid. */
function valueNoise2(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  // Smoothstep keeps the terrain free of the grid-aligned creases that raw
  // linear interpolation leaves behind.
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2(x0, y0);
  const n10 = hash2(x0 + 1, y0);
  const n01 = hash2(x0, y0 + 1);
  const n11 = hash2(x0 + 1, y0 + 1);
  return (n00 * (1 - sx) + n10 * sx) * (1 - sy) + (n01 * (1 - sx) + n11 * sx) * sy;
}

/** Fractal sum. Four octaves is enough for rolling hills at this scale. */
function fbm2(x: number, y: number, octaves = 4): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.07; // Slightly off 2.0 to avoid octaves lining up on the grid.
  }
  return sum / norm;
}

/* ── World ─────────────────────────────────────────────────────────────── */

export const WORLD = {
  /** Half-extent in metres; the valley spans -SIZE..SIZE on both axes. */
  size: 60,
  /** Terrain mesh subdivisions per axis. */
  segments: 128,
  /** Peak hill height. */
  amplitude: 5.2,
  /** Noise scale — smaller means broader, gentler hills. */
  frequency: 0.021,
  /** Radius around the origin flattened for a readable starting area. */
  clearingRadius: 9,
  playerRadius: 0.42,
  treeRadius: 0.6,
} as const;

/**
 * Ground height at a world position. The one and only authority — the mesh, the
 * props, and the player all read from here.
 */
export function terrainHeight(x: number, z: number): number {
  const base = fbm2(x * WORLD.frequency, z * WORLD.frequency) * 2 - 1;
  let h = base * WORLD.amplitude;

  // Flatten the spawn clearing so the player never starts on a slope, easing
  // out over the last third of the radius rather than cutting a visible disc.
  const d = Math.hypot(x, z);
  if (d < WORLD.clearingRadius) {
    const t = Math.max(0, (d - WORLD.clearingRadius * 0.62) / (WORLD.clearingRadius * 0.38));
    h *= t * t;
  }

  // Let the rim rise so the valley reads as enclosed instead of simply ending.
  // Capped at 1: past the rim the ground plateaus rather than climbing forever,
  // which matters at the square mesh's corners — those sit far outside the
  // circular playable area and would otherwise spike into a wall of geometry.
  const edge = Math.min(1, Math.max(0, (d - WORLD.size * 0.72) / (WORLD.size * 0.28)));
  h += edge * edge * 9;

  return h;
}

/** Steepness (rise over run) via central differences — used to reject props. */
export function terrainSlope(x: number, z: number, eps = 0.75): number {
  const hx = terrainHeight(x + eps, z) - terrainHeight(x - eps, z);
  const hz = terrainHeight(x, z + eps) - terrainHeight(x, z - eps);
  return Math.hypot(hx, hz) / (2 * eps);
}

export interface TreeInstance {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotation: number;
  /** Per-instance phase so canopies don't all sway in lockstep. */
  phase: number;
}

export interface GrassBlade {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotation: number;
  phase: number;
  /** 0..1 lean into the colour ramp, for patchy rather than uniform green. */
  tint: number;
  tall: boolean;
}

export interface TallGrassZone {
  x: number;
  z: number;
  radius: number;
  /** Which element's spirits favour this patch. */
  element: ElementId;
}

/**
 * Tall-grass zones, placed on a ring away from spawn so the player has to walk
 * somewhere to find one. Each zone favours one element, which is what makes
 * exploring in a direction mean something.
 */
export function generateTallGrassZones(seed: number): TallGrassZone[] {
  const rng = mulberry32(seed ^ 0x2a17);
  const zones: TallGrassZone[] = [];
  const count = 5;
  for (let i = 0; i < count; i++) {
    // Even angular spread with jitter: reliably spaced, never mechanical.
    const angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.7;
    const dist = WORLD.clearingRadius + 6 + rng() * 22;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    zones.push({
      x,
      z,
      radius: 5 + rng() * 3.5,
      element: ELEMENT_IDS[i % ELEMENT_IDS.length],
    });
  }
  return zones;
}

export function tallGrassZoneAt(x: number, z: number, zones: TallGrassZone[]): TallGrassZone | null {
  for (const zone of zones) {
    if (Math.hypot(x - zone.x, z - zone.z) < zone.radius) return zone;
  }
  return null;
}

/**
 * Trees on a jittered grid, rejected on slope (nothing grows on a cliff), inside
 * the spawn clearing, or inside a tall-grass zone (those need to stay walkable
 * and visible).
 */
export function generateTrees(seed: number, zones: TallGrassZone[]): TreeInstance[] {
  const rng = mulberry32(seed ^ 0x51ed);
  const trees: TreeInstance[] = [];
  const step = 4.4;
  for (let gx = -WORLD.size + 2; gx < WORLD.size - 2; gx += step) {
    for (let gz = -WORLD.size + 2; gz < WORLD.size - 2; gz += step) {
      if (rng() > 0.62) continue;
      const x = gx + (rng() - 0.5) * step * 1.5;
      const z = gz + (rng() - 0.5) * step * 1.5;
      const d = Math.hypot(x, z);
      if (d < WORLD.clearingRadius + 1.5) continue;
      if (d > WORLD.size - 3) continue;
      if (terrainSlope(x, z) > 0.55) continue;
      if (tallGrassZoneAt(x, z, zones)) continue;
      trees.push({
        x,
        z,
        y: terrainHeight(x, z),
        scale: 0.78 + rng() * 0.65,
        rotation: rng() * Math.PI * 2,
        phase: rng() * Math.PI * 2,
      });
    }
  }
  return trees;
}

/**
 * Grass blades. `budget` is the instance count, which the scene lowers on
 * smaller devices — placement stays deterministic because the RNG order does
 * not depend on how many blades we end up keeping.
 */
export function generateGrass(seed: number, zones: TallGrassZone[], budget: number): GrassBlade[] {
  const rng = mulberry32(seed ^ 0x7c3f);
  const blades: GrassBlade[] = [];
  // Weight placement toward the middle of the valley: sqrt() on a uniform
  // sample spreads points evenly over area rather than clumping at the centre.
  const reach = WORLD.size - 4;
  let guard = 0;
  while (blades.length < budget && guard < budget * 6) {
    guard++;
    const angle = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * reach;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (terrainSlope(x, z) > 0.85) continue;
    const zone = tallGrassZoneAt(x, z, zones);
    blades.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: zone ? 1.5 + rng() * 0.8 : 0.6 + rng() * 0.5,
      rotation: rng() * Math.PI * 2,
      phase: rng() * Math.PI * 2,
      tint: rng(),
      tall: Boolean(zone),
    });
  }
  return blades;
}

/**
 * Extra blades packed into the tall-grass zones so they read as dense thickets
 * rather than the same field with taller stalks.
 */
export function generateZoneGrass(seed: number, zones: TallGrassZone[], perZone: number): GrassBlade[] {
  const rng = mulberry32(seed ^ 0x19b7);
  const blades: GrassBlade[] = [];
  for (const zone of zones) {
    for (let i = 0; i < perZone; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * zone.radius;
      const x = zone.x + Math.cos(angle) * dist;
      const z = zone.z + Math.sin(angle) * dist;
      blades.push({
        x,
        z,
        y: terrainHeight(x, z),
        scale: 1.5 + rng() * 0.9,
        rotation: rng() * Math.PI * 2,
        phase: rng() * Math.PI * 2,
        tint: rng(),
        tall: true,
      });
    }
  }
  return blades;
}

/* ── Movement ──────────────────────────────────────────────────────────── */

export interface Vec2 {
  x: number;
  z: number;
}

/**
 * Move from `from` by `delta`, pushed out of tree trunks and kept inside the
 * valley. Resolves against trunks one at a time; with trunks this sparse a
 * single pass is enough and it never jitters between two colliders.
 */
export function resolveMovement(from: Vec2, delta: Vec2, trees: TreeInstance[]): Vec2 {
  let x = from.x + delta.x;
  let z = from.z + delta.z;

  const limit = WORLD.size - 4;
  const d = Math.hypot(x, z);
  if (d > limit) {
    x = (x / d) * limit;
    z = (z / d) * limit;
  }

  const minDist = WORLD.playerRadius + WORLD.treeRadius;
  for (const tree of trees) {
    const dx = x - tree.x;
    const dz = z - tree.z;
    let dist = Math.hypot(dx, dz);
    const r = minDist * tree.scale;
    if (dist >= r) continue;

    // Landing exactly on a trunk's centre leaves no direction to push along, and
    // walking straight at one does hit it dead-on. Back the player out the way
    // they came in; if even that is degenerate, pick a fixed axis so the result
    // stays deterministic rather than depending on floating-point noise.
    let nx = dx;
    let nz = dz;
    if (dist === 0) {
      nx = from.x - tree.x;
      nz = from.z - tree.z;
      dist = Math.hypot(nx, nz);
      if (dist === 0) {
        nx = 1;
        nz = 0;
        dist = 1;
      }
    }
    x = tree.x + (nx / dist) * r;
    z = tree.z + (nz / dist) * r;
  }

  return { x, z };
}

/* ── Encounters ────────────────────────────────────────────────────────── */

/** Metres of walking inside tall grass before an encounter can trigger. */
export const ENCOUNTER_STEP_DISTANCE = 1.35;
export const ENCOUNTER_CHANCE = 0.28;

/**
 * Pick a spirit for a zone: usually one that belongs to the zone's element, but
 * sometimes a neighbour on the 상생 cycle, so a patch has a character without
 * being a vending machine.
 */
export function rollSpirit(zone: TallGrassZone, roll: () => number): Spirit {
  const element = roll() < 0.75 ? zone.element : GENERATES[zone.element];
  const pool = spiritsOfElement(element);
  const fallback = spiritsOfElement(zone.element);
  const chosen = pool.length > 0 ? pool : fallback;
  return chosen[Math.floor(roll() * chosen.length) % chosen.length];
}
