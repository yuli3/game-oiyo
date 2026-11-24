import { describe, expect, it } from "vitest";
import { CORK_STAGES, FLIGHT, GAP, HEARTS, STAGE_COUNT, landAt, newBoard, pilot, shoot, spinAt, starsFor, step, type CorkStage } from "./cork-spin";

const T = 60_000;
// slower and sloppier than the throwers each board was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ react: 0.32, jitter: 0.06, margin: 0.08, seed }));

const steady: CorkStage = { stage: 0, pins: 2, fixed: [], speed: 2, wobble: 0, wobbleRate: 1, reverse: 0, par: 10, limit: 30 };

describe("cork-spin", () => {
  it("turns steadily, or swings back and forth further than a full turn", () => {
    expect(spinAt(steady, 1.5)).toBeCloseTo(3, 6);
    const swing = { ...steady, reverse: 4 };
    expect(spinAt(swing, 4)).toBeCloseTo(8, 6);
    expect(spinAt(swing, 6)).toBeCloseTo(4, 6);
    for (const st of CORK_STAGES) if (st.reverse) expect(Math.abs(st.speed) * st.reverse).toBeGreaterThan(Math.PI * 2);
  }, T);

  it("sticks a pin where the board is when it lands, and bounces one that lands too close", () => {
    const b = newBoard(steady);
    expect(shoot(b)).toBe(true);
    expect(shoot(b)).toBe(false); // still cooling down
    let ev = step(b, FLIGHT + 0.001);
    expect(ev).toEqual(["stuck"]);
    expect(b.stuck[0]).toBeCloseTo(landAt(steady, FLIGHT), 6);
    // a whole turn later the same spot comes round again: that pin bounces
    const full = (Math.PI * 2) / steady.speed;
    step(b, full - 0.001 - FLIGHT - 0.05);
    shoot(b);
    ev = [];
    for (let k = 0; k < 20; k++) ev.push(...step(b, 0.01));
    expect(ev).toContain("bounced");
    expect(b.hearts).toBe(HEARTS - 1);
    expect(b.left).toBe(1); // the pin goes back in the box
    expect(GAP).toBeGreaterThan(0.1);
  }, T);

  it("has 30 boards from 7 pins and a still board up to 13 pins with pins already in", () => {
    expect(CORK_STAGES).toHaveLength(STAGE_COUNT);
    expect(CORK_STAGES[0].pins).toBe(7);
    expect(CORK_STAGES[0].fixed).toHaveLength(0);
    expect(CORK_STAGES[29].pins).toBe(13);
    expect(CORK_STAGES[29].fixed).toHaveLength(2);
  }, T);

  it("lets quick, careful throwers clear every board with three stars", () => {
    for (const st of CORK_STAGES) {
      const b = pilot(st, { react: 0.2, jitter: 0.02, margin: 0.12, seed: 1 });
      expect(b.won).toBe(true);
      expect(starsFor(b)).toBe(3);
    }
  }, T);

  it("lets slower, sloppier human-like throwers clear almost every board", () => {
    let wins = 0;
    for (const st of CORK_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("runs out of hearts for tapping at random once the boards get busy", () => {
    let late = 0;
    for (const st of CORK_STAGES.slice(12)) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) late++;
    expect(late).toBeLessThan(8);
    for (const st of CORK_STAGES.slice(12)) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
