import { describe, expect, it } from "vitest";
import { STAGE_COUNT, WINDOWS_STAGES, fewestTaps, flip, newBlock, pilot, plan, starsFor, tap, type WindowsStage } from "./sleepy-windows";

const T = 60_000;
// clumsier than the players each block was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ mode: "chase" as const, slip: 0.08, seed }));

describe("sleepy-windows", () => {
  it("flips a window and its four neighbours", () => {
    const lit = new Array(9).fill(false);
    flip(lit, 3, 3, 4);
    expect(lit.map(Number)).toEqual([0, 1, 0, 1, 1, 1, 0, 1, 0]);
    flip(lit, 3, 3, 0);
    expect(lit.map(Number)).toEqual([1, 0, 0, 0, 1, 1, 0, 1, 0]);
  }, T);

  it("puts a block to sleep in the fewest taps, and stops at the limit", () => {
    const lit = new Array(9).fill(false);
    flip(lit, 3, 3, 4);
    flip(lit, 3, 3, 0);
    expect(fewestTaps(lit, 3, 3)).toBe(2);
    const st: WindowsStage = { stage: 0, cols: 3, rows: 3, lit, par: 2, limit: 3 };
    const b = newBlock(st);
    for (const i of plan(b.lit, 3, 3)) tap(b, i);
    expect(b.won).toBe(true);
    expect(starsFor(b)).toBe(3);
    const c = newBlock(st);
    tap(c, 8);
    tap(c, 8);
    tap(c, 8);
    expect(c.over).toBe(true);
    expect(c.won).toBe(false);
  }, T);

  it("has 30 blocks from 3 × 3 up to 5 × 6, each with lit windows", () => {
    expect(WINDOWS_STAGES).toHaveLength(STAGE_COUNT);
    expect([WINDOWS_STAGES[0].cols, WINDOWS_STAGES[0].rows]).toEqual([3, 3]);
    expect([WINDOWS_STAGES[29].cols, WINDOWS_STAGES[29].rows]).toEqual([5, 6]);
    for (const st of WINDOWS_STAGES) {
      expect(st.lit.some(Boolean)).toBe(true);
      expect(st.par).toBeLessThan(st.limit);
    }
  }, T);

  it("lets careful players put every block to sleep with three stars", () => {
    for (const st of WINDOWS_STAGES) {
      const b = pilot(st, { mode: "plan" });
      expect(b.won).toBe(true);
      expect(starsFor(b)).toBe(3);
    }
  }, T);

  it("lets human-like players who chase the lights down and miss now and then clear almost every block", () => {
    let wins = 0;
    for (const st of WINDOWS_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(110);
  }, T);

  it("runs random tapping out of taps", () => {
    let wins = 0;
    for (const st of WINDOWS_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(6);
    for (const st of WINDOWS_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
