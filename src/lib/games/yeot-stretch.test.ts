import { describe, expect, it } from "vitest";
import { L0, LFOLD, STAGE_COUNT, YEOT_STAGES, grab, heat, humanCare, letGo, limit, newYeot, pilot, starsFor, stepYeot } from "./yeot-stretch";

describe("yeot-stretch", () => {
  it("builds 30 stages asking for more folds from stiffer taffy", () => {
    expect(YEOT_STAGES).toHaveLength(STAGE_COUNT);
    const a = YEOT_STAGES[0];
    const z = YEOT_STAGES[STAGE_COUNT - 1];
    expect(z.rate).toBeLessThan(a.rate);
    expect(z.need).toBeGreaterThan(a.need);
    for (const s of YEOT_STAGES) expect(s.need).toBeLessThanOrEqual(s.par - 2);
  });

  it("pulling near the limit (speeding up as the rope grows) wins every stage with 3 stars", () => {
    for (const s of YEOT_STAGES) {
      const y = pilot(s, { safety: 0.95 });
      expect(y.snapped, `stage ${s.stage + 1}`).toBe(false);
      expect(starsFor(y), `stage ${s.stage + 1}`).toBe(3);
    }
  });

  it("a shaky human at the stage's care level (±15 %, half a second to regrab) clears every stage", () => {
    for (const s of YEOT_STAGES) for (const seed of [5, 31, 47]) expect(pilot(s, { safety: humanCare(s.stage), jitter: 0.15, regrab: 0.5, seed }).won, `stage ${s.stage + 1} seed ${seed}`).toBe(true);
  });

  it("a steady hand speed either snaps the short rope or is too slow, on every stage", () => {
    for (const s of YEOT_STAGES) for (const v of [80, 110, 300]) expect(pilot(s, { steadySpeed: v }).won, `stage ${s.stage + 1} at ${v}px/s`).toBe(false);
  });

  it("pulling past the limit snaps it; pulling too timidly misses most marks", () => {
    let timid = 0;
    for (const s of YEOT_STAGES) {
      expect(pilot(s, { safety: 1.15 }).snapped, `stage ${s.stage + 1}`).toBe(true);
      if (!pilot(s, { safety: humanCare(s.stage) - 0.12, jitter: 0.15, regrab: 0.5, seed: 4 }).won) timid++;
    }
    expect(timid).toBeGreaterThanOrEqual(20);
  });

  it("folds only past the mark, cools over time and stiffens per fold", () => {
    const y = newYeot(YEOT_STAGES[0]);
    grab(y);
    stepYeot(y, 1, 1 / 60);
    expect(letGo(y)).toBeNull();
    expect(y.len).toBe(L0 + 1);
    expect(y.snapped).toBe(false);
    const before = limit(y);
    grab(y);
    y.len = LFOLD;
    expect(letGo(y)).toBe("fold");
    expect(y.folds).toBe(1);
    expect(y.len).toBe(L0);
    expect(limit(y)).toBeLessThan(before);
    // moving left never shortens it, and an idle rope eventually sets
    grab(y);
    stepYeot(y, -50, 1 / 60);
    expect(y.len).toBe(L0);
    letGo(y);
    let ev = null;
    for (let i = 0; i < 6000 && !ev; i++) ev = stepYeot(y, 0, 1 / 60);
    expect(ev).toBe("set");
    expect(heat(y)).toBeLessThan(0.36);
  });
});
