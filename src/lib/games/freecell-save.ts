import { parseFreeCellSave } from "./active-game-save";
import type { FreeCellState } from "./freecell";

export const FREECELL_SAVE_KEY = "oiyo:freecell-state:v2";
export const LEGACY_FREECELL_SAVE_KEY = "oiyo:freecell-state:v1";

export interface FreeCellSaveV2 {
  version: 2;
  state: FreeCellState;
  moves: number;
  elapsedSeconds: number;
  // A game migrated from v1 has no trustworthy move count or elapsed time,
  // so a restored session hides those stats instead of claiming false ones.
  legacyMigrated: boolean;
  savedAtEpochMs: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function parseFreeCellSaveV2(raw: string | null, now = Date.now()): FreeCellSaveV2 | null {
  if (!raw || !Number.isFinite(now)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 2) return null;
    if (!Number.isInteger(value.moves) || (value.moves as number) < 0) return null;
    if (!Number.isInteger(value.elapsedSeconds) || (value.elapsedSeconds as number) < 0) return null;
    if (typeof value.legacyMigrated !== "boolean") return null;
    if (!Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 || (value.savedAtEpochMs as number) > now + 300_000) return null;
    // Reuse the existing fail-closed validator: exact 52-card deck, cross-checked
    // suit/value/power/id fields, and rejects an already-won board.
    const parsedState = parseFreeCellSave({ version: 1, state: value.state });
    if (!parsedState) return null;
    return {
      version: 2,
      state: parsedState.state,
      moves: value.moves as number,
      elapsedSeconds: value.elapsedSeconds as number,
      legacyMigrated: value.legacyMigrated,
      savedAtEpochMs: value.savedAtEpochMs as number,
    };
  } catch {
    return null;
  }
}

export function serializeFreeCellSaveV2(save: Omit<FreeCellSaveV2, "version">): string {
  return JSON.stringify({ version: 2, ...save });
}

// Promote an in-progress v1 game instead of discarding it: the board is fully
// validated state, only the moves/elapsed-time metadata is unknown — and we
// do not fabricate it.
export function migrateLegacyFreeCellSave(raw: string | null): Omit<FreeCellSaveV2, "version"> | null {
  if (!raw) return null;
  try {
    const parsed = parseFreeCellSave(JSON.parse(raw));
    if (!parsed) return null;
    return {
      state: parsed.state,
      moves: 0,
      elapsedSeconds: 0,
      legacyMigrated: true,
      savedAtEpochMs: Date.now(),
    };
  } catch {
    return null;
  }
}

export function loadFreeCellSaveV2(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): FreeCellSaveV2 | null {
  if (!storage) return null;
  try {
    const current = parseFreeCellSaveV2(storage.getItem(FREECELL_SAVE_KEY), now);
    if (current) return current;
    const migrated = migrateLegacyFreeCellSave(storage.getItem(LEGACY_FREECELL_SAVE_KEY));
    if (!migrated) return null;
    storage.setItem(FREECELL_SAVE_KEY, serializeFreeCellSaveV2(migrated));
    storage.removeItem(LEGACY_FREECELL_SAVE_KEY);
    return { version: 2, ...migrated };
  } catch {
    return null;
  }
}

export function storeFreeCellSaveV2(save: Omit<FreeCellSaveV2, "version">, storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(FREECELL_SAVE_KEY, serializeFreeCellSaveV2(save)); } catch { /* best-effort local active state */ }
}

export function clearFreeCellSaveV2(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(FREECELL_SAVE_KEY); } catch { /* best-effort local active state */ }
}

export function clearLegacyFreeCellSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(LEGACY_FREECELL_SAVE_KEY); } catch { /* best-effort local active state */ }
}
