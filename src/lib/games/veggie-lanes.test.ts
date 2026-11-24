import { describe, expect, it } from "vitest";
import { COLS, LANE_STAGES, PLANTS, ROWS, START_DEW, STAGE_COUNT, canPlant, newGarden, pilot, plant, starsFor, step } from "./veggie-lanes";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ react: 1.0, flowers: 4, seed }));

describe("veggie-lanes", () => {
  it("has 30 days with more pests later, and opens pumpkins and chilis after the first days", () => {
    expect(LANE_STAGES).toHaveLength(STAGE_COUNT);
    expect(LANE_STAGES[29].spawns.length).toBeGreaterThan(LANE_STAGES[0].spawns.length * 3);
    expect(LANE_STAGES[0].locked).toEqual([2, 3]);
    expect(LANE_STAGES[29].locked).toEqual([]);
    for (const st of LANE_STAGES) for (const s of st.spawns) expect(s.row >= 0 && s.row < ROWS).toBe(true);
  }, T);

  it("spends dew to plant, waits out the recharge, and makes dew from dewflowers", () => {
    const g = newGarden(LANE_STAGES[10]);
    expect(g.dew).toBe(START_DEW);
    expect(plant(g, 0, 2, 0)).toBe(true);
    expect(g.dew).toBe(START_DEW - PLANTS[0].cost);
    expect(canPlant(g, 0, 3, 0)).toBe(false); // recharging (and short of dew)
    expect(plant(g, 1, 2, 0)).toBe(false); // the cell is taken
    let made = 0;
    for (let k = 0; k < 120; k++) made += step(g, 0.05).dew;
    expect(made).toBeGreaterThanOrEqual(25);
    expect(canPlant(g, 1, 0, COLS)).toBe(false); // off the patch
  }, T);

  it("loses the day when a pest reaches the shed", () => {
    const g = newGarden(LANE_STAGES[3]);
    while (!g.over) step(g, 0.05);
    expect(g.won).toBe(false);
  }, T);

  it("lets a quick gardener hold every day", () => {
    let three = 0;
    for (const st of LANE_STAGES) {
      const g = pilot(st, { react: 0.5, flowers: 5, seed: 1 });
      expect(g.won).toBe(true);
      if (starsFor(g) === 3) three++;
    }
    expect(three).toBeGreaterThanOrEqual(20);
  }, T);

  it("lets slower human-like gardeners hold every day", () => {
    let wins = 0;
    for (const st of LANE_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBe(120);
  }, T);

  it("loses every day to random planting", () => {
    for (const st of LANE_STAGES) for (const seed of [21, 22, 23, 24]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
