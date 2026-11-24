import { describe, expect, it } from "vitest";
import { HEARTS, JUICE_STAGES, STAGE_COUNT, newStand, pilot, starsFor, step, swipe, type JuiceStage } from "./juice-swipe";

const T = 60_000;
// slower and shakier than the slicers each stage was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ react: 0.32, wobble: 8, care: 9, seed }));

const two: JuiceStage = {
  stage: 0,
  tosses: [
    { t: 0, x: 100, vx: 0, vy: -500, bee: false, kind: 0 },
    { t: 0, x: 260, vx: 0, vy: -500, bee: true, kind: 0 },
  ],
  need: 1,
  par: 1,
};

describe("juice-swipe", () => {
  it("slices fruit the blade passes through and stings on a bee", () => {
    const s = newStand(two);
    step(s, 0.3);
    const y = s.flying[0].y;
    expect(swipe(s, 60, y, 140, y)).toEqual({ fruit: 1, bees: 0 });
    expect(swipe(s, 60, y, 140, y)).toEqual({ fruit: 0, bees: 0 }); // already cut
    expect(swipe(s, 220, y, 300, y)).toEqual({ fruit: 0, bees: 1 });
    expect(s.hearts).toBe(HEARTS - 1);
    for (let k = 0; k < 300; k++) step(s, 1 / 60);
    expect(s.over).toBe(true);
    expect(s.won).toBe(true);
    expect(starsFor(s)).toBe(2); // a heart was lost
  }, T);

  it("has 30 stages from 10 tosses up to 39, with bees from stage 3", () => {
    expect(JUICE_STAGES).toHaveLength(STAGE_COUNT);
    expect(JUICE_STAGES[0].tosses).toHaveLength(10);
    expect(JUICE_STAGES[29].tosses).toHaveLength(39);
    for (const st of JUICE_STAGES.slice(0, 2)) expect(st.tosses.some((k) => k.bee)).toBe(false);
    expect(JUICE_STAGES[29].tosses.some((k) => k.bee)).toBe(true);
  }, T);

  it("lets quick, careful slicers clear every stage with three stars", () => {
    for (const st of JUICE_STAGES) {
      const s = pilot(st, { react: 0.2, wobble: 2, care: 14 });
      expect(s.won).toBe(true);
      expect(starsFor(s)).toBe(3);
    }
  }, T);

  it("lets slower, shakier human-like slicers clear almost every stage", () => {
    let wins = 0;
    for (const st of JUICE_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("never slices enough with random swipes", () => {
    for (const st of JUICE_STAGES) for (const seed of [21, 22, 23, 24]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
