import { describe, expect, it } from "vitest";
import { HEARTS, HOP, PRISM_STAGES, STAGE_COUNT, colourAt, newHop, pilot, starsFor, step, tap, type PrismStage } from "./prism-hop";

const T = 60_000;
// slower and sloppier than the hoppers each tower was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ react: 0.36, jitter: 0.06, margin: 0.05, seed }));

describe("prism-hop", () => {
  it("reads ring colours at the bottom and top, and bar colours under the bead", () => {
    const ring = { kind: 0 as const, y: 200, r: 80, phase: 0, speed: Math.PI / 2, colour: 0 };
    // at t = 0 the bottom points into quadrant 3 and the top into quadrant 1
    expect(colourAt(ring, "low", 0.01)).toBe(2);
    expect(colourAt(ring, "high", 0.01)).toBe(0);
    // a quarter turn later every colour has moved on by one
    expect(colourAt(ring, "high", 1.01)).toBe(3);
    const bar = { kind: 1 as const, y: 100, r: 0, phase: 0, speed: 90, colour: 0 };
    expect(colourAt(bar, "low", 0)).toBe(0);
    expect(colourAt(bar, "low", 1.5)).toBe(1);
  }, T);

  it("hops on a tap, falls back to its ledge, and loses a heart in the wrong colour", () => {
    const st: PrismStage = { stage: 0, gates: [{ kind: 1, y: 60, r: 0, phase: 0, speed: 0, colour: 1 }], ledges: [0, 200], limit: 30 };
    const h = newHop(st);
    tap(h);
    expect(h.v).toBe(HOP);
    let hit = false;
    for (let k = 0; k < 60; k++) if (step(h, 1 / 60).includes("hit")) hit = true;
    expect(hit).toBe(true); // the bar is colour 0, the bead colour 1
    expect(h.hearts).toBe(HEARTS - 1);
    for (let k = 0; k < 120; k++) step(h, 1 / 60);
    expect(h.y).toBe(0);
    expect(h.resting).toBe(true);
  }, T);

  it("has 30 towers of 4 gates up to 14, sliding bars from stage 5", () => {
    expect(PRISM_STAGES).toHaveLength(STAGE_COUNT);
    expect(PRISM_STAGES[0].gates).toHaveLength(4);
    expect(PRISM_STAGES[29].gates).toHaveLength(14);
    for (const st of PRISM_STAGES.slice(0, 4)) expect(st.gates.every((g) => g.kind === 0)).toBe(true);
    expect(PRISM_STAGES.slice(4).some((st) => st.gates.some((g) => g.kind === 1))).toBe(true);
  }, T);

  it("lets careful hoppers climb every tower with three stars", () => {
    for (const st of PRISM_STAGES) {
      const h = pilot(st, { react: 0.25, jitter: 0.02, margin: 0.08 });
      expect(h.won).toBe(true);
      expect(starsFor(h)).toBe(3);
    }
  }, T);

  it("lets slower, sloppier human-like hoppers climb almost every tower", () => {
    let wins = 0;
    for (const st of PRISM_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("knocks random tappers out of hearts", () => {
    let wins = 0;
    for (const st of PRISM_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(15);
    for (const st of PRISM_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
