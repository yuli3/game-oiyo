import { describe, expect, it } from "vitest";
import { PUZZLES, STAGE_COUNT, canTurn, heatOf, newBoard, period, rotateMask, solved, starsFor, tap, undo } from "./ondol-flue";

describe("ondol flue", () => {
  it("turns channel shapes clockwise", () => {
    expect(rotateMask(1, 1)).toBe(2); // north -> east
    expect(rotateMask(3, 1)).toBe(6); // north+east -> east+south
    expect(rotateMask(8, 1)).toBe(1); // west -> north
    expect(rotateMask(5, 2)).toBe(5);
    expect(period(10)).toBe(2);
    expect(period(15)).toBe(1);
  });

  it("has 30 puzzles that grow", () => {
    expect(PUZZLES).toHaveLength(STAGE_COUNT);
    expect(PUZZLES[29].w * PUZZLES[29].h).toBeGreaterThan(PUZZLES[0].w * PUZZLES[0].h);
    expect(PUZZLES[29].par).toBeGreaterThan(PUZZLES[0].par);
  });

  it("every puzzle starts unsolved and the built answer solves it in par taps", () => {
    for (const p of PUZZLES) {
      const b = newBoard(p);
      expect(solved(b), `stage ${p.stage + 1} starts solved`).toBe(false);
      let taps = 0;
      for (let i = 0; i < p.w * p.h; i++) {
        while (b.turn[i] !== 0) {
          expect(tap(b, i)).toBe(true);
          taps++;
        }
      }
      expect(taps, `stage ${p.stage + 1}`).toBe(p.par);
      expect(solved(b), `stage ${p.stage + 1}`).toBe(true);
      expect(starsFor(taps, p)).toBe(3);
    }
  });

  it("the answer joins every channel into one tree from the fire with no open ends", () => {
    for (const p of PUZZLES) {
      const open = p.solved.filter(Boolean).length;
      const ends = p.solved.reduce((s, m) => s + ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1)), 0);
      expect(ends).toBe(2 * (open - 1));
      expect(p.solved[p.fire]).not.toBe(0);
      expect(p.solved[p.chimney]).not.toBe(0);
      expect(Math.floor(p.fire / p.w)).toBe(p.h - 1);
      expect(p.chimney).toBeLessThan(p.w);
      expect(canTurn(p, p.fire)).toBe(false);
    }
  });

  it("shows leaks while unsolved and undo restores", () => {
    const b = newBoard(PUZZLES[4]);
    expect(heatOf(b).leaks.length).toBeGreaterThan(0);
    const i = b.turn.findIndex((t, k) => canTurn(b.puzzle, k) && t !== 0);
    const before = b.turn[i];
    tap(b, i);
    expect(undo(b)).toBe(true);
    expect(b.turn[i]).toBe(before);
    expect(b.taps).toBe(0);
  });

  it("stars drop with extra taps", () => {
    const p = PUZZLES[10];
    expect(starsFor(p.par, p)).toBe(3);
    expect(starsFor(p.par * 3 + 10, p)).toBe(1);
  });
});
