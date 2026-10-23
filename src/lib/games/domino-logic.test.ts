import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GAME_ID,
  countSolutions,
  dailyBestConditions,
  isSolved,
  practiceSeed,
  nearestDominoPair,
  placeTile,
  puzzlesForDate,
  ruleAllows,
  shareGrid,
  type LogicPuzzle,
  type SnapCell,
} from "./domino-logic";

const hand: LogicPuzzle = {
  difficulty: "easy",
  width: 2,
  height: 1,
  cells: [
    { id: 0, x: 0, y: 0, region: 0 },
    { id: 1, x: 1, y: 0, region: 1 },
  ],
  tiles: [{ id: 3, a: 0, b: 1 }],
  rules: [
    { region: 0, rule: { kind: "sum", n: 0 } },
    { region: 1, rule: { kind: "sum", n: 1 } },
  ],
};

describe("domino logic", () => {
  it("accepts only the orientation that meets the region", () => {
    expect(ruleAllows({ kind: "sum", n: 1 }, [0], false)).toBe(true);
    expect(ruleAllows({ kind: "sum", n: 1 }, [0, 2], true)).toBe(false);
    expect(countSolutions(hand, 2)).toBe(1);
    expect(isSolved(hand, [{ tileId: 3, cellA: 0, cellB: 1, a: 0, b: 1 }])).toBe(true);
    expect(isSolved(hand, [{ tileId: 3, cellA: 0, cellB: 1, a: 1, b: 0 }])).toBe(false);
    expect(placeTile(hand, [], 3, 0, 1, true)).toBeNull();
    expect(placeTile(hand, [], 3, 0, 1, false)).toHaveLength(1);
  });

  it("builds one unique board per difficulty from a KST date", () => {
    const started = Date.now();
    const boards = puzzlesForDate("2026-10-20");
    expect(Date.now() - started).toBeLessThan(1000);
    expect(boards.map((board) => board.difficulty)).toEqual(["easy", "normal", "hard"]);
    expect(boards.map((board) => [board.width, board.height, board.tiles.length, board.given?.length ?? 0])).toEqual([
      [4, 4, 8, 0],
      [5, 5, 12, 0],
      [6, 6, 18, 8],
    ]);
    for (const board of boards) {
      expect(countSolutions(board, 2)).toBe(1);
      expect(board.tiles.length * 2).toBe(board.cells.length);
      expect(new Set(board.tiles.map((tile) => tile.id)).size).toBe(board.tiles.length);
    }
    expect(puzzlesForDate("2026-10-20").map((board) => board.tiles.map((tile) => tile.id))).toEqual(
      boards.map((board) => board.tiles.map((tile) => tile.id)),
    );
  });

  it("keeps a week of dates unique without blowing the time budget", () => {
    const started = Date.now();
    for (const day of ["01", "02", "03", "04", "05", "06", "07"]) {
      for (const board of puzzlesForDate(`2026-10-${day}`)) expect(countSolutions(board, 2)).toBe(1);
    }
    expect(Date.now() - started).toBeLessThan(7000);
  });

  it("builds a practice seed that is not today's seed", () => {
    expect(practiceSeed(5, 5)).toBe(6);
    expect(practiceSeed(4, 5)).toBe(4);
  });

  it("snaps a drop to the nearest adjacent pair, including the outer edge of a cell", () => {
    const cells: SnapCell[] = [
      { id: 0, x: 0, y: 0, cx: 0, cy: 0 },
      { id: 1, x: 1, y: 0, cx: 48, cy: 0 },
      { id: 2, x: 0, y: 1, cx: 0, cy: 48 },
      { id: 3, x: 1, y: 1, cx: 48, cy: 48 },
    ];
    expect(nearestDominoPair(cells, [], { x: 24, y: 0 })).toEqual({ cellA: 0, cellB: 1 });
    expect(nearestDominoPair(cells, [], { x: 24, y: -22 })).toEqual({ cellA: 0, cellB: 1 });
    expect(nearestDominoPair(cells, [], { x: -22, y: 0 })).toEqual({ cellA: 0, cellB: 2 });
    expect(nearestDominoPair(cells, [], { x: 0, y: 20 })).toEqual({ cellA: 0, cellB: 2 });
    expect(nearestDominoPair(cells, [0, 1], { x: 24, y: 48 })).toEqual({ cellA: 2, cellB: 3 });
    expect(nearestDominoPair(cells, [], { x: 400, y: 400 })).toBeNull();
    expect(nearestDominoPair(cells, [0, 1, 2, 3], { x: 24, y: 0 })).toBeNull();
  });

  it("registers the catalog slug and the daily best cohort", () => {
    const page = readFileSync("src/pages/[...lang]/domino-logic.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="domino-logic"');
    expect(catalog).toContain('slug: "domino-logic"');
    expect(GAME_ID).toBe("domino-logic");
    expect(dailyBestConditions("2026-10-20", "hard", "none")).toEqual({ seed: "2026-10-20", difficulty: "hard", assist: "none" });
    expect(shareGrid("도미노 칸 맞추기", "2026-10-20", [true, false, true])).toBe("도미노 칸 맞추기 2026-10-20\n🟩⬜🟩");
  });
});
