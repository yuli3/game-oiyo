import { describe, expect, it } from "vitest";
import { BOX_SIZE, SCREW_STAGES, STAGE_COUNT, blocked, free, newBench, pilot, solve, starsFor, unscrew } from "./screw-jam";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.12, seed }));

describe("screw-jam", () => {
  it("has 30 boards with more plates, screws and colours later, in whole boxes", () => {
    expect(SCREW_STAGES).toHaveLength(STAGE_COUNT);
    expect(SCREW_STAGES[29].plates.length).toBeGreaterThan(SCREW_STAGES[0].plates.length);
    expect(SCREW_STAGES[29].screws.length).toBeGreaterThan(SCREW_STAGES[0].screws.length);
    expect(SCREW_STAGES[29].colours).toBeGreaterThan(SCREW_STAGES[0].colours);
    for (const st of SCREW_STAGES) {
      expect(st.screws.length % BOX_SIZE).toBe(0);
      expect(st.boxes.length * BOX_SIZE).toBe(st.screws.length);
      for (let c = 0; c < st.colours; c++) expect(st.screws.filter((s) => s.colour === c).length).toBe(st.boxes.filter((b) => b === c).length * BOX_SIZE);
    }
  }, T);

  it("keeps covered screws in, boxes or trays a free one, and drops a plate with its last screw", () => {
    const st = SCREW_STAGES[12];
    const b = newBench(st);
    const covered = st.screws.findIndex((_, i) => blocked(b, i));
    expect(covered).toBeGreaterThanOrEqual(0);
    expect(unscrew(b, covered)).toBe("stuck");
    const i = st.screws.findIndex((_, k) => free(b, k));
    const r = unscrew(b, i);
    expect(r === "boxed" || r === "tray").toBe(true);
    const plate = st.screws[i].plate;
    while (st.screws.some((s, k) => s.plate === plate && !b.out[k]) && !b.over) {
      const k = st.screws.findIndex((s, j) => s.plate === plate && !b.out[j]);
      if (!free(b, k)) break;
      unscrew(b, k);
    }
    if (st.screws.every((s, k) => s.plate !== plate || b.out[k])) expect(b.fallen[plate]).toBe(true);
  }, T);

  it("has a full answer for every board that a solver finds, with three stars", () => {
    for (const st of SCREW_STAGES) {
      expect(solve({ ...st, tray: st.best })).not.toBeNull();
      const b = pilot(st, { mode: "solve" });
      expect(b.won).toBe(true);
      expect(starsFor(b)).toBe(3);
    }
  }, T);

  it("lets human-like fixers (the obvious screw, with the odd slip) empty most boards", () => {
    let wins = 0;
    for (const st of SCREW_STAGES) wins += HUMANS.filter((o) => pilot(st, o).won).length;
    expect(wins).toBeGreaterThanOrEqual(95);
  }, T);

  it("jams the tray when screws come out at random", () => {
    for (const st of SCREW_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
