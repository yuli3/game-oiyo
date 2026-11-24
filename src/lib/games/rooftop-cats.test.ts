import { describe, expect, it } from "vitest";
import { CATS_STAGES, MISS_PENALTY, SCENE_H, SCENE_TOP, STAGE_COUNT, W, catAt, newHunt, pilot, starsFor, tap, tick, timeLeft } from "./rooftop-cats";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ base: 1.7, hidden: 1.7, slip: 0.1, seed }));

describe("rooftop-cats", () => {
  it("has 30 scenes, more cats and darker skies later", () => {
    expect(CATS_STAGES).toHaveLength(STAGE_COUNT);
    expect(CATS_STAGES[0].time).toBe("day");
    expect(CATS_STAGES[15].time).toBe("dusk");
    expect(CATS_STAGES[29].time).toBe("night");
    expect(CATS_STAGES[29].cats.length).toBeGreaterThan(CATS_STAGES[0].cats.length * 2);
    const hidden = (i: number) => CATS_STAGES[i].cats.filter((c) => c.camo > 0.8).length / CATS_STAGES[i].cats.length;
    expect(hidden(29)).toBeGreaterThan(hidden(0));
    for (const st of CATS_STAGES) {
      expect(st.par).toBeLessThan(st.limit);
      for (const c of st.cats) {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x).toBeLessThanOrEqual(W);
        expect(c.y).toBeGreaterThanOrEqual(SCENE_TOP);
        expect(c.y).toBeLessThanOrEqual(SCENE_TOP + SCENE_H);
      }
      // cats never sit on top of one another, so a tap always means one cat
      for (let i = 0; i < st.cats.length; i++)
        for (let j = i + 1; j < st.cats.length; j++) expect(Math.hypot(st.cats[i].x - st.cats[j].x, st.cats[i].y - st.cats[j].y)).toBeGreaterThanOrEqual(30);
    }
  }, T);

  it("finds a cat under the finger and charges seconds for a tap on nothing", () => {
    const st = CATS_STAGES[4];
    const h = newHunt(st);
    const c = st.cats[0];
    expect(catAt(st, h.found, c.x + 3, c.y + 2)).toBe(0);
    expect(tap(h, c.x, c.y)).toBe("found");
    expect(tap(h, c.x, c.y)).toBe("miss"); // already found
    expect(timeLeft(h)).toBe(st.limit - MISS_PENALTY);
    tick(h, st.limit);
    expect(h.over).toBe(true);
    expect(h.won).toBe(false);
  }, T);

  it("lets a quick finder clear every scene with three stars", () => {
    for (const st of CATS_STAGES) {
      const h = pilot(st, { base: 1.2, hidden: 1.2, slip: 0, seed: 1 });
      expect(h.won).toBe(true);
      expect(starsFor(h)).toBe(3);
    }
  }, T);

  it("lets human-like finders, misplaced taps and all, clear almost every scene", () => {
    let wins = 0;
    for (const st of CATS_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(110);
  }, T);

  it("runs out the clock on random tapping, and on someone three times slower", () => {
    for (const st of CATS_STAGES) for (const seed of [21, 22, 23, 24]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
    let slow = 0;
    for (const st of CATS_STAGES) if (!pilot(st, { base: 5, hidden: 5, slip: 0.1, seed: 2 }).won) slow++;
    expect(slow).toBeGreaterThanOrEqual(25);
  }, T);
});
