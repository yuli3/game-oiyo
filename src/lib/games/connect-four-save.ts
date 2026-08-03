import {
  checkWinAt,
  CONNECT_FOUR_COLS,
  CONNECT_FOUR_ROWS,
  isBoardFull,
  type ConnectFourBoard,
  type ConnectFourCell,
} from "./connect-four";
import { parseConnectFourSave } from "./active-game-save";
import type { AiLevel, GameMode } from "./ai/types";

export const CONNECT_FOUR_SAVE_KEY = "oiyo:connect-four-state:v2";
export const LEGACY_CONNECT_FOUR_SAVE_KEY = "oiyo:connect-four-state:v1";

export interface ConnectFourLastMove {
  row: number;
  col: number;
}

export interface ConnectFourSaveV2 {
  version: 2;
  board: ConnectFourBoard;
  currentPlayer: 1 | 2;
  mode: GameMode;
  level: AiLevel;
  lastMove: ConnectFourLastMove | null;
  startedAtEpochMs: number;
  savedAtEpochMs: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isMode = (value: unknown): value is GameMode => value === "local" || value === "ai";
const isLevel = (value: unknown): value is AiLevel => value === 1 || value === 2 || value === 3;

function isValidBoardShape(board: unknown): board is ConnectFourBoard {
  return (
    Array.isArray(board) &&
    board.length === CONNECT_FOUR_ROWS &&
    board.every(
      (row) => Array.isArray(row) && row.length === CONNECT_FOUR_COLS && row.every((cell) => cell === 0 || cell === 1 || cell === 2),
    )
  );
}

function respectsGravity(board: ConnectFourBoard): boolean {
  for (let col = 0; col < CONNECT_FOUR_COLS; col += 1) {
    let emptySeen = false;
    for (let row = CONNECT_FOUR_ROWS - 1; row >= 0; row -= 1) {
      if (board[row][col] === 0) emptySeen = true;
      else if (emptySeen) return false;
    }
  }
  return true;
}

export function parseConnectFourSaveV2(raw: string | null, now = Date.now()): ConnectFourSaveV2 | null {
  if (!raw || !Number.isFinite(now)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 2) return null;
    if (!isMode(value.mode) || !isLevel(value.level) || (value.currentPlayer !== 1 && value.currentPlayer !== 2)) return null;
    if (!isValidBoardShape(value.board) || !respectsGravity(value.board)) return null;
    const board = value.board.map((row) => [...row]) as ConnectFourBoard;

    const flat = board.flat();
    const ones = flat.filter((cell) => cell === 1).length;
    const twos = flat.filter((cell) => cell === 2).length;
    if (ones + twos === 0 || ones < twos || ones > twos + 1 || value.currentPlayer !== (ones === twos ? 1 : 2)) return null;

    if (value.lastMove !== null) {
      if (!isRecord(value.lastMove)) return null;
      const { row, col } = value.lastMove as Record<string, unknown>;
      if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
      if ((row as number) < 0 || (row as number) >= CONNECT_FOUR_ROWS || (col as number) < 0 || (col as number) >= CONNECT_FOUR_COLS) return null;
      const player = board[row as number][col as number];
      if (player === 0) return null;
      // A restorable match is always non-terminal: the last disc must not
      // already complete a connect-four, and the board must not be a full draw.
      if (checkWinAt(board, row as number, col as number, player as 1 | 2) !== null) return null;
      if (isBoardFull(board)) return null;
    } else if (ones + twos > 0) {
      // A migrated legacy save has no recorded last move. Fall back to a
      // full-board scan instead of fabricating which disc finished it.
      if (isBoardFull(board)) return null;
      for (let row = 0; row < CONNECT_FOUR_ROWS; row += 1) {
        for (let col = 0; col < CONNECT_FOUR_COLS; col += 1) {
          const player = board[row][col];
          if (player !== 0 && checkWinAt(board, row, col, player) !== null) return null;
        }
      }
    }

    if (!Number.isInteger(value.startedAtEpochMs) || (value.startedAtEpochMs as number) < 0) return null;
    if (!Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 || (value.savedAtEpochMs as number) > now + 300_000) return null;
    if ((value.startedAtEpochMs as number) > (value.savedAtEpochMs as number)) return null;

    return {
      version: 2,
      board,
      currentPlayer: value.currentPlayer,
      mode: value.mode,
      level: value.level,
      lastMove: value.lastMove as ConnectFourLastMove | null,
      startedAtEpochMs: value.startedAtEpochMs as number,
      savedAtEpochMs: value.savedAtEpochMs as number,
    };
  } catch {
    return null;
  }
}

export function serializeConnectFourSaveV2(save: Omit<ConnectFourSaveV2, "version">): string {
  return JSON.stringify({ version: 2, ...save });
}

// Promote an in-progress v1 match instead of discarding it: the board is
// fully validated state, only the last-move/timing metadata is unknown — and
// we do not fabricate it.
export function migrateLegacyConnectFourSave(raw: string | null, now = Date.now()): Omit<ConnectFourSaveV2, "version"> | null {
  if (!raw) return null;
  try {
    const parsed = parseConnectFourSave(JSON.parse(raw));
    if (!parsed) return null;
    return {
      board: parsed.board as ConnectFourBoard,
      currentPlayer: parsed.currentPlayer,
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

export function loadConnectFourSaveV2(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): ConnectFourSaveV2 | null {
  if (!storage) return null;
  try {
    const current = parseConnectFourSaveV2(storage.getItem(CONNECT_FOUR_SAVE_KEY), now);
    if (current) return current;
    const migrated = migrateLegacyConnectFourSave(storage.getItem(LEGACY_CONNECT_FOUR_SAVE_KEY), now);
    if (!migrated) return null;
    storage.setItem(CONNECT_FOUR_SAVE_KEY, serializeConnectFourSaveV2(migrated));
    storage.removeItem(LEGACY_CONNECT_FOUR_SAVE_KEY);
    return { version: 2, ...migrated };
  } catch {
    return null;
  }
}

export function storeConnectFourSaveV2(save: Omit<ConnectFourSaveV2, "version">, storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(CONNECT_FOUR_SAVE_KEY, serializeConnectFourSaveV2(save)); } catch { /* best-effort local active state */ }
}

export function clearConnectFourSaveV2(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(CONNECT_FOUR_SAVE_KEY); } catch { /* best-effort local active state */ }
}

export function clearLegacyConnectFourSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(LEGACY_CONNECT_FOUR_SAVE_KEY); } catch { /* best-effort local active state */ }
}

export type { ConnectFourCell };
