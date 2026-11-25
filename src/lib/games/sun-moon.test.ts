import { describe, expect, it } from "vitest";
import { MOON, STAGE_COUNT, SUN, SUNMOON_STAGES, deduce, newBoard, pilot, solveOrder, starsFor, tap, valid, type Clue, type MoonStage } from "./sun-moon";

const T = 60_000;
// slip more often than the solvers each grid was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.13, seed }));

const S = SUN;
const M = MOON;

describe("sun-moon", () => {
  it("checks the rules: halves, no three in a row, = and ×", () => {
    const good = [S, M, S, M, M, S, M, S, S, M, M, S, M, S, S, M];
    expect(valid(4, good, [])).toBe(true);
    expect(valid(4, good, [{ a: 0, dir: 0, same: false }])).toBe(true);
    expect(valid(4, good, [{ a: 0, dir: 0, same: true }])).toBe(false);
    const three = [S, S, S, M, M, M, S, S, S, M, M, M, M, S, M, S];
    expect(valid(4, three, [])).toBe(false);
  }, T);

  it("works squares out: two alike force the next, a full half settles the rest, clues pass values on", () => {
    const n = 4;
    const cells = [S, S, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(deduce(n, cells, [])).toEqual({ i: 2, v: M });
    const clue: Clue[] = [{ a: 5, dir: 1, same: true }];
    const c2 = [0, 0, 0, 0, 0, M, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(deduce(n, c2, clue)).toEqual({ i: 9, v: M });
  }, T);

  it("cycles a square empty → sun → moon → empty, never a given one, and wins on a full valid grid", () => {
    const answer = [S, M, S, M, M, S, M, S, S, M, M, S, M, S, S, M];
    const st: MoonStage = { stage: 0, n: 4, answer, given: Array.from({ length: 15 }, (_, i) => i), clues: [], par: 2, limit: 10 };
    const b = newBoard(st);
    expect(tap(b, 0)).toBe(false); // given
    tap(b, 15);
    expect(b.cells[15]).toBe(SUN);
    tap(b, 15);
    expect(b.won).toBe(true);
    expect(starsFor(b)).toBe(3);
  }, T);

  it("has 30 grids from 4 × 4 up to 8 × 8, each worked out square by square", () => {
    expect(SUNMOON_STAGES).toHaveLength(STAGE_COUNT);
    expect(SUNMOON_STAGES[0].n).toBe(4);
    expect(SUNMOON_STAGES[29].n).toBe(8);
    for (const st of SUNMOON_STAGES) {
      const start = st.answer.map((v, i) => (st.given.includes(i) ? v : 0));
      expect(solveOrder(st.n, start, st.clues)).not.toBeNull();
      expect(st.limit).toBeGreaterThan(st.par);
    }
  }, T);

  it("fills every grid in par with the answer's taps, for three stars", () => {
    for (const st of SUNMOON_STAGES) {
      const b = pilot(st, { mode: "plan" });
      expect(b.won).toBe(true);
      expect(b.taps).toBe(st.par);
      expect(starsFor(b)).toBe(3);
    }
  }, T);

  it("lets human-like solvers who slip more often fill almost every grid", () => {
    let wins = 0;
    for (const st of SUNMOON_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("never fills a grid tapping at random", () => {
    let wins = 0;
    for (const st of SUNMOON_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of SUNMOON_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
