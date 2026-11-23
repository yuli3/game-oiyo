import { describe, expect, it } from "vitest";
import { PUZZLES, STAGE_COUNT, countSplits, newBoard, put, resolveTargets, solved, starsFor, sums } from "./sebaetdon-split";

describe("sebaetdon-split", () => {
  it("has 30 puzzles that grow and add clue types", () => {
    expect(PUZZLES).toHaveLength(STAGE_COUNT);
    expect(PUZZLES[0].envelopes).toHaveLength(2);
    expect(PUZZLES[29].envelopes).toHaveLength(5);
    expect(PUZZLES[29].bills.length).toBeGreaterThan(PUZZLES[0].bills.length);
    expect(PUZZLES.slice(0, 10).every((p) => p.envelopes.every((e) => e.clue.kind === "amount"))).toBe(true);
    expect(PUZZLES.slice(20).every((p) => p.envelopes.filter((e) => e.clue.kind !== "amount").length === 2)).toBe(true);
  });

  it("every puzzle's own answer solves it and the clues fix every target", () => {
    for (const p of PUZZLES) {
      expect(resolveTargets(p.envelopes).every((t) => Number.isFinite(t))).toBe(true);
      const b = newBoard(p);
      for (const bill of p.bills) put(b, bill.id, p.answer[bill.id]);
      expect(solved(b), `stage ${p.stage + 1}`).toBe(true);
      expect(starsFor(b.moves, p)).toBe(3);
      expect(countSplits(p, 1)).toBe(1);
    }
  });

  it("a bill can move between envelopes and back to the wallet", () => {
    const p = PUZZLES[3];
    const b = newBoard(p);
    put(b, 0, 0);
    expect(sums(b)[0]).toBe(p.bills[0].value);
    put(b, 0, 1);
    expect(sums(b)[0]).toBe(0);
    put(b, 0, null);
    expect(sums(b)).toEqual([0, 0]);
    expect(put(b, 0, null)).toBe(false);
    expect(solved(b)).toBe(false);
  });
});
