export const MALLOW_ISLE_SAVE_KEY = "oiyo:mallow-isle:v1";
export const TERRAIN_SIZE = 25;
export const TERRAIN_STEP = 1.2;
export const ISLAND_RADIUS = 13.4;

export type SculptMode = "raise" | "lower";
export type DecorationType = "tree" | "flowers" | "bench";

export interface Decoration {
  id: string;
  type: DecorationType;
  x: number;
  z: number;
  rotation: number;
  variant: number;
}

export interface MallowIsleSave {
  version: 1;
  heights: number[];
  decorations: Decoration[];
  cozy: number;
  sculpted: number;
}

export interface PlayerPose {
  x: number;
  z: number;
  heading: number;
}

const DEFAULT_DECORATIONS: Decoration[] = [
  { id: "tree-welcome", type: "tree", x: -5.6, z: 2.5, rotation: 0.2, variant: 0 },
  { id: "tree-cottage", type: "tree", x: 5.8, z: -1.7, rotation: 1.1, variant: 1 },
  { id: "tree-hill", type: "tree", x: -2.7, z: -6.5, rotation: 2.4, variant: 2 },
  { id: "flowers-path-a", type: "flowers", x: -1.8, z: 3.8, rotation: 0.5, variant: 0 },
  { id: "flowers-path-b", type: "flowers", x: 1.6, z: 3.1, rotation: 1.7, variant: 1 },
  { id: "flowers-pond", type: "flowers", x: 6.6, z: 4.2, rotation: 2.2, variant: 2 },
  { id: "bench-overlook", type: "bench", x: -6.8, z: -3.7, rotation: 0.8, variant: 0 },
];

const indexOf = (x: number, z: number) => z * TERRAIN_SIZE + x;
const half = (TERRAIN_SIZE - 1) / 2;

export function terrainWorldPosition(gridX: number, gridZ: number): [number, number] {
  return [(gridX - half) * TERRAIN_STEP, (gridZ - half) * TERRAIN_STEP];
}

function seededNoise(x: number, z: number): number {
  const value = Math.sin(x * 12.9898 + z * 78.233 + 41.17) * 43758.5453;
  return value - Math.floor(value);
}

export function createIslandTerrain(): number[] {
  const heights: number[] = [];
  for (let z = 0; z < TERRAIN_SIZE; z += 1) {
    for (let x = 0; x < TERRAIN_SIZE; x += 1) {
      const [worldX, worldZ] = terrainWorldPosition(x, z);
      const distance = Math.hypot(worldX * 0.96, worldZ * 1.04);
      const shore = Math.max(0, 1 - (distance / ISLAND_RADIUS) ** 2.65);
      const broadHills =
        Math.sin(worldX * 0.24 - 0.7) * 0.28 +
        Math.cos(worldZ * 0.21 + 0.4) * 0.22 +
        Math.sin((worldX + worldZ) * 0.14) * 0.18;
      const texture = (seededNoise(x, z) - 0.5) * 0.08;
      heights.push(Number((-0.55 + shore * (2.35 + broadHills) + texture * shore).toFixed(4)));
    }
  }
  return heights;
}

export function sampleTerrainHeight(heights: number[], worldX: number, worldZ: number): number {
  if (heights.length !== TERRAIN_SIZE * TERRAIN_SIZE) return 0;
  const localX = worldX / TERRAIN_STEP + half;
  const localZ = worldZ / TERRAIN_STEP + half;
  const x0 = Math.max(0, Math.min(TERRAIN_SIZE - 1, Math.floor(localX)));
  const z0 = Math.max(0, Math.min(TERRAIN_SIZE - 1, Math.floor(localZ)));
  const x1 = Math.min(TERRAIN_SIZE - 1, x0 + 1);
  const z1 = Math.min(TERRAIN_SIZE - 1, z0 + 1);
  const tx = Math.max(0, Math.min(1, localX - x0));
  const tz = Math.max(0, Math.min(1, localZ - z0));
  const a = heights[indexOf(x0, z0)] ?? 0;
  const b = heights[indexOf(x1, z0)] ?? a;
  const c = heights[indexOf(x0, z1)] ?? a;
  const d = heights[indexOf(x1, z1)] ?? c;
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

export function sculptTerrain(
  heights: number[],
  worldX: number,
  worldZ: number,
  mode: SculptMode,
  radius = 2.25,
  strength = 0.18,
): number[] {
  if (heights.length !== TERRAIN_SIZE * TERRAIN_SIZE) return heights;
  if (Math.hypot(worldX, worldZ) > ISLAND_RADIUS - 1.1) return heights;
  const direction = mode === "raise" ? 1 : -1;
  let changed = false;
  const next = heights.map((height, index) => {
    const gridX = index % TERRAIN_SIZE;
    const gridZ = Math.floor(index / TERRAIN_SIZE);
    const [x, z] = terrainWorldPosition(gridX, gridZ);
    const distance = Math.hypot(x - worldX, z - worldZ);
    if (distance >= radius) return height;
    const edge = Math.hypot(x, z);
    if (edge > ISLAND_RADIUS - 0.7) return height;
    const falloff = (1 + Math.cos(Math.PI * distance / radius)) * 0.5;
    const adjusted = Math.max(0.18, Math.min(4.2, height + direction * strength * falloff));
    if (Math.abs(adjusted - height) > 0.0001) changed = true;
    return Number(adjusted.toFixed(4));
  });
  return changed ? next : heights;
}

export function placeDecoration(
  current: Decoration[],
  type: DecorationType,
  x: number,
  z: number,
  id: string,
): Decoration[] {
  if (current.length >= 72 || Math.hypot(x, z) > ISLAND_RADIUS - 1.3) return current;
  const minDistance = type === "tree" ? 1.45 : type === "bench" ? 1.2 : 0.75;
  if (current.some((item) => Math.hypot(item.x - x, item.z - z) < minDistance)) return current;
  const variant = Math.abs(Math.floor((x * 17 + z * 31) * 10)) % 3;
  const rotation = ((Math.abs(x * 13 + z * 19) % 6.28) + 6.28) % 6.28;
  return [...current, { id, type, x, z, rotation, variant }];
}

export function eraseDecoration(current: Decoration[], x: number, z: number, radius = 1.15): Decoration[] {
  let nearestIndex = -1;
  let nearestDistance = radius;
  current.forEach((item, index) => {
    const distance = Math.hypot(item.x - x, item.z - z);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex < 0 ? current : current.filter((_, index) => index !== nearestIndex);
}

export function decorationComfort(decorations: Decoration[]): number {
  return decorations.reduce((total, item) => {
    if (item.type === "tree") return total + 8;
    if (item.type === "bench") return total + 12;
    return total + 4;
  }, 0);
}

export function cozyScore(save: Pick<MallowIsleSave, "decorations" | "sculpted">): number {
  return Math.min(100, 18 + decorationComfort(save.decorations) + Math.min(20, save.sculpted * 2));
}

export function movePlayer(
  pose: PlayerPose,
  inputX: number,
  inputZ: number,
  cameraYaw: number,
  delta: number,
): PlayerPose {
  const length = Math.hypot(inputX, inputZ);
  if (length < 0.01) return pose;
  const normalizedX = inputX / Math.max(1, length);
  const normalizedZ = inputZ / Math.max(1, length);
  const cos = Math.cos(cameraYaw);
  const sin = Math.sin(cameraYaw);
  const worldX = normalizedX * cos + normalizedZ * sin;
  const worldZ = normalizedZ * cos - normalizedX * sin;
  const distance = Math.min(0.16, Math.max(0, delta)) * 4.35;
  let x = pose.x + worldX * distance;
  let z = pose.z + worldZ * distance;
  const radius = Math.hypot(x, z);
  const maxRadius = ISLAND_RADIUS - 1.1;
  if (radius > maxRadius) {
    x = x / radius * maxRadius;
    z = z / radius * maxRadius;
  }
  return { x, z, heading: Math.atan2(worldX, worldZ) };
}

function validDecoration(value: unknown): value is Decoration {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Decoration>;
  return typeof item.id === "string"
    && (item.type === "tree" || item.type === "flowers" || item.type === "bench")
    && Number.isFinite(item.x)
    && Number.isFinite(item.z)
    && Number.isFinite(item.rotation)
    && Number.isInteger(item.variant)
    && Math.hypot(item.x ?? 99, item.z ?? 99) <= ISLAND_RADIUS;
}

export function createDefaultMallowSave(): MallowIsleSave {
  const decorations = DEFAULT_DECORATIONS.map((item) => ({ ...item }));
  const base = { version: 1 as const, heights: createIslandTerrain(), decorations, sculpted: 0, cozy: 0 };
  return { ...base, cozy: cozyScore(base) };
}

export function parseMallowSave(raw: string | null): MallowIsleSave {
  if (!raw) return createDefaultMallowSave();
  try {
    const parsed = JSON.parse(raw) as Partial<MallowIsleSave>;
    if (
      parsed.version !== 1
      || !Array.isArray(parsed.heights)
      || parsed.heights.length !== TERRAIN_SIZE * TERRAIN_SIZE
      || !parsed.heights.every((value) => Number.isFinite(value) && value >= -0.7 && value <= 4.3)
      || !Array.isArray(parsed.decorations)
      || parsed.decorations.length > 72
      || !parsed.decorations.every(validDecoration)
      || !Number.isInteger(parsed.sculpted)
      || (parsed.sculpted ?? -1) < 0
    ) {
      return createDefaultMallowSave();
    }
    const next = {
      version: 1 as const,
      heights: parsed.heights as number[],
      decorations: parsed.decorations as Decoration[],
      sculpted: Math.min(500, parsed.sculpted ?? 0),
      cozy: 0,
    };
    return { ...next, cozy: cozyScore(next) };
  } catch {
    return createDefaultMallowSave();
  }
}
