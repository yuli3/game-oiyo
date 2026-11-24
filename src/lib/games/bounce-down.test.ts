import { describe, expect, it } from "vitest";
import { BOUNCE_STAGES, HEARTS, PERIOD, SLICES, STAGE_COUNT, aim, isGap, newTower, pilot, starsFor, step, under } from "./bounce-down";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ react: 0.45, slip: 0.15, careful: true, seed }));

describe("bounce-down", () => {
  it("has 30 towers that grow taller with more sour slices", () => {
    expect(BOUNCE_STAGES).toHaveLength(STAGE_COUNT);
    expect(BOUNCE_STAGES[29].floors.length).toBeGreaterThan(BOUNCE_STAGES[0].floors.length * 3);
    expect(BOUNCE_STAGES[0].floors.every((f) => f.sour.length === 0)).toBe(true);
    for (const st of BOUNCE_STAGES) {
      expect(st.par).toBeLessThan(st.limit);
      for (const f of st.floors) for (const s of f.sour) expect(isGap(f, s)).toBe(false);
    }
  }, T);

  it("drops through a gap and loses a heart on a sour slice", () => {
    const st = BOUNCE_STAGES[12];
    const tw = newTower(st);
    aim(tw, st.floors[0].gap);
    for (let k = 0; k < 40 && tw.floor === 0; k++) step(tw, PERIOD / 4);
    expect(tw.floor).toBe(1);
    const f = st.floors.findIndex((x) => x.sour.length > 0);
    const t2 = newTower(st);
    t2.floor = f;
    t2.angle = st.floors[f].sour[0] + 0.5;
    t2.clock = 0.01;
    expect(under(t2)).toBe(st.floors[f].sour[0]);
    expect(step(t2, 0.02)).toBe("sour");
    expect(t2.hearts).toBe(HEARTS - 1);
    expect(SLICES).toBe(12);
  }, T);

  it("lets a quick player reach the bottom of every tower with three stars", () => {
    for (const st of BOUNCE_STAGES) {
      const tw = pilot(st, { react: 0.25, careful: true, seed: 1 });
      expect(tw.won).toBe(true);
      expect(starsFor(tw)).toBe(3);
    }
  }, T);

  it("lets slower, sometimes-backwards human-like players reach the bottom of almost every tower", () => {
    let wins = 0;
    for (const st of BOUNCE_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("mostly fails when the tower is turned at random", () => {
    let wins = 0;
    let n = 0;
    for (const st of BOUNCE_STAGES)
      for (const seed of [21, 22, 23, 24, 25, 26, 27, 28]) {
        n++;
        if (pilot(st, { mode: "random", seed }).won) wins++;
      }
    expect(wins / n).toBeLessThan(0.1);
    for (const st of BOUNCE_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
