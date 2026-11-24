import { describe, expect, it } from "vitest";
import { COLS, LIVES, ROLLER_STAGES, ROWS, STAGE_COUNT, STEP, newGround, pilot, share, starsFor, steer, step } from "./roller-claim";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ reach: 5, caution: 2, late: 1, seed }));

describe("roller-claim", () => {
  it("has 30 playgrounds asking for more ground, with more balls later", () => {
    expect(ROLLER_STAGES).toHaveLength(STAGE_COUNT);
    expect(ROLLER_STAGES[0].balls).toHaveLength(0);
    expect(ROLLER_STAGES[29].balls.length).toBeGreaterThan(ROLLER_STAGES[5].balls.length);
    expect(ROLLER_STAGES[29].goal).toBeGreaterThan(ROLLER_STAGES[0].goal);
    for (const st of ROLLER_STAGES) expect(st.par).toBeLessThan(st.limit);
  }, T);

  it("paints a fenced-in box when the stripe comes home, and a run over your own stripe costs a life", () => {
    const st = ROLLER_STAGES[0];
    const g = newGround(st);
    expect(share(g)).toBeCloseTo(9 / (COLS * ROWS));
    // out 3 up, 1 right, back down into the patch: a strip of new ground
    const go = (d: number, n: number) => {
      steer(g, d);
      for (let k = 0; k < n; k++) step(g, STEP + 1e-6);
    };
    go(0, 4);
    go(1, 1);
    go(2, 3);
    expect(g.trailCells).toHaveLength(0);
    expect(g.painted).toBeGreaterThanOrEqual(9 + 6);
    // a small loop that runs into itself
    const h = newGround(st);
    const drive = (d: number, n: number) => {
      steer(h, d);
      for (let k = 0; k < n; k++) step(h, STEP + 1e-6);
    };
    drive(0, 4);
    drive(1, 2);
    drive(2, 2);
    drive(3, 3);
    expect(h.lives).toBe(LIVES - 1);
  }, T);

  it("lets a quick painter clear every playground with three stars", () => {
    for (const st of ROLLER_STAGES) {
      const g = pilot(st, { reach: 8, caution: 3, seed: 1 });
      expect(g.won).toBe(true);
    }
    let three = 0;
    for (const st of ROLLER_STAGES) if (starsFor(pilot(st, { reach: 6, caution: 3, seed: 2 })) === 3) three++;
    expect(three).toBeGreaterThanOrEqual(15);
  }, T);

  it("lets slower, more careless human-like painters clear every playground", () => {
    let wins = 0;
    for (const st of ROLLER_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBe(120);
  }, T);

  it("gets nowhere wandering at random", () => {
    for (const st of ROLLER_STAGES) for (const seed of [21, 22, 23, 24, 25, 26, 27, 28]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
