// Run cadence and shared-tier labels for number tiles.
// The difficulty pass line and the third chaos effect stay unset.
// A win raises the existing 1–3 level by one. That is the approved streak
// step, not a win-rate curve.

import type { AugmentTier } from "./augment";
import { rollAugmentOffer } from "./augment";
import type { AiLevel } from "./ai/types";
import { AUGMENTS, type AugmentId } from "./tile-rummy-augments";

/** Existing effects only. Counts are the work-order split: silver 4, gold 3, prism 1. */
export const AUGMENT_TIER: Record<AugmentId, AugmentTier> = {
  peek: "silver",
  glowHint: "silver",
  mulligan: "silver",
  opener25: "silver",
  slimHand: "gold",
  calmRival: "gold",
  heavyRival: "gold",
  starJoker: "prismatic",
};

export function sharedAugmentDefs() {
  return AUGMENTS.map((augment) => ({
    id: augment.id,
    tier: AUGMENT_TIER[augment.id],
    max: 1,
  }));
}

export function tierOf(id: AugmentId): AugmentTier {
  return AUGMENT_TIER[id];
}

/** Start, then every third game. Daily never calls this. */
export function runOffersAugment(index: number): boolean {
  return index >= 0 && index % 3 === 0;
}

export function runLevel(base: AiLevel, streak: number): AiLevel {
  const wins = Math.max(0, Math.floor(streak));
  return Math.min(3, base + wins) as AiLevel;
}

export function rollTieredOffer(seed: number, owned: Partial<Record<AugmentId, number>> = {}): AugmentId[] {
  return rollAugmentOffer(sharedAugmentDefs(), owned, seed >>> 0).offer;
}
