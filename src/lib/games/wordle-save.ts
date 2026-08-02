import { createWordle, inputWordle, submitWordle, type WordleMode, type WordleState } from "./wordle";
export const WORDLE_SAVE_KEY = "oiyo:wordle-state:v1";
export interface WordleSaveV1 { version: 1; state: WordleState; elapsedMs: number; savedAtEpochMs: number }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

function replayState(value: unknown): WordleState | null {
  if (!record(value) || !integer(value.seed, 0, 0xffff_ffff) || !integer(value.targetCount, 1, 100_000) || !integer(value.targetIndex, 0, (value.targetCount as number) - 1) || !["daily", "random"].includes(value.mode as string) || !(value.dateKey === null || typeof value.dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.dateKey)) || !Array.isArray(value.guesses) || value.guesses.length > 5 || typeof value.current !== "string" || !/^[A-Z]{0,5}$/.test(value.current) || value.status !== "playing") return null;
  if (value.mode === "daily" && value.dateKey === null || value.mode === "random" && value.dateKey !== null) return null;
  let replay = createWordle(value.seed as number, value.targetCount as number, value.mode as WordleMode, value.dateKey as string | null);
  for (const guess of value.guesses) { if (typeof guess !== "string" || !/^[A-Z]{5}$/.test(guess)) return null; for (const key of guess) replay = inputWordle(replay, key); replay = submitWordle(replay, guess === "AAAAA" ? "BBBBB" : "AAAAA", true); if (replay.status !== "playing") return null; }
  for (const key of value.current) replay = inputWordle(replay, key);
  return JSON.stringify(replay) === JSON.stringify(value) ? replay : null;
}
export function parseWordleSave(raw: string | null, nowEpochMs = Date.now()): WordleSaveV1 | null { if (!raw || !Number.isFinite(nowEpochMs)) return null; try { const value: unknown = JSON.parse(raw); if (!record(value) || value.version !== 1 || !integer(value.elapsedMs, 0, 86_400_000) || !integer(value.savedAtEpochMs, 0, nowEpochMs + 300_000) || nowEpochMs - (value.savedAtEpochMs as number) > 7 * 86_400_000) return null; const state = replayState(value.state); return state ? { version: 1, state, elapsedMs: value.elapsedMs as number, savedAtEpochMs: value.savedAtEpochMs as number } : null; } catch { return null; } }
export function loadWordleSave(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): WordleSaveV1 | null { try { return storage ? parseWordleSave(storage.getItem(WORDLE_SAVE_KEY), now) : null; } catch { return null; } }
export function storeWordleSave(state: WordleState, elapsedMs: number, savedAtEpochMs = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void { if (!storage || state.status !== "playing") return; try { storage.setItem(WORDLE_SAVE_KEY, JSON.stringify({ version: 1, state, elapsedMs: Math.max(0, Math.floor(elapsedMs)), savedAtEpochMs })); } catch { /* best effort */ } }
export function clearWordleSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void { try { storage?.removeItem(WORDLE_SAVE_KEY); } catch { /* best effort */ } }
