import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "../i18n";
import {
  GAME_ID,
  SOLUTIONS,
  SWAP_LIMIT,
  applySwap,
  bestArrangement,
  cellMarks,
  dailyBestConditions,
  isSolved,
  lettersOf,
  minSwaps,
  puzzleForDate,
  searchCost,
  shareGrid,
  wordsOf,
} from "./letter-swap";

describe("letter swap", () => {
  it("keeps matched cells fixed when counting swaps", () => {
    expect(minSwaps(["b", "a", "a"], ["a", "a", "b"])).toBe(1);
    expect(minSwaps(["a", "b"], ["a", "b"])).toBe(0);
    expect(minSwaps(["c", "a", "b"], ["a", "b", "c"])).toBe(2);
    expect(bestArrangement(["b", "a", "a"], ["a", "a", "b"])).toEqual(["a", "a", "b"]);
    expect(bestArrangement(["c", "a", "b"], ["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("does not spend a swap when the letters match", () => {
    const board = ["a", "b", null, "a"];
    expect(applySwap(board, 0, 3).counted).toBe(false);
    expect(applySwap(board, 0, 3).board).toEqual(board);
    const swapped = applySwap(board, 0, 1);
    expect(swapped.counted).toBe(true);
    expect(swapped.board).toEqual(["b", "a", null, "a"]);
  });

  it("crosses every built-in grid inside the search budget", () => {
    expect(SOLUTIONS.length).toBeGreaterThanOrEqual(9 + 6 + 4 + 4 + 4 + 5);
    for (const grid of SOLUTIONS) {
      const letters = lettersOf(grid.cells);
      expect(letters).toHaveLength(grid.size === 3 ? 9 : 21);
      expect(grid.cells).toHaveLength(grid.size * grid.size);
      const cost = searchCost(letters);
      expect(cost.peak).toBeLessThanOrEqual(6);
      expect(cost.prod).toBeLessThanOrEqual(20000);
      const words = wordsOf(grid.cells, grid.size);
      expect(words.across).toEqual([...grid.across]);
      expect(words.down).toEqual([...grid.down]);
      if (grid.size === 5) {
        for (const [row, col] of [[1, 1], [1, 3], [3, 1], [3, 3]] as const) {
          expect(grid.cells[row * 5 + col]).toBeNull();
        }
      }
    }
  });

  it("scrambles a week of boards that stay solvable", () => {
    const started = Date.now();
    for (const day of ["01", "02", "03", "04", "05", "06", "07"]) {
      for (const locale of locales) {
        const dateKey = `2026-10-${day}`;
        const puzzle = puzzleForDate(dateKey, locale);
        const again = puzzleForDate(dateKey, locale);
        expect(again.start).toEqual(puzzle.start);
        expect(lettersOf(puzzle.start).slice().sort()).toEqual(lettersOf(puzzle.solution).slice().sort());
        const current = lettersOf(puzzle.start);
        const target = lettersOf(puzzle.solution);
        const distance = minSwaps(current, target);
        expect(distance).toBeGreaterThanOrEqual(4);
        expect(distance).toBeLessThanOrEqual(12);
        expect(bestArrangement(current, target)).toEqual(target);
        expect(isSolved(puzzle.solution, puzzle.solution)).toBe(true);
        expect(isSolved(puzzle.start, puzzle.solution)).toBe(false);
      }
    }
    expect(Date.now() - started).toBeLessThan(7000);
  });

  it("marks a solved cell green and a hole as a block", () => {
    const puzzle = puzzleForDate("2026-10-20", "en");
    const marks = cellMarks(puzzle.solution, puzzle.solution, puzzle.size);
    expect(marks.filter((mark) => mark === "hole")).toHaveLength(4);
    expect(marks.filter((mark) => mark === "correct")).toHaveLength(21);
    expect(shareGrid("Letter Swap", "2026-10-20", 7, ["correct", "present", "absent", "hole"], 2)).toBe(
      `Letter Swap 2026-10-20 7/${SWAP_LIMIT}\n🟩🟨\n⬜⬛`,
    );
  });

  it("registers the catalog slug and the daily best cohort", () => {
    const page = readFileSync("src/pages/[...lang]/letter-swap.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    const guides = readFileSync("src/data/game-guides.ts", "utf8");
    const guide = guides.slice(guides.indexOf('"letter-swap"'), guides.indexOf('"tile-rummy"'));
    expect(page).toContain('slug="letter-swap"');
    expect(catalog).toContain('slug: "letter-swap"');
    expect(GAME_ID).toBe("letter-swap");
    expect(dailyBestConditions("2026-10-20", "ko", "none")).toEqual({
      seed: "2026-10-20:ko",
      difficulty: "daily",
      assist: "none",
    });
    const banned = /waffle|와플|wordle/i;
    for (const file of ["src/lib/games/letter-swap.ts", "src/components/games/LetterSwap.tsx", "src/pages/[...lang]/letter-swap.astro"]) {
      expect(readFileSync(file, "utf8")).not.toMatch(banned);
    }
    expect(guide).not.toMatch(banned);
  });
});
