import { describe, expect, it } from "vitest";
import { BEE_STAGES, EMPTY, STAGE_COUNT, begin, end, extend, flowerAt, hamiltonian, joined, newMeadow, pilot, solve, starsFor, stroke, type BeeStage } from "./bee-lines";

const T = 60_000;
// draw more trails wrong first than the players each meadow was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ mode: "human" as const, slip: 0.35, seed }));

/** A 3 × 3 meadow: red along the top row, blue down the rest in a snake. */
const tiny: BeeStage = { stage: 0, n: 3, pairs: [[0, 2], [5, 6]], plan: [[0, 1, 2], [5, 4, 3, 6, 7, 8]] };

describe("bee-lines", () => {
  it("draws a trail square by square between neighbours, and fills the meadow to win", () => {
    const m = newMeadow({ ...tiny, pairs: [[0, 2], [5, 8]], plan: [] });
    expect(begin(m, 0)).toBe(true);
    expect(extend(m, 4)).toBe(false); // not a neighbour
    expect(extend(m, 1)).toBe(true);
    expect(extend(m, 2)).toBe(true);
    end(m);
    expect(joined(m, 0)).toBe(true);
    expect(m.won).toBe(false); // squares still empty
    stroke(m, [5, 4, 3, 6, 7, 8]);
    expect(m.won).toBe(true);
    expect(starsFor(m)).toBe(3);
  }, T);

  it("cuts an old trail when a new one is drawn through it, and backs up over its own", () => {
    const st: BeeStage = { stage: 0, n: 3, pairs: [[0, 2], [3, 5]], plan: [] };
    const m = newMeadow(st);
    stroke(m, [0, 1, 2]);
    stroke(m, [3, 4, 1]); // blue goes through red's middle
    expect(m.owner[1]).toBe(1);
    expect(joined(m, 0)).toBe(false);
    begin(m, 3);
    extend(m, 4);
    extend(m, 7);
    extend(m, 4); // back up
    expect(m.trails[1]).toEqual([3, 4]);
    expect(m.owner[7]).toBe(EMPTY);
  }, T);

  it("never draws onto another colour's flower", () => {
    const m = newMeadow(tiny);
    begin(m, 0);
    extend(m, 3);
    expect(extend(m, 6)).toBe(false); // the blue flower
    expect(flowerAt(tiny, 6)).toBe(1);
  }, T);

  it("makes random paths that pass through every square once", () => {
    let a = 1;
    const rng = () => ((a = (a * 16807) % 2147483647) / 2147483647);
    for (const n of [5, 7, 9]) {
      const p = hamiltonian(n, rng, 2000);
      expect(new Set(p).size).toBe(n * n);
      for (let i = 1; i < p.length; i++) expect(Math.abs((p[i] % n) - (p[i - 1] % n)) + Math.abs(Math.floor(p[i] / n) - Math.floor(p[i - 1] / n))).toBe(1);
    }
  }, T);

  it("has 30 meadows from 5 × 5 to 9 × 9, every square on exactly one planned trail", () => {
    expect(BEE_STAGES).toHaveLength(STAGE_COUNT);
    expect(BEE_STAGES[0].n).toBe(5);
    expect(BEE_STAGES[29].n).toBe(9);
    for (const st of BEE_STAGES) {
      const all = st.plan.flat();
      expect(all.length).toBe(st.n * st.n);
      expect(new Set(all).size).toBe(st.n * st.n);
      st.plan.forEach((t, k) => expect([t[0], t[t.length - 1]]).toEqual(st.pairs[k]));
    }
  }, T);

  it("fills every meadow with its plan, one stroke a trail, for three stars", () => {
    for (const st of BEE_STAGES) {
      const m = pilot(st);
      expect(m.won).toBe(true);
      expect(m.strokes).toBe(st.pairs.length);
      expect(starsFor(m)).toBe(3);
    }
  }, T);

  it("lets a search that never sees the plan fill meadows 1–18", () => {
    for (const st of BEE_STAGES.slice(0, 18)) {
      const trails = solve(st);
      expect(trails).not.toBeNull();
      const m = newMeadow(st);
      for (const t of trails as number[][]) stroke(m, t);
      expect(m.won).toBe(true);
    }
  }, T);

  it("lets human-like players who redraw more trails fill every meadow, mostly for three stars", () => {
    let wins = 0;
    let three = 0;
    for (const st of BEE_STAGES) {
      for (const o of HUMANS) {
        const m = pilot(st, o);
        if (m.won) wins++;
        if (starsFor(m) === 3) three++;
      }
    }
    expect(wins).toBe(120);
    expect(three).toBeGreaterThanOrEqual(90);
  }, T);

  it("never fills a meadow with random strokes", () => {
    for (const st of BEE_STAGES) for (const seed of [21, 22, 23, 24, 1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
