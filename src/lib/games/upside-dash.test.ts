import { describe, expect, it } from "vitest";
import { CEIL, FLIP_T, FLOOR, HEARTS, MID, STAGE_COUNT, UPSIDE_STAGES, flip, newRun, pilot, starsFor, step, type UpsideStage } from "./upside-dash";

const T = 60_000;
// later and shakier than the runners each tunnel was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ lead: 0.36, timing: 0.06, seed }));

const tunnel = (over: Partial<UpsideStage>): UpsideStage => ({ stage: 0, speed: 200, length: 1000, hazards: [], batteries: [], flips: [], par: 0, ...over });

describe("upside-dash", () => {
  it("flips from the floor to the ceiling in a fixed time, and not again mid-flip", () => {
    const r = newRun(tunnel({}));
    expect(r.y).toBe(FLOOR);
    expect(flip(r)).toBe(true);
    expect(flip(r)).toBe(false);
    let t = 0;
    while (r.flipping) {
      step(r, 1 / 120);
      t += 1 / 120;
    }
    expect(r.y).toBe(CEIL);
    expect(t).toBeCloseTo(FLIP_T, 1);
  }, T);

  it("loses a heart on spikes, passes through for a moment, and picks up batteries", () => {
    const r = newRun(tunnel({ hazards: [{ x: 50, w: 40, lane: 0 }, { x: 60, w: 20, lane: 0 }], batteries: [{ x: 200, y: FLOOR }, { x: 300, y: MID }] }));
    for (let k = 0; k < 120; k++) step(r, 1 / 120);
    expect(r.hearts).toBe(HEARTS - 1); // the second spike is inside the safe second
    expect(r.batteries).toBe(1);
    expect(r.over).toBe(false);
  }, T);

  it("wins at the end of the tunnel and loses with no hearts left", () => {
    const r = newRun(tunnel({ length: 100 }));
    while (!r.over) step(r, 1 / 120);
    expect(r.won).toBe(true);
    expect(starsFor(r)).toBe(3);
    const l = newRun(tunnel({ hazards: [{ x: 0, w: 2000, lane: 0 }] }));
    while (!l.over) step(l, 1 / 120);
    expect(l.won).toBe(false);
  }, T);

  it("has 30 tunnels, longer and faster later on", () => {
    expect(UPSIDE_STAGES).toHaveLength(STAGE_COUNT);
    expect(UPSIDE_STAGES[29].length).toBeGreaterThan(UPSIDE_STAGES[0].length);
    expect(UPSIDE_STAGES[29].speed).toBeGreaterThan(UPSIDE_STAGES[0].speed);
    expect(UPSIDE_STAGES[0].hazards.some((h) => h.lane === 1)).toBe(false); // no saws to start with
  }, T);

  it("clears every tunnel with three stars on the planned flips", () => {
    for (const st of UPSIDE_STAGES) {
      const r = pilot(st, { mode: "plan" });
      expect(r.won).toBe(true);
      expect(starsFor(r)).toBe(3);
    }
  }, T);

  it("lets later, shakier human-like runners clear almost every tunnel", () => {
    let wins = 0;
    for (const st of UPSIDE_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("rarely gets through tapping at random", () => {
    let wins = 0;
    for (const st of UPSIDE_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of UPSIDE_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
