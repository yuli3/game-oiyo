import { describe, expect, it } from "vitest";
import { FLOOR, POTS_STAGES, STAGE_COUNT, WALL, moves, newRoom, pilot, solve, starsFor, undo, walk, type PotStage } from "./sunny-pots";

const T = 60_000;
// slip more often than the gardeners each room was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.15, seed }));

/** A 5 × 3 room inside walls: the player at x 1, a pot at x 2, sun at x 3 (middle row). */
function corridor(): PotStage {
  const w = 5;
  const h = 3;
  const cells = Array.from({ length: w * h }, (_, i) => (Math.floor(i / w) === 1 && i % w > 0 && i % w < w - 1 ? FLOOR : WALL));
  return { stage: 0, w, h, cells, marks: [8], pots: [7], player: 6, plan: [1], par: 1 };
}

describe("sunny-pots", () => {
  it("pushes a pot onto the sun, but never pulls it, and never pushes two", () => {
    const st = corridor();
    const r = newRoom(st);
    expect(walk(r, 3)).toBe(false); // wall
    expect(walk(r, 1)).toBe(true); // pushes the pot onto the sun
    expect(r.pots).toEqual([8]);
    expect(r.won).toBe(true);
    expect(starsFor(r)).toBe(3);
    const r2 = newRoom({ ...st, pots: [7, 8], marks: [7, 8] });
    expect(walk(r2, 1)).toBe(false); // two pots in a row don't move
  }, T);

  it("undoes moves, pushes included, and only kept moves count", () => {
    const st = corridor();
    const r = newRoom(st);
    walk(r, 1);
    expect(moves(r)).toBe(1);
    expect(undo(r)).toBe(true);
    expect(r.pots).toEqual([7]);
    expect(r.player).toBe(6);
    expect(r.won).toBe(false);
    expect(moves(r)).toBe(0);
    expect(undo(r)).toBe(false);
  }, T);

  it("finds the fewest moves with a breadth-first search", () => {
    const st = corridor();
    expect(solve(st, st.player, st.pots)).toEqual([1]);
    expect(solve(st, 8, [7])).toBeNull(); // the pot can't be pulled back
  }, T);

  it("has 30 rooms growing from 1 pot to 4, every pot starting off the sun in the early rooms", () => {
    expect(POTS_STAGES).toHaveLength(STAGE_COUNT);
    expect(POTS_STAGES[0].pots).toHaveLength(1);
    expect(POTS_STAGES[29].pots).toHaveLength(4);
    for (const st of POTS_STAGES) {
      expect(st.marks).toHaveLength(st.pots.length);
      expect(st.par).toBe(st.plan.length);
      for (const p of [...st.pots, st.player, ...st.marks]) expect(st.cells[p]).toBe(FLOOR);
    }
    for (const st of POTS_STAGES.slice(0, 12)) expect(st.pots.some((p) => st.marks.includes(p))).toBe(false);
  }, T);

  it("solves every room with its plan, in par, for three stars", () => {
    for (const st of POTS_STAGES) {
      const r = pilot(st, { mode: "plan" });
      expect(r.won).toBe(true);
      expect(moves(r)).toBe(st.par);
      expect(starsFor(r)).toBe(3);
    }
  }, T);

  it("lets human-like gardeners who slip more often, and undo dead ends, solve every room", () => {
    let wins = 0;
    let threeStars = 0;
    for (const st of POTS_STAGES) {
      for (const o of HUMANS) {
        const r = pilot(st, o);
        if (r.won) wins++;
        if (starsFor(r) === 3) threeStars++;
      }
    }
    expect(wins).toBe(120);
    expect(threeStars).toBeGreaterThanOrEqual(70);
  }, T);

  it("never solves a room walking at random", () => {
    let wins = 0;
    for (const st of POTS_STAGES.slice(3)) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(5);
    for (const st of POTS_STAGES.slice(3)) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
