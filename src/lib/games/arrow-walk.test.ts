import { describe, expect, it } from "vitest";
import { mulberry32 } from "./number-trail";
import { createWalk, hamiltonianPath, hintCell, isSolved, rotate, traceWalk, WALK_SIZE } from "./arrow-walk";

describe("arrow-walk", () => {
  it("hamiltonian paths cover every cell with orthogonal steps", () => {
    for (const size of [4, 5, 6]) {
      for (let s = 1; s <= 20; s++) {
        const p = hamiltonianPath(size, mulberry32(s));
        expect(new Set(p).size).toBe(size * size);
        for (let i = 1; i < p.length; i++) {
          const a = p[i - 1], b = p[i];
          const manhattan = Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs((a % size) - (b % size));
          expect(manhattan).toBe(1);
        }
      }
    }
  });

  it("the hidden solution solves every generated puzzle and the scramble does not", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      for (let s = 1; s <= 25; s++) {
        const p = createWalk(level, s);
        expect(p.size).toBe(WALK_SIZE[level]);
        expect(isSolved(p, p.solution)).toBe(true);
        expect(isSolved(p, p.arrows)).toBe(false);
      }
    }
  });

  it("locked cells cannot rotate and free cells cycle through four turns", () => {
    const p = createWalk("easy", 3);
    const free = p.locked.findIndex((l, i) => !l && i !== p.goal);
    let a = p.arrows;
    for (let k = 0; k < 4; k++) a = rotate(p, a, free);
    expect(a[free]).toBe(p.arrows[free]);
    expect(rotate(p, p.arrows, p.goal)).toBe(p.arrows);
  });

  it("following hints solves the puzzle", () => {
    const p = createWalk("hard", 11);
    let a = p.arrows;
    for (let guard = 0; guard < 200 && !isSolved(p, a); guard++) {
      const c = hintCell(p, a);
      expect(c).not.toBeNull();
      a = a.slice();
      a[c!] = p.solution[c!];
    }
    expect(isSolved(p, a)).toBe(true);
    expect(traceWalk(p, a).cells).toHaveLength(36);
  });
});
