import { parseSolitaireSave } from "./active-game-save";
import { dayIndex } from "./daily";
import type { SolitaireState } from "./solitaire";

export const SOLITAIRE_SAVE_KEY = "oiyo:solitaire-state:v2";
export const LEGACY_SOLITAIRE_SAVE_KEY = "oiyo:solitaire-state:v1";

export type SolitaireMode = "daily" | "free";

export interface SolitaireSaveV2 {
  version: 2;
  mode: SolitaireMode;
  dailyDate: string;
  seed: number;
  state: SolitaireState;
  elapsedSeconds: number;
  moves: number;
  undoCount: number;
  // A game migrated from v1 has no trustworthy elapsed time, so wins from it
  // keep W/L and streak but never claim a time personal best.
  legacyMigrated: boolean;
  savedAtEpochMs: number;
}

type SolitaireStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function validCivilDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function solitaireDailySeed(index = dayIndex()): number {
  return (0x501e ^ Math.imul(index + 1, 2654435761)) | 0;
}

function dayIndexForCivilDate(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(2024, 0, 1)) / 86_400_000);
}

export function parseSolitaireSaveV2(raw: string | null, expectedDailyDate: string, nowEpochMs = Date.now()): SolitaireSaveV2 | null {
  if (!raw || !validCivilDate(expectedDailyDate) || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 2) return null;
    if (value.mode !== "daily" && value.mode !== "free") return null;
    if (!validCivilDate(value.dailyDate) || value.mode === "daily" && value.dailyDate !== expectedDailyDate) return null;
    if (!Number.isInteger(value.seed) || (value.seed as number) < -0x8000_0000 || (value.seed as number) > 0x7fff_ffff) return null;
    if (value.mode === "daily" && value.seed !== solitaireDailySeed(dayIndexForCivilDate(value.dailyDate))) return null;
    if (!Number.isInteger(value.elapsedSeconds) || (value.elapsedSeconds as number) < 0 || (value.elapsedSeconds as number) > 31_536_000) return null;
    if (!Number.isInteger(value.moves) || (value.moves as number) < 0 || (value.moves as number) > 1_000_000) return null;
    if (!Number.isInteger(value.undoCount) || (value.undoCount as number) < 0 || (value.undoCount as number) > (value.moves as number)) return null;
    if (typeof value.legacyMigrated !== "boolean") return null;
    if (!Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 || (value.savedAtEpochMs as number) > nowEpochMs + 300_000) return null;
    // Deck integrity, card shape, and the not-already-won rule are the same
    // trust boundary as v1 — delegate to the existing state parser.
    const stateParsed = parseSolitaireSave({ version: 1, state: value.state });
    if (!stateParsed) return null;
    return {
      version: 2,
      mode: value.mode,
      dailyDate: value.dailyDate,
      seed: value.seed as number,
      state: stateParsed.state,
      elapsedSeconds: value.elapsedSeconds as number,
      moves: value.moves as number,
      undoCount: value.undoCount as number,
      legacyMigrated: value.legacyMigrated,
      savedAtEpochMs: value.savedAtEpochMs as number,
    };
  } catch {
    return null;
  }
}

export function serializeSolitaireSaveV2(save: Omit<SolitaireSaveV2, "version">): string {
  return JSON.stringify({ version: 2, ...save });
}

export function restoredSolitaireSeconds(save: SolitaireSaveV2, nowEpochMs = Date.now()): number {
  return save.elapsedSeconds + Math.max(0, Math.floor((nowEpochMs - save.savedAtEpochMs) / 1000));
}

// Promote an in-progress v1 game instead of discarding it: the board is fully
// validated state, only the metadata (mode/seed/timer) is unknown.
export function migrateLegacySolitaireSave(raw: string | null, nowEpochMs = Date.now(), dailyDate = "1970-01-01"): Omit<SolitaireSaveV2, "version"> | null {
  if (!raw) return null;
  try {
    const parsed = parseSolitaireSave(JSON.parse(raw));
    if (!parsed) return null;
    return {
      mode: "free",
      dailyDate,
      seed: 0,
      state: parsed.state,
      elapsedSeconds: 0,
      moves: 0,
      undoCount: 0,
      legacyMigrated: true,
      savedAtEpochMs: nowEpochMs,
    };
  } catch {
    return null;
  }
}

export function loadSolitaireSaveV2(expectedDailyDate: string, nowEpochMs = Date.now(), storage: SolitaireStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): SolitaireSaveV2 | null {
  if (!storage) return null;
  try {
    const current = parseSolitaireSaveV2(storage.getItem(SOLITAIRE_SAVE_KEY), expectedDailyDate, nowEpochMs);
    if (current) return current;
    const migrated = migrateLegacySolitaireSave(storage.getItem(LEGACY_SOLITAIRE_SAVE_KEY), nowEpochMs);
    if (!migrated) return null;
    storage.setItem(SOLITAIRE_SAVE_KEY, serializeSolitaireSaveV2(migrated));
    storage.removeItem(LEGACY_SOLITAIRE_SAVE_KEY);
    return { version: 2, ...migrated };
  } catch {
    return null;
  }
}

export function storeSolitaireSaveV2(save: Omit<SolitaireSaveV2, "version">, storage: SolitaireStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(SOLITAIRE_SAVE_KEY, serializeSolitaireSaveV2(save)); } catch { /* best-effort local active state */ }
}

export function clearSolitaireSaveV2(storage: SolitaireStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try {
    storage.removeItem(SOLITAIRE_SAVE_KEY);
    storage.removeItem(LEGACY_SOLITAIRE_SAVE_KEY);
  } catch { /* best-effort local active state */ }
}
