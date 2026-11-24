import { describe, expect, it } from "vitest";
import { CX, CY, ICE, RINK_STAGES, RX, RY, STAGE_COUNT, coverage, newMachine, onIce, pilot, starsFor, stepMachine } from "./rink-resurface";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ lag: 0.14, slop: 0.22, overlap: 0.8, seed }));

describe("rink-resurface", () => {
  it("has 30 rinks with a faster machine, a narrower blade and more gouges later", () => {
    expect(RINK_STAGES).toHaveLength(STAGE_COUNT);
    expect(RINK_STAGES[29].speed).toBeGreaterThan(RINK_STAGES[0].speed);
    expect(RINK_STAGES[29].blade).toBeLessThan(RINK_STAGES[0].blade);
    expect(RINK_STAGES[29].gouges.length).toBeGreaterThan(RINK_STAGES[0].gouges.length);
    expect(ICE.length).toBeGreaterThan(1000);
  }, T);

  it("keeps the ice inside the rounded boards", () => {
    expect(onIce(CX, CY)).toBe(true);
    expect(onIce(CX - RX + 2, CY - RY + 2)).toBe(false); // the rounded corner
    expect(onIce(CX + RX + 5, CY)).toBe(false);
  }, T);

  it("smooths the ice under the blade and stalls on the boards", () => {
    const st = RINK_STAGES[0];
    const m = newMachine(st);
    const seen = new Set<number>();
    for (let k = 0; k < 30; k++) stepMachine(m, 0, 1 / 30, seen);
    expect(coverage(m)).toBeGreaterThan(0);
    const before = m.bumps;
    let bumped = false;
    for (let k = 0; k < 600 && !bumped; k++) bumped = stepMachine(m, 0, 1 / 30, seen).bump;
    expect(bumped).toBe(true);
    expect(m.bumps).toBe(before + 1);
  }, T);

  it("gives a careful driver lapping inward three stars on every rink", () => {
    for (const st of RINK_STAGES) {
      const m = pilot(st);
      expect(m.won).toBe(true);
      expect(starsFor(m)).toBe(3);
    }
  }, T);

  it("lets human-like drivers (slow hands, a little slop) finish every rink in time", () => {
    for (const st of RINK_STAGES) expect(HUMANS.filter((o) => pilot(st, o).won).length).toBeGreaterThanOrEqual(3);
  }, T);

  it("does not let one loop, no steering or sloppy wide lanes do the job", () => {
    for (const st of RINK_STAGES) {
      expect(pilot(st, { mode: "circle" }).won).toBe(false);
      expect(pilot(st, { mode: "straight" }).won).toBe(false);
    }
    expect(RINK_STAGES.filter((st) => !pilot(st, { lag: 0.45, slop: 0.7, overlap: 1.3 }).won).length).toBeGreaterThanOrEqual(25);
  }, T);

  it("is deterministic", () => {
    expect(pilot(RINK_STAGES[9], HUMANS[1]).t).toBe(pilot(RINK_STAGES[9], HUMANS[1]).t);
  }, T);
});
