import { describe, expect, it } from "vitest";
import { ANSWERS, PUZZLES, STAGE_COUNT, isStuck, move, newBoard, parsePuzzle, solve, solved, starsFor, undo } from "./snow-plow";

describe("snow plow", () => {
  it("has 30 puzzles that grow", () => {
    expect(PUZZLES).toHaveLength(STAGE_COUNT);
    expect(PUZZLES[29].w * PUZZLES[29].h).toBeGreaterThan(PUZZLES[0].w * PUZZLES[0].h);
    const piles = (i: number) => PUZZLES[i].snow.filter(Boolean).length;
    expect(piles(29)).toBeGreaterThan(piles(0));
  });

  it("every recorded answer clears the road in the listed number of moves", () => {
    PUZZLES.forEach((p, i) => {
      const b = newBoard(p);
      for (const ch of ANSWERS[i]) expect(move(b, "URDL".indexOf(ch)), `stage ${i + 1}`).not.toBe("blocked");
      expect(solved(b), `stage ${i + 1}`).toBe(true);
      expect(ANSWERS[i].length).toBe(p.best);
    });
  });

  it("the listed best is the true shortest on the early puzzles", () => {
    for (let i = 0; i < 6; i++) expect(solve(PUZZLES[i])?.length, `stage ${i + 1}`).toBe(PUZZLES[i].best);
  }, 60_000);

  it("pushes, merges into a heavy heap, and undoes", () => {
    const p = parsePuzzle(0, "P.oo.,", 0);
    const b = newBoard(p);
    expect(move(b, 1)).toBe("moved");
    expect(move(b, 1)).toBe("merged");
    expect(b.snow[3]).toBe(2);
    expect(isStuck(p, b.snow)).toBe(true);
    expect(move(b, 1)).toBe("blocked");
    expect(undo(b)).toBe(true);
    expect(b.snow[2]).toBe(1);
    expect(b.moves).toBe(1);
  });

  it("a pile wedged in a corner is stuck", () => {
    const p = parsePuzzle(0, "...,/.o../P...", 0);
    expect(isStuck(p, p.snow)).toBe(false);
    const q = parsePuzzle(0, "#o../...,/P...", 0);
    expect(isStuck(q, q.snow)).toBe(true);
  });

  it("stars compare moves with the best", () => {
    const p = PUZZLES[0];
    expect(starsFor(p.best, p)).toBe(3);
    expect(starsFor(p.best * 3 + 10, p)).toBe(1);
  });
});
