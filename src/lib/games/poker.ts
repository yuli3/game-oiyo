// Texas Hold'em hand evaluation — the teachable core of poker: "what beats what".
// Pure and deterministic; the same 5–7 cards always resolve to the same ranked
// hand, so the evaluator can be unit-tested and reused by the UI and any trainer.

import { mulberry32, shuffle } from "./daily";

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

/** Rank 2..14, where 11=J, 12=Q, 13=K, 14=A. Ace is high (and low in the wheel). */
export interface Card {
  suit: Suit;
  rank: number;
}

export const SUITS: readonly Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const RANKS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/** Category ordinals, high beats low. Names are stable keys the UI localizes. */
export type HandCategory =
  | "straight-flush"
  | "four-of-a-kind"
  | "full-house"
  | "flush"
  | "straight"
  | "three-of-a-kind"
  | "two-pair"
  | "one-pair"
  | "high-card";

export const CATEGORY_ORDER: Record<HandCategory, number> = {
  "straight-flush": 9,
  "four-of-a-kind": 8,
  "full-house": 7,
  flush: 6,
  straight: 5,
  "three-of-a-kind": 4,
  "two-pair": 3,
  "one-pair": 2,
  "high-card": 1,
};

export interface HandValue {
  category: HandCategory;
  /** Tiebreakers, most significant first (e.g. [pairRank, ...kickers]). */
  tiebreak: number[];
  /** The exact 5 cards that make the hand, for display. */
  best5: Card[];
}

/** A fresh, ordered 52-card deck. */
export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  return deck;
}

/** Deterministic shuffle given a numeric seed (reuses the shared RNG). */
export function shuffleDeck(deck: readonly Card[], seed: number): Card[] {
  return shuffle(deck, mulberry32(seed));
}

/** Rank → count map, and a suit → count map, for a set of cards. */
function tally(cards: readonly Card[]) {
  const rankCount = new Map<number, number>();
  const suitCount = new Map<Suit, number>();
  for (const c of cards) {
    rankCount.set(c.rank, (rankCount.get(c.rank) ?? 0) + 1);
    suitCount.set(c.suit, (suitCount.get(c.suit) ?? 0) + 1);
  }
  return { rankCount, suitCount };
}

/** Highest straight top-card among the given ranks, or 0 if none. Handles the wheel (A-2-3-4-5 → top 5). */
function straightTop(ranks: Set<number>): number {
  const has = (r: number) => ranks.has(r) || (r === 1 && ranks.has(14)); // ace as low
  for (let top = 14; top >= 5; top--) {
    if (has(top) && has(top - 1) && has(top - 2) && has(top - 3) && has(top - 4)) return top;
  }
  return 0;
}

/** Evaluate exactly 5 cards into a comparable HandValue. */
export function evaluate5(cards: Card[]): HandValue {
  if (cards.length !== 5) throw new Error("evaluate5 needs exactly 5 cards");
  const { rankCount, suitCount } = tally(cards);
  const isFlush = [...suitCount.values()].some((n) => n === 5);
  const rankSet = new Set(cards.map((c) => c.rank));
  const sTop = straightTop(rankSet);

  // Ranks grouped by count desc, then rank desc — the standard tiebreak ordering.
  const grouped = [...rankCount.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const counts = grouped.map((g) => g[1]);
  const byGroup = grouped.map((g) => g[0]);

  if (isFlush && sTop) return { category: "straight-flush", tiebreak: [sTop], best5: cards };
  if (counts[0] === 4) return { category: "four-of-a-kind", tiebreak: byGroup, best5: cards };
  if (counts[0] === 3 && counts[1] === 2) return { category: "full-house", tiebreak: byGroup, best5: cards };
  if (isFlush) return { category: "flush", tiebreak: [...cards.map((c) => c.rank)].sort((a, b) => b - a), best5: cards };
  if (sTop) return { category: "straight", tiebreak: [sTop], best5: cards };
  if (counts[0] === 3) return { category: "three-of-a-kind", tiebreak: byGroup, best5: cards };
  if (counts[0] === 2 && counts[1] === 2) return { category: "two-pair", tiebreak: byGroup, best5: cards };
  if (counts[0] === 2) return { category: "one-pair", tiebreak: byGroup, best5: cards };
  return { category: "high-card", tiebreak: byGroup, best5: cards };
}

/** Lexicographic compare: category first, then tiebreakers. >0 if a beats b. */
export function compareHands(a: HandValue, b: HandValue): number {
  const c = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
  if (c !== 0) return c;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i++) {
    const d = (a.tiebreak[i] ?? 0) - (b.tiebreak[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** All k-combinations of an array (k small, here 5 of up to 7). */
function combinations<T>(arr: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const pick = (start: number, combo: T[]) => {
    if (combo.length === k) { out.push(combo); return; }
    for (let i = start; i < arr.length; i++) pick(i + 1, [...combo, arr[i]]);
  };
  pick(0, []);
  return out;
}

/** Best 5-card hand from 5–7 cards (2 hole + up to 5 community). */
export function evaluateBest(cards: Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) throw new Error("evaluateBest needs 5–7 cards");
  let best: HandValue | null = null;
  for (const combo of combinations(cards, 5)) {
    const v = evaluate5(combo);
    if (!best || compareHands(v, best) > 0) best = v;
  }
  return best!;
}

/** Compare two players' 7-card sets. 1 = a wins, -1 = b wins, 0 = split pot. */
export function compareShowdown(a: Card[], b: Card[]): -1 | 0 | 1 {
  const r = compareHands(evaluateBest(a), evaluateBest(b));
  return r > 0 ? 1 : r < 0 ? -1 : 0;
}
