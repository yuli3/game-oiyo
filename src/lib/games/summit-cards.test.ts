import { describe, expect, it } from "vitest";
import { COVERED_BY, PEAK_CARDS, STAGE_COUNT, SUMMIT_STAGES, draw, fits, isFree, newClimb, pilot, play, playable, rankOf, starsFor } from "./summit-cards";

const T = 60_000;
// careless as often as the climbers each deal was built against, with other seeds
const HUMANS = [11, 12, 13, 14].map((seed) => ({ depth: 2, slip: 0.12, seed }));

describe("summit-cards", () => {
  it("builds three peaks of 28 cards where only uncovered cards can move", () => {
    expect(COVERED_BY).toHaveLength(PEAK_CARDS);
    // the base row is free from the start; the tips sit on nothing
    for (let s = 18; s < 28; s++) expect(COVERED_BY[s].length).toBeGreaterThan(0);
    for (let s = 0; s < 3; s++) expect(COVERED_BY[s]).toHaveLength(0);
    const cl = newClimb(SUMMIT_STAGES[0]);
    expect(isFree(cl, 0)).toBe(true);
    expect(isFree(cl, 3)).toBe(false); // a tip rests on it
  }, T);

  it("plays one rank up or down, King and Ace joined, and turns the stock when stuck", () => {
    expect(fits(0, 1)).toBe(true); // Ace, 2
    expect(fits(12, 0)).toBe(true); // King, Ace
    expect(fits(4, 6)).toBe(false);
    const st = SUMMIT_STAGES[0];
    const cl = newClimb(st);
    const moves = playable(cl);
    for (const s of moves) expect(Math.abs(rankOf(st.peaks[s]) - rankOf(cl.camp)) % 11).toBe(1);
    const left = cl.stock.length;
    expect(draw(cl)).toBe(true);
    expect(cl.stock.length).toBe(left - 1);
    expect(play(cl, 27) || !isFree(cl, 27) || !fits(st.peaks[27], cl.camp)).toBe(true);
  }, T);

  it("has 30 deals that hide covered cards from stage 7 and shrink the stock", () => {
    expect(SUMMIT_STAGES).toHaveLength(STAGE_COUNT);
    expect(SUMMIT_STAGES[0].faceDown).toBe(false);
    expect(SUMMIT_STAGES[29].faceDown).toBe(true);
    expect(SUMMIT_STAGES[29].stock.length).toBeLessThan(SUMMIT_STAGES[0].stock.length);
    for (const st of SUMMIT_STAGES) expect(new Set([...st.peaks, ...st.stock, st.camp]).size).toBe(PEAK_CARDS + st.stock.length + 1);
  }, T);

  it("lets careful players clear every deal with three stars", () => {
    for (const st of SUMMIT_STAGES) {
      const cl = pilot(st, { depth: 3 });
      expect(cl.won).toBe(true);
      expect(starsFor(cl)).toBe(3);
    }
  }, T);

  it("lets human-like players who look two cards ahead and slip now and then clear almost every deal", () => {
    let wins = 0;
    for (const st of SUMMIT_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(108);
  }, T);

  it("runs random play out of stock", () => {
    for (const st of SUMMIT_STAGES) for (const seed of [21, 22, 23, 24]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
