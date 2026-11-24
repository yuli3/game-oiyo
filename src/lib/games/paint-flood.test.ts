import { describe, expect, it } from "vitest";
import { FLOOD_STAGES, STAGE_COUNT, newCanvas, ownedCount, paint, pilot, starsFor, type FloodStage } from "./paint-flood";

const T = 60_000;
// looking only one move ahead and careless more often than the painters each canvas was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ depth: 1 as const, slip: 0.15, seed }));

describe("paint-flood", () => {
  it("soaks up touching squares of the colour painted, and wins when all is one colour", () => {
    // 0 0 1
    // 2 1 1
    // 2 2 1
    const st: FloodStage = { stage: 0, size: 3, colours: 3, cells: [0, 0, 1, 2, 1, 1, 2, 2, 1], limit: 5, par: 2 };
    const c = newCanvas(st);
    expect(ownedCount(c)).toBe(2);
    expect(paint(c, 0)).toBe(-1); // already that colour
    expect(paint(c, 1)).toBe(4);
    expect(ownedCount(c)).toBe(6);
    expect(paint(c, 2)).toBe(3);
    expect(c.won).toBe(true);
    expect(starsFor(c)).toBe(3);
  }, T);

  it("runs out of moves at the brush's limit", () => {
    const st: FloodStage = { stage: 0, size: 2, colours: 3, cells: [0, 1, 2, 0], limit: 1, par: 1 };
    const c = newCanvas(st);
    paint(c, 2);
    expect(c.over).toBe(true);
    expect(c.won).toBe(false);
  }, T);

  it("has 30 canvases growing from 6 × 6 in three colours", () => {
    expect(FLOOD_STAGES).toHaveLength(STAGE_COUNT);
    expect(FLOOD_STAGES[0].size).toBe(6);
    expect(FLOOD_STAGES[0].colours).toBe(3);
    expect(FLOOD_STAGES[29].size).toBeGreaterThan(12);
    expect(FLOOD_STAGES[29].colours).toBe(6);
    for (const st of FLOOD_STAGES) expect(st.par).toBeLessThan(st.limit);
  }, T);

  it("lets players who look two moves ahead clear every canvas with three stars", () => {
    for (const st of FLOOD_STAGES) {
      const c = pilot(st, { depth: 2 });
      expect(c.won).toBe(true);
      expect(starsFor(c)).toBe(3);
    }
  }, T);

  it("lets human-like painters who look one move ahead and slip now and then clear almost every canvas", () => {
    let wins = 0;
    for (const st of FLOOD_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("runs random painting out of moves on the bigger canvases", () => {
    let wins = 0;
    for (const st of FLOOD_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(30);
    for (const st of FLOOD_STAGES.slice(4)) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
    let late = 0;
    for (const st of FLOOD_STAGES.slice(16)) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) late++;
    expect(late).toBeLessThan(4);
  }, T);
});
