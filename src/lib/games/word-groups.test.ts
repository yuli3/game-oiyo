import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dateKeyIndex } from "./todays-game";
import {
  GAME_ID,
  MISTAKE_LIMIT,
  PUZZLE_COUNTS,
  dailyBestConditions,
  matchGroup,
  puzzleForDate,
  puzzlesFor,
  shareGrid,
  tileOrder,
} from "./word-groups";
import type { Locale } from "../i18n";
import type { WordPuzzle } from "./groups/types";

const LOCALES: Locale[] = ["ko", "en", "ja", "zh", "fr", "es"];

function wordsOf(puzzle: WordPuzzle): string[] {
  return puzzle.groups.flatMap((group) => [...group.words]);
}

describe("word group banks", () => {
  it("builds the daily run for each language from one difficulty of each color", () => {
    for (const locale of LOCALES) {
      const puzzles = puzzlesFor(locale);
      expect(puzzles).toHaveLength(PUZZLE_COUNTS[locale]);
      const ids = new Set(puzzles.map((puzzle) => puzzle.id));
      expect(ids.size).toBe(puzzles.length);
      for (const puzzle of puzzles) {
        expect(puzzle.groups.map((group) => group.level).sort()).toEqual([0, 1, 2, 3]);
        expect(new Set(wordsOf(puzzle)).size).toBe(16);
        expect(puzzle.traps.length).toBeGreaterThan(0);
        for (const trap of puzzle.traps) {
          const toward = puzzle.groups.find((group) => group.id === trap.toward);
          expect(toward).toBeTruthy();
          expect(toward?.words).not.toContain(trap.word);
          expect(wordsOf(puzzle)).toContain(trap.word);
          const tempting = toward ? [trap.word, ...toward.words.slice(0, 3)] : [];
          expect(matchGroup(puzzle, tempting)).toBeNull();
        }
        for (const group of puzzle.groups) {
          expect(matchGroup(puzzle, group.words)?.id).toBe(group.id);
        }
      }
    }
  });

  it("deals the same board and the same order from a KST date", () => {
    const first = puzzleForDate("ko", "2026-10-20");
    const second = puzzleForDate("ko", "2026-10-20");
    expect(second.id).toBe(first.id);
    expect(tileOrder(first, "2026-10-20")).toEqual(tileOrder(second, "2026-10-20"));
    const next = puzzleForDate("ko", "2026-10-21");
    expect(dateKeyIndex("2026-10-21") % PUZZLE_COUNTS.ko).not.toBe(dateKeyIndex("2026-10-20") % PUZZLE_COUNTS.ko);
    expect(next.id).not.toBe(first.id);
    expect(dailyBestConditions("2026-10-20")).toEqual({ seed: "2026-10-20", difficulty: "daily", assist: "none" });
    expect(MISTAKE_LIMIT).toBe(4);
    expect(GAME_ID).toBe("word-groups");
  });

  it("keeps product names out of the page and puts the search phrases in Korean", () => {
    const page = readFileSync(new URL("../../pages/[...lang]/word-groups.astro", import.meta.url), "utf8");
    const view = readFileSync(new URL("../../components/games/WordGroups.tsx", import.meta.url), "utf8");
    const guide = readFileSync(new URL("../../data/game-guides.ts", import.meta.url), "utf8");
    const engine = readFileSync(new URL("./word-groups.ts", import.meta.url), "utf8");
    const blob = `${page}\n${view}\n${guide}\n${engine}`;
    expect(blob).not.toMatch(/Connections|Pips|Rummikub|Waffle|Polytrack|루미큐브/);
    expect(page).toContain("단어 묶기 퍼즐");
    expect(page).toContain("4개씩 묶기 게임");
    expect(page).toContain("오늘의 단어 퍼즐");
    expect(engine).toContain('export const GAME_ID = "word-groups"');
    expect(view).toContain("recordResult(GAME_ID");
    expect(view).toContain("dailyBestConditions");
    expect(view).toContain("useArcadePortal");
    expect(view).toContain("kstDateKey");
  });

  it("shares one emoji row per solved group", () => {
    expect(shareGrid("네 묶음", "2026-10-20", [0, 3], 1, "실수")).toBe(
      "네 묶음\n2026-10-20\n🟨🟨🟨🟨\n🟪🟪🟪🟪\n실수 1",
    );
  });
});
