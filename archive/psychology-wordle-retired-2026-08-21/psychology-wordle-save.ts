import { createPsychologyWordle, inputPsychologyWordle, submitPsychologyWordle, type PsychologyWordleLocale, type PsychologyWordleState } from "./psychology-wordle";

export const PSYCHOLOGY_WORDLE_SAVE_KEY = "oiyo:psychology-wordle-state:v1";
export type PsychologyWordleMode = "daily" | "random";
export interface PsychologyWordleSaveV1 { version: 1; state: PsychologyWordleState; mode: PsychologyWordleMode; dateKey: string | null; savedAtEpochMs: number }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const dateKey = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

function parseState(value: unknown): PsychologyWordleState | null {
  if (!record(value) || !integer(value.seed, 0, 0xffff_ffff) || !integer(value.rngState, 0, 0xffff_ffff) ||
    !["ko", "latin"].includes(value.locale as string) || typeof value.targetDisplay !== "string" || !Array.isArray(value.target) ||
    !Array.isArray(value.guesses) || !Array.isArray(value.currentGuess) || value.status !== "playing") return null;
  const initial = createPsychologyWordle(value.seed as number, value.locale as PsychologyWordleLocale);
  if (initial.rngState !== value.rngState || initial.targetDisplay !== value.targetDisplay || JSON.stringify(initial.target) !== JSON.stringify(value.target)) return null;
  let replay = initial;
  for (const guess of value.guesses) {
    if (!Array.isArray(guess) || guess.length !== initial.target.length || !guess.every((symbol) => typeof symbol === "string" && symbol.length > 0 && symbol.length <= 2)) return null;
    for (const symbol of guess) replay = inputPsychologyWordle(replay, symbol);
    replay = submitPsychologyWordle(replay);
    if (replay.status !== "playing") return null;
  }
  if (value.currentGuess.length > initial.target.length || !value.currentGuess.every((symbol) => typeof symbol === "string" && symbol.length > 0 && symbol.length <= 2)) return null;
  for (const symbol of value.currentGuess) replay = inputPsychologyWordle(replay, symbol as string);
  return replay;
}

export function parsePsychologyWordleSave(raw: string | null, nowEpochMs = Date.now()): PsychologyWordleSaveV1 | null {
  if (!raw || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || !["daily", "random"].includes(value.mode as string) ||
      !integer(value.savedAtEpochMs, 0, nowEpochMs + 300_000) || nowEpochMs - (value.savedAtEpochMs as number) > 7 * 24 * 60 * 60 * 1_000) return null;
    if (value.mode === "daily" ? !dateKey(value.dateKey) : value.dateKey !== null) return null;
    const state = parseState(value.state); if (!state) return null;
    return { version: 1, state, mode: value.mode as PsychologyWordleMode, dateKey: value.dateKey as string | null, savedAtEpochMs: value.savedAtEpochMs as number };
  } catch { return null; }
}

export function loadPsychologyWordleSave(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): PsychologyWordleSaveV1 | null {
  if (!storage) return null;
  try { return parsePsychologyWordleSave(storage.getItem(PSYCHOLOGY_WORDLE_SAVE_KEY), now); } catch { return null; }
}
export function storePsychologyWordleSave(state: PsychologyWordleState, mode: PsychologyWordleMode, activeDateKey: string | null, savedAtEpochMs = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage || state.status !== "playing") return;
  try { storage.setItem(PSYCHOLOGY_WORDLE_SAVE_KEY, JSON.stringify({ version: 1, state, mode, dateKey: mode === "daily" ? activeDateKey : null, savedAtEpochMs })); } catch { /* best effort */ }
}
export function clearPsychologyWordleSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void { try { storage?.removeItem(PSYCHOLOGY_WORDLE_SAVE_KEY); } catch { /* best effort */ } }
