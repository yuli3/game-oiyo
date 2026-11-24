import { describe, expect, it } from "vitest";
import { CLIMB_STAGES, ICE_BANDS, STAGE_COUNT, band, newClimber, pilot, powerFor, press, release, starsFor, stepClimber } from "./ice-climb";

describe("ice-climb", () => {
  it("builds 30 walls: taller, a faster meter, narrower bands, every kind of ice on each", () => {
    expect(CLIMB_STAGES).toHaveLength(STAGE_COUNT);
    const a = CLIMB_STAGES[0];
    const z = CLIMB_STAGES[STAGE_COUNT - 1];
    expect(z.wall.length).toBeGreaterThan(a.wall.length);
    expect(z.rise).toBeLessThan(a.rise);
    expect(z.narrow).toBeGreaterThan(a.narrow);
    for (const s of CLIMB_STAGES) for (const ice of [0, 1, 2]) expect(s.wall.includes(ice as 0 | 1 | 2), `wall ${s.stage + 1} ice ${ice}`).toBe(true);
  });

  it("swinging to the middle of each patch's band wins every wall with 3 stars", () => {
    for (const s of CLIMB_STAGES) {
      const c = pilot(s, { react: 0.1 });
      expect(c.won, `wall ${s.stage + 1}`).toBe(true);
      expect(starsFor(c), `wall ${s.stage + 1}`).toBe(3);
      expect(c.shatters + c.glances).toBe(0);
    }
  });

  it("a steady human (40 ms off on each release, 0.2 s to react) climbs every wall in time", () => {
    for (const s of CLIMB_STAGES) for (const seed of [5, 31, 47, 53]) expect(pilot(s, { noise: 0.04, react: 0.2, seed }).won, `wall ${s.stage + 1} seed ${seed}`).toBe(true);
  });

  it("one fixed swing strength never tops any wall, and a sloppy swing (100 ms off) fails most later walls", () => {
    for (const s of CLIMB_STAGES) for (const p of [0.3, 0.55, 0.8, 1]) expect(pilot(s, { fixed: p, react: 0.2 }).won, `wall ${s.stage + 1} at ${p}`).toBe(false);
    let lost = 0;
    for (const s of CLIMB_STAGES.slice(10)) if (!pilot(s, { noise: 0.1, react: 0.2, seed: 9 }).won) lost++;
    expect(lost).toBeGreaterThanOrEqual(15);
  });

  it("the meter rises and falls; soft swings glance, hard ones shatter and slip, banded ones bite", () => {
    const s = CLIMB_STAGES[0];
    expect(powerFor(s, s.rise * 0.5)).toBeCloseTo(0.5, 6);
    expect(powerFor(s, s.rise * 1.5)).toBeCloseTo(0.5, 6);
    expect(band(s, 1)[0]).toBeCloseTo(ICE_BANDS[1][0], 6);
    const c = newClimber(s);
    c.step = 2; // hard ice
    press(c);
    stepClimber(c, s.rise * 0.2);
    expect(release(c)).toBe("glance");
    expect(c.step).toBe(2);
    stepClimber(c, 1);
    c.step = 0; // thin ice
    press(c);
    stepClimber(c, s.rise * 0.9);
    expect(release(c)).toBe("shatter");
    expect(c.step).toBe(0);
    stepClimber(c, 1);
    press(c);
    stepClimber(c, s.rise * 0.3);
    expect(release(c)).toBe("bite");
    expect(c.step).toBe(1);
    // no new wind-up while still recovering
    expect(press(c)).toBe(false);
  });
});
