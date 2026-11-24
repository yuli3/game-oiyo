import { describe, expect, it } from "vitest";
import { MIN_GAP, RACES, STAGE_COUNT, legOk, newSkater, pilot, quality, rightLeg, segAt, starsFor, stepSkater, stroke } from "./speed-skate";

describe("speed-skate", () => {
  it("builds 30 races: longer, on a faster cadence with a tighter window", () => {
    expect(RACES).toHaveLength(STAGE_COUNT);
    const a = RACES[0];
    const z = RACES[STAGE_COUNT - 1];
    expect(z.length).toBeGreaterThan(a.length);
    expect(z.cadence).toBeLessThan(a.cadence);
    expect(z.window).toBeLessThan(a.window);
    for (const r of RACES) expect(r.goal).toBeGreaterThan(r.par);
  });

  it("the oval alternates 100 m straights and curves", () => {
    expect(segAt(0)).toBe("straight");
    expect(segAt(150)).toBe("curve");
    expect(segAt(250)).toBe("straight");
    expect(segAt(350)).toBe("curve");
    expect(segAt(410)).toBe("straight");
  });

  it("stroking on the cadence with the right leg wins every race with 3 stars", () => {
    for (const r of RACES) {
      const s = pilot(r);
      expect(s.won, `race ${r.stage + 1}`).toBe(true);
      expect(starsFor(s), `race ${r.stage + 1}`).toBe(3);
      expect(s.wobbles).toBe(0);
    }
  });

  it("a steady human (each stroke up to 40 ms off the cadence) still wins every race", () => {
    for (const r of RACES) for (const seed of [3, 11, 19, 23]) expect(pilot(r, { noise: 0.04, seed }).won, `race ${r.stage + 1} seed ${seed}`).toBe(true);
  });

  it("ignoring the curves, mashing, or stroking too slowly loses every race", () => {
    for (const r of RACES) {
      expect(pilot(r, { alternateOnly: true }).won, `race ${r.stage + 1} alternate`).toBe(false);
      expect(pilot(r, { beat: 0.3 }).won, `race ${r.stage + 1} mash`).toBe(false);
      expect(pilot(r, { beat: r.cadence * 1.6 }).won, `race ${r.stage + 1} slow`).toBe(false);
    }
  });

  it("a sloppy skater (strokes up to 120 ms off) loses most of the later races", () => {
    let lost = 0;
    for (const r of RACES.slice(10)) if (!pilot(r, { noise: 0.12, seed: 5 }).won) lost++;
    expect(lost).toBeGreaterThanOrEqual(12);
  });

  it("legs: alternate on the straights, right leg in the curves; a wrong leg wobbles", () => {
    const s = newSkater(RACES[0]);
    expect(legOk(s, -1)).toBe(true);
    expect(stroke(s, -1)).toBe("perfect");
    expect(rightLeg(s)).toBe(1);
    expect(legOk(s, -1)).toBe(false);
    const v = s.v;
    expect(stroke(s, -1)).toBe("wrong");
    expect(s.v).toBeCloseTo(v * 0.85, 6);
    s.d = 150;
    expect(rightLeg(s)).toBe(1);
    expect(legOk(s, 1)).toBe(true);
    s.last = 1;
    expect(legOk(s, 1)).toBe(true);
    expect(quality(RACES[0], MIN_GAP - 0.01)).toBe(0);
    expect(quality(RACES[0], RACES[0].cadence)).toBe(1);
    // the clock runs and the skater crosses the line
    const f = newSkater({ ...RACES[0], length: 1 });
    f.v = 5;
    let crossed = false;
    for (let i = 0; i < 30 && !crossed; i++) crossed = stepSkater(f, 1 / 60);
    expect(crossed).toBe(true);
    expect(f.finish).toBeCloseTo(0.2, 1);
  });
});
