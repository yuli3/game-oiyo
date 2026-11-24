import { describe, expect, it } from "vitest";
import { BAG, BURN, CHESTNUT_STAGES, GOLD_LO, PAN, STAGE_COUNT, dragTo, drop, golden, grab, heatAt, newStall, pilot, starsFor, stepStall } from "./chestnut-roast";

describe("chestnut-roast", () => {
  it("builds 30 stalls: more chestnuts, a hotter pan and a narrower golden window", () => {
    expect(CHESTNUT_STAGES).toHaveLength(STAGE_COUNT);
    const a = CHESTNUT_STAGES[0];
    const z = CHESTNUT_STAGES[STAGE_COUNT - 1];
    expect(z.arrivals.length).toBeGreaterThan(a.arrivals.length);
    expect(z.cook).toBeGreaterThan(a.cook);
    expect(z.goldHi).toBeLessThan(a.goldHi);
  }, 60_000);

  it("keeping two roasting in the middle and selling each as it turns golden sells every chestnut with 3 stars", () => {
    for (const s of CHESTNUT_STAGES) {
      const st = pilot(s);
      expect(st.won, `stall ${s.stage + 1}`).toBe(true);
      expect(starsFor(st), `stall ${s.stage + 1}`).toBe(3);
    }
  }, 60_000);

  it("stall keepers who take 0.32–0.42 s to react and drag at 550 px/s clear every stall", () => {
    for (const s of CHESTNUT_STAGES) for (const react of [0.32, 0.37, 0.42]) expect(pilot(s, { react, speed: 550 }).won, `stall ${s.stage + 1} react ${react}`).toBe(true);
  }, 60_000);

  it("never touching, heaping them all in the middle and selling late, bagging them raw, or a slow hand loses", () => {
    let slow = 0;
    for (const s of CHESTNUT_STAGES) {
      expect(pilot(s, { mode: "never" }).won, `stall ${s.stage + 1} never`).toBe(false);
      expect(pilot(s, { mode: "centre", react: 0.35, speed: 550 }).won, `stall ${s.stage + 1} centre`).toBe(false);
      expect(pilot(s, { mode: "early" }).won, `stall ${s.stage + 1} early`).toBe(false);
      if (!pilot(s, { react: 1.2, speed: 300 }).won) slow++;
    }
    expect(slow).toBe(STAGE_COUNT);
  }, 60_000);

  it("the middle is hottest; golden ones sell, raw ones come back, and too long burns", () => {
    expect(heatAt(PAN.x, PAN.y)).toBeGreaterThan(heatAt(PAN.x + PAN.r, PAN.y));
    const s = CHESTNUT_STAGES[0];
    const st = newStall(s);
    stepStall(st, s.arrivals[0].at + 0.01);
    expect(grab(st, st.x[0], st.y[0])).toBe(0);
    dragTo(st, BAG.x, BAG.y);
    expect(drop(st)).toBe("raw");
    const st2 = newStall(s);
    stepStall(st2, s.arrivals[0].at + 0.01);
    st2.d[0] = (GOLD_LO + s.goldHi) / 2;
    expect(golden(st2, 0)).toBe(true);
    grab(st2, st2.x[0], st2.y[0]);
    dragTo(st2, BAG.x, BAG.y);
    expect(drop(st2)).toBe("sold");
    const st3 = newStall(s);
    stepStall(st3, s.arrivals[0].at + 0.01);
    st3.d[0] = BURN - 0.001;
    expect(stepStall(st3, 0.5).burnt).toContain(0);
  }, 60_000);
});
