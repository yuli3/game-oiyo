import { describe, expect, it } from "vitest";
import { PLANT_STAGES, STAGE_COUNT, act, bugsOn, growthRate, light, newPlant, pilot, starsFor, stepPlant, sunAt } from "./window-plant";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ glance: 11, seed }));

describe("window-plant", () => {
  it("has 30 days that get longer, drier, cloudier and buggier", () => {
    expect(PLANT_STAGES).toHaveLength(STAGE_COUNT);
    expect(PLANT_STAGES[29].day).toBeGreaterThan(PLANT_STAGES[0].day);
    expect(PLANT_STAGES[29].dry).toBeGreaterThan(PLANT_STAGES[0].dry);
    expect(PLANT_STAGES[29].clouds.length).toBeGreaterThan(PLANT_STAGES[0].clouds.length);
    expect(PLANT_STAGES[29].bugs.length).toBeGreaterThan(PLANT_STAGES[0].bugs.length);
  }, T);

  it("grows best facing the sun with moist soil, and holds back when dry, soaked or nibbled", () => {
    const st = PLANT_STAGES[0];
    const p = newPlant(st);
    while (sunAt(st, p.t) < 0.5) stepPlant(p, 0.1);
    p.moisture = 0.6;
    p.facing = 1;
    const good = light(p);
    p.facing = -1;
    expect(light(p)).toBeLessThan(good);
    p.facing = 1;
    const happy = growthRate(p);
    p.moisture = 0.05;
    expect(growthRate(p)).toBeLessThan(0);
    p.moisture = 1;
    expect(growthRate(p)).toBeLessThan(happy);
    act(p, "water");
    expect(p.moisture).toBeGreaterThan(1);
  }, T);

  it("lets a bug be flicked off, and lets one that stays nibble", () => {
    const st = PLANT_STAGES[6];
    const p = newPlant(st);
    while (bugsOn(p).length === 0) stepPlant(p, 0.1);
    expect(act(p, "bug")).toBe(true);
    expect(bugsOn(p)).toHaveLength(0);
    expect(act(p, "bug")).toBe(false);
  }, T);

  it("gets an attentive carer to the day's height with three stars", () => {
    for (const st of PLANT_STAGES) {
      const p = pilot(st);
      expect(p.won).toBe(true);
      expect(starsFor(p)).toBe(3);
    }
  }, T);

  it("gets human-like carers who glance over every ten seconds or so there on most days", () => {
    let wins = 0;
    for (const st of PLANT_STAGES) {
      const w = HUMANS.filter((o) => pilot(st, o).won).length;
      expect(w).toBeGreaterThanOrEqual(3);
      wins += w;
    }
    expect(wins).toBeGreaterThanOrEqual(110);
  }, T);

  it("does not let a neglected, drowned or randomly tended plant get there", () => {
    for (const st of PLANT_STAGES) {
      expect(pilot(st, { mode: "neglect" }).won).toBe(false);
      expect(pilot(st, { mode: "drown", glance: 10 }).won).toBe(false);
      for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", glance: 5, seed }).won).toBe(false);
    }
    expect(PLANT_STAGES.filter((st) => !pilot(st, { glance: 30 }).won).length).toBeGreaterThanOrEqual(25);
  }, T);
});
