export const START_CASH_CENTS = 10_000;
export const SAVE_KEY = "oiyo:game-run-a-business:v1";
export const BEST_KEY = "oiyo:game-run-a-business-best:v1";

export type Weather = "clear" | "hot" | "cold" | "rain";
export type EventId = "none" | "overtime" | "food_scare" | "cost_hike";
export type StallId = "ramen" | "lemonade" | "pcbang";
export type HorizonId = "day";
export type Richness = 0 | 1 | 2;
export type Stock = Record<string, number>;

export interface Prep {
  buy: Stock;
  priceCents: number;
  richness: Richness;
}

export interface Morning {
  weather: Weather;
  eventId: EventId;
}

export interface DayBooks {
  weather: Weather;
  eventId: EventId;
  sold: number;
  revenueCents: number;
  cogsCents: number;
  wasteCents: number;
  purchaseCents: number;
  overheadCents: number;
  profitCents: number;
}

export interface RunState {
  seed: string;
  stall: StallId;
  horizon: HorizonId;
  currency: "USD";
  cashCents: number;
  day: number;
  stock: Stock;
  bust: boolean;
  result?: DayBooks;
}

export interface StallPack {
  id: StallId;
  keys: string[];
  units: Stock;
  refPrice: number;
  weather: Record<Weather, number>;
  overheadCents: number;
  recipe: (richness: Richness) => Stock;
  empty: () => Stock;
}

const WEATHERS: Weather[] = ["clear", "hot", "cold", "rain"];
const EVENTS: EventId[] = ["none", "overtime", "food_scare", "cost_hike"];

function zero(keys: string[]): Stock {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

export const STALLS: Record<StallId, StallPack> = {
  ramen: {
    id: "ramen",
    keys: ["noodles", "soup", "topping"],
    units: { noodles: 40, soup: 35, topping: 25 },
    refPrice: 400,
    weather: { clear: 0, hot: -6, cold: 8, rain: 6 },
    overheadCents: 0,
    recipe: (r) => ({ noodles: 1, soup: 1, topping: r }),
    empty: () => zero(["noodles", "soup", "topping"]),
  },
  lemonade: {
    id: "lemonade",
    keys: ["lemons", "sugar", "ice"],
    units: { lemons: 30, sugar: 15, ice: 20 },
    refPrice: 250,
    weather: { clear: 2, hot: 10, cold: -8, rain: -10 },
    overheadCents: 0,
    recipe: (r) => ({ lemons: 1, sugar: r > 0 ? 1 : 0, ice: r >= 2 ? 2 : 1 }),
    empty: () => zero(["lemons", "sugar", "ice"]),
  },
  pcbang: {
    id: "pcbang",
    keys: ["snacks", "drinks", "seats"],
    units: { snacks: 50, drinks: 40, seats: 0 },
    refPrice: 300,
    weather: { clear: -2, hot: 2, cold: 2, rain: 8 },
    overheadCents: 400,
    recipe: (r) => ({ snacks: r > 0 ? 1 : 0, drinks: r > 0 ? 1 : 0, seats: 0 }),
    empty: () => zero(["snacks", "drinks", "seats"]),
  },
};

function fnv(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function morning(seed: string, day: number): Morning {
  const h = fnv(`${seed}:${day}`);
  return {
    weather: WEATHERS[h % 4],
    eventId: EVENTS[Math.floor(h / 4) % 4],
  };
}

export function startRun(opts: {
  seed: string;
  stall?: StallId;
  horizon?: HorizonId;
  cashCents?: number;
}): RunState {
  const stall = opts.stall ?? "ramen";
  return {
    seed: opts.seed,
    stall,
    horizon: opts.horizon ?? "day",
    currency: "USD",
    cashCents: opts.cashCents ?? START_CASH_CENTS,
    day: 1,
    stock: STALLS[stall].empty(),
    bust: false,
  };
}

function unitCosts(stall: StallPack, eventId: EventId): Stock {
  const hike = eventId === "cost_hike" ? 1.25 : 1;
  return Object.fromEntries(stall.keys.map((key) => [key, Math.round((stall.units[key] ?? 0) * hike)]));
}

function demandFor(stall: StallPack, card: Morning, priceCents: number, richness: Richness): number {
  let demand = 12 + stall.weather[card.weather];
  if (card.eventId === "overtime") demand += 8;
  if (card.eventId === "food_scare") demand -= stall.id === "pcbang" ? 2 : 10;
  demand += Math.floor((stall.refPrice - priceCents) / 50);
  demand += richness === 2 ? 3 : richness === 0 ? -3 : 0;
  return Math.max(0, demand);
}

function affordableBuy(cash: number, want: Stock, costs: Stock, keys: string[]): Stock {
  const buy: Stock = {};
  let left = cash;
  for (const key of keys) {
    const unit = costs[key] ?? 0;
    const asked = Math.max(0, want[key] ?? 0);
    if (unit <= 0) {
      buy[key] = asked;
      continue;
    }
    const max = Math.max(0, Math.floor(left / unit));
    const qty = Math.min(asked, max);
    buy[key] = qty;
    left -= qty * unit;
  }
  return buy;
}

function recipeCost(recipe: Stock, costs: Stock): number {
  return Object.entries(recipe).reduce((sum, [key, qty]) => sum + qty * (costs[key] ?? 0), 0);
}

function capacity(stock: Stock, recipe: Stock, stall: StallPack, prep: Prep): number {
  if (stall.id === "pcbang") {
    return Math.max(0, prep.buy.seats ?? 0);
  }
  let cap = Infinity;
  for (const [key, need] of Object.entries(recipe)) {
    if (need <= 0) continue;
    cap = Math.min(cap, Math.floor((stock[key] ?? 0) / need));
  }
  return Number.isFinite(cap) ? cap : 0;
}

export function forecastShift(run: RunState, prep: Prep) {
  const stall = STALLS[run.stall];
  const card = morning(run.seed, run.day);
  const costs = unitCosts(stall, card.eventId);
  const buy = affordableBuy(run.cashCents, prep.buy, costs, stall.keys);
  const stock: Stock = { ...stall.empty() };
  for (const key of stall.keys) stock[key] = (run.stock[key] ?? 0) + (buy[key] ?? 0);
  const recipe = stall.recipe(prep.richness);
  const demand = demandFor(stall, card, prep.priceCents, prep.richness);
  const sold = Math.min(demand, capacity(stock, recipe, stall, prep));
  return { stall, card, costs, buy, stock, recipe, demand, sold };
}

export function playDay(run: RunState, prep: Prep): RunState {
  if (run.bust) return run;
  const { stall, card, costs, buy, stock, recipe, sold } = forecastShift(run, prep);
  const purchaseCents = stall.keys.reduce((sum, key) => sum + (buy[key] ?? 0) * (costs[key] ?? 0), 0);
  let cashCents = run.cashCents - purchaseCents;
  for (const [key, need] of Object.entries(recipe)) {
    stock[key] = (stock[key] ?? 0) - sold * need;
  }

  const revenueCents = sold * Math.max(0, prep.priceCents);
  const cogsCents = sold * recipeCost(recipe, costs);
  const wasteCents =
    stall.id === "pcbang"
      ? 0
      : stall.keys.reduce((sum, key) => sum + (stock[key] ?? 0) * (costs[key] ?? 0), 0);
  const leftover = stall.empty();
  const overheadCents = stall.overheadCents;
  cashCents += revenueCents - overheadCents;
  const profitCents = revenueCents - cogsCents - wasteCents - overheadCents;
  const bust = cashCents <= 0;

  return {
    ...run,
    cashCents,
    day: run.day + 1,
    stock: leftover,
    bust,
    result: {
      weather: card.weather,
      eventId: card.eventId,
      sold,
      revenueCents,
      cogsCents,
      wasteCents,
      purchaseCents,
      overheadCents,
      profitCents,
    },
  };
}

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
