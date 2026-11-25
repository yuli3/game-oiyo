import { describe, expect, it } from "vitest";
import { BOBA_STAGES, BROWN, CHILI, COLS, EMPTY, PIN, PLAIN, ROWS, STAGE_COUNT, WALL, at, layout, newMachine, pilot, pull, settle, starsFor, type BobaStage } from "./boba-pins";

const T = 60_000;

/** A machine with one chamber in the left lane, its floor pin 0 (and a side pin 1 if asked). */
function one(what: "S" | "P" | "C", side = false): BobaStage {
  const { grid, pins } = layout([{ lane: 0, top: 3, floor: 10, what, side }], false, 0.55, () => 0.5);
  return { stage: 0, grid, pins, plan: [0], par: 1 };
}

describe("boba-pins", () => {
  it("lays out walls, bins either side and pins under the chambers", () => {
    const st = one("S", true);
    expect(st.grid[at(0, 0)]).toBe(WALL);
    expect(st.grid[at(ROWS - 1, 5)]).toBe(WALL);
    expect(st.grid[at(10, 5)]).toBe(PIN);
    expect(st.grid[at(5, 3)]).toBe(PIN); // the side pin
    expect(st.grid.filter((v) => v === BROWN).length).toBeGreaterThan(5);
  }, T);

  it("serves brown pearls into the cup when their pin is pulled", () => {
    const m = newMachine(one("S"));
    settle(m);
    expect(m.over).toBe(false);
    pull(m, 0);
    settle(m);
    expect(m.won).toBe(true);
    expect(starsFor(m)).toBe(3);
  }, T);

  it("spoils the drink with a white pearl or chili in the cup, and wastes pearls rolled into a bin", () => {
    const white = newMachine(one("P"));
    pull(white, 0);
    settle(white);
    expect(white.won).toBe(false);
    expect(white.why).toBe("plain");
    const hot = newMachine(one("C"));
    pull(hot, 0);
    settle(hot);
    expect(hot.why).toBe("chili");
    const spill = newMachine(one("S", true));
    pull(spill, 1);
    settle(spill);
    expect(spill.why).toBe("spill");
  }, T);

  it("turns white pearls brown where brown ones touch them", () => {
    const { grid, pins } = layout([
      { lane: 0, top: 1, floor: 6, what: "S", side: false },
      { lane: 0, top: 7, floor: 12, what: "P", side: false },
    ], false, 0.55, () => 0.5);
    const m = newMachine({ stage: 0, grid, pins, plan: [0, 1], par: 2 });
    pull(m, 0);
    settle(m);
    expect(m.grid.filter((v) => v === PLAIN)).toHaveLength(0);
    pull(m, 1);
    settle(m);
    expect(m.won).toBe(true);
  }, T);

  it("has 30 machines, every grid the right size, with more pins to pull later on", () => {
    expect(BOBA_STAGES).toHaveLength(STAGE_COUNT);
    for (const st of BOBA_STAGES) {
      expect(st.grid).toHaveLength(COLS * ROWS);
      expect(st.par).toBe(st.plan.length);
      expect(st.pins.length).toBeGreaterThan(st.par);
      for (const cells of st.pins) for (const i of cells) expect(st.grid[i]).toBe(PIN);
    }
    const avg = (a: BobaStage[]) => a.reduce((n, s) => n + s.par, 0) / a.length;
    expect(avg(BOBA_STAGES.slice(20))).toBeGreaterThan(avg(BOBA_STAGES.slice(0, 5)));
    expect(BOBA_STAGES.some((st) => st.grid.includes(CHILI))).toBe(true);
    expect(BOBA_STAGES.some((st) => st.grid.includes(PLAIN))).toBe(true);
  }, T);

  it("fills the cup on every machine with its plan, in par, for three stars", () => {
    for (const st of BOBA_STAGES) {
      const m = pilot(st);
      expect(m.won).toBe(true);
      expect(m.pulls).toBe(st.par);
      expect(starsFor(m)).toBe(3);
      expect(m.grid.filter((v) => v === EMPTY).length).toBeGreaterThan(0);
    }
  }, T);

  it("lets a careful player, who only skips pins that spoil the drink at once, fill most cups", () => {
    let wins = 0;
    for (const st of BOBA_STAGES) for (const seed of [11, 12, 13, 14]) if (pilot(st, { mode: "careful", seed }).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(90);
  }, T);

  it("mostly spoils the drink pulling pins at random", () => {
    let early = 0;
    let late = 0;
    BOBA_STAGES.forEach((st, i) => {
      for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) i < 3 ? early++ : late++;
    });
    expect(early).toBeLessThanOrEqual(8); // the first three are gentle
    expect(late).toBeLessThan(20);
    for (const st of BOBA_STAGES.slice(3)) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
