import { describe, expect, it } from "vitest";
import { CHECKOUT_STAGES, STAGE_COUNT, allScanned, changeDue, count, customer, makeChange, newShift, pay, pilot, scan, starsFor, stepShift, totalOf } from "./night-checkout";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ tap: 0.38, think: 2.8, slip: 0.03, seed }));

describe("night-checkout", () => {
  it("has 30 shifts with more customers and bigger baskets, and the change screen goes dark later", () => {
    expect(CHECKOUT_STAGES).toHaveLength(STAGE_COUNT);
    expect(CHECKOUT_STAGES[29].customers.length).toBeGreaterThan(CHECKOUT_STAGES[0].customers.length);
    expect(CHECKOUT_STAGES[0].showChange).toBe(true);
    expect(CHECKOUT_STAGES[29].showChange).toBe(false);
  }, T);

  it("charges a buy-one-get-one-free item for every other one, and makes change with the fewest pieces", () => {
    const deal = { price: 1500, kind: 3, twoForOne: true };
    expect(totalOf([deal, deal, { price: 800, kind: 0, twoForOne: false }])).toBe(2300);
    expect(totalOf([deal, deal, deal])).toBe(3000);
    expect(makeChange(16_700)).toEqual([10000, 5000, 1000, 500, 100, 100]);
  }, T);

  it("serves a customer once every item is scanned and the change is right, and complains when it is wrong", () => {
    const st = CHECKOUT_STAGES[3];
    const s = newShift(st);
    while (!customer(s)) stepShift(s, 0.1);
    const c = customer(s)!;
    expect(pay(s)).toBe("not yet");
    c.items.forEach((_, k) => scan(s, k));
    expect(allScanned(s)).toBe(true);
    for (const d of makeChange(changeDue(c))) count(s, d);
    expect(pay(s)).toBe("thanks");
    expect(s.served).toBe(1);
    while (!customer(s) && !s.over) stepShift(s, 0.1);
    const c2 = customer(s)!;
    c2.items.forEach((_, k) => scan(s, k));
    if (c2.paid > 0) {
      count(s, 100);
      if (changeDue(c2) !== 100) {
        expect(pay(s)).toBe("wrong");
        expect(s.complaints).toBe(1);
      }
    }
  }, T);

  it("gets a quick, careful clerk through every shift with three stars", () => {
    for (const st of CHECKOUT_STAGES) {
      const s = pilot(st);
      expect(s.won).toBe(true);
      expect(starsFor(s)).toBe(3);
    }
  }, T);

  it("gets human-like clerks (a third of a second a tap, a few seconds to work change out) through most shifts", () => {
    let wins = 0;
    for (const st of CHECKOUT_STAGES) {
      const w = HUMANS.filter((o) => pilot(st, o).won).length;
      expect(w).toBeGreaterThanOrEqual(2);
      wins += w;
    }
    expect(wins).toBeGreaterThanOrEqual(110);
  }, T);

  it("does not let guessing the change or a slow clerk get through", () => {
    for (const st of CHECKOUT_STAGES) expect(pilot(st, { mode: "guess", tap: 0.35 }).won).toBe(false);
    expect(CHECKOUT_STAGES.filter((st) => !pilot(st, { tap: 0.9, think: 6 }).won).length).toBeGreaterThanOrEqual(18);
  }, T);
});
