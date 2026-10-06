/**
 * Pick-one-of-three augments shared by the arcade games. A game owns its card
 * list and what each card does; this module only owns the draft: which three
 * cards are offered, how often a card may be taken, and how a saved pick list
 * is validated. Tents chaos keeps its own day-seeded offer because everyone
 * must see the same three cards there; here the offer follows the run's seed.
 * 2026-10-06
 */
export type AugmentTier = "silver" | "gold" | "prismatic";

export interface AugmentDef<Id extends string = string> {
  id: Id;
  tier: AugmentTier;
  /** How many times one run may take this card. */
  max: number;
}

export type AugmentOwned<Id extends string = string> = Partial<Record<Id, number>>;

/** Rarer tiers are drawn less often. The weight is per card, not per tier. */
export const AUGMENT_TIER_WEIGHT: Record<AugmentTier, number> = { silver: 6, gold: 3, prismatic: 1.5 };
export const AUGMENT_OFFER_SIZE = 3;

export function augmentRng(state: number) {
  const next = (Math.imul(state >>> 0, 1664525) + 1013904223) >>> 0;
  return { state: next, value: next / 0x1_0000_0000 };
}

export function augmentStack<Id extends string>(owned: AugmentOwned<Id>, id: Id): number {
  return owned[id] ?? 0;
}

export function augmentCount<Id extends string>(owned: AugmentOwned<Id>): number {
  let total = 0;
  for (const value of Object.values<number | undefined>(owned)) total += value ?? 0;
  return total;
}

export function availableAugments<Id extends string>(defs: readonly AugmentDef<Id>[], owned: AugmentOwned<Id>) {
  return defs.filter((def) => augmentStack(owned, def.id) < def.max);
}

/**
 * Up to three distinct cards, weighted by tier, drawn without replacement.
 * Returns fewer than three (down to none) once the run has taken everything.
 */
export function rollAugmentOffer<Id extends string>(
  defs: readonly AugmentDef<Id>[],
  owned: AugmentOwned<Id>,
  rng: number,
  size = AUGMENT_OFFER_SIZE,
): { offer: Id[]; rng: number } {
  const pool = availableAugments(defs, owned);
  const offer: Id[] = [];
  let state = rng >>> 0;
  while (offer.length < size && pool.length > 0) {
    const total = pool.reduce((sum, def) => sum + AUGMENT_TIER_WEIGHT[def.tier], 0);
    const roll = augmentRng(state);
    state = roll.state;
    let cursor = roll.value * total;
    let index = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      cursor -= AUGMENT_TIER_WEIGHT[pool[i].tier];
      if (cursor < 0) { index = i; break; }
    }
    offer.push(pool[index].id);
    pool.splice(index, 1);
  }
  return { offer, rng: state };
}

export function takeAugment<Id extends string>(defs: readonly AugmentDef<Id>[], owned: AugmentOwned<Id>, id: Id): AugmentOwned<Id> {
  const def = defs.find((entry) => entry.id === id);
  if (!def || augmentStack(owned, id) >= def.max) return owned;
  return { ...owned, [id]: augmentStack(owned, id) + 1 };
}

/** Saved pick lists are user-editable: keep known ids, clamp each to its cap. */
export function parseAugmentOwned<Id extends string>(defs: readonly AugmentDef<Id>[], raw: unknown): AugmentOwned<Id> {
  const owned: AugmentOwned<Id> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return owned;
  const data = raw as Record<string, unknown>;
  for (const def of defs) {
    const value = data[def.id];
    if (typeof value === "number" && Number.isInteger(value) && value > 0) owned[def.id] = Math.min(def.max, value);
  }
  return owned;
}

export function parseAugmentOffer<Id extends string>(defs: readonly AugmentDef<Id>[], owned: AugmentOwned<Id>, raw: unknown): Id[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > AUGMENT_OFFER_SIZE) return null;
  const ids = new Set(availableAugments(defs, owned).map((def) => def.id as string));
  const seen = new Set<string>();
  for (const value of raw) {
    if (typeof value !== "string" || !ids.has(value) || seen.has(value)) return null;
    seen.add(value);
  }
  return raw as Id[];
}
