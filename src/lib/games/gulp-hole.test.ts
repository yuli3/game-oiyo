import { describe, expect, it } from "vitest";
import { HOLE_STAGES, MAP_H, MAP_TOP, START_R, STAGE_COUNT, THINGS, W, fits, newPark, pilot, radiusFor, starsFor, steer, step } from "./gulp-hole";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ react: 0.5, wobble: 14, seed }));

describe("gulp-hole", () => {
  it("has 30 parks that fill up and ask for more", () => {
    expect(HOLE_STAGES).toHaveLength(STAGE_COUNT);
    expect(HOLE_STAGES[29].things.length).toBeGreaterThan(HOLE_STAGES[0].things.length);
    expect(HOLE_STAGES[29].goal).toBeGreaterThan(HOLE_STAGES[0].goal);
    for (const st of HOLE_STAGES) {
      expect(st.par).toBeLessThan(st.limit);
      const total = st.things.reduce((s, t) => s + THINGS[t.kind].points, 0);
      expect(st.goal).toBeLessThan(total);
      for (const t of st.things) {
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.x).toBeLessThanOrEqual(W);
        expect(t.y).toBeGreaterThanOrEqual(MAP_TOP);
        expect(t.y).toBeLessThanOrEqual(MAP_TOP + MAP_H);
      }
    }
  }, T);

  it("swallows only things small enough, and grows with every bite", () => {
    const st = HOLE_STAGES[3];
    const p = newPark(st);
    expect(p.r).toBe(START_R);
    expect(fits(p, 0)).toBe(true);
    expect(fits(p, 9)).toBe(false);
    const flower = st.things.findIndex((t) => t.kind === 0);
    const kiosk = st.things.findIndex((t) => t.kind >= 7);
    steer(p, st.things[flower].x, st.things[flower].y);
    while (!p.eaten[flower] && !p.over) step(p, 0.05);
    expect(p.eaten[flower]).toBe(true);
    expect(p.r).toBeCloseTo(radiusFor(p.points));
    expect(p.r).toBeGreaterThan(START_R);
    if (kiosk >= 0) {
      const q = newPark(st);
      q.x = st.things[kiosk].x;
      q.y = st.things[kiosk].y;
      steer(q, q.x, q.y);
      step(q, 0.05);
      expect(q.eaten[kiosk]).toBe(false);
    }
  }, T);

  it("fills the meter on every park for a quick player, with three stars", () => {
    for (const st of HOLE_STAGES) {
      const p = pilot(st, { react: 0.25, wobble: 4, seed: 1 });
      expect(p.won).toBe(true);
      expect(starsFor(p)).toBe(3);
    }
  }, T);

  it("lets slower human-like players win every park with time to spare", () => {
    let wins = 0;
    let three = 0;
    let spare = 0;
    for (const st of HOLE_STAGES)
      for (const o of HUMANS) {
        const p = pilot(st, o);
        if (p.won) wins++;
        if (starsFor(p) === 3) three++;
        spare += (st.limit - p.t) / st.limit;
      }
    expect(wins).toBe(120);
    expect(three).toBeGreaterThanOrEqual(100);
    expect(spare / 120).toBeGreaterThan(0.25); // on average a quarter of the clock is left over
  }, T);

  it("runs out the clock on aimless wandering", () => {
    let wins = 0;
    for (const st of HOLE_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThanOrEqual(6);
    for (const st of HOLE_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
