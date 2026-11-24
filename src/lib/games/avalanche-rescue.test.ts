import { describe, expect, it } from "vitest";
import { DIG_REACH, RESCUE_STAGES, STAGE_COUNT, WALK, beepGap, dig, nearest, newRescue, pilot, reading, starsFor, stepRescue, walkTo } from "./avalanche-rescue";

describe("avalanche-rescue", () => {
  it("builds 30 slides: bigger fields, more and deeper burials, a shakier arrow", () => {
    expect(RESCUE_STAGES).toHaveLength(STAGE_COUNT);
    const a = RESCUE_STAGES[0];
    const z = RESCUE_STAGES[STAGE_COUNT - 1];
    expect(z.w * z.h).toBeGreaterThan(a.w * a.h);
    expect(z.buried.length).toBeGreaterThan(a.buried.length);
    expect(z.noise).toBeGreaterThan(a.noise);
  }, 60_000);

  it("following the arrow and digging at 1 m finds everyone on every slide with 3 stars", () => {
    for (const s of RESCUE_STAGES) {
      const r = pilot(s);
      expect(r.won, `slide ${s.stage + 1}`).toBe(true);
      expect(starsFor(r), `slide ${s.stage + 1}`).toBe(3);
    }
  }, 60_000);

  it("a human who reacts 0.5 s late and walks 8 m legs finds everyone in time", () => {
    for (const s of RESCUE_STAGES) for (const seed of [5, 31, 47, 53]) expect(pilot(s, { react: 0.5, leg: 8, seed }).won, `slide ${s.stage + 1} seed ${seed}`).toBe(true);
  }, 60_000);

  it("sweeping in strips, digging on the spot, or reading the beacon only every 2 s runs out of air", () => {
    for (const s of RESCUE_STAGES) {
      expect(pilot(s, { mode: "grid" }).won, `slide ${s.stage + 1} grid`).toBe(false);
      expect(pilot(s, { mode: "dig" }).won, `slide ${s.stage + 1} dig`).toBe(false);
      expect(pilot(s, { react: 2, leg: 14, seed: 9 }).won, `slide ${s.stage + 1} slow`).toBe(false);
    }
  }, 60_000);

  it("the beacon beeps faster close up, walking is 3.2 m/s and digging only helps on top", () => {
    expect(beepGap(1)).toBeLessThan(beepGap(30));
    const s = RESCUE_STAGES[0];
    const r = newRescue(s);
    const b = s.buried[0];
    expect(reading(r)).not.toBeNull();
    walkTo(r, r.x + 10, r.y);
    stepRescue(r, 1);
    expect(r.x - s.start.x).toBeCloseTo(WALK, 5);
    // digging away from the skier never finds them
    dig(r);
    for (let i = 0; i < 300; i++) stepRescue(r, 0.05);
    expect(r.found[0]).toBe(false);
    // on top of them it does
    r.x = b.x;
    r.y = b.y + DIG_REACH * 0.5;
    expect(nearest(r)!.dist).toBeLessThan(DIG_REACH);
    dig(r);
    let ev = null;
    for (let i = 0; i < 200 && ev !== "end"; i++) ev = stepRescue(r, 0.05);
    expect(r.found[0]).toBe(true);
  }, 60_000);
});
