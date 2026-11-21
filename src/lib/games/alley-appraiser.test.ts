import { describe, expect, it } from "vitest";
import {
  ALLEY_DAYS,
  CATEGORIES,
  CATEGORY_SLOTS,
  bestProfit,
  buildDay,
  counterOffer,
  dayProfit,
  dayStars,
  dealProfit,
  genuineTraits,
  isDayCleared,
  visibilitiesForDay,
  type Deal,
} from "./alley-appraiser";

function perfectDeals(day: number): Deal[] {
  const plan = buildDay(day);
  return plan.customers.map((c, i) => {
    const buy = bestProfit(c) > 0;
    return { customer: i, bought: buy, price: c.floor, profit: buy ? dealProfit(c.item, c.floor) : 0, genuine: c.item.genuine };
  });
}

describe("alley appraiser", () => {
  it("ships 30 days, within the 10-50 stage range", () => {
    expect(ALLEY_DAYS).toBeGreaterThanOrEqual(10);
    expect(ALLEY_DAYS).toBeLessThanOrEqual(50);
  });

  it("builds the same day every time", () => {
    expect(buildDay(12)).toEqual(buildDay(12));
  });

  it("keeps every catalogue model's genuine traits inside each slot's options", () => {
    for (const c of CATEGORIES) {
      for (let m = 0; m < 3; m++) {
        const t = genuineTraits(c, m);
        CATEGORY_SLOTS[c].forEach((s, i) => {
          expect(t[i]).toBeGreaterThanOrEqual(0);
          expect(t[i]).toBeLessThan(s.options);
        });
      }
    }
  });

  it("makes every day winnable by a perfect appraiser, with all three stars", () => {
    for (let d = 1; d <= ALLEY_DAYS; d++) {
      const plan = buildDay(d);
      const deals = perfectDeals(d);
      expect(isDayCleared(plan, deals), `day ${d}`).toBe(true);
      expect(dayStars(plan, deals), `day ${d}`).toBe(3);
    }
  });

  it("marks fakes by changing at least one trait, and only kinds allowed that day", () => {
    let fakes = 0;
    for (let d = 1; d <= ALLEY_DAYS; d++) {
      const allowed = new Set(visibilitiesForDay(d));
      for (const c of buildDay(d).customers) {
        const ref = genuineTraits(c.item.category, c.item.model);
        const diff = c.item.traits.map((v, i) => (v !== ref[i] ? i : -1)).filter((i) => i >= 0);
        expect(diff).toEqual([...c.item.altered].sort((a, b) => a - b));
        expect(c.item.genuine).toBe(diff.length === 0);
        for (const i of diff) expect(allowed.has(CATEGORY_SLOTS[c.item.category][i].vis)).toBe(true);
        if (!c.item.genuine) fakes++;
      }
    }
    expect(fakes).toBeGreaterThan(20);
  });

  it("never asks a fake on day 1-3 to be spotted with a tool the player does not have", () => {
    for (let d = 1; d <= 3; d++) {
      for (const c of buildDay(d).customers) {
        for (const i of c.item.altered) expect(CATEGORY_SLOTS[c.item.category][i].vis).toBe("plain");
      }
    }
  });

  it("opens day 1 with a fair genuine deal", () => {
    const first = buildDay(1).customers[0];
    expect(first.item.genuine).toBe(true);
  });

  it("buying any fake loses money", () => {
    for (let d = 1; d <= ALLEY_DAYS; d++) {
      for (const c of buildDay(d).customers) {
        if (!c.item.genuine) expect(dealProfit(c.item, c.floor)).toBeLessThan(0);
      }
    }
  });

  it("accepts counters at or above the floor and names the floor below it", () => {
    const c = buildDay(5).customers[0];
    expect(counterOffer(c, c.floor)).toEqual({ kind: "accepted", price: c.floor });
    expect(counterOffer(c, c.floor - 5)).toEqual({ kind: "countered", price: c.floor });
  });

  it("gives one star when a fake was bought", () => {
    const d = 20;
    const plan = buildDay(d);
    const fakeIdx = plan.customers.findIndex((c) => !c.item.genuine);
    expect(fakeIdx).toBeGreaterThanOrEqual(0);
    const deals = perfectDeals(d);
    const fc = plan.customers[fakeIdx];
    deals[fakeIdx] = { customer: fakeIdx, bought: true, price: 5, profit: dealProfit(fc.item, 5), genuine: false };
    if (isDayCleared(plan, deals)) expect(dayStars(plan, deals)).toBe(1);
    expect(dayProfit(deals)).toBeLessThan(dayProfit(perfectDeals(d)) + 1);
  });
});

describe("alley appraiser assets", () => {
  it("ships every registered sprite file", async () => {
    const { existsSync } = await import("node:fs");
    const { ALLEY_APPRAISER_SPRITES } = await import("./sprites");
    const urls = [...ALLEY_APPRAISER_SPRITES.customers, ALLEY_APPRAISER_SPRITES.loupe, ALLEY_APPRAISER_SPRITES.uvLamp, ALLEY_APPRAISER_SPRITES.coin, ALLEY_APPRAISER_SPRITES.catalogue, "/games/alley-appraiser-keyart.webp"];
    for (const url of urls) expect(existsSync(`public${url}`), url).toBe(true);
  });
});
