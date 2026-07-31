import {
  MINESWEEPER_DIFFICULTIES,
  isMinesweeperWon,
  type MinesweeperBoard,
  type MinesweeperDifficultyId,
} from "./minesweeper";

export const MINESWEEPER_SAVE_KEY = "oiyo:minesweeper-state:v1";

export type MinesweeperMode = "daily" | MinesweeperDifficultyId;
export type MinesweeperGenerationStrategy = "pending" | "verified" | "safe-fallback";

export interface MinesweeperSave {
  version: 1;
  board: MinesweeperBoard;
  mode: MinesweeperMode;
  dailyDate: string;
  generationSeed: number;
  generationStrategy: MinesweeperGenerationStrategy;
  firstClick: boolean;
  hasStarted: boolean;
  elapsedMs: number;
  savedAtEpochMs: number;
  flagMode: boolean;
  activeCell: number;
  assist: "none" | "hint";
}

type MinesweeperStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function validCivilDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function difficultyFor(mode: MinesweeperMode): MinesweeperDifficultyId {
  return mode === "daily" ? "intermediate" : mode;
}

function parseBoard(value: unknown, mode: MinesweeperMode, firstClick: boolean, strategy: MinesweeperGenerationStrategy): MinesweeperBoard | null {
  if (!Array.isArray(value)) return null;
  const difficulty = MINESWEEPER_DIFFICULTIES[difficultyFor(mode)];
  if (value.length !== difficulty.height) return null;
  const board: MinesweeperBoard = [];
  for (let y = 0; y < difficulty.height; y++) {
    const sourceRow = value[y];
    if (!Array.isArray(sourceRow) || sourceRow.length !== difficulty.width) return null;
    const row = [];
    for (let x = 0; x < difficulty.width; x++) {
      const cell = sourceRow[x];
      if (!isRecord(cell) || cell.x !== x || cell.y !== y || typeof cell.isMine !== "boolean" ||
        typeof cell.isRevealed !== "boolean" || typeof cell.isFlagged !== "boolean" ||
        !Number.isInteger(cell.neighborMines) || (cell.neighborMines as number) < 0 || (cell.neighborMines as number) > 8 ||
        cell.isRevealed && cell.isFlagged) return null;
      row.push({
        x, y,
        isMine: cell.isMine,
        isRevealed: cell.isRevealed,
        isFlagged: cell.isFlagged,
        neighborMines: cell.neighborMines as number,
      });
    }
    board.push(row);
  }

  const cells = board.flat();
  const pending = strategy === "pending";
  if (pending !== firstClick || mode === "daily" && pending) return null;
  if (pending) {
    if (cells.some((cell) => cell.isMine || cell.isRevealed || cell.neighborMines !== 0)) return null;
  } else {
    if (cells.filter((cell) => cell.isMine).length !== difficulty.mineCount) return null;
    for (const cell of cells) {
      if (cell.isMine) {
        if (cell.isRevealed) return null;
        continue;
      }
      let adjacent = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx !== 0 || dy !== 0) && board[cell.y + dy]?.[cell.x + dx]?.isMine) adjacent++;
      }
      if (cell.neighborMines !== adjacent) return null;
    }
    if (isMinesweeperWon(board)) return null;
  }
  if (cells.filter((cell) => cell.isFlagged).length > difficulty.mineCount) return null;
  return board;
}

export function parseMinesweeperSave(raw: string | null, expectedDailyDate: string, nowEpochMs = Date.now()): MinesweeperSave | null {
  if (!raw || !validCivilDate(expectedDailyDate) || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1) return null;
    const mode = value.mode;
    if (mode !== "daily" && mode !== "beginner" && mode !== "intermediate" && mode !== "expert") return null;
    if (!validCivilDate(value.dailyDate) || mode === "daily" && value.dailyDate !== expectedDailyDate) return null;
    if (!Number.isInteger(value.generationSeed) || (value.generationSeed as number) < -0x8000_0000 || (value.generationSeed as number) > 0x7fff_ffff) return null;
    if (value.generationStrategy !== "pending" && value.generationStrategy !== "verified" && value.generationStrategy !== "safe-fallback") return null;
    if (typeof value.firstClick !== "boolean" || typeof value.hasStarted !== "boolean" || typeof value.flagMode !== "boolean") return null;
    if (value.assist !== "none" && value.assist !== "hint") return null;
    if (!Number.isFinite(value.elapsedMs) || (value.elapsedMs as number) < 0 || !Number.isInteger(value.elapsedMs)) return null;
    if (!Number.isFinite(value.savedAtEpochMs) || !Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 || (value.savedAtEpochMs as number) > nowEpochMs + 300_000) return null;
    if (!value.hasStarted && value.elapsedMs !== 0) return null;
    const difficulty = MINESWEEPER_DIFFICULTIES[difficultyFor(mode)];
    if (!Number.isInteger(value.activeCell) || (value.activeCell as number) < 0 || (value.activeCell as number) >= difficulty.width * difficulty.height) return null;
    const board = parseBoard(value.board, mode, value.firstClick, value.generationStrategy);
    if (!board) return null;
    return {
      version: 1,
      board,
      mode,
      dailyDate: value.dailyDate,
      generationSeed: value.generationSeed as number,
      generationStrategy: value.generationStrategy,
      firstClick: value.firstClick,
      hasStarted: value.hasStarted,
      elapsedMs: value.elapsedMs as number,
      savedAtEpochMs: value.savedAtEpochMs as number,
      flagMode: value.flagMode,
      activeCell: value.activeCell as number,
      assist: value.assist,
    };
  } catch {
    return null;
  }
}

export function serializeMinesweeperSave(save: Omit<MinesweeperSave, "version">): string {
  return JSON.stringify({ version: 1, ...save });
}

export function loadMinesweeperSave(expectedDailyDate: string, nowEpochMs = Date.now(), storage: MinesweeperStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): MinesweeperSave | null {
  if (!storage) return null;
  try { return parseMinesweeperSave(storage.getItem(MINESWEEPER_SAVE_KEY), expectedDailyDate, nowEpochMs); } catch { return null; }
}

export function storeMinesweeperSave(save: Omit<MinesweeperSave, "version">, storage: MinesweeperStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(MINESWEEPER_SAVE_KEY, serializeMinesweeperSave(save)); } catch { /* best-effort local active state */ }
}

export function clearMinesweeperSave(storage: MinesweeperStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(MINESWEEPER_SAVE_KEY); } catch { /* best-effort local active state */ }
}
