// Four-group daily. A word belongs to one category in its language bank, so the
// only complete foursome on a board is one of the four dealt categories.
// The lure word tempts a cousin that is also on the board, but it is not a member
// of that cousin, so the tempting foursome is not a second answer (2026-10-20).

import { mulberry32, shuffle } from "./daily";
import { dateKeyIndex } from "./todays-game";
import type { BestConditions } from "./records";
import type { Locale } from "../i18n";
import { enBank } from "./groups/en";
import { esBank } from "./groups/es";
import { frBank } from "./groups/fr";
import { jaBank } from "./groups/ja";
import { koBank } from "./groups/ko";
import { zhBank } from "./groups/zh";
import type { Category, WordGroup, WordPuzzle } from "./groups/types";

export type { Category, WordGroup, WordPuzzle } from "./groups/types";

export const GAME_ID = "word-groups";
export const MISTAKE_LIMIT = 4;
export const GROUP_SIZE = 4;
/** Korean list is longer so the daily can run two months without repeating a board. */
export const PUZZLE_COUNTS: Record<Locale, number> = {
  ko: 60,
  en: 30,
  ja: 30,
  zh: 30,
  fr: 30,
  es: 30,
};

const BANKS: Record<Locale, readonly Category[]> = {
  ko: koBank,
  en: enBank,
  ja: jaBank,
  zh: zhBank,
  fr: frBank,
  es: esBank,
};

const LEVEL_MARK = ["🟨", "🟩", "🟦", "🟪"] as const;

function norm(word: string, locale: Locale): string {
  return word.normalize("NFC").trim().toLocaleLowerCase(locale);
}

export function assertBank(categories: readonly Category[], locale: Locale): void {
  const ids = new Set<string>();
  const words = new Set<string>();
  for (const category of categories) {
    if (ids.has(category.id)) throw new Error(`${locale}: duplicate category ${category.id}`);
    ids.add(category.id);
    if (category.words.length !== GROUP_SIZE) throw new Error(`${locale}: ${category.id} needs 4 words`);
    if (!category.words.includes(category.lure)) throw new Error(`${locale}: ${category.id} lure is not a member`);
    for (const word of category.words) {
      const key = norm(word, locale);
      if (words.has(key)) throw new Error(`${locale}: duplicate word ${word}`);
      words.add(key);
    }
  }
  for (const category of categories) {
    const cousin = categories.find((item) => item.id === category.cousin);
    if (!cousin || cousin.id === category.id) throw new Error(`${locale}: ${category.id} cousin is missing`);
    if (cousin.level === category.level) throw new Error(`${locale}: ${category.id} cousin shares a level`);
    if (cousin.words.some((word) => norm(word, locale) === norm(category.lure, locale))) {
      throw new Error(`${locale}: ${category.lure} is already in ${cousin.id}`);
    }
  }
}

function byLevel(categories: readonly Category[]): Category[][] {
  const levels: Category[][] = [[], [], [], []];
  for (const category of categories) levels[category.level].push(category);
  for (const level of levels) level.sort((a, b) => (a.id < b.id ? -1 : 1));
  return levels;
}

/** Lexicographic boards that contain at least one on-board lure. Stable for a bank. */
export function buildPuzzles(categories: readonly Category[], count: number, locale: Locale): WordPuzzle[] {
  assertBank(categories, locale);
  const levels = byLevel(categories);
  if (levels.some((level) => level.length === 0)) throw new Error(`${locale}: every difficulty needs a category`);
  const puzzles: WordPuzzle[] = [];
  for (const a of levels[0]) {
    for (const b of levels[1]) {
      for (const c of levels[2]) {
        for (const d of levels[3]) {
          const chosen = [a, b, c, d];
          const ids = new Set(chosen.map((item) => item.id));
          const traps = chosen
            .filter((item) => ids.has(item.cousin))
            .map((item) => ({ word: item.lure, toward: item.cousin }));
          if (traps.length === 0) continue;
          const index = String(puzzles.length + 1).padStart(3, "0");
          puzzles.push({
            id: `${locale}-${index}`,
            groups: chosen.map((item) => ({
              id: item.id,
              name: item.name,
              level: item.level,
              words: item.words,
            })),
            traps,
          });
          if (puzzles.length === count) return puzzles;
        }
      }
    }
  }
  throw new Error(`${locale}: only ${puzzles.length} boards, needed ${count}`);
}

const CACHE = new Map<Locale, readonly WordPuzzle[]>();

export function puzzlesFor(locale: Locale): readonly WordPuzzle[] {
  const cached = CACHE.get(locale);
  if (cached) return cached;
  const built = buildPuzzles(BANKS[locale], PUZZLE_COUNTS[locale], locale);
  CACHE.set(locale, built);
  return built;
}

export function puzzleForDate(locale: Locale, dateKey: string): WordPuzzle {
  const puzzles = puzzlesFor(locale);
  const index = dateKeyIndex(dateKey) % puzzles.length;
  const puzzle = puzzles[index];
  if (!puzzle) throw new Error(`${locale}: empty puzzle list`);
  return puzzle;
}

/** Same date, same tile order. Group order is not the deal order. */
export function tileOrder(puzzle: WordPuzzle, dateKey: string): string[] {
  const words = puzzle.groups.flatMap((group) => [...group.words]);
  return shuffle(words, mulberry32(dateKeyIndex(dateKey) + 1));
}

export function matchGroup(puzzle: WordPuzzle, selected: readonly string[]): WordGroup | null {
  if (selected.length !== GROUP_SIZE) return null;
  const wanted = new Set(selected.map((word) => norm(word, puzzle.id.slice(0, 2) as Locale)));
  if (wanted.size !== GROUP_SIZE) return null;
  return puzzle.groups.find((group) => group.words.every((word) => wanted.has(norm(word, puzzle.id.slice(0, 2) as Locale)))) ?? null;
}

export function dailyBestConditions(dateKey: string): BestConditions {
  return { seed: dateKey, difficulty: "daily", assist: "none" };
}

/** One row of four marks per solved group, in the order the player found them. */
export function shareGrid(
  title: string,
  dateKey: string,
  levels: readonly number[],
  mistakes: number,
  mistakeLabel: string,
): string {
  const rows = levels.map((level) => (LEVEL_MARK[level] ?? "⬜").repeat(4));
  return [title, dateKey, ...rows, `${mistakeLabel} ${mistakes}`].join("\n");
}
