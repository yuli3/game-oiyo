import { describe, expect, it } from "vitest";
import { CARTON_H, CARTON_STAGES, HEARTS, STAGE_COUNT, airTime, bestPower, newKitchen, pilot, runFlick, starsFor, type CartonStage } from "./carton-flip";

const T = 60_000;
// a little more off in strength than the flickers each kitchen was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ power: 0.03, seed }));

const kitchen = (spin: number): CartonStage => ({ stage: 0, shelves: [{ x0: 20, x1: 120, y: 500 }, { x0: 200, x1: 280, y: 440 }], spin, plan: [] });

describe("carton-flip", () => {
  it("times the flight: harder flicks stay up longer", () => {
    expect(airTime(600, 500, 440)).toBeGreaterThan(airTime(500, 500, 440));
    expect(airTime(100, 500, 300)).toBe(-1); // too weak to reach
  }, T);

  it("lands upright when the tumble comes round in time, and costs a heart otherwise", () => {
    // one tumble a second: the flick that stays up one second lands upright
    const st = kitchen(2 * Math.PI);
    const b = bestPower(st, 0);
    expect(b.half).toBeGreaterThan(5);
    const k = newKitchen(st);
    expect(runFlick(k, b.power)).toBe(true);
    expect(k.won).toBe(true);
    expect(starsFor(k)).toBe(HEARTS);
    const miss = newKitchen(st);
    expect(runFlick(miss, b.power + 120)).toBe(false);
    expect(miss.hearts).toBe(HEARTS - 1);
    expect(miss.y).toBeCloseTo(500 - CARTON_H / 2, 5); // back on its shelf
  }, T);

  it("has 30 kitchens, with more shelves and a quicker tumble later on", () => {
    expect(CARTON_STAGES).toHaveLength(STAGE_COUNT);
    expect(CARTON_STAGES[29].shelves.length).toBeGreaterThan(CARTON_STAGES[0].shelves.length);
    expect(CARTON_STAGES[29].spin).toBeGreaterThan(CARTON_STAGES[0].spin);
  }, T);

  it("climbs every kitchen with no hearts lost on the planned flicks, for three stars", () => {
    for (const st of CARTON_STAGES) expect(starsFor(pilot(st, { mode: "plan" }))).toBe(3);
  }, T);

  it("lets human-like flickers, a little more off in strength, climb almost every kitchen", () => {
    let wins = 0;
    for (const st of CARTON_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(108);
  }, T);

  it("never climbs a kitchen flicking at random", () => {
    let wins = 0;
    for (const st of CARTON_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of CARTON_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
