import { describe, expect, it } from "vitest";
import { STAGE_COUNT, buildPuzzle, clueStatus, countSolutions, hint, isSolved, positions, puzzle, sizeFor, starsFor } from "./sebae-line";

describe("sebae-line", () => {
  it("grows from 4 to 8 people", () => {
    expect(sizeFor(0)).toBe(4);
    expect(sizeFor(STAGE_COUNT - 1)).toBe(8);
  });

  it("every puzzle has exactly one answer and the answer satisfies the clues", () => {
    for (let i = 0; i < STAGE_COUNT; i++) {
      const p = puzzle(i);
      expect(p.answer).toHaveLength(p.size);
      expect(isSolved(p, p.answer), `stage ${i}`).toBe(true);
      expect(countSolutions(p), `stage ${i}`).toBe(1);
      expect(p.clues.length).toBeGreaterThanOrEqual(2);
      expect(p.clues.length).toBeLessThanOrEqual(12);
    }
  });

  it("is deterministic", () => {
    expect(buildPuzzle(7)).toEqual(buildPuzzle(7));
  });

  it("later puzzles lean on reasoning, not pinned spots", () => {
    const late = Array.from({ length: 7 }, (_, k) => puzzle(23 + k));
    const pinned = late.reduce((n, p) => n + p.clues.filter((c) => c.kind === "pos").length, 0);
    const total = late.reduce((n, p) => n + p.clues.length, 0);
    expect(pinned / total).toBeLessThan(0.25);
  });

  it("clue status is open until the people are placed", () => {
    const pos = positions([3, null, 1]);
    expect(clueStatus({ kind: "left", a: 3, b: 1 }, pos, 3)).toBe("ok");
    expect(clueStatus({ kind: "left", a: 1, b: 3 }, pos, 3)).toBe("bad");
    expect(clueStatus({ kind: "adj", a: 3, b: 5 }, pos, 3)).toBe("open");
    expect(clueStatus({ kind: "end", a: 1 }, pos, 3)).toBe("ok");
    expect(clueStatus({ kind: "between", a: 4, b: 3, c: 1 }, positions([3, 4, 1]), 3)).toBe("ok");
  });

  it("hint points to a wrong spot", () => {
    const p = puzzle(3);
    const h = hint(p, new Array(p.size).fill(null));
    expect(h).toEqual({ spot: 0, person: p.answer[0] });
    expect(hint(p, p.answer)).toBeNull();
  });

  it("stars by moves", () => {
    expect(starsFor(6, 4)).toBe(3);
    expect(starsFor(10, 4)).toBe(2);
    expect(starsFor(30, 4)).toBe(1);
  });
});
