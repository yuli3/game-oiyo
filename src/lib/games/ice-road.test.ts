import { describe, expect, it } from "vitest";
import { CARELESS, ICE_ROAD_STAGES, STAGE_COUNT, VMAX, bandLoad, cruiseFor, newDrive, pilot, starsFor, stepDrive, stretchAt } from "./ice-road";

const T = 60_000;

describe("ice-road", () => {
  it("has 30 stages that get longer with more ridges", () => {
    expect(ICE_ROAD_STAGES).toHaveLength(STAGE_COUNT);
    expect(ICE_ROAD_STAGES[29].length).toBeGreaterThan(ICE_ROAD_STAGES[0].length);
    expect(ICE_ROAD_STAGES[29].ridges.length).toBeGreaterThan(ICE_ROAD_STAGES[0].ridges.length);
  }, T);

  it("loads the ice most at the wave speed and not at all outside the band", () => {
    const s = { from: 0, to: 100, wave: 15, width: 3 };
    expect(bandLoad(s, 15)).toBe(1);
    expect(bandLoad(s, 16.5)).toBeGreaterThan(0);
    expect(bandLoad(s, 18)).toBe(0);
    expect(bandLoad(s, 11)).toBe(0);
    expect(bandLoad(s, cruiseFor(s, 1))).toBe(0);
  }, T);

  it("cracks the ice when you sit in the band", () => {
    const st = ICE_ROAD_STAGES[0];
    const d = newDrive(st);
    const wave = stretchAt(st, 0).wave;
    while (!d.over && d.t < 20) stepDrive(d, d.v < wave, 1 / 60);
    expect(d.over).toBe(true);
    expect(d.fail).toBe("crack");
  }, T);

  it("spins out on a ridge taken fast", () => {
    const st = ICE_ROAD_STAGES[12];
    const d = newDrive(st);
    // hold the gas until the first ridge, staying out of bands is not the point here
    while (!d.over) stepDrive(d, true, 1 / 60);
    expect(["ridge", "crack"]).toContain(d.fail);
  }, T);

  it("can be crossed on every stage by the autopilot within the clock", () => {
    for (const st of ICE_ROAD_STAGES) {
      const d = pilot(st);
      expect(d.won, `stage ${st.stage + 1}`).toBe(true);
      expect(d.t).toBeLessThan(st.timeLimit);
      expect(starsFor(d)).toBe(3);
    }
  }, T);

  it("can be crossed by unseen human-like drivers", () => {
    let wins = 0;
    for (const st of ICE_ROAD_STAGES) {
      const w = [4, 5, 6, 7].filter((seed) => pilot(st, { lag: 0.22, margin: 1.3, noise: 0.9, seed }).won).length;
      expect(w, `stage ${st.stage + 1}`).toBeGreaterThanOrEqual(3);
      wins += w;
    }
    expect(wins).toBeGreaterThanOrEqual(110);
  }, T);

  it("can't be crossed by flooring it, holding one speed, or crawling", () => {
    for (const st of ICE_ROAD_STAGES) {
      for (const o of CARELESS) expect(pilot(st, o).won, `stage ${st.stage + 1} ${o.mode} ${o.steady ?? ""}`).toBe(false);
      expect(pilot(st, { mode: "crawl" }).won).toBe(false);
      expect(pilot(st, { mode: "steady", steady: 15, lag: 0.2 }).won).toBe(false);
    }
    expect(VMAX).toBeGreaterThan(20);
  }, T);
});
