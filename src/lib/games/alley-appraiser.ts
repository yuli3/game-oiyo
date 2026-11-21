/**
 * Alley Appraiser (골목 감정소) — an original appraisal-shop game (2026-11-21).
 *
 * Trend basis: shop/job sims led Steam Next Fest Oct 2026 (a counterfeit-spotting
 * shop demo was #1 by peak players) and shop-keeping is a steady web-portal hit.
 * The loop here is our own: customers bring old objects, the player compares each
 * one with the reference copy in the catalogue (plain look, fine marks under the
 * loupe, hidden marks under the UV lamp), then buys, haggles or refuses.
 *
 * 30 days = 30 stages (stage range 10-50). Everything is deterministic per day so a
 * day can be replayed and tested; no randomness lives in the component.
 */
import { mulberry32 } from "./daily";

export const ALLEY_DAYS = 30;
export const ALLEY_SLUG = "alley-appraiser";

export type Category = "vase" | "coin" | "watch" | "scroll" | "ring" | "stamp";
export type Visibility = "plain" | "fine" | "uv";

export interface TraitSlot {
  id: string;
  options: number;
  vis: Visibility;
}

/** Trait slots per category. The renderer draws option `n` of each slot. */
export const CATEGORY_SLOTS: Record<Category, readonly TraitSlot[]> = {
  vase: [
    { id: "shape", options: 3, vis: "plain" },
    { id: "glaze", options: 3, vis: "plain" },
    { id: "pattern", options: 3, vis: "plain" },
    { id: "handles", options: 2, vis: "plain" },
    { id: "seal", options: 3, vis: "fine" },
    { id: "uv", options: 3, vis: "uv" },
  ],
  coin: [
    { id: "metal", options: 3, vis: "plain" },
    { id: "hole", options: 2, vis: "plain" },
    { id: "glyph", options: 3, vis: "plain" },
    { id: "dots", options: 3, vis: "fine" },
    { id: "notch", options: 2, vis: "fine" },
    { id: "uv", options: 3, vis: "uv" },
  ],
  watch: [
    { id: "case", options: 3, vis: "plain" },
    { id: "hands", options: 2, vis: "plain" },
    { id: "markers", options: 3, vis: "plain" },
    { id: "crown", options: 2, vis: "plain" },
    { id: "engraving", options: 3, vis: "fine" },
    { id: "uv", options: 3, vis: "uv" },
  ],
  scroll: [
    { id: "peaks", options: 3, vis: "plain" },
    { id: "sky", options: 2, vis: "plain" },
    { id: "sealColor", options: 2, vis: "plain" },
    { id: "sealSide", options: 2, vis: "fine" },
    { id: "signature", options: 3, vis: "fine" },
    { id: "uv", options: 3, vis: "uv" },
  ],
  ring: [
    { id: "metal", options: 3, vis: "plain" },
    { id: "gem", options: 3, vis: "plain" },
    { id: "cut", options: 2, vis: "plain" },
    { id: "prongs", options: 2, vis: "fine" },
    { id: "hallmark", options: 3, vis: "fine" },
    { id: "uv", options: 3, vis: "uv" },
  ],
  stamp: [
    { id: "ink", options: 3, vis: "plain" },
    { id: "figure", options: 3, vis: "plain" },
    { id: "value", options: 3, vis: "plain" },
    { id: "perf", options: 2, vis: "fine" },
    { id: "corner", options: 3, vis: "fine" },
    { id: "uv", options: 3, vis: "uv" },
  ],
};

export const CATEGORIES: readonly Category[] = ["vase", "coin", "watch", "scroll", "ring", "stamp"];
const BASE_VALUE: Record<Category, number> = { vase: 120, coin: 40, watch: 90, scroll: 150, ring: 110, stamp: 30 };
export const MODELS_PER_CATEGORY = 3;
const MODEL_MULT = [1, 1.4, 2] as const;
/** Fakes are destroyed, not resold: buying one loses the whole price. */
export const FAKE_SCRAP_RATE = 0;

/** Day on which each tool becomes available. */
export const LOUPE_DAY = 4;
export const UV_DAY = 8;

export interface Item {
  category: Category;
  model: number;
  traits: number[];
  genuine: boolean;
  /** Market value of the genuine piece (what a genuine buy resells for). */
  value: number;
  /** Slots changed on a fake (empty for a genuine piece). */
  altered: number[];
}

export interface Customer {
  face: number;
  line: number;
  item: Item;
  ask: number;
  /** Lowest price this customer will take; one counter-offer is allowed below it. */
  floor: number;
}

export interface DayPlan {
  day: number;
  categories: Category[];
  customers: Customer[];
  target: number;
  loupe: boolean;
  uv: boolean;
}

function hash(...parts: number[]): number {
  let h = 2166136261;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function categoryIndex(c: Category): number {
  return CATEGORIES.indexOf(c);
}

/** The genuine trait vector of a catalogue model. Fixed for all players. */
export function genuineTraits(category: Category, model: number): number[] {
  const rnd = mulberry32(hash(7919, categoryIndex(category), model));
  return CATEGORY_SLOTS[category].map((s) => Math.floor(rnd() * s.options));
}

export function modelValue(category: Category, model: number): number {
  return Math.round(BASE_VALUE[category] * MODEL_MULT[model % MODEL_MULT.length]);
}

/** Categories on sale from a given day: two at first, one more every few days, all six from day 22. */
export function categoriesForDay(day: number): Category[] {
  const n = day <= 3 ? 2 : day <= 7 ? 3 : day <= 14 ? 4 : day <= 21 ? 5 : 6;
  return CATEGORIES.slice(0, n) as Category[];
}

export function customersForDay(day: number): number {
  return day <= 3 ? 3 : day <= 9 ? 4 : day <= 19 ? 5 : 6;
}

/** Which kinds of differences a fake may hide on this day. */
export function visibilitiesForDay(day: number): Visibility[] {
  if (day < LOUPE_DAY) return ["plain"];
  if (day < UV_DAY) return ["plain", "fine"];
  if (day < 16) return ["plain", "fine", "uv"];
  // Late days: fakes are subtle — no more plain giveaways.
  return ["fine", "uv"];
}

export function fakeChance(day: number): number {
  return Math.min(0.55, 0.3 + day * 0.01);
}

export function makeItem(category: Category, model: number, fake: boolean, day: number, rnd: () => number): Item {
  const traits = genuineTraits(category, model);
  const altered: number[] = [];
  if (fake) {
    const allowed = new Set(visibilitiesForDay(day));
    const slots = CATEGORY_SLOTS[category];
    const pool = slots.map((s, i) => ({ s, i })).filter(({ s }) => allowed.has(s.vis));
    const k = day >= 18 && rnd() < 0.35 ? 2 : 1;
    for (let n = 0; n < k && pool.length; n++) {
      const pick = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      const opts = pick.s.options;
      traits[pick.i] = (traits[pick.i] + 1 + Math.floor(rnd() * (opts - 1))) % opts;
      altered.push(pick.i);
    }
  }
  return { category, model, traits, genuine: altered.length === 0, value: modelValue(category, model), altered };
}

function round5(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5);
}

/** Best profit a perfect appraiser can make from this customer (0 for fakes or overpriced pieces). */
export function bestProfit(c: Customer): number {
  return c.item.genuine ? Math.max(0, c.item.value - c.floor) : 0;
}

export function buildDay(day: number): DayPlan {
  const d = Math.min(Math.max(1, Math.floor(day)), ALLEY_DAYS);
  const rnd = mulberry32(hash(20261121, d));
  const categories = categoriesForDay(d);
  const n = customersForDay(d);
  const customers: Customer[] = [];
  for (let i = 0; i < n; i++) {
    const category = categories[Math.floor(rnd() * categories.length)];
    const model = Math.floor(rnd() * MODELS_PER_CATEGORY);
    // The first customer of day 1 always brings a fair genuine deal, so the opening is a lesson, not a trap.
    const fake = d === 1 && i === 0 ? false : rnd() < fakeChance(d);
    const item = makeItem(category, model, fake, d, rnd);
    const ratio = fake ? 0.55 + rnd() * 0.5 : 0.55 + rnd() * 0.75;
    const ask = round5(item.value * ratio);
    const floor = round5(ask * (0.7 + rnd() * 0.22));
    customers.push({ face: Math.floor(rnd() * 6), line: Math.floor(rnd() * 6), item, ask: Math.max(ask, floor), floor: Math.min(floor, ask) });
  }
  // Every day must be winnable: make sure at least two customers carry a profitable genuine piece.
  let good = customers.filter((c) => bestProfit(c) > 0).length;
  for (let i = 0; good < 2 && i < customers.length; i++) {
    const c = customers[i];
    if (bestProfit(c) > 0) continue;
    const item = makeItem(c.item.category, c.item.model, false, d, rnd);
    const ask = round5(item.value * (0.6 + rnd() * 0.25));
    customers[i] = { ...c, item, ask, floor: round5(ask * 0.85) };
    good++;
  }
  const best = customers.reduce((sum, c) => sum + bestProfit(c), 0);
  const target = Math.max(10, Math.round((best * (0.4 + d * 0.006)) / 5) * 5);
  return { day: d, categories, customers, target, loupe: d >= LOUPE_DAY, uv: d >= UV_DAY };
}

export type Decision = { kind: "buy" } | { kind: "refuse" } | { kind: "counter"; offer: number };

export type CounterResult =
  | { kind: "accepted"; price: number }
  /** Customer names their floor; the player may still take it or pass. */
  | { kind: "countered"; price: number };

/** A counter-offer at or above the floor is accepted; below it, the customer names their floor once. */
export function counterOffer(c: Customer, offer: number): CounterResult {
  const o = Math.max(0, Math.round(offer));
  if (o >= c.floor) return { kind: "accepted", price: Math.min(o, c.ask) };
  return { kind: "countered", price: c.floor };
}

/** Profit (can be negative) of paying `price` for this customer's item. */
export function dealProfit(item: Item, price: number): number {
  const resale = item.genuine ? item.value : Math.round(item.value * FAKE_SCRAP_RATE);
  return resale - price;
}

export interface Deal {
  customer: number;
  bought: boolean;
  price: number;
  profit: number;
  genuine: boolean;
}

export function dayProfit(deals: readonly Deal[]): number {
  return deals.reduce((s, d) => s + (d.bought ? d.profit : 0), 0);
}

export function isDayCleared(plan: DayPlan, deals: readonly Deal[]): boolean {
  return dayProfit(deals) >= plan.target;
}

/** Stars for the report card: 1 = cleared, 2 = no fakes bought, 3 = also ≥ 80 % of the best possible profit. */
export function dayStars(plan: DayPlan, deals: readonly Deal[]): number {
  if (!isDayCleared(plan, deals)) return 0;
  const fakes = deals.some((d) => d.bought && !d.genuine);
  if (fakes) return 1;
  const best = plan.customers.reduce((s, c) => s + bestProfit(c), 0);
  return dayProfit(deals) >= best * 0.8 ? 3 : 2;
}

const BEST_KEY = "oiyo:alley-appraiser:best-profit:v1";

export function loadDayBests(): Record<number, number> {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const day = Number(k);
      if (Number.isInteger(day) && day >= 1 && day <= ALLEY_DAYS && typeof v === "number" && Number.isFinite(v)) out[day] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Saves the day's profit if it beats the stored one; returns the updated table. */
export function saveDayBest(day: number, profit: number): Record<number, number> {
  const all = loadDayBests();
  if (!(day in all) || profit > all[day]) all[day] = profit;
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(all));
  } catch {
    // Storage blocked: keep in memory only.
  }
  return all;
}

export function totalBest(bests: Record<number, number>): number {
  return Object.values(bests).reduce((s, v) => s + Math.max(0, v), 0);
}
