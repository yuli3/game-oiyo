import { describe, expect, it } from "vitest";
import { generateKurodokoPuzzle, kurodokoDailySeed } from "./kurodoko";
import { mulberry32 } from "./daily";
import { parseKurodokoSaveV1, puzzleFromKurodokoSave, restoredKurodokoSeconds } from "./kurodoko-save";

const date = "2026-08-02";
const seed = kurodokoDailySeed(100);
const puzzle = generateKurodokoPuzzle("medium", mulberry32(seed)).puzzle;
const marks = puzzle.map((row) => row.map((clue) => clue === null ? -1 as const : 0 as const));
const payload = { version: 1, mode: "daily", difficulty: "medium", dailyDate: date, seed, marks, moves: 1, seconds: 12, savedAtEpochMs: 1000 } as const;

describe("Kurodoko active save", () => {
  it("restores a valid seeded daily board", () => {
    const save = parseKurodokoSaveV1(JSON.stringify(payload), date, 1000);
    expect(save).not.toBeNull();
    expect(puzzleFromKurodokoSave(save!)).toEqual(puzzle);
    expect(restoredKurodokoSeconds(save!, 6000)).toBe(17);
  });

  it("expires a daily board at rollover", () => {
    expect(parseKurodokoSaveV1(JSON.stringify(payload), "2026-08-03", 1000)).toBeNull();
  });

  it("rejects clue edits, malformed marks, and future timestamps", () => {
    const clue = puzzle.flat().findIndex((value) => value !== null);
    const row = Math.floor(clue / puzzle.length), column = clue % puzzle.length;
    const tampered = structuredClone(payload) as { marks: number[][] };
    tampered.marks[row][column] = 1;
    expect(parseKurodokoSaveV1(JSON.stringify(tampered), date, 1000)).toBeNull();
    expect(parseKurodokoSaveV1(JSON.stringify({ ...payload, marks: [] }), date, 1000)).toBeNull();
    expect(parseKurodokoSaveV1(JSON.stringify({ ...payload, savedAtEpochMs: 400_001 }), date, 1000)).toBeNull();
  });
});
