import { describe, expect, it } from "vitest";
import { BURST_BONUS, PIP_STAGES, ROCK, STAGE_COUNT, newTray, pilot, place, settle, starsFor, type PipStage } from "./pip-merge";

const T = 60_000;
// a little sloppier than the players each stage was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ deep: true, slip: 0.15, seed }));

describe("pip-merge", () => {
  it("merges three touching dice into one a pip higher, and chains", () => {
    const cells = new Array(25).fill(0);
    cells[0] = 2;
    cells[1] = 2;
    cells[6] = 3;
    cells[7] = 3;
    // a 2 at square 5 joins the two 2s (0 and 1 through 0), becomes a 3 and joins the 3s at 6 and 7
    const ev = settle(cells, 5, 2);
    expect(ev.chain).toBe(2);
    expect(ev.face).toBe(4);
    expect(cells[5]).toBe(4);
    expect(cells[0] + cells[1] + cells[6] + cells[7]).toBe(0);
    expect(ev.gained).toBe(2 * 2 * 3 + 3 * 3 * 3 * 2);
  }, T);

  it("bursts three sixes, clearing the dice round them but not the stones", () => {
    const cells = new Array(25).fill(0);
    cells[11] = 6;
    cells[13] = 6;
    cells[7] = 1;
    cells[17] = ROCK;
    const ev = settle(cells, 12, 6);
    expect(ev.burst).toBe(true);
    expect(ev.face).toBe(0);
    expect(cells[12]).toBe(0);
    expect(cells[7]).toBe(0);
    expect(cells[17]).toBe(ROCK);
    expect(ev.gained).toBe(6 * 6 * 3 + 1 * 2 + BURST_BONUS);
  }, T);

  it("ends when the dice run out or the tray is full", () => {
    const st: PipStage = { stage: 0, rocks: [], dice: [1, 2], need: 1, par: 2 };
    const t = newTray(st);
    expect(place(t, 0)).not.toBeNull();
    expect(place(t, 0)).toBeNull(); // taken
    place(t, 1);
    expect(t.over).toBe(true);
    expect(t.won).toBe(false);
    const full = newTray({ stage: 0, rocks: Array.from({ length: 24 }, (_, i) => i), dice: [1, 1, 1], need: 0, par: 0 });
    place(full, 24);
    expect(full.over).toBe(true);
  }, T);

  it("has 30 stages with more dice and more stones later on", () => {
    expect(PIP_STAGES).toHaveLength(STAGE_COUNT);
    expect(PIP_STAGES[0].rocks).toHaveLength(0);
    expect(PIP_STAGES[29].dice.length).toBeGreaterThan(PIP_STAGES[0].dice.length);
    for (const st of PIP_STAGES) {
      expect(st.par).toBeGreaterThan(st.need);
      expect(st.dice.every((d) => d >= 1 && d <= 5)).toBe(true);
    }
  }, T);

  it("lets the careful player take three stars on every stage", () => {
    for (const st of PIP_STAGES) expect(starsFor(pilot(st))).toBe(3);
  }, T);

  it("lets sloppier human-like players clear almost every stage", () => {
    let wins = 0;
    for (const st of PIP_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(104);
  }, T);

  it("rarely reaches the goal placing dice at random", () => {
    let wins = 0;
    for (const st of PIP_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of PIP_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
