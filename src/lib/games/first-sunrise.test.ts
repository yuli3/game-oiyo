import { describe, expect, it } from "vitest";
import { LEVELS, LEVEL_COUNT, isWon, moveBy, parse, reach, solve, starsFor, type Level } from "./first-sunrise";

describe("first sunrise", () => {
  it("has 30 boards with a 2x2 sun and growing par", () => {
    expect(LEVEL_COUNT).toBe(30);
    for (const l of LEVELS) {
      const p = parse(l);
      expect(p.pieces[p.sunIndex]).toMatchObject({ w: 2, h: 2 });
      expect(isWon(p, p.start)).toBe(false);
      for (const r of l.rows) expect(r).toHaveLength(l.rows[0].length);
    }
    const avg = (a: number, b: number) => LEVELS.slice(a, b).reduce((s, l) => s + l.par, 0) / (b - a);
    expect(avg(20, 30)).toBeGreaterThan(avg(0, 10));
    // stages 11-20 have a magpie, 21+ have a rock
    for (let i = 10; i < 20; i++) expect(LEVELS[i].rows.join("")).toMatch(/[A-RT-Z]/);
    for (let i = 20; i < 30; i++) expect(LEVELS[i].rows.join("")).toContain("#");
  });

  it("every par is the true shortest solution and replaying it wins", () => {
    LEVELS.forEach((l, i) => {
      const sol = solve(l, 2_000_000);
      expect(sol, `dawn ${i + 1}`).not.toBeNull();
      expect(sol!.length, `dawn ${i + 1}`).toBe(l.par);
      const p = parse(l);
      let s = p.start.slice();
      for (const m of sol!) {
        expect(reach(p, s, m.piece, m.dir)).toBeGreaterThanOrEqual(m.steps);
        s = moveBy(s, m.piece, m.dir, m.steps);
      }
      expect(isWon(p, s)).toBe(true);
    });
  }, 120_000);

  it("clouds slide along their length only, magpies any way, rocks block", () => {
    const l: Level = { par: 0, rows: ["..#..", "aa..b", "....b", ".SSA.", ".SS.."] };
    const p = parse(l);
    const idx = (id: string) => p.pieces.findIndex((x) => x.id === id);
    const s = p.start;
    expect(reach(p, s, idx("a"), "right")).toBe(2);
    expect(reach(p, s, idx("a"), "down")).toBe(0);
    expect(reach(p, s, idx("b"), "left")).toBe(0);
    expect(reach(p, s, idx("b"), "down")).toBe(2);
    expect(reach(p, s, idx("A"), "right")).toBe(1);
    expect(reach(p, s, idx("A"), "up")).toBe(3);
    expect(reach(p, s, idx("S"), "up")).toBe(1);
    expect(starsFor(5, 5)).toBe(3);
    expect(starsFor(9, 5)).toBe(2);
    expect(starsFor(20, 5)).toBe(1);
  });
});
