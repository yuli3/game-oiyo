import { chessDrawReason, chessLegalStateMoves, chessPositionKey, type ChessState } from "./ai/chess";

export const CHESS_SAVE_KEY = "oiyo:chess-state:v1";
const VERSION = 1;
const PIECES = new Set("prnbqkPRNBQK".split(""));

export type ChessSave = {
  version: 1;
  state: ChessState;
  positionHistory: string[];
  mode: "local" | "ai";
  level: 1 | 2 | 3;
};

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

/** Parse an untrusted browser value without mutating any game or storage state. */
export function parseChessSave(raw: string | null): ChessSave | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ChessSave>;
    if (value.version !== VERSION || !isChessState(value.state)) return null;
    if (!Array.isArray(value.positionHistory) || value.positionHistory.length < 1 || value.positionHistory.length > 512
      || value.positionHistory.some((key) => typeof key !== "string" || key.length < 10 || key.length > 100)) return null;
    if (value.positionHistory.at(-1) !== chessPositionKey(value.state)) return null;
    if (value.mode !== "local" && value.mode !== "ai") return null;
    if (value.level !== 1 && value.level !== 2 && value.level !== 3) return null;
    // The component stores only resumable positions and clears terminal games.
    // Reject stale or tampered terminal saves so a restored AI turn cannot stall.
    if (chessLegalStateMoves(value.state).length === 0 || chessDrawReason(value.state, value.positionHistory)) return null;
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
  try { return parseChessSave(storage.getItem(CHESS_SAVE_KEY)); } catch { return null; }
}

export function storeChessSave(save: Omit<ChessSave, "version">, storage: ChessStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(CHESS_SAVE_KEY, serializeChessSave(save)); } catch { /* quota/private mode: active game saving is best-effort */ }
}

export function clearChessSave(storage: ChessStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(CHESS_SAVE_KEY); } catch { /* private mode: ignore */ }
}
