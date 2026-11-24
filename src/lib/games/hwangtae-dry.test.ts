import { describe, expect, it } from "vitest";
import { COVER_KEEP, FREEZE, HARD, HWANGTAE_STAGES, STAGE_COUNT, THAW, WARM, air, felt, newYard, pilot, seasonHours, starsFor, stepYard, toggle } from "./hwangtae-dry";

const T = 60_000;

describe("hwangtae-dry", () => {
  it("has 30 winters that grow longer with more racks", () => {
    expect(HWANGTAE_STAGES).toHaveLength(STAGE_COUNT);
    expect(HWANGTAE_STAGES[29].days).toBeGreaterThan(HWANGTAE_STAGES[0].days);
    expect(HWANGTAE_STAGES[29].racks.length).toBeGreaterThan(HWANGTAE_STAGES[0].racks.length);
  }, T);

  it("is coldest before dawn and warmest in the afternoon", () => {
    const st = HWANGTAE_STAGES[0];
    expect(air(st, 3)).toBeLessThan(air(st, 15));
  }, T);

  it("softens the day's swing under the mat", () => {
    const st = HWANGTAE_STAGES[0];
    const open = felt(st, 0, 15, false) - felt(st, 0, 3, false);
    const shut = felt(st, 0, 15, true) - felt(st, 0, 3, true);
    expect(shut).toBeCloseTo(open * COVER_KEEP, 1);
  }, T);

  it("counts a cycle when a frozen fish thaws", () => {
    // a plain winter: −3 °C on average, swinging 8 °C either way
    const st = { stage: 0, days: 3, mean: [-3, -3, -3], amp: [8, 8, 8], racks: [{ exposure: 1 }], need: 99, par: 0 };
    const y = newYard(st);
    y.fish[0] = FREEZE - 1;
    y.frozen[0] = true;
    // walk until it thaws once
    let cycled = false;
    for (let i = 0; i < 2000 && !cycled && !y.over; i++) cycled = stepYard(y, 0.05).cycled.length > 0;
    expect(cycled).toBe(true);
    expect(y.fish[0]).toBeGreaterThan(THAW);
    expect(y.cycles[0]).toBe(1);
    toggle(y, 0);
    expect(y.covered[0]).toBe(true);
    expect(WARM).toBeGreaterThan(THAW);
    expect(HARD).toBeLessThan(FREEZE);
  }, T);

  it("can be finished on every stage by the autopilot", () => {
    for (const st of HWANGTAE_STAGES) {
      const y = pilot(st);
      expect(y.won, `stage ${st.stage + 1}`).toBe(true);
      expect(y.h).toBeLessThanOrEqual(seasonHours(st));
      expect(starsFor(y)).toBeGreaterThanOrEqual(2);
    }
  }, T);

  it("can be finished by unseen human-like keepers", () => {
    for (const st of HWANGTAE_STAGES) {
      const wins = [{ every: 2.2, ahead: 6.5, slack: 1.2 }, { every: 2.8, ahead: 7, slack: 0.8 }, { every: 1.8, ahead: 5, slack: 1.6 }, { every: 3, ahead: 6, slack: 1.3 }].filter((o) => pilot(st, o).won).length;
      expect(wins, `stage ${st.stage + 1}`).toBeGreaterThanOrEqual(3);
    }
  }, T);

  it("can't be finished by never covering or by keeping the mats down", () => {
    for (const st of HWANGTAE_STAGES) {
      expect(pilot(st, { mode: "open" }).won, `stage ${st.stage + 1}`).toBe(false);
      expect(pilot(st, { mode: "shut" }).won, `stage ${st.stage + 1}`).toBe(false);
    }
  }, T);
});
