/**
 * Urban Strike's deterministic combat rules.
 *
 * This module intentionally imports nothing from three.js. The browser scene is
 * lazy-loaded, while recoil, spread, hit-scan and scoring stay cheap to test.
 */

export type WeaponId = "m4" | "ak" | "mp5";
export type HitZone = "head" | "body";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface WeaponSpec {
  id: WeaponId;
  magazine: number;
  startingReserve: number;
  damage: number;
  headMultiplier: number;
  roundsPerMinute: number;
  reloadMs: number;
  tacticalReloadMs: number;
  hipSpread: number;
  adsSpread: number;
  adsFov: number;
  moveSpeed: number;
  recoil: ReadonlyArray<readonly [pitch: number, yaw: number]>;
}

export const MATCH_SECONDS = 120;
export const SCORE_LIMIT = 40;

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  m4: {
    id: "m4",
    magazine: 30,
    startingReserve: 120,
    damage: 29,
    headMultiplier: 2.25,
    roundsPerMinute: 760,
    reloadMs: 2_320,
    tacticalReloadMs: 1_920,
    hipSpread: 0.021,
    adsSpread: 0.0032,
    adsFov: 54,
    moveSpeed: 6.6,
    recoil: [
      [0.70, 0.02], [0.82, -0.08], [0.91, 0.10], [1.05, -0.16],
      [1.11, -0.08], [1.18, 0.18], [1.20, 0.25], [1.16, 0.18],
      [1.10, -0.12], [1.04, -0.24], [1.00, -0.28], [0.96, 0.14],
    ],
  },
  ak: {
    id: "ak",
    magazine: 30,
    startingReserve: 90,
    damage: 36,
    headMultiplier: 2.1,
    roundsPerMinute: 610,
    reloadMs: 2_720,
    tacticalReloadMs: 2_280,
    hipSpread: 0.026,
    adsSpread: 0.0042,
    adsFov: 51,
    moveSpeed: 6.15,
    recoil: [
      [1.05, 0.04], [1.24, -0.18], [1.38, 0.22], [1.48, 0.30],
      [1.52, -0.28], [1.55, -0.38], [1.48, 0.34], [1.40, 0.45],
      [1.34, 0.22], [1.28, -0.42], [1.22, -0.36], [1.18, 0.28],
    ],
  },
  mp5: {
    id: "mp5",
    magazine: 30,
    startingReserve: 150,
    damage: 23,
    headMultiplier: 2,
    roundsPerMinute: 860,
    reloadMs: 2_100,
    tacticalReloadMs: 1_680,
    hipSpread: 0.018,
    adsSpread: 0.0048,
    adsFov: 57,
    moveSpeed: 7.2,
    recoil: [
      [0.48, -0.03], [0.54, 0.06], [0.61, -0.08], [0.66, 0.10],
      [0.69, 0.13], [0.72, -0.16], [0.71, -0.20], [0.68, 0.18],
      [0.64, 0.14], [0.61, -0.12], [0.58, -0.08], [0.55, 0.10],
    ],
  },
};

export interface HitTarget {
  id: string;
  alive: boolean;
  body: Vec3;
  bodyRadius: number;
  head: Vec3;
  headRadius: number;
}

export interface HitResult {
  id: string;
  zone: HitZone;
  distance: number;
  point: Vec3;
}

export function shotIntervalMs(weapon: WeaponSpec): number {
  return 60_000 / weapon.roundsPerMinute;
}

/**
 * A weapon pattern repeats with a small controlled climb after its authored
 * section. This keeps long sprays learnable without making them laser-straight.
 */
export function recoilAt(weapon: WeaponSpec, shotIndex: number): readonly [number, number] {
  const safeIndex = Math.max(0, Math.floor(shotIndex));
  const base = weapon.recoil[safeIndex % weapon.recoil.length];
  const cycle = Math.floor(safeIndex / weapon.recoil.length);
  return [base[0] * (1 + Math.min(cycle, 2) * 0.08), base[1] * (1 + Math.min(cycle, 2) * 0.12)];
}

export function spreadFor(
  weapon: WeaponSpec,
  options: { ads: boolean; moving: boolean; sprinting: boolean; crouched: boolean },
): number {
  const base = options.ads ? weapon.adsSpread : weapon.hipSpread;
  const movement = options.sprinting ? 2.9 : options.moving ? 1.55 : 1;
  const stance = options.crouched ? 0.72 : 1;
  return base * movement * stance;
}

/** Small deterministic PRNG for repeatable spread tests and replays. */
export function random01(seed: number): number {
  let value = seed | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 4_294_967_296;
}

export function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

export function directionFromAim(yaw: number, pitch: number, spread: number, seed: number): Vec3 {
  const angle = random01(seed) * Math.PI * 2;
  // sqrt produces an even distribution over the circular cone.
  const radius = Math.sqrt(random01(seed ^ 0x9e3779b9)) * spread;
  const spreadYaw = Math.cos(angle) * radius;
  const spreadPitch = Math.sin(angle) * radius;
  const finalYaw = yaw + spreadYaw;
  const finalPitch = pitch + spreadPitch;
  const cosPitch = Math.cos(finalPitch);
  return normalize({
    x: -Math.sin(finalYaw) * cosPitch,
    y: Math.sin(finalPitch),
    z: -Math.cos(finalYaw) * cosPitch,
  });
}

export function raySphereDistance(origin: Vec3, direction: Vec3, center: Vec3, radius: number): number | null {
  const offset = {
    x: origin.x - center.x,
    y: origin.y - center.y,
    z: origin.z - center.z,
  };
  const b = offset.x * direction.x + offset.y * direction.y + offset.z * direction.z;
  const c = offset.x ** 2 + offset.y ** 2 + offset.z ** 2 - radius ** 2;
  const discriminant = b * b - c;
  if (discriminant < 0) return null;
  const near = -b - Math.sqrt(discriminant);
  const far = -b + Math.sqrt(discriminant);
  if (near >= 0) return near;
  return far >= 0 ? far : null;
}

export function resolveHitscan(
  origin: Vec3,
  directionInput: Vec3,
  targets: readonly HitTarget[],
  maxDistance = 120,
): HitResult | null {
  const direction = normalize(directionInput);
  let result: HitResult | null = null;

  for (const target of targets) {
    if (!target.alive) continue;
    const candidates: Array<[HitZone, number | null]> = [
      ["head", raySphereDistance(origin, direction, target.head, target.headRadius)],
      ["body", raySphereDistance(origin, direction, target.body, target.bodyRadius)],
    ];
    for (const [zone, distance] of candidates) {
      if (distance === null || distance > maxDistance || (result && distance >= result.distance)) continue;
      result = {
        id: target.id,
        zone,
        distance,
        point: {
          x: origin.x + direction.x * distance,
          y: origin.y + direction.y * distance,
          z: origin.z + direction.z * distance,
        },
      };
    }
  }
  return result;
}

export function damageForHit(weapon: WeaponSpec, zone: HitZone, distance: number): number {
  const falloffStart = weapon.id === "mp5" ? 22 : 34;
  const falloffEnd = weapon.id === "mp5" ? 58 : 86;
  const falloff = distance <= falloffStart
    ? 1
    : Math.max(0.62, 1 - ((distance - falloffStart) / (falloffEnd - falloffStart)) * 0.38);
  return Math.round(weapon.damage * (zone === "head" ? weapon.headMultiplier : 1) * falloff);
}

export function scoreForElimination(zone: HitZone, streak: number): number {
  return 100 + (zone === "head" ? 50 : 0) + Math.min(Math.max(streak, 0), 5) * 10;
}

export type FireFailure = "empty" | "reloading" | "sprinting" | "respawn" | "rate";
export function explainFireFailure(state: {
  magazine: number;
  reloading: boolean;
  sprinting: boolean;
  respawning: boolean;
  rateLimited: boolean;
}): FireFailure | null {
  if (state.respawning) return "respawn";
  if (state.reloading) return "reloading";
  if (state.sprinting) return "sprinting";
  if (state.rateLimited) return "rate";
  if (state.magazine <= 0) return "empty";
  return null;
}

export function reloadDuration(weapon: WeaponSpec, roundsInMagazine: number): number {
  return roundsInMagazine > 0 ? weapon.tacticalReloadMs : weapon.reloadMs;
}

export function finishReload(
  weapon: WeaponSpec,
  roundsInMagazine: number,
  reserve: number,
): { magazine: number; reserve: number } {
  const needed = Math.max(0, weapon.magazine - roundsInMagazine);
  const loaded = Math.min(needed, Math.max(0, reserve));
  return {
    magazine: roundsInMagazine + loaded,
    reserve: reserve - loaded,
  };
}

export type MatchWeakness = "aim" | "survival" | "objective";
export function reviewUrbanStrikeResult(result: {
  accuracy: number;
  deaths: number;
  blueScore: number;
  redScore: number;
}): MatchWeakness {
  if (result.accuracy < 25) return "aim";
  if (result.deaths > 8) return "survival";
  return "objective";
}

export function formatMatchTime(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
