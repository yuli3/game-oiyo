import { chessDrawReason, chessLegalStateMoves, chessPositionKey, type ChessState } from "./ai/chess";

export const CHESS_SAVE_KEY = "oiyo:chess-state:v2";
export const LEGACY_CHESS_SAVE_KEY = "oiyo:chess-state:v1";
const VERSION = 2;
const PIECES = new Set("prnbqkPRNBQK".split(""));

export type ChessMoveRecord = { notation: string; captured: string | null; white: boolean };

export type ChessSave = {
  version: 2;
  state: ChessState;
  positionHistory: string[];
  mode: "local" | "ai";
  level: 1 | 2 | 3;
  moveHistory: ChessMoveRecord[];
  orientation: "white" | "black";
};

type LegacyChessSave = Omit<ChessSave, "version" | "moveHistory" | "orientation"> & { version: 1 };

function isCoordinate(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2
    && value.every((part) => Number.isInteger(part) && part >= 0 && part < 8);
}

function isChessState(value: unknown): value is ChessState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<ChessState>;
  if (!Array.isArray(state.board) || state.board.length !== 8
    || state.board.some((row) => !Array.isArray(row) || row.length !== 8
      || row.some((piece) => piece !== null && (typeof piece !== "string" || !PIECES.has(piece))))) return false;
  const pieces = state.board.flat();
  if (pieces.filter((piece) => piece === "K").length !== 1 || pieces.filter((piece) => piece === "k").length !== 1) return false;
  const castling = state.castling as Record<string, unknown> | undefined;
  if (!castling || ["K", "Q", "k", "q"].some((key) => typeof castling[key] !== "boolean")) return false;
  return typeof state.whiteToMove === "boolean"
    && (state.enPassant === null || isCoordinate(state.enPassant))
    && Number.isInteger(state.halfmoveClock) && state.halfmoveClock! >= 0
    && Number.isInteger(state.fullmoveNumber) && state.fullmoveNumber! >= 1;
}

function hasValidBase(value: Partial<ChessSave | LegacyChessSave>): value is Partial<ChessSave | LegacyChessSave> & Pick<ChessSave, "state" | "positionHistory" | "mode" | "level"> {
  if (!isChessState(value.state)) return false;
  if (!Array.isArray(value.positionHistory) || value.positionHistory.length < 1 || value.positionHistory.length > 512
    || value.positionHistory.some((key) => typeof key !== "string" || key.length < 10 || key.length > 100)) return false;
  if (value.positionHistory.at(-1) !== chessPositionKey(value.state)) return false;
  if (value.mode !== "local" && value.mode !== "ai") return false;
  if (value.level !== 1 && value.level !== 2 && value.level !== 3) return false;
  return chessLegalStateMoves(value.state).length > 0 && !chessDrawReason(value.state, value.positionHistory);
}

function isMoveHistory(value: unknown): value is ChessMoveRecord[] {
  return Array.isArray(value) && value.length <= 512 && value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const move = entry as Partial<ChessMoveRecord>;
    return typeof move.notation === "string" && move.notation.length >= 2 && move.notation.length <= 16
      && (move.captured === null || (typeof move.captured === "string" && PIECES.has(move.captured)))
      && typeof move.white === "boolean";
  });
}

/** Parse an untrusted current or legacy browser value into the v2 runtime shape. */
export function parseChessSave(raw: string | null): ChessSave | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ChessSave | LegacyChessSave>;
    if (!hasValidBase(value)) return null;
    if (value.version === 1) return { ...value, version: 2, moveHistory: [], orientation: "white" };
    if (value.version !== VERSION || !isMoveHistory(value.moveHistory)
      || (value.orientation !== "white" && value.orientation !== "black")) return null;
    return value as ChessSave;
  } catch {
    return null;
  }
}

export function serializeChessSave(save: Omit<ChessSave, "version">): string {
  return JSON.stringify({ version: VERSION, ...save } satisfies ChessSave);
}

type ChessStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function loadChessSave(storage: ChessStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): ChessSave | null {
  if (!storage) return null;
  try {
    const current = parseChessSave(storage.getItem(CHESS_SAVE_KEY));
    if (current) return current;
    const migrated = parseChessSave(storage.getItem(LEGACY_CHESS_SAVE_KEY));
    if (migrated) storage.setItem(CHESS_SAVE_KEY, serializeChessSave(migrated));
    return migrated;
  } catch { return null; }
}

export function storeChessSave(save: Omit<ChessSave, "version">, storage: ChessStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(CHESS_SAVE_KEY, serializeChessSave(save)); } catch { /* quota/private mode: active game saving is best-effort */ }
}

export function clearChessSave(storage: ChessStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try {
    storage.removeItem(CHESS_SAVE_KEY);
    storage.removeItem(LEGACY_CHESS_SAVE_KEY);
  } catch { /* private mode: ignore */ }
}
