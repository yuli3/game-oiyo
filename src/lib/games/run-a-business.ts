export const START_CASH_CENTS = 10_000;
export const SAVE_KEY = "oiyo:game-run-a-business:v1";
export const BEST_KEY = "oiyo:game-run-a-business-best:v1";

export type Weather = "clear" | "hot" | "cold" | "rain";
export type EventId = "none" | "overtime" | "food_scare" | "cost_hike";
export type StallId = "ramen";
export type HorizonId = "day";
export type Richness = 0 | 1 | 2;

export interface Stock {
  noodles: number;
  soup: number;
  topping: number;
}

export interface BuyOrder extends Stock {}

export interface Prep {
  buy: BuyOrder;
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

const WEATHERS: Weather[] = ["clear", "hot", "cold", "rain"];
const EVENTS: EventId[] = ["none", "overtime", "food_scare", "cost_hike"];

const UNIT = { noodles: 40, soup: 35, topping: 25 };

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
  return {
    seed: opts.seed,
    stall: opts.stall ?? "ramen",
    horizon: opts.horizon ?? "day",
    currency: "USD",
    cashCents: opts.cashCents ?? START_CASH_CENTS,
    day: 1,
    stock: { noodles: 0, soup: 0, topping: 0 },
    bust: false,
  };
}

function unitCosts(eventId: EventId) {
  const hike = eventId === "cost_hike" ? 1.25 : 1;
  return {
    noodles: Math.round(UNIT.noodles * hike),
    soup: Math.round(UNIT.soup * hike),
    topping: Math.round(UNIT.topping * hike),
  };
}

function toppingPerBowl(richness: Richness): number {
  if (richness <= 0) return 0;
  return richness;
}

function demandFor(morningCard: Morning, priceCents: number, richness: Richness): number {
  let demand = 12;
  if (morningCard.weather === "cold") demand += 8;
  if (morningCard.weather === "rain") demand += 6;
  if (morningCard.weather === "hot") demand -= 6;
  if (morningCard.eventId === "overtime") demand += 8;
  if (morningCard.eventId === "food_scare") demand -= 10;
  demand += Math.floor((400 - priceCents) / 50);
  demand += richness === 2 ? 3 : richness === 0 ? -3 : 0;
  return Math.max(0, demand);
}

function affordableBuy(cash: number, want: BuyOrder, costs: Stock): BuyOrder {
  const buy: BuyOrder = { noodles: 0, soup: 0, topping: 0 };
  let left = cash;
  for (const key of ["noodles", "soup", "topping"] as const) {
    const max = Math.max(0, Math.floor(left / costs[key]));
    const qty = Math.max(0, Math.min(want[key], max));
    buy[key] = qty;
    left -= qty * costs[key];
  }
  return buy;
}

export function playDay(run: RunState, prep: Prep): RunState {
  if (run.bust) return run;
  const card = morning(run.seed, run.day);
  const costs = unitCosts(card.eventId);
  const buy = affordableBuy(run.cashCents, prep.buy, costs);
  const purchaseCents =
    buy.noodles * costs.noodles + buy.soup * costs.soup + buy.topping * costs.topping;
  const stock: Stock = {
    noodles: run.stock.noodles + buy.noodles,
    soup: run.stock.soup + buy.soup,
    topping: run.stock.topping + buy.topping,
  };
  let cashCents = run.cashCents - purchaseCents;

  const needTopping = toppingPerBowl(prep.richness);
  const capacity = Math.min(
    stock.noodles,
    stock.soup,
    needTopping === 0 ? stock.noodles : Math.floor(stock.topping / needTopping),
  );
  const sold = Math.min(demandFor(card, prep.priceCents, prep.richness), Math.max(0, capacity));
  stock.noodles -= sold;
  stock.soup -= sold;
  stock.topping -= sold * needTopping;

  const revenueCents = sold * Math.max(0, prep.priceCents);
  const cogsCents =
    sold * (costs.noodles + costs.soup + needTopping * costs.topping);
  const wasteCents =
    stock.noodles * costs.noodles + stock.soup * costs.soup + stock.topping * costs.topping;
  cashCents += revenueCents;

  const leftover: Stock = { noodles: 0, soup: 0, topping: 0 };
  const profitCents = revenueCents - cogsCents - wasteCents;
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
      profitCents,
    },
  };
}

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
