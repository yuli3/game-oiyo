import type { AugmentTier } from "../../lib/games/augment";

/**
 * Card colours for the three augment tiers, in theme tokens so the cards follow
 * the site palette: silver is the neutral surface, gold the warning tone, and
 * prismatic the violet chart colour. 2026-10-06 (shadcn lint)
 */
export const AUGMENT_TIER_TONE: Record<AugmentTier, string> = {
  silver: "border-border bg-muted text-foreground",
  gold: "border-warning bg-warning/15 text-foreground",
  prismatic: "border-chart-4 bg-chart-4/10 text-foreground",
};
