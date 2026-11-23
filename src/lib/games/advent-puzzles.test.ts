import { describe, expect, it } from "vitest";
import {
  DAY_COUNT, buildShareText, calendarEmoji, garlandHint, garlandSolved, kindForDay, lightsHint, lightsSolved, litCells, mergeResult,
  parseProgress, pour, pressLights, puzzleForDay, pushTrail, rotateCell, slideHint, slideOptimal, slideSolved, slideTile, solveSort,
  sortHint, sortSolved, starsFor, suggestedDay, unlockedThrough, type GarlandPuzzle, type LightsPuzzle, type SlidePuzzle, type SortPuzzle,
} from "./advent-puzzles";

describe("advent calendar schedule", () => {
  it("rotates four families and ends on a big garland", () => {
    expect([1, 2, 3, 4, 5].map(kindForDay)).toEqual(["lights", "slide", "garland", "sort", "lights"]);
    expect(kindForDay(25)).toBe("garland");
    const finale = puzzleForDay(25) as GarlandPuzzle;
    expect(finale.w).toBe(7);
  });

  it("opens one door a day in December, a preview in November, all doors otherwise", () => {
    expect(unlockedThrough(new Date(2026, 11, 1, 0, 5))).toBe(1);
    expect(unlockedThrough(new Date(2026, 11, 7, 23, 59))).toBe(7);
    expect(unlockedThrough(new Date(2026, 11, 31))).toBe(25);
    expect(unlockedThrough(new Date(2026, 10, 23))).toBe(1);
    expect(unlockedThrough(new Date(2027, 0, 3))).toBe(25);
  });

  it("suggests today's door, then the earliest missed one", () => {
    expect(suggestedDay(5, new Set([1, 2]))).toBe(5);
    expect(suggestedDay(5, new Set([1, 2, 5]))).toBe(3);
    expect(suggestedDay(2, new Set([1, 2]))).toBe(2);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(puzzleForDay(9))).toBe(JSON.stringify(puzzleForDay(9)));
  });
});

describe("every door is solvable by following its own hints", () => {
  for (let day = 1; day <= DAY_COUNT; day++) {
    it(`door ${day}`, () => {
      const p = puzzleForDay(day);
      expect(p.par).toBeGreaterThan(0);
      if (p.kind === "lights") {
        const lp = p as LightsPuzzle;
        expect(lightsSolved(lp.start)).toBe(false);
        let state = lp.start;
        const odd = Array(lp.n * lp.n).fill(false);
        for (let guard = 0; guard < 40 && !lightsSolved(state); guard++) {
          const h = lightsHint(lp, odd);
          expect(h).toBeGreaterThanOrEqual(0);
          state = pressLights(lp.n, state, h);
          odd[h] = !odd[h];
        }
        expect(lightsSolved(state)).toBe(true);
      } else if (p.kind === "slide") {
        const sp = p as SlidePuzzle;
        expect(slideSolved(sp.start)).toBe(false);
        let tiles: readonly number[] = sp.start;
        let trail = sp.trail;
        let moves = 0;
        while (!slideSolved(tiles)) {
          const h = slideHint(trail);
          expect(h).toBeGreaterThanOrEqual(0);
          tiles = slideTile(sp.n, tiles, h);
          trail = pushTrail(trail, h);
          moves++;
          expect(moves).toBeLessThan(200);
        }
        if (sp.n === 3) expect(sp.par).toBeLessThanOrEqual(moves);
      } else if (p.kind === "garland") {
        const gp = p as GarlandPuzzle;
        expect(garlandSolved(gp, gp.start)).toBe(false);
        expect(garlandSolved(gp, gp.solution)).toBe(true);
        let state = gp.start;
        for (let guard = 0; guard < 400; guard++) {
          const h = garlandHint(gp, state);
          if (h < 0) break;
          state = rotateCell(state, h);
        }
        expect(garlandSolved(gp, state)).toBe(true);
        expect(litCells(gp, state).size).toBe(gp.w * gp.h);
      } else {
        const op = p as SortPuzzle;
        expect(sortSolved(op.start)).toBe(false);
        const sol = solveSort(op.start);
        expect(sol).not.toBeNull();
        let state = op.start.map((t) => t.slice());
        for (const [a, b] of sol ?? []) state = pour(state, a, b);
        expect(sortSolved(state)).toBe(true);
        expect(sortHint(op.start)).not.toBeNull();
      }
    });
  }
});

describe("puzzle rules", () => {
  it("lights toggle a plus shape", () => {
    const s = pressLights(3, Array(9).fill(false), 4);
    expect(s.map(Number)).toEqual([0, 1, 0, 1, 1, 1, 0, 1, 0]);
  });

  it("slide only moves tiles next to the gap", () => {
    const solved = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(slideTile(3, solved, 0)).toBe(solved);
    expect(slideTile(3, solved, 7)).toEqual([0, 1, 2, 3, 4, 5, 6, 8, 7]);
    expect(slideOptimal(3, [0, 1, 2, 3, 4, 5, 6, 8, 7])).toBe(1);
  });

  it("sort pours the whole top run that fits", () => {
    const s = pour([[0, 1, 1], [1, 1], []], 0, 1);
    expect(s).toEqual([[0], [1, 1, 1, 1], []]);
    expect(pour([[0, 1], [0]], 0, 1)).toEqual([[0, 1], [0]]);
  });

  it("stars reward few moves and no hints", () => {
    expect(starsFor(10, 10, 0)).toBe(3);
    expect(starsFor(13, 10, 0)).toBe(3);
    expect(starsFor(15, 10, 0)).toBe(2);
    expect(starsFor(10, 10, 2)).toBe(1);
  });
});

describe("progress and sharing", () => {
  it("keeps the best result per door", () => {
    let p = mergeResult({}, 3, { stars: 2, moves: 20 });
    p = mergeResult(p, 3, { stars: 1, moves: 5 });
    expect(p[3]).toEqual({ stars: 2, moves: 20 });
    p = mergeResult(p, 3, { stars: 3, moves: 30 });
    expect(p[3]).toEqual({ stars: 3, moves: 30 });
  });

  it("drops malformed saved data", () => {
    expect(parseProgress("not json")).toEqual({});
    expect(parseProgress(JSON.stringify({ 2: { stars: 3, moves: 9 }, 40: { stars: 1, moves: 1 }, x: 1 }))).toEqual({ 2: { stars: 3, moves: 9 } });
  });

  it("draws a 5×5 calendar in the share text", () => {
    const progress = { 1: { stars: 3, moves: 5 }, 2: { stars: 1, moves: 30 } };
    const grid = calendarEmoji(progress, 3);
    expect(grid.split("\n")).toHaveLength(5);
    expect(grid.startsWith("🌟⭐🎁🔒")).toBe(true);
    const text = buildShareText({ head: "Door {0}", line: "{0} moves · {1} hints", tag: "#tag" }, 2, progress[2], 1, progress, 3);
    expect(text.split("\n")[0]).toBe("Door 2");
    expect(text).toContain("★☆☆ 30 moves · 1 hints");
    expect(text.endsWith("#tag")).toBe(true);
  });
});
