import { describe, expect, it } from "vitest";
import { PUZZLES, STAGE_COUNT, applySnip, effective, flakeRaster, groupCount, makeGrid, neighbours, newFlake, sameMask, starsFor } from "./snowflake-cut";

describe("snowflake-cut", () => {
  it("builds 30 distinct puzzles that grow harder", () => {
    expect(PUZZLES).toHaveLength(STAGE_COUNT);
    const keys = new Set(PUZZLES.map((p) => p.target.map(Number).join("") + p.grid.folds));
    expect(keys.size).toBe(STAGE_COUNT);
    expect(PUZZLES[0].grid.folds).toBe(4);
    expect(PUZZLES[29].grid.folds).toBe(6);
    expect(PUZZLES[29].grid.cells).toBeGreaterThan(PUZZLES[0].grid.cells);
    const early = PUZZLES.slice(0, 5).reduce((s, p) => s + p.par, 0) / 5;
    const late = PUZZLES.slice(25).reduce((s, p) => s + p.par, 0) / 5;
    expect(late).toBeGreaterThan(early);
  });

  it("every target comes from its own cuts and the centre is never cut", () => {
    for (const p of PUZZLES) {
      const cut = new Array<boolean>(p.grid.cells).fill(false);
      for (const c of p.cuts) cut[c] = true;
      expect(sameMask(effective(p.grid, cut), p.target)).toBe(true);
      expect(p.cuts).not.toContain(0);
      expect(p.par).toBe(groupCount(p.grid, p.cuts));
      expect(p.par).toBeGreaterThanOrEqual(1);
      expect(p.target[0]).toBe(true);
    }
  });

  it("the sheet starts trimmed into a star point", () => {
    for (const p of PUZZLES) {
      expect(p.grid.paper.some((v) => !v)).toBe(true);
      expect(p.cuts.every((c) => p.grid.paper[c])).toBe(true);
    }
  });

  it("neighbours are symmetric", () => {
    const g = makeGrid(6, 10);
    for (let c = 0; c < g.cells; c++) for (const n of neighbours(g, c)) expect(neighbours(g, n)).toContain(c);
  });

  it("snipping each group once solves at par for every stage", () => {
    for (let s = 0; s < STAGE_COUNT; s++) {
      const st = newFlake(s);
      const set = new Set(st.puzzle.cuts);
      const seen = new Set<number>();
      for (const c of st.puzzle.cuts) {
        if (seen.has(c)) continue;
        const group = [c];
        seen.add(c);
        for (let i = 0; i < group.length; i++) for (const n of neighbours(st.puzzle.grid, group[i])) if (set.has(n) && !seen.has(n)) {
          seen.add(n);
          group.push(n);
        }
        applySnip(st, group, false);
      }
      expect(st.solved).toBe(true);
      expect(st.snips).toBeLessThanOrEqual(st.puzzle.par);
    }
  });

  it("restoring a wrong snip counts but still lets you win", () => {
    const st = newFlake(3);
    const wrong = st.puzzle.target.findIndex((v, i) => v && i > 0 && !st.puzzle.cuts.includes(i));
    expect(applySnip(st, [wrong], false)).toBe(true);
    expect(applySnip(st, [wrong], true)).toBe(true);
    expect(applySnip(st, [wrong], true)).toBe(false);
    applySnip(st, st.puzzle.cuts, false);
    expect(st.solved).toBe(true);
    expect(st.snips).toBe(3);
  });

  it("raster covers paper and air", () => {
    const r = flakeRaster(PUZZLES[10].grid, 64);
    expect(r.some((v) => v === -1)).toBe(true);
    expect(r.some((v) => v === 0)).toBe(true);
    expect(r.some((v) => v === PUZZLES[10].grid.cells - 1)).toBe(true);
  });

  it("stars", () => {
    expect(starsFor(3, 3)).toBe(3);
    expect(starsFor(5, 3)).toBe(2);
    expect(starsFor(6, 3)).toBe(1);
  });
});
