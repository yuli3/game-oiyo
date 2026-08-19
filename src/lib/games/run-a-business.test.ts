import { describe, expect, it } from "vitest";
import {
  HORIZON_DAYS,
  START_CASH_CENTS,
  forecastShift,
  morning,
  playDay,
  playPeriod,
  startRun,
} from "./run-a-business";

describe("run-a-business engine", () => {
  it("uses the same morning for the same seed and day", () => {
    expect(morning("alpha", 1)).toEqual(morning("alpha", 1));
    expect(morning("alpha", 1)).not.toEqual(morning("beta", 1));
    expect(morning("alpha", 1)).not.toEqual(morning("alpha", 2));
  });

  it("starts a ramen day run with $100 and empty stock", () => {
    const run = startRun({ seed: "alpha", stall: "ramen", horizon: "day" });
    expect(run.cashCents).toBe(START_CASH_CENTS);
    expect(run.currency).toBe("USD");
    expect(run.day).toBe(1);
    expect(run.stock).toEqual({ noodles: 0, soup: 0, topping: 0 });
    expect(run.bust).toBe(false);
  });

  it("sells nothing when stock is empty", () => {
    const run = startRun({ seed: "alpha" });
    const after = playDay(run, { buy: { noodles: 0, soup: 0, topping: 0 }, priceCents: 400, richness: 1 });
    expect(after.result?.sold).toBe(0);
    expect(after.result?.revenueCents).toBe(0);
    expect(after.cashCents).toBe(START_CASH_CENTS);
  });

  it("turns leftover ingredients into waste cost", () => {
    const run = startRun({ seed: "s6" });
    const after = playDay(run, {
      buy: { noodles: 20, soup: 20, topping: 20 },
      priceCents: 900,
      richness: 1,
    });
    expect(after.result?.wasteCents).toBeGreaterThan(0);
    expect(after.result?.sold).toBeLessThan(20);
  });

  it("can finish a day in profit with cold weather and a fair price", () => {
    const run = startRun({ seed: "s10" });
    expect(morning("s10", 1).weather).toBe("cold");
    const after = playDay(run, {
      buy: { noodles: 18, soup: 18, topping: 18 },
      priceCents: 400,
      richness: 1,
    });
    expect(after.result?.profitCents).toBeGreaterThan(0);
    expect(after.cashCents).toBeGreaterThan(0);
  });

  it("can finish a day in loss after a food scare and leftovers", () => {
    const run = startRun({ seed: "s6" });
    expect(morning("s6", 1).eventId).toBe("food_scare");
    const after = playDay(run, {
      buy: { noodles: 24, soup: 24, topping: 24 },
      priceCents: 700,
      richness: 2,
    });
    expect(after.result?.profitCents).toBeLessThan(0);
  });

  it("is bust when cash and stock are both gone", () => {
    let run = startRun({ seed: "s6", cashCents: 75 });
    run = playDay(run, {
      buy: { noodles: 1, soup: 1, topping: 0 },
      priceCents: 900,
      richness: 0,
    });
    expect(run.cashCents).toBe(0);
    expect(run.stock.noodles + run.stock.soup + run.stock.topping).toBe(0);
    expect(run.bust).toBe(true);
  });

  it("does not write the shared arcade bests key", () => {
    const src = require("node:fs").readFileSync("src/lib/games/run-a-business.ts", "utf8") as string;
    expect(src).not.toContain("oiyo:game-bests:v1");
    expect(src).toContain("oiyo:game-run-a-business");
  });

  it("sells more lemonade than ramen on a hot day", () => {
    expect(morning("s6", 1).weather).toBe("hot");
    const ramen = playDay(startRun({ seed: "s6", stall: "ramen" }), {
      buy: { noodles: 20, soup: 20, topping: 20 },
      priceCents: 400,
      richness: 1,
    });
    const drink = playDay(startRun({ seed: "s6", stall: "lemonade" }), {
      buy: { lemons: 20, sugar: 20, ice: 20 },
      priceCents: 250,
      richness: 1,
    });
    expect(drink.result?.sold ?? 0).toBeGreaterThan(ramen.result?.sold ?? 0);
  });

  it("forecasts the same sold count the day books will record", () => {
    const run = startRun({ seed: "s10" });
    const prep = { buy: { noodles: 18, soup: 18, topping: 18 }, priceCents: 400, richness: 1 as const };
    expect(forecastShift(run, prep).sold).toBe(playDay(run, prep).result?.sold);
  });

  it("charges pc-bang overhead even when nobody comes", () => {
    const after = playDay(startRun({ seed: "s6", stall: "pcbang", cashCents: 2000 }), {
      buy: { snacks: 0, drinks: 0, seats: 4 },
      priceCents: 900,
      richness: 0,
    });
    expect(after.result?.sold).toBe(0);
    expect(after.cashCents).toBeLessThan(2000);
    expect(after.result?.profitCents ?? 0).toBeLessThan(0);
  });

  it("keeps retail leftover as inventory instead of waste", () => {
    const after = playDay(startRun({ seed: "s10", stall: "retail" }), {
      buy: { cases: 20, shelf: 4 },
      priceCents: 500,
      richness: 1,
    });
    expect(after.result?.wasteCents).toBe(0);
    expect(after.stock.cases).toBeGreaterThan(0);
  });

  it("gives a bulk discount when retail buys a full case lot", () => {
    const small = forecastShift(startRun({ seed: "s10", stall: "retail" }), {
      buy: { cases: 4, shelf: 4 },
      priceCents: 500,
      richness: 1,
    });
    const bulk = forecastShift(startRun({ seed: "s10", stall: "retail" }), {
      buy: { cases: 10, shelf: 8 },
      priceCents: 500,
      richness: 1,
    });
    expect(bulk.costs.cases).toBeLessThan(small.costs.cases);
  });

  it("charges salon labor even when chairs stay empty", () => {
    const after = playDay(startRun({ seed: "s6", stall: "salon", cashCents: 2000 }), {
      buy: { dye: 0, shampoo: 0, chairs: 3 },
      priceCents: 2000,
      richness: 0,
    });
    expect(after.result?.overheadCents).toBeGreaterThan(0);
    expect(after.cashCents).toBeLessThan(2000);
  });

  it("runs a week as seven days and keeps the sheet in balance", () => {
    const after = playPeriod(startRun({ seed: "s10", stall: "ramen", horizon: "week" }), {
      buy: { noodles: 12, soup: 12, topping: 12 },
      priceCents: 400,
      richness: 1,
    });
    expect(after.period?.sold).toBeGreaterThan(0);
    expect(after.day).toBe(1 + HORIZON_DAYS.week);
    const sheet = after.sheet;
    expect(sheet).toBeTruthy();
    expect(sheet!.assetsCents).toBe(sheet!.liabilitiesCents + sheet!.equityCents);
  });

  it("depreciates equipment without taking the cash", () => {
    const run = startRun({ seed: "alpha", stall: "ramen" });
    const after = playDay(run, { buy: { noodles: 0, soup: 0, topping: 0 }, priceCents: 400, richness: 1 });
    expect(after.equipmentCents).toBeLessThan(run.equipmentCents);
    expect(after.cashCents).toBe(START_CASH_CENTS);
    expect(after.result?.depreciationCents).toBeGreaterThan(0);
  });
});
