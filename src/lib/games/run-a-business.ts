export const START_CASH_CENTS = 10_000;
export const SAVE_KEY = "oiyo:game-run-a-business:v1";
export const BEST_KEY = "oiyo:game-run-a-business-best:v1";

export type Weather = "clear" | "hot" | "cold" | "rain";
export type EventId = "none" | "overtime" | "food_scare" | "cost_hike";
export type StallId = "ramen" | "lemonade" | "pcbang" | "salon" | "retail";
export type HorizonId = "day" | "week" | "month" | "year";
export type Richness = 0 | 1 | 2;
export type Stock = Record<string, number>;

export const HORIZON_DAYS: Record<HorizonId, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 360,
};

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
  depreciationCents: number;
  profitCents: number;
}

export interface BalanceSheet {
  cashCents: number;
  inventoryCents: number;
  equipmentCents: number;
  assetsCents: number;
  liabilitiesCents: number;
  equityCents: number;
}

export interface RunState {
  seed: string;
  stall: StallId;
  horizon: HorizonId;
  currency: "USD";
  cashCents: number;
  startCashCents: number;
  day: number;
  stock: Stock;
  equipmentCents: number;
  retainedCents: number;
  bust: boolean;
  result?: DayBooks;
  period?: DayBooks;
  sheet?: BalanceSheet;
}

export interface StallPack {
  id: StallId;
  keys: string[];
  units: Stock;
  bulkOf?: number;
  bulkUnits?: Stock;
  refPrice: number;
  weather: Record<Weather, number>;
  overheadCents: number;
  equipmentCents: number;
  depPerDay: number;
  perishable: boolean;
  seatKey?: string;
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
    equipmentCents: 1_500,
    depPerDay: 50,
    perishable: true,
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
    equipmentCents: 800,
    depPerDay: 25,
    perishable: true,
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
    equipmentCents: 4_000,
    depPerDay: 80,
    perishable: false,
    seatKey: "seats",
    recipe: (r) => ({ snacks: r > 0 ? 1 : 0, drinks: r > 0 ? 1 : 0, seats: 0 }),
    empty: () => zero(["snacks", "drinks", "seats"]),
  },
  salon: {
    id: "salon",
    keys: ["dye", "shampoo", "chairs"],
    units: { dye: 80, shampoo: 40, chairs: 0 },
    refPrice: 1_200,
    weather: { clear: 1, hot: 2, cold: -2, rain: 4 },
    overheadCents: 350,
    equipmentCents: 2_500,
    depPerDay: 60,
    perishable: false,
    seatKey: "chairs",
    recipe: (r) => ({ dye: r > 0 ? 1 : 0, shampoo: 1, chairs: 0 }),
    empty: () => zero(["dye", "shampoo", "chairs"]),
  },
  retail: {
    id: "retail",
    keys: ["cases", "shelf"],
    units: { cases: 120, shelf: 0 },
    bulkOf: 10,
    bulkUnits: { cases: 90 },
    refPrice: 500,
    weather: { clear: 0, hot: -2, cold: 2, rain: 3 },
    overheadCents: 250,
    equipmentCents: 2_000,
    depPerDay: 40,
    perishable: false,
    recipe: () => ({ cases: 1, shelf: 0 }),
    empty: () => zero(["cases", "shelf"]),
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
  const pack = STALLS[stall];
  const cash = opts.cashCents ?? START_CASH_CENTS;
  return {
    seed: opts.seed,
    stall,
    horizon: opts.horizon ?? "day",
    currency: "USD",
    cashCents: cash,
    startCashCents: cash,
    day: 1,
    stock: pack.empty(),
    equipmentCents: pack.equipmentCents,
    retainedCents: 0,
    bust: false,
  };
}

function unitCosts(stall: StallPack, eventId: EventId, want: Stock): Stock {
  const hike = eventId === "cost_hike" ? 1.25 : 1;
  return Object.fromEntries(
    stall.keys.map((key) => {
      const bulk = stall.bulkOf && stall.bulkUnits?.[key] && (want[key] ?? 0) >= stall.bulkOf
        ? stall.bulkUnits[key]
        : stall.units[key] ?? 0;
      return [key, Math.round(bulk * hike)];
    }),
  );
}

function demandFor(stall: StallPack, card: Morning, priceCents: number, richness: Richness): number {
  let demand = 12 + stall.weather[card.weather];
  if (card.eventId === "overtime") demand += 8;
  if (card.eventId === "food_scare") demand -= stall.id === "pcbang" || stall.id === "salon" || stall.id === "retail" ? 2 : 10;
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

function inventoryValue(stock: Stock, costs: Stock, keys: string[]): number {
  return keys.reduce((sum, key) => sum + (stock[key] ?? 0) * (costs[key] ?? 0), 0);
}

function capacity(stock: Stock, recipe: Stock, stall: StallPack, prep: Prep): number {
  if (stall.seatKey) {
    const seats = Math.max(stock[stall.seatKey] ?? 0, prep.buy[stall.seatKey] ?? 0);
    return Math.max(0, seats);
  }
  if (stall.id === "retail") {
    const shelf = Math.max(stock.shelf ?? 0, prep.buy.shelf ?? 0);
    return Math.min(stock.cases ?? 0, shelf > 0 ? shelf : stock.cases ?? 0);
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
  const costs = unitCosts(stall, card.eventId, prep.buy);
  const buy = affordableBuy(run.cashCents, prep.buy, costs, stall.keys);
  const stock: Stock = { ...stall.empty() };
  for (const key of stall.keys) stock[key] = (run.stock[key] ?? 0) + (buy[key] ?? 0);
  const recipe = stall.recipe(prep.richness);
  const demand = demandFor(stall, card, prep.priceCents, prep.richness);
  const sold = Math.min(demand, capacity(stock, recipe, stall, prep));
  return { stall, card, costs, buy, stock, recipe, demand, sold };
}

function sheetFor(run: RunState, stock: Stock, costs: Stock, stall: StallPack): BalanceSheet {
  const inventoryCents = inventoryValue(stock, costs, stall.keys.filter((key) => key !== stall.seatKey && key !== "shelf"));
  const assetsCents = run.cashCents + inventoryCents + run.equipmentCents;
  const liabilitiesCents = 0;
  const equityCents = run.startCashCents + stall.equipmentCents + run.retainedCents;
  return {
    cashCents: run.cashCents,
    inventoryCents,
    equipmentCents: run.equipmentCents,
    assetsCents,
    liabilitiesCents,
    equityCents,
  };
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
  const leftover = stall.perishable ? stall.empty() : { ...stock, ...(stall.seatKey ? { [stall.seatKey]: 0 } : {}), shelf: stall.id === "retail" ? 0 : stock.shelf };
  const wasteCents = stall.perishable ? inventoryValue(stock, costs, stall.keys) : 0;
  const overheadCents = stall.overheadCents;
  const depreciationCents = Math.min(run.equipmentCents, stall.depPerDay);
  cashCents += revenueCents - overheadCents;
  const profitCents = revenueCents - cogsCents - wasteCents - overheadCents - depreciationCents;
  const equipmentCents = run.equipmentCents - depreciationCents;
  const retainedCents = run.retainedCents + profitCents;
  const bust = cashCents <= 0;
  const next: RunState = {
    ...run,
    cashCents,
    day: run.day + 1,
    stock: leftover,
    equipmentCents,
    retainedCents,
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
      depreciationCents,
      profitCents,
    },
  };
  next.sheet = sheetFor(next, leftover, costs, stall);
  return next;
}

export function playPeriod(run: RunState, prep: Prep): RunState {
  const days = HORIZON_DAYS[run.horizon] ?? 1;
  let current = run;
  const period: DayBooks = {
    weather: morning(run.seed, run.day).weather,
    eventId: morning(run.seed, run.day).eventId,
    sold: 0,
    revenueCents: 0,
    cogsCents: 0,
    wasteCents: 0,
    purchaseCents: 0,
    overheadCents: 0,
    depreciationCents: 0,
    profitCents: 0,
  };
  for (let i = 0; i < days; i += 1) {
    if (current.bust) break;
    current = playDay(current, prep);
    const day = current.result;
    if (!day) continue;
    period.sold += day.sold;
    period.revenueCents += day.revenueCents;
    period.cogsCents += day.cogsCents;
    period.wasteCents += day.wasteCents;
    period.purchaseCents += day.purchaseCents;
    period.overheadCents += day.overheadCents;
    period.depreciationCents += day.depreciationCents;
    period.profitCents += day.profitCents;
    period.weather = day.weather;
    period.eventId = day.eventId;
  }
  return { ...current, period };
}

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
