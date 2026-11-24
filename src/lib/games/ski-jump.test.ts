import { describe, expect, it } from "vitest";
import { BAND_C, HILLS, POP_WINDOW, STAGE_COUNT, STEADY, groundAt, hold, lift, newJump, pilot, starsFor, stepJump, tap } from "./ski-jump";

describe("ski-jump", () => {
  it("builds 30 hills from K70 to K140 with winds and gusts", () => {
    expect(HILLS).toHaveLength(STAGE_COUNT);
    expect(HILLS[0].k).toBe(70);
    expect(HILLS[STAGE_COUNT - 1].k).toBe(140);
    expect(HILLS.some((h) => h.wind < 0) && HILLS.some((h) => h.wind > 0)).toBe(true);
    expect(Math.max(...HILLS[STAGE_COUNT - 1].gusts.map(Math.abs))).toBeGreaterThan(5);
  });

  it("the landing hill drops away and flattens into the out-run", () => {
    const k = 100;
    expect(groundAt(k, 50)).toBeLessThan(groundAt(k, 10));
    const slope = (x: number) => groundAt(k, x + 1) - groundAt(k, x);
    expect(Math.abs(slope(k * 1.7))).toBeLessThan(Math.abs(slope(k)));
  });

  it("a clean jump wins every hill with 3 stars and lands past the K-point", () => {
    for (const h of HILLS) {
      const j = pilot(h);
      expect(j.won, `hill ${h.stage + 1}`).toBe(true);
      expect(starsFor(j), `hill ${h.stage + 1}`).toBe(3);
      expect(j.distance).toBeGreaterThan(h.k);
      expect(j.landing).toBe("telemark");
    }
  });

  it("a steady human jump (40-50 ms early, wobbly body angle) clears every hill", () => {
    for (const h of HILLS) {
      expect(pilot(h, { ...STEADY, seed: 11 }).won, `hill ${h.stage + 1}`).toBe(true);
      expect(pilot(h, { popErr: 0.05, noise: 3, telemarkLead: 0.25, seed: 7 }).won, `hill ${h.stage + 1}`).toBe(true);
    }
  });

  it("skipping the tuck or sitting upright never clears a hill, and missing the spring fails most hills from 10", () => {
    for (const h of HILLS) {
      expect(pilot(h, { tuck: false }).won, `hill ${h.stage + 1} no tuck`).toBe(false);
      expect(pilot(h, { aim: 24 }).won, `hill ${h.stage + 1} upright`).toBe(false);
    }
    // tapping too early does nothing, so the jumper rolls off the lip without a spring
    const late = HILLS.slice(9).filter((h) => !pilot(h, { popErr: 0.2 }).won);
    expect(late.length).toBeGreaterThanOrEqual(15);
  });

  it("the air carries you best inside the green band", () => {
    expect(lift(BAND_C)).toBeGreaterThan(lift(BAND_C + 15));
    expect(lift(BAND_C)).toBeGreaterThan(lift(BAND_C - 15));
  });

  it("a tap too early on the in-run does nothing; on the lip it springs you off", () => {
    const j = newJump(HILLS[0]);
    hold(j, true);
    stepJump(j, 0.5);
    expect(tap(j)).toBe("early");
    expect(j.phase).toBe("inrun");
    while ((j.hill.inrun - j.s) / j.v > POP_WINDOW / 2) stepJump(j, 1 / 120);
    expect(tap(j)).toBe("pop");
    expect(j.phase).toBe("flight");
    expect(j.popQuality).toBeGreaterThan(0.4);
  });
});
