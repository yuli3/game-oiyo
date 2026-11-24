import { describe, expect, it } from "vitest";
import { BOTTOM, LAND_TOL, PIPES, STAGE_COUNT, airTime, landedClean, letGo, newRider, pilot, pointsFor, press, starsFor, stepRider, wallY } from "./snow-halfpipe";

describe("snow-halfpipe", () => {
  it("builds 30 pipes: deeper, slower to pump, with more hits", () => {
    expect(PIPES).toHaveLength(STAGE_COUNT);
    const a = PIPES[0];
    const z = PIPES[STAGE_COUNT - 1];
    expect(z.depth).toBeGreaterThan(a.depth);
    expect(z.pump).toBeLessThan(a.pump);
    expect(z.hits).toBeGreaterThan(a.hits);
    expect(wallY(a, 0)).toBe(0);
    expect(wallY(a, a.half)).toBeCloseTo(a.depth, 5);
  });

  it("pumping every pass and spinning what each air allows wins every pipe with 3 stars", () => {
    for (const p of PIPES) {
      const r = pilot(p);
      expect(r.won, `pipe ${p.stage + 1}`).toBe(true);
      expect(starsFor(r), `pipe ${p.stage + 1}`).toBe(3);
      expect(r.crashes).toBe(0);
    }
  });

  it("a sloppy rider (stops up to 12° off, forgets a pump in ten) still clears every pipe", () => {
    for (const p of PIPES) {
      expect(pilot(p, { stopErr: 12, pumpMiss: 0.1, seed: 11 }).won, `pipe ${p.stage + 1}`).toBe(true);
      expect(pilot(p, { stopErr: 12, pumpMiss: 0.1, seed: 19 }).won, `pipe ${p.stage + 1}`).toBe(true);
    }
  });

  it("never pumping, spinning half a turn too far or letting go wildly loses every pipe", () => {
    for (const p of PIPES) {
      expect(pilot(p, { pumpMiss: 1 }).won, `pipe ${p.stage + 1} no pump`).toBe(false);
      expect(pilot(p, { greed: 1 }).won, `pipe ${p.stage + 1} greedy`).toBe(false);
      expect(pilot(p, { stopErr: 60, seed: 3 }).won, `pipe ${p.stage + 1} wild`).toBe(false);
    }
  });

  it("lands are clean within 30° of a half turn and score by half turns and height", () => {
    expect(landedClean(360 + LAND_TOL - 1)).toBe(true);
    expect(landedClean(180 - LAND_TOL + 1)).toBe(true);
    expect(landedClean(90)).toBe(false);
    expect(pointsFor(360, 0)).toBe(10);
    expect(pointsFor(540, 120)).toBe(25);
    expect(airTime(450)).toBeCloseTo(1, 5);
  });

  it("a press in the bottom pumps once per pass; a press up the wall is a bobble", () => {
    const p = PIPES[0];
    const r = newRider(p);
    r.x = 0;
    r.v = 200;
    expect(press(r)).toBe("pump");
    expect(r.v).toBe(200 + p.pump);
    expect(press(r)).toBeNull();
    r.x = p.half * (BOTTOM + 0.3);
    expect(press(r)).toBe("bobble");
    // in the air a press spins and letting go stops
    r.air = true;
    r.vy = 300;
    expect(press(r)).toBe("spin");
    stepRider(r, 0.1);
    letGo(r);
    const spun = r.spin;
    stepRider(r, 0.1);
    expect(r.spin).toBe(spun);
  });
});
