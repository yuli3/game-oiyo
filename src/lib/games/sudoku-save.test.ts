import { describe, expect, it } from "vitest";
import {
  LEGACY_SUDOKU_SAVE_KEY,
  SUDOKU_SAVE_KEY,
  clearLegacySudokuSave,
  parseSudokuSaveV2,
  restoredSudokuSeconds,
  serializeSudokuSaveV2,
  type SudokuSaveV2,
} from "./sudoku-save";
import { generateSudokuPuzzle, sudokuDailySeed } from "./sudoku";

const TODAY = "2026-08-01";
const NOW = Date.UTC(2026, 7, 1, 12, 0, 0);

function emptyEntries(): (number | null)[][] {
  return Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));
}

function validSave(overrides: Partial<Omit<SudokuSaveV2, "version">> = {}): Omit<SudokuSaveV2, "version"> {
  return {
    mode: "daily",
    dailyDate: TODAY,
    seed: sudokuDailySeed(100),
    entries: emptyEntries(),
    seconds: 30,
    savedAtEpochMs: NOW - 5_000,
    ...overrides,
  };
}

describe("sudoku save v2 parser", () => {
  it("round-trips a valid in-progress save", () => {
    const save = validSave();
    const entries = emptyEntries();
    const { givens } = generateSudokuPuzzle("medium", save.seed);
    const row = givens.findIndex((r) => r.includes(null));
    const column = givens[row].indexOf(null);
    entries[row][column] = 5;
    const parsed = parseSudokuSaveV2(serializeSudokuSaveV2({ ...save, entries }), TODAY, NOW);
    expect(parsed).not.toBeNull();
    expect(parsed?.entries[row][column]).toBe(5);
    expect(parsed?.mode).toBe("daily");
  });

  it("fails closed on corrupt or foreign payloads", () => {
    expect(parseSudokuSaveV2(null, TODAY, NOW)).toBeNull();
    expect(parseSudokuSaveV2("not json {", TODAY, NOW)).toBeNull();
    expect(parseSudokuSaveV2(JSON.stringify({ version: 1, grid: [], seconds: 3 }), TODAY, NOW)).toBeNull();
    expect(parseSudokuSaveV2(serializeSudokuSaveV2(validSave({ mode: "expert" as never })), TODAY, NOW)).toBeNull();
    expect(parseSudokuSaveV2(serializeSudokuSaveV2(validSave({ seconds: -1 })), TODAY, NOW)).toBeNull();
    expect(parseSudokuSaveV2(serializeSudokuSaveV2(validSave({ savedAtEpochMs: NOW + 600_000 })), TODAY, NOW)).toBeNull();
    expect(parseSudokuSaveV2(serializeSudokuSaveV2(validSave({ seed: 1.5 })), TODAY, NOW)).toBeNull();
  });

  it("rejects a stale daily but keeps free-play saves date-independent", () => {
    expect(parseSudokuSaveV2(serializeSudokuSaveV2(validSave({ dailyDate: "2026-07-31" })), TODAY, NOW)).toBeNull();
    const free = validSave({ mode: "hard", dailyDate: "2026-07-31", seed: 42 });
    expect(parseSudokuSaveV2(serializeSudokuSaveV2(free), TODAY, NOW)).not.toBeNull();
  });

  it("rejects entries that overwrite given cells or hold invalid digits", () => {
    const save = validSave();
    const { givens } = generateSudokuPuzzle("medium", save.seed);
    const givenRow = givens.findIndex((r) => r.some((v) => v !== null));
    const givenColumn = givens[givenRow].findIndex((v) => v !== null);
    const tampered = emptyEntries();
    tampered[givenRow][givenColumn] = 9;
    expect(parseSudokuSaveV2(serializeSudokuSaveV2(validSave({ entries: tampered })), TODAY, NOW)).toBeNull();

    const badDigit = emptyEntries();
    const openRow = givens.findIndex((r) => r.includes(null));
    badDigit[openRow][givens[openRow].indexOf(null)] = 10;
    expect(parseSudokuSaveV2(serializeSudokuSaveV2(validSave({ entries: badDigit })), TODAY, NOW)).toBeNull();
  });

  it("rejects an already-solved board as non-restorable", () => {
    const seed = 42;
    const { givens, solution } = generateSudokuPuzzle("easy", seed);
    const entries = emptyEntries();
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (givens[r][c] === null) entries[r][c] = solution[r][c];
    }
    const solved = validSave({ mode: "easy", seed, entries });
    expect(parseSudokuSaveV2(serializeSudokuSaveV2(solved), TODAY, NOW)).toBeNull();
  });

  it("continues wall-clock time on restore without rewinding", () => {
    const parsed = parseSudokuSaveV2(serializeSudokuSaveV2(validSave({ seconds: 30, savedAtEpochMs: NOW - 12_000 })), TODAY, NOW)!;
    expect(restoredSudokuSeconds(parsed, NOW)).toBe(42);
    expect(restoredSudokuSeconds(parsed, parsed.savedAtEpochMs - 60_000)).toBe(30);
  });
});

describe("sudoku legacy v1 boundary", () => {
  it("removes only the legacy key and never throws on blocked storage", () => {
    const written = new Map<string, string>([
      [LEGACY_SUDOKU_SAVE_KEY, "{}"],
      [SUDOKU_SAVE_KEY, "keep"],
    ]);
    const storage = {
      getItem: (key: string) => written.get(key) ?? null,
      setItem: (key: string, value: string) => { written.set(key, value); },
      removeItem: (key: string) => { written.delete(key); },
    };
    clearLegacySudokuSave(storage);
    expect(written.has(LEGACY_SUDOKU_SAVE_KEY)).toBe(false);
    expect(written.get(SUDOKU_SAVE_KEY)).toBe("keep");
    const throwing = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(() => clearLegacySudokuSave(throwing)).not.toThrow();
  });
});
