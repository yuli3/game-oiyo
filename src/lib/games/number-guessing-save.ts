import { createNumberGuessingGame, guessNumber, type NumberGuessingDifficulty, type NumberGuessingState } from "./number-guessing";

export const NUMBER_GUESSING_SAVE_KEY = "oiyo:number-guessing-state:v1";
export interface NumberGuessingSaveV1 { version: 1; state: NumberGuessingState; elapsedMs: number; assisted: boolean; savedAtEpochMs: number }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

function replayState(value: unknown): NumberGuessingState | null {
  if (!record(value) || !integer(value.seed, 0, 0xffff_ffff) || !["easy", "normal", "hard"].includes(value.difficulty as string) || !Array.isArray(value.attempts) || value.status !== "playing") return null;
  let replay = createNumberGuessingGame(value.seed as number, value.difficulty as NumberGuessingDifficulty);
  for (const attempt of value.attempts) {
    if (!record(attempt) || !integer(attempt.guess, replay.min, replay.max)) return null;
    const next = guessNumber(replay, attempt.guess as number);
    if (next === replay || next.status !== "playing") return null;
    replay = next;
  }
  return JSON.stringify(replay) === JSON.stringify(value) ? replay : null;
}

export function parseNumberGuessingSave(raw: string | null, nowEpochMs = Date.now()): NumberGuessingSaveV1 | null {
  if (!raw || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || !integer(value.elapsedMs, 0, 86_400_000) || typeof value.assisted !== "boolean" || !integer(value.savedAtEpochMs, 0, nowEpochMs + 300_000) || nowEpochMs - (value.savedAtEpochMs as number) > 7 * 86_400_000) return null;
    const state = replayState(value.state);
    return state ? { version: 1, state, elapsedMs: value.elapsedMs as number, assisted: value.assisted as boolean, savedAtEpochMs: value.savedAtEpochMs as number } : null;
  } catch { return null; }
}

export function loadNumberGuessingSave(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): NumberGuessingSaveV1 | null { try { return storage ? parseNumberGuessingSave(storage.getItem(NUMBER_GUESSING_SAVE_KEY), now) : null; } catch { return null; } }
export function storeNumberGuessingSave(state: NumberGuessingState, elapsedMs: number, assisted: boolean, savedAtEpochMs = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void { if (!storage || state.status !== "playing") return; try { storage.setItem(NUMBER_GUESSING_SAVE_KEY, JSON.stringify({ version: 1, state, elapsedMs: Math.max(0, Math.floor(elapsedMs)), assisted, savedAtEpochMs })); } catch { /* best effort */ } }
export function clearNumberGuessingSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void { try { storage?.removeItem(NUMBER_GUESSING_SAVE_KEY); } catch { /* best effort */ } }
