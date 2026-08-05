export type TempestWeapon = "rifle" | "heavy" | "rocket";
export type TempestEnemy = "rifleman" | "rocketeer" | "shield" | "boss";

export const WEAPONS = {
  rifle: { damage: 12, cooldown: 0.13, ammo: Infinity, speed: 760 },
  heavy: { damage: 9, cooldown: 0.055, ammo: 180, speed: 900 },
  rocket: { damage: 90, cooldown: 0.72, ammo: 12, speed: 470 },
} as const;

export const ENEMY_HEALTH: Record<TempestEnemy, number> = {
  rifleman: 36,
  rocketeer: 55,
  shield: 110,
  boss: 1_800,
};

export function weaponDrop(kills: number): TempestWeapon | null {
  if (kills > 0 && kills % 14 === 0) return "rocket";
  if (kills > 0 && kills % 7 === 0) return "heavy";
  return null;
}

export function applyTempestDamage(health: number, damage: number, armored = false) {
  const dealt = Math.max(0, damage) * (armored ? 0.45 : 1);
  const next = Math.max(0, health - dealt);
  return { health: next, killed: next === 0, dealt };
}

export function blastDamage(base: number, distance: number, radius: number) {
  if (radius <= 0 || distance >= radius) return 0;
  return Math.round(Math.max(0, base) * (1 - Math.max(0, distance) / radius));
}

export function structureStage(health: number, maxHealth: number) {
  if (maxHealth <= 0 || health <= 0) return 3;
  const ratio = health / maxHealth;
  if (ratio <= 0.33) return 2;
  if (ratio <= 0.66) return 1;
  return 0;
}

export function missionScore(kills: number, structures: number, bossDamage: number, seconds: number) {
  return Math.max(0, Math.round(kills * 125 + structures * 600 + bossDamage * 2 + Math.max(0, 150 - seconds) * 20));
}

export function cameraShake(impact: number, distance: number) {
  return Math.min(22, Math.max(0, impact) / Math.max(1, distance * 0.22));
}
