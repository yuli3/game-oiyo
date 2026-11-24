import { describe, expect, it } from "vitest";
import { LEAD, SCARF_STAGES, STAGE_COUNT, chartIndex, forward, newKnitting, pilot, starsFor, stepKnitting, stitchTime } from "./scarf-knit";

const T = 60_000;

describe("scarf-knit", () => {
  it("has 30 charts that grow wider, longer and quicker", () => {
    expect(SCARF_STAGES).toHaveLength(STAGE_COUNT);
    expect(SCARF_STAGES[29].rows.length).toBeGreaterThan(SCARF_STAGES[0].rows.length);
    expect(SCARF_STAGES[29].rows[0].length).toBeGreaterThan(SCARF_STAGES[0].rows[0].length);
    expect(SCARF_STAGES[29].speed).toBeGreaterThan(SCARF_STAGES[0].speed);
  }, T);

  it("charts symmetric motifs", () => {
    for (const st of SCARF_STAGES) for (const row of st.rows) expect(row).toEqual(row.slice().reverse());
  }, T);

  it("knits each row back and forth, a stitch as the needle passes its middle", () => {
    const st = SCARF_STAGES[0];
    expect(forward(0)).toBe(true);
    expect(forward(1)).toBe(false);
    expect(chartIndex(st, 1, 0)).toBe(st.rows[1].length - 1);
    const kn = newKnitting(st);
    stepKnitting(kn, true, LEAD + stitchTime(st, 0) + 1e-6);
    expect(kn.made[0][0]).toBe(1);
    expect(kn.good).toBe(st.rows[0][0] === 1 ? 1 : 0);
  }, T);

  it("can be knitted perfectly on every stage by the autopilot", () => {
    for (const st of SCARF_STAGES) {
      const kn = pilot(st);
      expect(kn.won, `stage ${st.stage + 1}`).toBe(true);
      expect(kn.good).toBe(st.total);
      expect(starsFor(kn)).toBe(3);
    }
  }, T);

  it("can be knitted by unseen human-like knitters", () => {
    for (const st of SCARF_STAGES) {
      const wins = [11, 12, 13, 14].filter((seed) => pilot(st, { slop: 0.065, late: 0.025, seed }).won).length;
      expect(wins, `stage ${st.stage + 1}`).toBe(4);
    }
  }, T);

  it("loses with one yarn only, with random changes, or with sloppy timing later on", () => {
    let sloppy = 0;
    for (const st of SCARF_STAGES) {
      expect(pilot(st, { mode: "cream" }).won, `stage ${st.stage + 1}`).toBe(false);
      expect(pilot(st, { mode: "red" }).won).toBe(false);
      expect(pilot(st, { mode: "random" }).won).toBe(false);
      if (!pilot(st, { slop: 0.15, late: 0.06, seed: 3 }).won) sloppy++;
    }
    expect(sloppy).toBeGreaterThanOrEqual(15);
  }, T);
});
