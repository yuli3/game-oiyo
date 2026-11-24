import { describe, expect, it } from "vitest";
import { CROWN_STAGES, STAGE_COUNT, clashes, countSolutions, dailyStage, newBoard, pilot, reasoningSteps, solved, starsFor, tap } from "./crown-regions";

const T = 60_000;

describe("crown-regions", () => {
  it("has 30 boards growing from 5 × 5 to 9 × 9, each with one land per row", () => {
    expect(CROWN_STAGES).toHaveLength(STAGE_COUNT);
    expect(CROWN_STAGES[0].n).toBe(5);
    expect(CROWN_STAGES[29].n).toBe(9);
    for (const st of CROWN_STAGES) expect(new Set(st.region).size).toBe(st.n);
  }, T);

  it("has exactly one answer on every board, and simple reasoning alone reaches it", () => {
    for (const st of CROWN_STAGES) {
      expect(countSolutions(st.n, st.region, 2)).toBe(1);
      expect(Number.isFinite(reasoningSteps(st))).toBe(true);
      const marks = new Array(st.n * st.n).fill(0) as Array<0 | 1 | 2>;
      st.answer.forEach((c, r) => (marks[r * st.n + c] = 2));
      expect(solved(st, marks)).toBe(true);
    }
  }, T);

  it("cycles a square through empty, no and crown, and flags crowns that touch or share a line or land", () => {
    const st = CROWN_STAGES[2];
    const b = newBoard(st);
    expect(tap(b, 0)).toBe(1);
    expect(tap(b, 0)).toBe(2);
    expect(tap(b, 1)).toBe(1);
    expect(tap(b, 1)).toBe(2);
    expect(clashes(st, b.marks).has(0)).toBe(true); // side by side
    expect(tap(b, 0)).toBe(0);
    expect(b.won).toBe(false);
  }, T);

  it("gives a quick reasoner three stars, a slower one two, and random crowns nothing", () => {
    for (const st of CROWN_STAGES) {
      const quick = pilot(st);
      expect(quick.won).toBe(true);
      expect(starsFor(quick)).toBe(3);
      expect(starsFor(pilot(st, { step: 5 }))).toBe(2);
      for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
    }
  }, T);

  it("gives everyone the same board on the same day", () => {
    const a = dailyStage("2026-11-24");
    expect(dailyStage("2026-11-24")).toEqual(a);
    expect(dailyStage("2026-11-25").region).not.toEqual(a.region);
    expect(countSolutions(a.n, a.region)).toBe(1);
  }, T);
});
