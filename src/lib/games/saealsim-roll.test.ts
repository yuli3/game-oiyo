import { describe, expect, it } from "vitest";
import { SAEALSIM_STAGES, STAGE_COUNT, lift, newDough, pilot, starsFor, stepDough } from "./saealsim-roll";

describe("saealsim-roll", () => {
  it("builds 30 stages: a narrower, quicker band and more balls to roll", () => {
    expect(SAEALSIM_STAGES).toHaveLength(STAGE_COUNT);
    const a = SAEALSIM_STAGES[0];
    const z = SAEALSIM_STAGES[STAGE_COUNT - 1];
    expect(z.hi - z.lo).toBeLessThan(a.hi - a.lo);
    expect(z.lo).toBeGreaterThan(a.lo);
    expect(z.need).toBeGreaterThan(a.need);
  });

  it("circling at the middle of the band rolls every stage with 3 stars", () => {
    for (const s of SAEALSIM_STAGES) {
      const d = pilot(s);
      expect(d.won, `stage ${s.stage + 1}`).toBe(true);
      expect(starsFor(d), `stage ${s.stage + 1}`).toBe(3);
    }
  });

  it("a human whose pace drifts ±25 % and who takes 0.5 s between balls clears every stage", () => {
    for (const s of SAEALSIM_STAGES) for (const seed of [5, 31, 47, 53]) expect(pilot(s, { drift: 0.25, gap: 0.5, seed }).won, `stage ${s.stage + 1} seed ${seed}`).toBe(true);
  });

  it("whirling too fast crumbles, crawling too slowly or scrubbing back and forth rolls nothing", () => {
    for (const s of SAEALSIM_STAGES) {
      const fast = pilot(s, { pace: s.hi * 1.3 });
      expect(fast.won, `stage ${s.stage + 1} fast`).toBe(false);
      expect(fast.crumbled).toBeGreaterThan(0);
      expect(pilot(s, { pace: s.lo * 0.8 }).done, `stage ${s.stage + 1} slow`).toBe(0);
      expect(pilot(s, { scrub: true, pace: 2 }).done, `stage ${s.stage + 1} scrub`).toBe(0);
    }
  });

  it("an unsteady pace (±60 %) fails most stages from the fourth on", () => {
    let lost = 0;
    for (const s of SAEALSIM_STAGES.slice(3)) if (!pilot(s, { drift: 0.6, gap: 0.5, seed: 9 }).won) lost++;
    expect(lost).toBeGreaterThanOrEqual(25);
  });

  it("the turning rate comes from the finger's change of direction", () => {
    const s = SAEALSIM_STAGES[0];
    const d = newDough(s);
    const f = (s.lo + s.hi) / 2;
    let a = 0;
    for (let i = 0; i < 60; i++) {
      const b = a + (2 * Math.PI * f) / 60;
      stepDough(d, 50 * (Math.cos(b) - Math.cos(a)), 50 * (Math.sin(b) - Math.sin(a)), 1 / 60);
      a = b;
    }
    expect(d.rate).toBeGreaterThan(s.lo);
    expect(d.rate).toBeLessThan(s.hi);
    expect(d.round).toBeGreaterThan(0.5);
    lift(d);
    expect(d.lastAng).toBeNull();
  });
});
