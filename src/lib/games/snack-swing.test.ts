import { describe, expect, it } from "vitest";
import { GRAVITY, SNACK_STAGES, STAGE_COUNT, newSwing, pilot, ropeAt, snip, starsFor, step, type SnackStage } from "./snack-swing";

const T = 60_000;
// a little more off in their timing than the snippers each stage was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ timing: 0.06, seed }));

const hang = (over: Partial<SnackStage>): SnackStage => ({ stage: 0, start: [180, 200], ropes: [{ ax: 180, ay: 100, len: 100 }], mouth: [180, 460], sparkles: [], thorns: [], plan: [], ...over });

describe("snack-swing", () => {
  it("hangs still on a rope, and drops once it is snipped", () => {
    const s = newSwing(hang({}));
    for (let k = 0; k < 120; k++) step(s);
    expect(s.y).toBeCloseTo(200, 0); // held by the rope
    snip(s, 0);
    for (let k = 0; k < 60; k++) step(s);
    expect(s.y).toBeGreaterThan(200 + (GRAVITY * 0.5 * 0.5) / 2 - 10);
  }, T);

  it("swings from a rope held off to one side, never further than its length", () => {
    const s = newSwing(hang({ start: [260, 100], ropes: [{ ax: 180, ay: 100, len: 80 }] }));
    let maxD = 0;
    for (let k = 0; k < 240; k++) {
      step(s);
      maxD = Math.max(maxD, Math.hypot(s.x - 180, s.y - 100));
    }
    expect(maxD).toBeLessThan(81);
    expect(s.x).toBeLessThan(260); // it has swung back across
  }, T);

  it("snips the rope nearest a tap, feeds the hamster, and counts sparkles", () => {
    const st = hang({ sparkles: [[180, 300]] });
    const s = newSwing(st);
    expect(ropeAt(s, 185, 150)).toBe(0);
    expect(ropeAt(s, 300, 150)).toBe(-1);
    snip(s, 0);
    while (!s.over) step(s);
    expect(s.won).toBe(true);
    expect(s.sparkles).toBe(1);
    expect(starsFor(s)).toBe(1);
  }, T);

  it("has 30 set-ups with more ropes and thorns later on", () => {
    expect(SNACK_STAGES).toHaveLength(STAGE_COUNT);
    expect(SNACK_STAGES[0].ropes).toHaveLength(1);
    expect(SNACK_STAGES[29].ropes.length).toBeGreaterThan(1);
    expect(SNACK_STAGES[29].thorns.length).toBeGreaterThan(0);
  }, T);

  it("feeds the hamster with every sparkle on the planned snips, for three stars", () => {
    for (const st of SNACK_STAGES) expect(starsFor(pilot(st, { mode: "plan" }))).toBe(3);
  }, T);

  it("lets human-like snippers, a little more off in their timing, feed the hamster almost every time", () => {
    let wins = 0;
    for (const st of SNACK_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(108);
  }, T);

  it("rarely feeds it snipping at random", () => {
    let wins = 0;
    for (const st of SNACK_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of SNACK_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
