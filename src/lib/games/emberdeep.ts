export const EMBERDEEP_SAVE_KEY = "oiyo:emberdeep:v1";

export type HeroClass = "spellblade" | "warden" | "arcanist";
export type SpellId = "ember" | "frost" | "storm";
export type BranchId = "crypt" | "foundry";

export interface HeroStats {
  maxHealth: number;
  maxMana: number;
  speed: number;
  attack: number;
}

export const HERO_STATS: Record<HeroClass, HeroStats> = {
  spellblade: { maxHealth: 140, maxMana: 100, speed: 230, attack: 18 },
  warden: { maxHealth: 190, maxMana: 70, speed: 195, attack: 22 },
  arcanist: { maxHealth: 105, maxMana: 150, speed: 215, attack: 14 },
};

export const SPELL_COST: Record<SpellId, number> = {
  ember: 24,
  frost: 32,
  storm: 45,
};

export function comboDamage(base: number, comboStep: number, air = false): number {
  const step = Math.max(0, Math.min(3, Math.floor(comboStep)));
  const multipliers = [1, 1.18, 1.42, 1.9];
  return Math.round(Math.max(0, base) * multipliers[step] * (air ? 1.25 : 1));
}

export function canCast(mana: number, spell: SpellId): boolean {
  return explainCastFailure(mana, spell) === null;
}

export function explainCastFailure(mana: number, spell: SpellId): "mana" | null {
  return Number.isFinite(mana) && mana >= SPELL_COST[spell] ? null : "mana";
}

export function spendMana(mana: number, spell: SpellId): number {
  return canCast(mana, spell) ? mana - SPELL_COST[spell] : mana;
}

export function laneDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) * 1.8);
}

export function attackConnects(
  attacker: { x: number; y: number; facing: number },
  target: { x: number; y: number },
  range: number,
): boolean {
  const ahead = (target.x - attacker.x) * attacker.facing;
  return ahead >= -12 && ahead <= range && Math.abs(target.y - attacker.y) <= 48;
}

export function chooseBranch(leftVotes: number, rightVotes: number): BranchId {
  return rightVotes > leftVotes ? "foundry" : "crypt";
}

export function hitStopFrames(damage: number, finisher = false): number {
  if (finisher) return 9;
  return Math.max(2, Math.min(7, Math.round(Math.max(0, damage) / 8)));
}

export function scoreForHit(damage: number, combo: number, killed: boolean): number {
  const chain = 1 + Math.min(20, Math.max(0, combo)) * 0.08;
  return Math.round(Math.max(0, damage) * 10 * chain + (killed ? 500 : 0));
}

export interface EmberdeepSave {
  version: 1;
  bestScore: number;
  deepestRoom: number;
  preferredHero: HeroClass;
}

export function parseEmberdeepSave(raw: string | null): EmberdeepSave | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<EmberdeepSave>;
    if (
      value.version !== 1 ||
      !Number.isFinite(value.bestScore) ||
      !Number.isFinite(value.deepestRoom) ||
      !["spellblade", "warden", "arcanist"].includes(String(value.preferredHero))
    ) return null;
    return {
      version: 1,
      bestScore: Math.max(0, Math.floor(value.bestScore!)),
      deepestRoom: Math.max(0, Math.floor(value.deepestRoom!)),
      preferredHero: value.preferredHero!,
    };
  } catch {
    return null;
  }
}
