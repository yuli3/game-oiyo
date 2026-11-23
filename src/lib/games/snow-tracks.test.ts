import { describe, expect, it } from "vitest";
import { PUZZLES, STAGE_COUNT, extend, grab, newBoard, solve, solved, starsFor } from "./snow-tracks";

describe("snow-tracks", () => {
  it("has 30 puzzles that grow", () => {
    expect(PUZZLES).toHaveLength(STAGE_COUNT);
    expect(PUZZLES[0].w * PUZZLES[0].h).toBeLessThan(PUZZLES[29].w * PUZZLES[29].h);
    expect(PUZZLES[29].animals).toBeGreaterThan(PUZZLES[0].animals);
    for (const p of PUZZLES) {
      for (let a = 0; a < p.animals; a++) {
        expect(p.den[a]).toBeGreaterThanOrEqual(0);
        expect(p.food[a]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("every puzzle has exactly one answer, and drawing it solves the board", () => {
    for (const p of PUZZLES) {
      const r = solve(p, 2);
      expect(r.count, `stage ${p.stage + 1}`).toBe(1);
      // walk each animal's answer trail from its burrow
      const b = newBoard(p.stage);
      const color = r.first as number[];
      for (let a = 0; a < p.animals; a++) {
        grab(b, p.den[a]);
        // order the answer's cells for this animal into a trail (a depth-first walk over its cells)
        const cells = new Set(color.map((c, i) => (c === a ? i : -1)).filter((i) => i >= 0));
        const order: number[] = [p.den[a]];
        const walk = (cur: number): boolean => {
          if (order.length === cells.size) return cur === p.food[a];
          const x = cur % p.w;
          for (const j of [cur - p.w, cur + p.w, x > 0 ? cur - 1 : -1, x < p.w - 1 ? cur + 1 : -1]) {
            if (!cells.has(j) || order.includes(j)) continue;
            order.push(j);
            if (walk(j)) return true;
            order.pop();
          }
          return false;
        };
        expect(walk(p.den[a])).toBe(true);
        for (const c of order.slice(1)) expect(extend(b, a, c)).toBe(true);
      }
      expect(solved(b), `stage ${p.stage + 1}`).toBe(true);
    }
  });

  it("crossing another trail cuts it back, and clues block other animals", () => {
    const b = newBoard(1);
    const p = b.puzzle;
    const a = 0;
    grab(b, p.den[a]);
    const start = b.trails[a].length;
    expect(start).toBe(1);
    expect(solved(b)).toBe(false);
    expect(starsFor(p.animals, p)).toBe(3);
    expect(starsFor(p.animals * 3 + 3, p)).toBe(1);
  });
});
