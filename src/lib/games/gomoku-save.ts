import { getGomokuResult, GOMOKU_CELL_COUNT, GOMOKU_SIZE, type GomokuBoard, type GomokuCell } from "./gomoku";
import { parseGomokuSave } from "./active-game-save";
import type { AiLevel, GameMode } from "./ai/types";

export const GOMOKU_SAVE_KEY = "oiyo:gomoku-state:v2";
export const LEGACY_GOMOKU_SAVE_KEY = "oiyo:gomoku-state:v1";

export interface GomokuSaveV2 {
  version: 2;
  board: GomokuBoard;
  isBlackTurn: boolean;
  mode: GameMode;
  level: AiLevel;
  lastMove: number | null;
  startedAtEpochMs: number;
  savedAtEpochMs: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isMode = (value: unknown): value is GameMode => value === "local" || value === "ai";
const isLevel = (value: unknown): value is AiLevel => value === 1 || value === 2 || value === 3;

export function parseGomokuSaveV2(raw: string | null, now = Date.now()): GomokuSaveV2 | null {
  if (!raw || !Number.isFinite(now)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 2) return null;
    if (!isMode(value.mode) || !isLevel(value.level) || typeof value.isBlackTurn !== "boolean") return null;
    if (!Array.isArray(value.board) || value.board.length !== GOMOKU_CELL_COUNT ||
      value.board.some((cell) => cell !== null && cell !== 1 && cell !== 2)) return null;
    const board = [...value.board] as GomokuBoard;

    const ones = board.filter((cell) => cell === 1).length;
    const twos = board.filter((cell) => cell === 2).length;
    if (ones + twos === 0 || ones < twos || ones > twos + 1 || value.isBlackTurn !== (ones === twos)) return null;

    if (value.lastMove !== null) {
      if (!Number.isInteger(value.lastMove) || (value.lastMove as number) < 0 || (value.lastMove as number) >= GOMOKU_CELL_COUNT) return null;
      if (board[value.lastMove as number] === null) return null;
      // A restorable match is always non-terminal: the last placed stone must not
      // already be a completed five, and the board must not be a full draw.
      if (getGomokuResult(board, value.lastMove as number) !== null) return null;
    } else if (ones + twos > 0) {
      // A migrated legacy save has no recorded last move. Fall back to a full-board
      // scan for a completed five (or a full-board draw) instead of fabricating
      // which stone finished it.
      if (ones + twos === GOMOKU_CELL_COUNT) return null;
      if (board.some((cell, index) => cell !== null && getGomokuResult(board, index) !== null)) return null;
    }

    if (!Number.isInteger(value.startedAtEpochMs) || (value.startedAtEpochMs as number) < 0) return null;
    if (!Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 || (value.savedAtEpochMs as number) > now + 300_000) return null;
    if ((value.startedAtEpochMs as number) > (value.savedAtEpochMs as number)) return null;

    return {
      version: 2,
      board,
      isBlackTurn: value.isBlackTurn,
      mode: value.mode,
      level: value.level,
      lastMove: value.lastMove as number | null,
      startedAtEpochMs: value.startedAtEpochMs as number,
      savedAtEpochMs: value.savedAtEpochMs as number,
    };
  } catch {
    return null;
  }
}

export function serializeGomokuSaveV2(save: Omit<GomokuSaveV2, "version">): string {
  return JSON.stringify({ version: 2, ...save });
}

// Promote an in-progress v1 match instead of discarding it: the board is fully
// validated state, only the last-move/timing metadata is unknown — and we do
// not fabricate it.
export function migrateLegacyGomokuSave(raw: string | null, now = Date.now()): Omit<GomokuSaveV2, "version"> | null {
  if (!raw) return null;
  try {
    const parsed = parseGomokuSave(JSON.parse(raw));
    if (!parsed) return null;
    return {
      board: parsed.board,
      isBlackTurn: parsed.isBlackTurn,
      mode: parsed.mode,
      level: parsed.level,
      lastMove: null,
      startedAtEpochMs: now,
      savedAtEpochMs: now,
    };
  } catch {
    return null;
  }
}

export function loadGomokuSaveV2(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): GomokuSaveV2 | null {
  if (!storage) return null;
  try {
    const current = parseGomokuSaveV2(storage.getItem(GOMOKU_SAVE_KEY), now);
    if (current) return current;
    const migrated = migrateLegacyGomokuSave(storage.getItem(LEGACY_GOMOKU_SAVE_KEY), now);
    if (!migrated) return null;
    storage.setItem(GOMOKU_SAVE_KEY, serializeGomokuSaveV2(migrated));
    storage.removeItem(LEGACY_GOMOKU_SAVE_KEY);
    return { version: 2, ...migrated };
  } catch {
    return null;
  }
}

export function storeGomokuSaveV2(save: Omit<GomokuSaveV2, "version">, storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(GOMOKU_SAVE_KEY, serializeGomokuSaveV2(save)); } catch { /* best-effort local active state */ }
}

export function clearGomokuSaveV2(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(GOMOKU_SAVE_KEY); } catch { /* best-effort local active state */ }
}

export function clearLegacyGomokuSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(LEGACY_GOMOKU_SAVE_KEY); } catch { /* best-effort local active state */ }
}

// GOMOKU_SIZE re-exported for adapters/tests that only import from this module.
export { GOMOKU_SIZE };
export type { GomokuCell };
