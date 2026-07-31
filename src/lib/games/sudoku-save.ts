import { isSudokuSolved, type SudokuValue } from "./logic-puzzles";
import {
  SUDOKU_DAILY_DIFFICULTY,
  generateSudokuPuzzle,
  type SudokuDifficultyId,
} from "./sudoku";

export const SUDOKU_SAVE_KEY = "oiyo:sudoku-state:v2";
// v1 stored progress against the single fixed demo puzzle that no longer
// exists as a mode. Per the modernization save policy, a v1 payload is safely
// discarded instead of being migrated into a puzzle it never belonged to.
export const LEGACY_SUDOKU_SAVE_KEY = "oiyo:sudoku-state:v1";

export type SudokuMode = "daily" | SudokuDifficultyId;

export interface SudokuSaveV2 {
  version: 2;
  mode: SudokuMode;
  dailyDate: string;
  seed: number;
  // Player entries only: given cells must stay null here, so a tampered
  // payload can never overwrite the puzzle itself.
  entries: SudokuValue[][];
  seconds: number;
  savedAtEpochMs: number;
}

type SudokuStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function validCivilDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function sudokuDifficultyFor(mode: SudokuMode): SudokuDifficultyId {
  return mode === "daily" ? SUDOKU_DAILY_DIFFICULTY : mode;
}

export function parseSudokuSaveV2(raw: string | null, expectedDailyDate: string, nowEpochMs = Date.now()): SudokuSaveV2 | null {
  if (!raw || !validCivilDate(expectedDailyDate) || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 2) return null;
    const mode = value.mode;
    if (mode !== "daily" && mode !== "easy" && mode !== "medium" && mode !== "hard") return null;
    if (!validCivilDate(value.dailyDate) || mode === "daily" && value.dailyDate !== expectedDailyDate) return null;
    if (!Number.isInteger(value.seed) || (value.seed as number) < -0x8000_0000 || (value.seed as number) > 0x7fff_ffff) return null;
    if (!Number.isInteger(value.seconds) || (value.seconds as number) < 0) return null;
    if (!Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 || (value.savedAtEpochMs as number) > nowEpochMs + 300_000) return null;

    // The board is never trusted from storage: it is regenerated from the
    // seed, and only the player's entries into non-given cells are accepted.
    const { givens } = generateSudokuPuzzle(sudokuDifficultyFor(mode), value.seed as number);
    const rawEntries = value.entries;
    if (!Array.isArray(rawEntries) || rawEntries.length !== 9) return null;
    const entries: SudokuValue[][] = [];
    const combined: SudokuValue[][] = givens.map((row) => [...row]);
    for (let r = 0; r < 9; r++) {
      const sourceRow = rawEntries[r];
      if (!Array.isArray(sourceRow) || sourceRow.length !== 9) return null;
      const row: SudokuValue[] = [];
      for (let c = 0; c < 9; c++) {
        const cell = sourceRow[c];
        if (cell === null) {
          row.push(null);
          continue;
        }
        if (!Number.isInteger(cell) || (cell as number) < 1 || (cell as number) > 9 || givens[r][c] !== null) return null;
        row.push(cell as number);
        combined[r][c] = cell as number;
      }
      entries.push(row);
    }
    if (isSudokuSolved(combined)) return null;
    return {
      version: 2,
      mode,
      dailyDate: value.dailyDate,
      seed: value.seed as number,
      entries,
      seconds: value.seconds as number,
      savedAtEpochMs: value.savedAtEpochMs as number,
    };
  } catch {
    return null;
  }
}

export function serializeSudokuSaveV2(save: Omit<SudokuSaveV2, "version">): string {
  return JSON.stringify({ version: 2, ...save });
}

// Wall-clock continuation mirrors the minesweeper restore contract: time spent
// with the tab closed still counts, and clock drift never rewinds the timer.
export function restoredSudokuSeconds(save: SudokuSaveV2, nowEpochMs = Date.now()): number {
  return save.seconds + Math.max(0, Math.floor((nowEpochMs - save.savedAtEpochMs) / 1000));
}

export function loadSudokuSaveV2(expectedDailyDate: string, nowEpochMs = Date.now(), storage: SudokuStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): SudokuSaveV2 | null {
  if (!storage) return null;
  try { return parseSudokuSaveV2(storage.getItem(SUDOKU_SAVE_KEY), expectedDailyDate, nowEpochMs); } catch { return null; }
}

export function storeSudokuSaveV2(save: Omit<SudokuSaveV2, "version">, storage: SudokuStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(SUDOKU_SAVE_KEY, serializeSudokuSaveV2(save)); } catch { /* best-effort local active state */ }
}

export function clearSudokuSaveV2(storage: SudokuStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(SUDOKU_SAVE_KEY); } catch { /* best-effort local active state */ }
}

export function clearLegacySudokuSave(storage: SudokuStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(LEGACY_SUDOKU_SAVE_KEY); } catch { /* best-effort local active state */ }
}
