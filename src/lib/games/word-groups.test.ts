import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  WORD_GROUPS_MAX_MISTAKES,
  WORD_GROUPS_SCHEMA,
  createWordGroups,
  parseWordGroups,
  remainingWords,
  serializeWordGroups,
  submitWordGroupsGuess,
  validateWordGroupsPuzzle,
  wordGroupsIndexForDate,
  wordGroupsDailyKey,
  wordGroupsShareText,
  wordGroupsTiles,
  type WordGroupsPack,
  type WordGroupsPuzzle,
} from "./word-groups";

const PUZZLE: WordGroupsPuzzle = {
  id: "test-001",
  groups: [
    { theme: "Fruits", level: 0, words: ["apple", "pear", "plum", "fig"] },
    { theme: "Metals", level: 1, words: ["gold", "iron", "tin", "lead"] },
    { theme: "Birds", level: 2, words: ["owl", "crow", "swan", "wren"] },
    { theme: "___ball", level: 3, words: ["foot", "snow", "eye", "meat"] },
  ],
};

describe("word-groups: language save isolation", () => {
  it("gives every language a distinct key without reusing the legacy record", () => {
    const keys = ["ko", "en", "ja", "zh", "fr", "es"].map(wordGroupsDailyKey);
    expect(new Set(keys).size).toBe(6);
    expect(keys).not.toContain("oiyo-word-groups-daily");
    expect(wordGroupsDailyKey("ko")).toBe("oiyo-word-groups-daily:ko");
  });
});

describe("word-groups: validate", () => {
  it("accepts a well-formed puzzle", () => {
    expect(validateWordGroupsPuzzle(PUZZLE)).toEqual([]);
  });
  it("rejects duplicate words, missing levels, and short groups", () => {
    const dup = { ...PUZZLE, groups: PUZZLE.groups.map((g, i) => (i === 1 ? { ...g, words: ["gold", "iron", "tin", "Apple"] } : g)) };
    expect(validateWordGroupsPuzzle(dup).join()).toMatch(/appears twice/);
    const levels = { ...PUZZLE, groups: PUZZLE.groups.map((g) => ({ ...g, level: 0 as const })) };
    expect(validateWordGroupsPuzzle(levels).join()).toMatch(/level 1 missing/);
    const short = { ...PUZZLE, groups: PUZZLE.groups.map((g, i) => (i === 0 ? { ...g, words: ["apple"] } : g)) };
    expect(validateWordGroupsPuzzle(short).join()).toMatch(/needs 4 words/);
  });
});

describe("word-groups: daily pick", () => {
  it("starts at puzzle 0 on launch day and walks the pack", () => {
    expect(wordGroupsIndexForDate("2026-10-20", 7)).toBe(0);
    expect(wordGroupsIndexForDate("2026-10-21", 7)).toBe(1);
    expect(wordGroupsIndexForDate("2026-10-27", 7)).toBe(0);
    expect(wordGroupsIndexForDate("2026-01-01", 7)).toBe(0);
  });
  it("orders tiles the same way every time", () => {
    const a = wordGroupsTiles(PUZZLE);
    expect(wordGroupsTiles(PUZZLE)).toEqual(a);
    expect([...a].sort()).toEqual(PUZZLE.groups.flatMap((g) => g.words).sort());
  });
});

describe("word-groups: guesses", () => {
  it("solves a group in any order and ignores case", () => {
    const { state, result } = submitWordGroupsGuess(PUZZLE, createWordGroups(PUZZLE), ["Tin", "lead", "gold", "iron"]);
    expect(result).toBe("solved");
    expect(state.solved).toEqual([1]);
    expect(remainingWords(PUZZLE, state, wordGroupsTiles(PUZZLE))).toHaveLength(12);
  });
  it("flags one-away, counts mistakes, and does not charge a repeat", () => {
    let s = createWordGroups(PUZZLE);
    const first = submitWordGroupsGuess(PUZZLE, s, ["apple", "pear", "plum", "owl"]);
    expect(first.result).toBe("one-away");
    s = first.state;
    expect(s.mistakes).toBe(1);
    const repeat = submitWordGroupsGuess(PUZZLE, s, ["owl", "plum", "pear", "apple"]);
    expect(repeat.result).toBe("repeat");
    expect(repeat.state).toBe(s);
    expect(submitWordGroupsGuess(PUZZLE, s, ["apple", "pear", "owl", "crow"]).result).toBe("miss");
  });
  it("rejects selections that are not four live words", () => {
    const s = createWordGroups(PUZZLE);
    expect(submitWordGroupsGuess(PUZZLE, s, ["apple", "pear", "plum"]).result).toBe("invalid");
    expect(submitWordGroupsGuess(PUZZLE, s, ["apple", "apple", "pear", "plum"]).result).toBe("invalid");
    expect(submitWordGroupsGuess(PUZZLE, s, ["apple", "pear", "plum", "banana"]).result).toBe("invalid");
    const solved = submitWordGroupsGuess(PUZZLE, s, ["apple", "pear", "plum", "fig"]).state;
    expect(submitWordGroupsGuess(PUZZLE, solved, ["apple", "pear", "plum", "fig"]).result).toBe("invalid");
  });
  it("wins after four groups and loses after four mistakes", () => {
    let s = createWordGroups(PUZZLE);
    for (const g of PUZZLE.groups) s = submitWordGroupsGuess(PUZZLE, s, g.words).state;
    expect(s.status).toBe("won");
    let l = createWordGroups(PUZZLE);
    const misses = [
      ["apple", "gold", "owl", "foot"],
      ["pear", "iron", "crow", "snow"],
      ["plum", "tin", "swan", "eye"],
      ["fig", "lead", "wren", "meat"],
    ];
    for (const m of misses) l = submitWordGroupsGuess(PUZZLE, l, m).state;
    expect(l.mistakes).toBe(WORD_GROUPS_MAX_MISTAKES);
    expect(l.status).toBe("lost");
    expect(submitWordGroupsGuess(PUZZLE, l, PUZZLE.groups[0].words).result).toBe("invalid");
  });
  it("shares colors without spelling out words", () => {
    let s = createWordGroups(PUZZLE);
    s = submitWordGroupsGuess(PUZZLE, s, ["apple", "pear", "plum", "owl"]).state;
    s = submitWordGroupsGuess(PUZZLE, s, ["apple", "pear", "plum", "fig"]).state;
    const text = wordGroupsShareText(PUZZLE, s, "OIYO");
    expect(text.split("\n")).toHaveLength(3);
    expect(text).not.toMatch(/apple|owl/);
    expect(text).toContain("🟨🟨🟨🟨");
  });
});

describe("word-groups: save", () => {
  it("round-trips by replaying guesses", () => {
    let s = createWordGroups(PUZZLE);
    s = submitWordGroupsGuess(PUZZLE, s, ["apple", "pear", "plum", "owl"]).state;
    s = submitWordGroupsGuess(PUZZLE, s, ["gold", "iron", "tin", "lead"]).state;
    const back = parseWordGroups(serializeWordGroups(s, false), PUZZLE);
    expect(back?.state).toEqual(s);
    expect(back?.recorded).toBe(false);
  });
  it("drops saves for another puzzle or with impossible guesses", () => {
    const s = submitWordGroupsGuess(PUZZLE, createWordGroups(PUZZLE), ["apple", "pear", "plum", "fig"]).state;
    expect(parseWordGroups(serializeWordGroups(s, true), { ...PUZZLE, id: "other" })).toBeNull();
    expect(parseWordGroups(JSON.stringify({ v: 1, puzzleId: PUZZLE.id, guesses: [["apple", "x", "y", "z"]], recorded: false }), PUZZLE)).toBeNull();
    expect(parseWordGroups("not json", PUZZLE)).toBeNull();
    expect(parseWordGroups(null, PUZZLE)).toBeNull();
  });
});

describe("word-groups: shipped packs", () => {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../public/data/word-groups");
  for (const locale of ["ko", "en", "ja", "zh", "fr", "es"]) {
    it(`${locale} pack is valid`, () => {
      const pack = JSON.parse(readFileSync(resolve(dir, `${locale}.json`), "utf8")) as WordGroupsPack;
      expect(pack.schema).toBe(WORD_GROUPS_SCHEMA);
      expect(pack.locale).toBe(locale);
      expect(pack.puzzles.length).toBeGreaterThanOrEqual(7);
      const ids = new Set<string>();
      for (const puzzle of pack.puzzles) {
        expect(validateWordGroupsPuzzle(puzzle), puzzle.id).toEqual([]);
        expect(ids.has(puzzle.id)).toBe(false);
        ids.add(puzzle.id);
      }
    });
  }
});
