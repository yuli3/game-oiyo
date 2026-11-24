import { describe, expect, it } from "vitest";
import { DUCK_STAGES, START, STAGE_COUNT, apply, bestCount, finishAt, newParade, pilot, starsFor, steer, step } from "./duck-parade";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ react: 1.2, slip: 0.15, seed }));

describe("duck-parade", () => {
  it("has 30 paths that grow longer, with foxes and a stream to cross", () => {
    expect(DUCK_STAGES).toHaveLength(STAGE_COUNT);
    expect(DUCK_STAGES[29].rows.length).toBeGreaterThan(DUCK_STAGES[0].rows.length);
    for (const st of DUCK_STAGES) {
      expect(st.rows.some((r) => r.kind === "fox")).toBe(true);
      expect(st.need).toBeGreaterThan(START);
      expect(st.need).toBeLessThan(st.best);
      expect(st.best).toBe(bestCount(st.rows));
      expect(st.best).toBeLessThanOrEqual(5000);
    }
  }, T);

  it("works each gate on the whole parade, and the fox takes a share", () => {
    expect(apply({ op: "+", n: 5 }, 10)).toBe(15);
    expect(apply({ op: "-", n: 15 }, 10)).toBe(0);
    expect(apply({ op: "x", n: 3 }, 10)).toBe(30);
    expect(apply({ op: "/", n: 2 }, 11)).toBe(5);
    const st = DUCK_STAGES[6];
    const fox = st.rows.findIndex((r) => r.kind === "fox");
    const row = st.rows[fox];
    if (row.kind !== "fox") throw new Error("no fox");
    const p = newParade(st);
    p.count = 100;
    p.passed = fox;
    p.dist = 150 * fox + 149;
    steer(p, row.lane);
    step(p, 0.05);
    expect(p.count).toBe(100 - Math.ceil(row.bite));
  }, T);

  it("crosses the stream on every path with three stars when every gate is read in time", () => {
    for (const st of DUCK_STAGES) {
      const p = pilot(st, { react: 0.6, slip: 0, seed: 1 });
      expect(p.won).toBe(true);
      expect(starsFor(p)).toBe(3);
      expect(p.dist).toBeGreaterThanOrEqual(finishAt(st));
    }
  }, T);

  it("lets slower, sometimes-wrong human-like walkers cross almost every stream", () => {
    let wins = 0;
    for (const st of DUCK_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(110);
  }, T);

  it("mostly falls short when lanes are flipped at random", () => {
    let wins = 0;
    let n = 0;
    for (const st of DUCK_STAGES)
      for (const seed of [21, 22, 23, 24, 25, 26, 27, 28]) {
        n++;
        if (pilot(st, { mode: "random", seed }).won) wins++;
      }
    expect(wins / n).toBeLessThan(0.2);
    for (const st of DUCK_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
