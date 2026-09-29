import { generateTents, generateUniqueTents, validateTents, type Pos, type TentsPuzzle } from "./tents";
import { mulberry32 } from "./daily";
import {
  CHAOS_SECONDS,
  chaosBoard,
  chaosEffects,
  isChaosAugmentId,
  type ChaosAugmentId,
} from "./tents-chaos";

/**
 * Fail-closed active-puzzle save, mirroring the Sudoku save contract: the
 * puzzle itself is never trusted from storage. It is regenerated from a seed
 * (the daily's own date-derived seed, or a stored seed for a free-play
 * board), and only the player's tent/grass marks are accepted from the save.
 */

export const TENTS_SAVE_KEY = "oiyo:tents-and-trees-state:v1";

export type CellMark = "empty" | "tent" | "grass";
export type TentsMode = "daily" | "free" | "chaos";

export const FREE_BOARD = { size: 5, pairs: 5 };
export const DAILY_BOARD = { size: 6, pairs: 7 };

export interface TentsSaveV1 {
  version: 1;
  mode: TentsMode;
  /** The civil date the save was made on. Enforced for "daily" and "chaos". */
  dailyDate: string;
  /** Regenerates the exact board for mode "free"; ignored for "daily" and "chaos". */
  seed: number;
  marks: CellMark[][];
  savedAtEpochMs: number;
  // Optional so a version-1 daily or free save from before chaos still loads. 2026-09-29
  chaosAugment?: ChaosAugmentId;
  chaosStartedAtEpochMs?: number;
  chaosDeadlineMs?: number;
  chaosFlashlightUsed?: boolean;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function validCivilDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Mirrors `dayIndex()` from `daily.ts` exactly, but starting from an already
 *-known "YYYY-MM-DD" key instead of `new Date()` — avoids round-tripping the
 * key through the `Date` constructor, whose implicit UTC parsing of a
 * date-only string then read back through local getters can shift by a day
 * near midnight in some timezones.
 */
function dayIndexFromKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  const epochOrdinal = Date.UTC(2024, 0, 1);
  const todayOrdinal = Date.UTC(y, m - 1, d);
  return Math.floor((todayOrdinal - epochOrdinal) / 86400000);
}

/** Regenerates the canonical board a save claims to belong to. */
export function puzzleForTentsSave(mode: TentsMode, dailyDate: string, seed: number): TentsPuzzle {
  if (mode === "daily") {
    const dayIndex = dayIndexFromKey(dailyDate);
    return generateUniqueTents(
      DAILY_BOARD.size,
      DAILY_BOARD.pairs,
      mulberry32(0x74656e ^ Math.imul(dayIndex + 1, 2654435761)),
    ).puzzle;
  }
  if (mode === "chaos") return chaosBoard(dayIndexFromKey(dailyDate)).puzzle;
  return generateTents(FREE_BOARD.size, FREE_BOARD.pairs, mulberry32(seed)).puzzle;
}

function isValidMarksGrid(value: unknown, puzzle: TentsPuzzle): value is CellMark[][] {
  if (!Array.isArray(value) || value.length !== puzzle.size) return false;
  const treeKeys = new Set(puzzle.trees.map(([r, c]) => `${r}:${c}`));
  for (let r = 0; r < puzzle.size; r += 1) {
    const row = value[r];
    if (!Array.isArray(row) || row.length !== puzzle.size) return false;
    for (let c = 0; c < puzzle.size; c += 1) {
      const cell = row[c];
      if (cell !== "empty" && cell !== "tent" && cell !== "grass") return false;
      // A tent (or grass mark) can never sit on a tree cell — the UI never
      // lets a player click one, so a save claiming otherwise is tampered.
      if (cell !== "empty" && treeKeys.has(`${r}:${c}`)) return false;
    }
  }
  return true;
}

export function parseTentsSave(raw: string | null, expectedDailyDate: string, now = Date.now()): TentsSaveV1 | null {
  if (!raw || !validCivilDate(expectedDailyDate) || !Number.isFinite(now)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1) return null;
    if (value.mode !== "daily" && value.mode !== "free" && value.mode !== "chaos") return null;
    const mode = value.mode as TentsMode;
    if (!validCivilDate(value.dailyDate)) return null;
    if ((mode === "daily" || mode === "chaos") && value.dailyDate !== expectedDailyDate) return null;
    if (!Number.isInteger(value.seed) || (value.seed as number) < 0 || (value.seed as number) > 0xffffffff) return null;
    if (!Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 || (value.savedAtEpochMs as number) > now + 300_000) return null;

    let chaosAugment: ChaosAugmentId | undefined;
    let chaosStartedAtEpochMs: number | undefined;
    let chaosDeadlineMs: number | undefined;
    let chaosFlashlightUsed = false;
    if (mode === "chaos") {
      if (!isChaosAugmentId(value.chaosAugment)) return null;
      chaosAugment = value.chaosAugment;
      if (!Number.isInteger(value.chaosStartedAtEpochMs) || (value.chaosStartedAtEpochMs as number) < 0 || (value.chaosStartedAtEpochMs as number) > now + 300_000) return null;
      chaosStartedAtEpochMs = value.chaosStartedAtEpochMs as number;
      if (chaosAugment === "hourglass") {
        // There is no server clock. An expired hourglass is dropped so a refresh can try again,
        // and a stored deadline that is not the 90s we showed is rejected. 2026-09-29
        if (value.chaosDeadlineMs !== chaosStartedAtEpochMs + CHAOS_SECONDS * 1000) return null;
        if ((value.chaosDeadlineMs as number) <= now) return null;
        chaosDeadlineMs = value.chaosDeadlineMs as number;
      }
      if (value.chaosFlashlightUsed !== undefined) {
        if (typeof value.chaosFlashlightUsed !== "boolean") return null;
        chaosFlashlightUsed = value.chaosFlashlightUsed;
      }
    }

    const puzzle = puzzleForTentsSave(mode, value.dailyDate as string, value.seed as number);
    if (!isValidMarksGrid(value.marks, puzzle)) return null;
    const marks = (value.marks as CellMark[][]).map((row) => [...row]);
    const effects = mode === "chaos" ? chaosEffects(dayIndexFromKey(value.dailyDate as string)) : null;

    if (effects && chaosAugment) {
      if (chaosAugment === "banned") {
        for (const [r, c] of effects.banned) {
          if (marks[r][c] !== "empty") return null;
        }
      }
      // Trail and safe-grass cells are recomputed from the day, not trusted from storage. 2026-09-29
      if (chaosAugment === "trailhead") {
        const [r, c] = effects.trailhead;
        marks[r][c] = "tent";
      }
      if (chaosAugment === "safeGrass") {
        const [r, c] = effects.safeGrass;
        marks[r][c] = "grass";
      }
    }

    const tents: Pos[] = [];
    for (let r = 0; r < puzzle.size; r += 1) {
      for (let c = 0; c < puzzle.size; c += 1) {
        if (marks[r][c] === "tent") tents.push([r, c]);
      }
    }
    const rules = chaosAugment === "banned" && effects ? { banned: effects.banned } : undefined;
    if (validateTents(tents, puzzle, rules).complete) return null; // a finished board isn't resumable

    return {
      version: 1,
      mode,
      dailyDate: value.dailyDate as string,
      seed: value.seed as number,
      marks,
      savedAtEpochMs: value.savedAtEpochMs as number,
      ...(chaosAugment ? { chaosAugment, chaosStartedAtEpochMs, chaosFlashlightUsed } : {}),
      ...(chaosDeadlineMs !== undefined ? { chaosDeadlineMs } : {}),
    };
  } catch {
    return null;
  }
}

export function serializeTentsSave(save: Omit<TentsSaveV1, "version">): string {
  return JSON.stringify({ version: 1, ...save });
}

export function loadTentsSave(
  expectedDailyDate: string,
  now = Date.now(),
  storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): TentsSaveV1 | null {
  if (!storage) return null;
  try {
    return parseTentsSave(storage.getItem(TENTS_SAVE_KEY), expectedDailyDate, now);
  } catch {
    return null;
  }
}

export function storeTentsSave(
  save: Omit<TentsSaveV1, "version">,
  storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): void {
  if (!storage) return;
  try {
    storage.setItem(TENTS_SAVE_KEY, serializeTentsSave(save));
  } catch {
    /* best-effort local active state */
  }
}

export function clearTentsSave(
  storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): void {
  if (!storage) return;
  try {
    storage.removeItem(TENTS_SAVE_KEY);
  } catch {
    /* best-effort local active state */
  }
}
