import { describe, expect, it } from "vitest";
import { CENTER, STAGE_COUNT, YONGAL_STAGES, drop, landingX, moonX, newWell, pilot, starsFor, stepWell, swingV, swingX } from "./yongal-scoop";

const T = 60_000;

describe("yongal-scoop", () => {
  it("has 30 stages with a quicker swing and a smaller moon later", () => {
    expect(YONGAL_STAGES).toHaveLength(STAGE_COUNT);
    expect(YONGAL_STAGES[29].swingPeriod).toBeLessThan(YONGAL_STAGES[0].swingPeriod);
    expect(YONGAL_STAGES[29].moonR).toBeLessThan(YONGAL_STAGES[0].moonR);
  }, T);

  it("carries the swing as the dipper falls", () => {
    const st = YONGAL_STAGES[5];
    // at the middle of the swing the dipper lands well past where it was let go
    expect(swingX(st, 0)).toBeCloseTo(CENTER, 5);
    expect(swingV(st, 0)).toBeGreaterThan(0);
    expect(landingX(st, 0)).toBeGreaterThan(CENTER + 20);
  }, T);

  it("scoops the moon only when the dipper lands on it, then waits for the ripples", () => {
    const st = YONGAL_STAGES[0];
    const w = newWell(st);
    // find a moment whose landing hits the moon
    let t = 0;
    while (Math.abs(landingX(st, t) - moonX(w, t + st.fall)) > 2) t += 1 / 240;
    while (w.t < t) stepWell(w, 1 / 240);
    expect(drop(w)).toBe(true);
    expect(drop(w)).toBe(false);
    let landed = null;
    while (!landed) landed = stepWell(w, 1 / 240).landed;
    expect(landed.moon).toBe(true);
    expect(w.scooped).toBe(1);
    expect(w.ready).toBe(false);
    for (let i = 0; i < 240 * (st.ripple + 0.1); i++) stepWell(w, 1 / 240);
    expect(w.ready).toBe(true);
  }, T);

  it("can be cleared on every stage by the autopilot", () => {
    for (const st of YONGAL_STAGES) {
      const w = pilot(st);
      expect(w.won, `stage ${st.stage + 1}`).toBe(true);
      expect(starsFor(w)).toBe(3);
    }
  }, T);

  it("can be cleared by unseen human-like scoopers", () => {
    for (const st of YONGAL_STAGES) {
      const wins = [11, 12, 13, 14].filter((seed) => pilot(st, { slop: 0.075, aim: 0.3, seed }).won).length;
      expect(wins, `stage ${st.stage + 1}`).toBeGreaterThanOrEqual(2);
    }
  }, T);

  it("loses by dropping blindly, by dropping straight over the moon, by waiting, or by sloppy timing", () => {
    let blind = 0;
    let sloppy = 0;
    for (const st of YONGAL_STAGES) {
      expect(pilot(st, { mode: "over" }).won, `stage ${st.stage + 1}`).toBe(false);
      expect(pilot(st, { mode: "idle" }).won).toBe(false);
      if (!pilot(st, { mode: "spam" }).won) blind++;
      if (!pilot(st, { slop: 0.16, aim: 0.3, seed: 3 }).won) sloppy++;
    }
    expect(blind).toBeGreaterThanOrEqual(29);
    expect(sloppy).toBeGreaterThanOrEqual(26);
  }, T);
});
