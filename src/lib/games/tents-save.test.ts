import { describe, expect, it } from "vitest";
import {
  DAILY_BOARD,
  FREE_BOARD,
  TENTS_SAVE_KEY,
  clearTentsSave,
  loadTentsSave,
  parseTentsSave,
  puzzleForTentsSave,
  serializeTentsSave,
  storeTentsSave,
  type CellMark,
} from "./tents-save";
import { generateUniqueTents, validateTents } from "./tents";
import { mulberry32 } from "./daily";

/** Mirrors dayIndexFromKey()'s formula (not exported) so the test can derive
 * the exact seed puzzleForTentsSave("daily", ...) uses internally. */
function dayIndexFromKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(2024, 0, 1)) / 86400000);
}

const NOW = 2_000_000;
const TODAY = "2026-08-05";

function emptyMarks(size: number): CellMark[][] {
  return Array.from({ length: size }, () => Array<CellMark>(size).fill("empty"));
}

function validDailySave() {
  return {
    mode: "daily" as const,
    dailyDate: TODAY,
    seed: 0,
    marks: emptyMarks(DAILY_BOARD.size),
    savedAtEpochMs: NOW - 1_000,
  };
}

function validFreeSave(seed: number) {
  return {
    mode: "free" as const,
    dailyDate: TODAY,
    seed,
    marks: emptyMarks(FREE_BOARD.size),
    savedAtEpochMs: NOW - 1_000,
  };
}

describe("tents & trees save v1 parser", () => {
  it("round-trips a valid in-progress daily board", () => {
    const save = validDailySave();
    const parsed = parseTentsSave(serializeTentsSave(save), TODAY, NOW);
    expect(parsed).not.toBeNull();
    expect(parsed?.mode).toBe("daily");
    expect(parsed?.marks).toEqual(save.marks);
  });

  it("round-trips a valid in-progress free board using its stored seed", () => {
    const save = validFreeSave(12345);
    const parsed = parseTentsSave(serializeTentsSave(save), TODAY, NOW);
    expect(parsed).not.toBeNull();
    expect(parsed?.seed).toBe(12345);
  });

  it("rejects malformed, missing or future-dated payloads", () => {
    expect(parseTentsSave(null, TODAY, NOW)).toBeNull();
    expect(parseTentsSave("not json", TODAY, NOW)).toBeNull();
    expect(parseTentsSave(JSON.stringify({ ...validDailySave(), version: 2 }), TODAY, NOW)).toBeNull();
    expect(
      parseTentsSave(serializeTentsSave({ ...validDailySave(), savedAtEpochMs: NOW + 1_000_000 }), TODAY, NOW),
    ).toBeNull();
  });

  it("rejects a daily save from a different day than expected", () => {
    const save = validDailySave();
    expect(parseTentsSave(serializeTentsSave({ ...save, dailyDate: "2026-08-04" }), TODAY, NOW)).toBeNull();
  });

  it("accepts a free save regardless of dailyDate mismatch (mode is not daily)", () => {
    const save = validFreeSave(7);
    const parsed = parseTentsSave(serializeTentsSave({ ...save, dailyDate: "2020-01-01" }), TODAY, NOW);
    expect(parsed).not.toBeNull();
  });

  it("rejects marks claiming a tent or grass on a tree cell", () => {
    const save = validDailySave();
    const puzzle = puzzleForTentsSave("daily", TODAY, 0);
    const [tr, tc] = puzzle.trees[0];
    const tampered = save.marks.map((row) => [...row]);
    tampered[tr][tc] = "tent";
    expect(parseTentsSave(serializeTentsSave({ ...save, marks: tampered }), TODAY, NOW)).toBeNull();
  });

  it("rejects marks with the wrong grid size for the board", () => {
    const save = validDailySave();
    expect(
      parseTentsSave(serializeTentsSave({ ...save, marks: emptyMarks(FREE_BOARD.size) }), TODAY, NOW),
    ).toBeNull();
  });

  it("rejects an already-complete board as not resumable", () => {
    const dayIndex = dayIndexFromKey(TODAY);
    const { puzzle, solution } = generateUniqueTents(
      DAILY_BOARD.size,
      DAILY_BOARD.pairs,
      mulberry32(0x74656e ^ Math.imul(dayIndex + 1, 2654435761)),
    );
    expect(puzzle).toEqual(puzzleForTentsSave("daily", TODAY, 0)); // same seed derivation as production
    expect(validateTents(solution, puzzle).complete).toBe(true);

    const marks = emptyMarks(DAILY_BOARD.size);
    for (const [r, c] of solution) marks[r][c] = "tent";
    const save = { ...validDailySave(), marks };
    expect(parseTentsSave(serializeTentsSave(save), TODAY, NOW)).toBeNull();
  });

  it("round-trips through storage and clears on demand", () => {
    const calls: Record<string, string> = {};
    const storage = {
      getItem: (key: string) => calls[key] ?? null,
      setItem: (key: string, value: string) => { calls[key] = value; },
      removeItem: (key: string) => { delete calls[key]; },
    };
    storeTentsSave(validDailySave(), storage);
    expect(loadTentsSave(TODAY, NOW, storage)?.mode).toBe("daily");
    expect(calls[TENTS_SAVE_KEY]).toBeDefined();
    clearTentsSave(storage);
    expect(loadTentsSave(TODAY, NOW, storage)).toBeNull();
  });
});
