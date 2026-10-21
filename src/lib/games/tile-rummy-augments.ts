// Augments and chaos tables for number tiles (2026-10-21 quality pass).
// Match mode only: the daily table keeps one ruleset so its records compare.
// Each augment either bends the deal (variant) or turns on a table aid.

import { mulberry32 } from "./daily";
import type { AiLevel } from "./ai/types";
import type { RummyVariant } from "./tile-rummy";

export type AugmentId =
  | "opener25"
  | "starJoker"
  | "slimHand"
  | "peek"
  | "glowHint"
  | "calmRival"
  | "mulligan"
  | "heavyRival";

export type ChaosId = "shortPool" | "starRain";

export interface AugmentDef {
  id: AugmentId;
  variant?: RummyVariant;
  /** AI level change, applied after the player's pick and floored at 1. */
  levelShift?: number;
}

export const AUGMENTS: readonly AugmentDef[] = [
  { id: "opener25", variant: { firstMeld: 25 } },
  { id: "starJoker", variant: { startJoker: true } },
  { id: "slimHand", variant: { handSize: 13 } },
  { id: "peek" },
  { id: "glowHint" },
  { id: "calmRival", levelShift: -1 },
  { id: "mulligan" },
  { id: "heavyRival", variant: { rivalHandSize: 15 } },
];

export const CHAOS: Record<ChaosId, RummyVariant> = {
  shortPool: { poolLimit: 24 },
  starRain: { jokersNearTop: true },
};

/** One in five match tables bends a rule. */
export const CHAOS_CHANCE = 0.2;

export function rollAugments(seed: number, count = 3): AugmentId[] {
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const ids = AUGMENTS.map((augment) => augment.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, count);
}

export function rollChaos(seed: number): ChaosId | null {
  const rng = mulberry32((seed ^ 0x51ed270b) >>> 0);
  if (rng() >= CHAOS_CHANCE) return null;
  return rng() < 0.5 ? "shortPool" : "starRain";
}

export function augmentDef(id: AugmentId): AugmentDef {
  const found = AUGMENTS.find((augment) => augment.id === id);
  if (!found) throw new Error(`unknown augment ${id}`);
  return found;
}

export function tableVariant(augment: AugmentId | null, chaos: ChaosId | null): RummyVariant {
  return { ...(chaos ? CHAOS[chaos] : {}), ...(augment ? augmentDef(augment).variant ?? {} : {}) };
}

export function shiftedLevel(level: AiLevel, augment: AugmentId | null): AiLevel {
  const shift = augment ? augmentDef(augment).levelShift ?? 0 : 0;
  return Math.min(3, Math.max(1, level + shift)) as AiLevel;
}

/** Titles and table themes unlock by lifetime wins, read from the game record. */
export const TITLE_STEPS = [0, 5, 15, 40] as const;
export type TableTheme = "felt" | "walnut" | "midnight";
export const THEME_UNLOCK: Record<TableTheme, number> = { felt: 0, walnut: 5, midnight: 15 };

export function titleTier(wins: number): number {
  let tier = 0;
  TITLE_STEPS.forEach((step, index) => {
    if (wins >= step) tier = index;
  });
  return tier;
}

export function unlockedThemes(wins: number): TableTheme[] {
  return (Object.keys(THEME_UNLOCK) as TableTheme[]).filter((theme) => wins >= THEME_UNLOCK[theme]);
}

/** Result stars: a fast win earns three, any win two, a draw one. */
export function resultStars(outcome: "w" | "l" | "d" | null, ownTurns: number): number {
  if (outcome === "w") return ownTurns <= 12 ? 3 : 2;
  if (outcome === "d") return 1;
  return 0;
}
