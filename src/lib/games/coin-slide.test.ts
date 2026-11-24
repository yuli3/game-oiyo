import { describe, expect, it } from "vitest";
import { EDGE, SLIDE_STAGES, STAGE_COUNT, START, aimAt, newTable, pilot, pointsAt, score, slide, starsFor, step, type SlideStage } from "./coin-slide";

const T = 60_000;
// sloppier than the sliders each table was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ aimSpread: 1.1, powerSpread: 0.017, seed }));

const bare: SlideStage = { stage: 0, tokens: 2, posts: [], need: 3, par: 6 };
const settle = (tb: ReturnType<typeof newTable>) => {
  const ev: string[] = [];
  for (let k = 0; k < 600; k++) for (const e of step(tb, 1 / 60)) if (e) ev.push(e);
  return ev;
};

describe("coin-slide", () => {
  it("scores 3 at the edge, 2 in the middle band, 1 past the line", () => {
    expect(pointsAt(60)).toBe(3);
    expect(pointsAt(120)).toBe(2);
    expect(pointsAt(200)).toBe(1);
    expect(pointsAt(300)).toBe(0);
  }, T);

  it("stops a token where it was aimed, and drops one slid too hard off the end", () => {
    const tb = newTable(bare);
    const v = aimAt({ x: START.x, y: 66 });
    expect(slide(tb, v.vx, v.vy)).toBe(true);
    settle(tb);
    expect(tb.pucks[0].y).toBeGreaterThan(EDGE);
    expect(Math.abs(tb.pucks[0].y - 66)).toBeLessThan(4);
    expect(score(tb)).toBe(3);
    slide(tb, 0, -1100);
    expect(settle(tb)).toContain("drop");
    expect(tb.over).toBe(true);
    expect(tb.won).toBe(true);
    expect(starsFor(tb)).toBe(1);
  }, T);

  it("has 30 tables from 4 tokens up to 8, with sugar-pot posts from stage 4", () => {
    expect(SLIDE_STAGES).toHaveLength(STAGE_COUNT);
    expect(SLIDE_STAGES[0].tokens).toBe(4);
    expect(SLIDE_STAGES[29].tokens).toBe(8);
    for (const st of SLIDE_STAGES.slice(0, 3)) expect(st.posts).toHaveLength(0);
    expect(SLIDE_STAGES[29].posts.length).toBeGreaterThan(0);
  }, T);

  it("lets careful sliders clear every table with three stars", () => {
    for (const st of SLIDE_STAGES) {
      const tb = pilot(st, { aimSpread: 0.3, powerSpread: 0.004 });
      expect(tb.won).toBe(true);
      expect(starsFor(tb)).toBe(3);
    }
  }, T);

  it("lets sloppier human-like sliders clear almost every table", () => {
    let wins = 0;
    for (const st of SLIDE_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("never scores enough with random slides", () => {
    for (const st of SLIDE_STAGES) for (const seed of [21, 22, 23, 24]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
