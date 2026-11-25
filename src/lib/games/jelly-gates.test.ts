import { describe, expect, it } from "vitest";
import { JELLY_STAGES, STAGE_COUNT, flick, newTray, pilot, slide, solve, starsFor, type JellyStage } from "./jelly-gates";

const T = 60_000;
// slip more often than the players each tray was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.16, seed }));

// a 5 × 6 tray: a red square under a red gate on top, a blue bar that leaves through the bottom
const tray = (): JellyStage => ({
  stage: 0,
  cols: 5,
  rows: 6,
  blocks: [{ x: 1, y: 3, w: 1, h: 1, color: 0 }, { x: 2, y: 4, w: 2, h: 1, color: 1 }],
  gates: [{ side: 0, from: 1, len: 1, color: 0 }, { side: 2, from: 2, len: 3, color: 1 }],
  plan: [],
  par: 2,
  limit: 6,
});

describe("jelly-gates", () => {
  it("slides a block until something stops it, and out through a gate of its colour", () => {
    const st = tray();
    const t = newTray(st);
    expect(flick(st, t.pos, 0, 3)).toEqual({ b: 0, d: 3, dist: 1 }); // left to the rim
    expect(flick(st, t.pos, 0, 0)).toEqual({ b: 0, d: 0, dist: -1 }); // up and out through the red gate
    expect(flick(st, t.pos, 1, 0)).toEqual({ b: 1, d: 0, dist: 4 }); // up to the rim: no blue gate there
    expect(slide(t, { b: 1, d: 2, dist: -1 })).toBe(true); // down and out through the blue gate
    expect(slide(t, { b: 0, d: 2, dist: -1 })).toBe(false); // red can't leave by the blue gate
    expect(slide(t, { b: 0, d: 0, dist: -1 })).toBe(true);
    expect(t.won).toBe(true);
    expect(starsFor(t)).toBe(3);
  }, T);

  it("finds the fewest moves and ends when the moves run out", () => {
    const st = tray();
    expect(solve(st, [[1, 3], [2, 4]])).toHaveLength(2);
    const t = newTray({ ...st, limit: 1 });
    slide(t, { b: 0, d: 3, dist: 1 });
    expect(t.over).toBe(true);
    expect(t.won).toBe(false);
  }, T);

  it("has 30 trays, more blocks and colours later on", () => {
    expect(JELLY_STAGES).toHaveLength(STAGE_COUNT);
    expect(JELLY_STAGES[29].blocks.length).toBeGreaterThan(JELLY_STAGES[0].blocks.length);
    expect(new Set(JELLY_STAGES[29].blocks.map((b) => b.color)).size).toBeGreaterThan(new Set(JELLY_STAGES[0].blocks.map((b) => b.color)).size);
    for (const st of JELLY_STAGES) expect(st.limit).toBeGreaterThan(st.par);
  }, T);

  it("keeps an answer that clears every tray in par, for three stars", () => {
    for (const st of JELLY_STAGES) {
      const t = pilot(st, { mode: "plan" });
      expect(t.won).toBe(true);
      expect(t.moves).toBe(st.par);
      expect(starsFor(t)).toBe(3);
    }
  }, T);

  // Split by seed and by stretches of trays so each test stays well inside the time limit on a busy CI runner;
  // the last test checks the same total as before: at least 104 of the 120 runs.
  const humanWins: number[] = [];
  for (const o of HUMANS) {
    for (const [from, to] of [[0, 12], [12, 18], [18, 22], [22, 26], [26, 30]]) {
      it(`plays human-like seed ${o.seed} on trays ${from + 1}–${to}`, () => {
        let wins = 0;
        for (const st of JELLY_STAGES.slice(from, to)) if (pilot(st, o).won) wins++;
        humanWins.push(wins);
      }, T);
    }
  }
  it("lets human-like players who slip more often clear almost every tray", () => {
    expect(humanWins).toHaveLength(HUMANS.length * 5);
    expect(humanWins.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(104);
  }, T);

  it("rarely clears a tray flicking at random", () => {
    let wins = 0;
    for (const st of JELLY_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of JELLY_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
