import { describe, expect, it } from "vitest";
import { CAKE_STAGES, MAX_WRONG, STAGE_COUNT, accuse, mark, newCase, pilot, reasoningPasses, solutions, starsFor } from "./cake-thief";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ read: 3.5, slip: 0.08, seed }));

describe("cake-thief", () => {
  it("has 30 cases growing from three suspects to five", () => {
    expect(CAKE_STAGES).toHaveLength(STAGE_COUNT);
    expect(CAKE_STAGES[0].n).toBe(3);
    expect(CAKE_STAGES[29].n).toBe(5);
    expect(CAKE_STAGES[29].clues.length).toBeGreaterThan(CAKE_STAGES[0].clues.length);
  }, T);

  it("gives every case exactly one answer, reachable by plain grid reasoning", () => {
    for (const st of CAKE_STAGES) {
      const sols = solutions(st.n, st.clues, 5);
      expect(sols).toHaveLength(1);
      expect(sols[0].room).toEqual(st.room);
      expect(sols[0].item).toEqual(st.item);
      expect(reasoningPasses(st.n, st.clues)).toBeGreaterThan(0);
      // no clue is spare
      for (let i = 0; i < st.clues.length; i++) {
        const without = st.clues.filter((_, k) => k !== i);
        expect(solutions(st.n, without).length === 1 && reasoningPasses(st.n, without) > 0).toBe(false);
      }
    }
  }, T);

  it("cycles grid marks and lets the thief get away after two wrong guesses", () => {
    const st = CAKE_STAGES[10];
    const c = newCase(st);
    expect(mark(c, 0, 1, 2)).toBe(1);
    expect(mark(c, 0, 1, 2)).toBe(2);
    expect(mark(c, 0, 1, 2)).toBe(0);
    const wrongRoom = (st.room[st.thief] + 1) % st.n;
    for (let k = 0; k < MAX_WRONG; k++) expect(accuse(c, st.thief, wrongRoom)).toBe("wrong");
    expect(c.over).toBe(true);
    expect(c.won).toBe(false);
    const d = newCase(st);
    expect(accuse(d, st.thief, st.room[st.thief])).toBe("caught");
    expect(d.won).toBe(true);
  }, T);

  it("lets a careful sleuth solve every case with three stars", () => {
    for (const st of CAKE_STAGES) {
      const c = pilot(st, { read: 3, slip: 0, seed: 1 });
      expect(c.won).toBe(true);
      expect(starsFor(c)).toBe(3);
    }
  }, T);

  it("lets human-like sleuths, slower and slipping now and then, catch almost every thief", () => {
    let wins = 0;
    let three = 0;
    for (const st of CAKE_STAGES)
      for (const o of HUMANS) {
        const c = pilot(st, o);
        if (c.won) wins++;
        if (starsFor(c) === 3) three++;
      }
    expect(wins).toBeGreaterThanOrEqual(115);
    expect(three).toBeGreaterThanOrEqual(90);
  }, T);

  it("mostly lets the thief go when you guess at random", () => {
    let wins = 0;
    let n = 0;
    for (const st of CAKE_STAGES)
      for (const seed of [21, 22, 23, 24, 25, 26, 27, 28]) {
        n++;
        if (pilot(st, { mode: "random", seed }).won) wins++;
      }
    expect(wins / n).toBeLessThan(0.2);
    for (const st of CAKE_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
