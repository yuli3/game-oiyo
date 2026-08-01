import { isValidSnakeState, type SnakeState } from "./snake";

export const SNAKE_SAVE_KEY = "oiyo:snake-state:v1";

export interface SnakeSaveV1 {
  version: 1;
  state: SnakeState;
  savedAtEpochMs: number;
}

type SnakeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parseSnakeSave(raw: string | null, nowEpochMs = Date.now()): SnakeSaveV1 | null {
  if (!raw || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as Partial<SnakeSaveV1>;
    const savedAtEpochMs = candidate.savedAtEpochMs;
    if (candidate.version !== 1 || !Number.isInteger(savedAtEpochMs) || savedAtEpochMs! < 0 || savedAtEpochMs! > nowEpochMs + 300_000) return null;
    if (!isValidSnakeState(candidate.state)) return null;
    return {
      version: 1,
      state: {
        ...candidate.state,
        snake: candidate.state.snake.map((point) => ({ ...point })),
        food: { ...candidate.state.food },
        direction: candidate.state.direction ? { ...candidate.state.direction } : null,
      },
      savedAtEpochMs: savedAtEpochMs!,
    };
  } catch {
    return null;
  }
}

export function loadSnakeSave(nowEpochMs = Date.now(), storage: SnakeStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): SnakeSaveV1 | null {
  if (!storage) return null;
  try { return parseSnakeSave(storage.getItem(SNAKE_SAVE_KEY), nowEpochMs); } catch { return null; }
}

export function storeSnakeSave(state: SnakeState, nowEpochMs = Date.now(), storage: SnakeStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage || !isValidSnakeState(state) || !Number.isInteger(nowEpochMs) || nowEpochMs < 0) return;
  try { storage.setItem(SNAKE_SAVE_KEY, JSON.stringify({ version: 1, state, savedAtEpochMs: nowEpochMs })); } catch { /* best-effort */ }
}

export function clearSnakeSave(storage: SnakeStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(SNAKE_SAVE_KEY); } catch { /* best-effort */ }
}
