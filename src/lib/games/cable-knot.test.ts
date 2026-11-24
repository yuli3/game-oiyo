import { describe, expect, it } from "vitest";
import { CABLE_STAGES, STAGE_COUNT, crossCount, emptySockets, move, newDesk, pilot, starsFor } from "./cable-knot";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ breadth: 4, slip: 0.15, seed }));

describe("cable-knot", () => {
  it("has 30 tangled desks with spare sockets and a tidy answer", () => {
    expect(CABLE_STAGES).toHaveLength(STAGE_COUNT);
    expect(CABLE_STAGES[29].plugs).toBeGreaterThan(CABLE_STAGES[0].plugs);
    for (const st of CABLE_STAGES) {
      expect(st.sockets.length).toBeGreaterThan(st.plugs);
      expect(crossCount(st, st.start)).toBeGreaterThan(0);
      // the tidy desk (plug i in socket i) has no crossings
      expect(crossCount(st, Array.from({ length: st.plugs }, (_, i) => i))).toBe(0);
      expect(st.par).toBeLessThan(st.limit);
    }
  }, T);

  it("moves a plug only to an empty socket, and runs out at the move limit", () => {
    const st = CABLE_STAGES[8];
    const d = newDesk(st);
    expect(move(d, 0, d.at[1])).toBe(false); // taken
    const free = emptySockets(d);
    expect(free.length).toBe(st.sockets.length - st.plugs);
    expect(move(d, 0, free[0])).toBe(true);
    expect(d.moves).toBe(1);
    while (!d.over) {
      const e = emptySockets(d);
      move(d, d.moves % st.plugs, e[0]);
    }
    expect(d.moves).toBeLessThanOrEqual(st.limit);
  }, T);

  it("untangles every desk with three stars for a careful solver", () => {
    for (const st of CABLE_STAGES) {
      const d = pilot(st, { breadth: 1, seed: 1 });
      expect(d.won).toBe(true);
      expect(starsFor(d)).toBe(3);
    }
  }, T);

  it("lets human-like untanglers, loose and careless now and then, untangle almost every desk", () => {
    let wins = 0;
    for (const st of CABLE_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(105);
  }, T);

  it("runs out of moves when plugs are moved at random", () => {
    let wins = 0;
    let n = 0;
    for (const st of CABLE_STAGES)
      for (const seed of [21, 22, 23, 24, 25, 26, 27, 28]) {
        n++;
        if (pilot(st, { mode: "random", seed }).won) wins++;
      }
    expect(wins / n).toBeLessThan(0.15);
    for (const st of CABLE_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
