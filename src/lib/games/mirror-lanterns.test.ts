import { describe, expect, it } from "vitest";
import { LEVELS, LEVEL_COUNT, analyse, goal, isSolved, parse, starsFor, trace, turn, withMask } from "./mirror-lanterns";

describe("mirror lanterns", () => {
  it("has 30 levels with more mirrors and lanterns later", () => {
    expect(LEVEL_COUNT).toBe(30);
    const first = parse(LEVELS[0]);
    const last = parse(LEVELS[29]);
    expect(last.mirrors.length).toBeGreaterThan(first.mirrors.length);
    expect(goal(last).lanterns).toBeGreaterThan(goal(first).lanterns);
    expect(LEVELS[29].rows.join("")).toMatch(/[RLUD]/); // blue light later
    expect(LEVELS[25].rows.join("")).toMatch(/x/); // night flowers later
  });

  it("every level starts unsolved, can be solved, and its par is the fewest taps", () => {
    LEVELS.forEach((lvl, i) => {
      const b = parse(lvl);
      expect(isSolved(b), `level ${i + 1}`).toBe(false);
      const an = analyse(b);
      expect(an.solutions.length, `level ${i + 1}`).toBeGreaterThan(0);
      expect(an.minTaps, `level ${i + 1}`).toBe(lvl.par);
      expect(isSolved(withMask(b, an.solutions[0]))).toBe(true);
    });
  });

  it("mirrors turn beams and half-mirrors split them", () => {
    const b = parse({ par: 0, rows: [">.m.", "....", "..a."] });
    let tr = trace(b);
    expect(tr.lit.amber.has("2,0")).toBe(true);
    expect(tr.lit.amber.has("2,2")).toBe(false); // "/" sends the beam up and out
    const turned = turn(b, 2, 0);
    tr = trace(turned);
    expect(tr.lit.amber.has("2,2")).toBe(true);
    expect(isSolved(turned)).toBe(true);
    const split = trace(parse({ par: 0, rows: [">.t.a", "....", "..a.."] }));
    expect(split.lit.amber.has("4,0")).toBe(true);
    expect(split.lit.amber.has("2,2")).toBe(true);
    expect(turn(b, 0, 0)).toBe(b); // the light itself does not turn
  });

  it("colours matter and night flowers must stay dark", () => {
    expect(isSolved(parse({ par: 0, rows: ["R..b"] }))).toBe(true);
    expect(isSolved(parse({ par: 0, rows: [">..b"] }))).toBe(false);
    expect(isSolved(parse({ par: 0, rows: [">.ax"] }))).toBe(false);
    expect(starsFor(3, 3)).toBe(3);
    expect(starsFor(5, 3)).toBe(2);
    expect(starsFor(6, 3)).toBe(1);
  });
});
