export type InfernalWeaponId = "scattergun" | "rocket" | "plasma";
export type DemonKind = "crawler" | "brute" | "wraith";

export interface InfernalWeapon {
  id: InfernalWeaponId;
  magazine: number;
  reserve: number;
  damage: number;
  pellets: number;
  rpm: number;
  reloadMs: number;
  spread: number;
  heat: number;
}

export const INFERNAL_WEAPONS: Record<InfernalWeaponId, InfernalWeapon> = {
  scattergun: { id: "scattergun", magazine: 8, reserve: 56, damage: 15, pellets: 8, rpm: 105, reloadMs: 1_250, spread: 0.075, heat: 22 },
  rocket: { id: "rocket", magazine: 5, reserve: 25, damage: 126, pellets: 1, rpm: 78, reloadMs: 1_650, spread: 0, heat: 31 },
  plasma: { id: "plasma", magazine: 32, reserve: 160, damage: 25, pellets: 1, rpm: 560, reloadMs: 1_350, spread: 0.008, heat: 6 },
};

export const DEMON_HEALTH: Record<DemonKind, number> = {
  crawler: 55,
  brute: 260,
  wraith: 90,
};

export function waveBudget(wave: number): number {
  const safe = Math.max(1, Math.floor(wave));
  return Math.min(32, 5 + safe * 2 + Math.floor(safe / 3) * 2);
}

export function demonForSpawn(wave: number, index: number): DemonKind {
  if (wave >= 3 && index % 7 === 6) return "brute";
  if (wave >= 2 && index % 4 === 3) return "wraith";
  return "crawler";
}

export function dashVelocity(forward: { x: number; z: number }, right: { x: number; z: number }, input: { x: number; z: number }, strength = 17) {
  const x = forward.x * input.z + right.x * input.x;
  const z = forward.z * input.z + right.z * input.x;
  const length = Math.hypot(x, z);
  if (length < 0.001) return { x: forward.x * strength, z: forward.z * strength };
  return { x: (x / length) * strength, z: (z / length) * strength };
}

export function canJump(jumpsUsed: number): boolean {
  return Number.isFinite(jumpsUsed) && jumpsUsed < 2;
}

export function comboMultiplier(combo: number): number {
  return 1 + Math.min(4, Math.max(0, Math.floor(combo))) * 0.25;
}

export function eliminationScore(kind: DemonKind, combo: number): number {
  const base = kind === "brute" ? 400 : kind === "wraith" ? 175 : 100;
  return Math.round(base * comboMultiplier(combo));
}

export function applyDamage(health: number, damage: number): { health: number; killed: boolean } {
  const next = Math.max(0, health - Math.max(0, damage));
  return { health: next, killed: next === 0 };
}

export function shotIntervalMs(weapon: InfernalWeapon): number {
  return 60_000 / weapon.rpm;
}

export function coolHeat(heat: number, deltaSeconds: number): number {
  return Math.max(0, heat - Math.max(0, deltaSeconds) * 28);
}

export function arenaBound(value: number, radius = 28): number {
  return Math.max(-radius, Math.min(radius, value));
}

export function accelerateVelocity(
  velocity: { x: number; z: number },
  wishDirection: { x: number; z: number },
  acceleration: number,
  maxWishSpeed: number,
  deltaSeconds: number,
) {
  const wishLength = Math.hypot(wishDirection.x, wishDirection.z);
  if (wishLength < 0.001) return { ...velocity };
  const wishX = wishDirection.x / wishLength;
  const wishZ = wishDirection.z / wishLength;
  const currentSpeed = velocity.x * wishX + velocity.z * wishZ;
  const addSpeed = Math.max(0, maxWishSpeed - currentSpeed);
  const accelerationSpeed = Math.min(addSpeed, acceleration * maxWishSpeed * Math.max(0, deltaSeconds));
  return { x: velocity.x + wishX * accelerationSpeed, z: velocity.z + wishZ * accelerationSpeed };
}

export function applyGroundFriction(velocity: { x: number; z: number }, friction: number, deltaSeconds: number) {
  const speed = Math.hypot(velocity.x, velocity.z);
  if (speed < 0.001) return { x: 0, z: 0 };
  const nextSpeed = Math.max(0, speed - speed * Math.max(0, friction) * Math.max(0, deltaSeconds));
  const ratio = nextSpeed / speed;
  return { x: velocity.x * ratio, z: velocity.z * ratio };
}

export function splashDamage(baseDamage: number, distance: number, radius: number) {
  if (radius <= 0 || distance >= radius) return 0;
  return Math.round(Math.max(0, baseDamage) * (1 - Math.max(0, distance) / radius));
}
