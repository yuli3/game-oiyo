import { replayWhack, type WhackAction, type WhackState } from "./whack-a-mole";

export const WHACK_SAVE_KEY = "oiyo:whack-a-mole-state:v1";
export interface WhackSaveV1 { version: 1; state: WhackState; savedAtEpochMs: number }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function parseWhackSave(raw: string | null, now = Date.now()): WhackSaveV1 | null {
  if (!raw || !Number.isFinite(now)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.version !== 1 || !object(value.state) || !Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) > now + 300_000 || now - (value.savedAtEpochMs as number) > 86_400_000) return null;
    const source = value.state;
    if (!Number.isInteger(source.seed) || !Array.isArray(source.history) || source.history.length > 1_000) return null;
    const history: WhackAction[] = [];
    for (const item of source.history) {
      if (!object(item) || (item.kind !== "advance" && item.kind !== "hit")) return null;
      if (item.kind === "advance" && Number.isInteger(item.elapsedMs) && (item.elapsedMs as number) >= 0 && (item.elapsedMs as number) <= 30_000) history.push({ kind: "advance", elapsedMs: item.elapsedMs as number });
      else if (item.kind === "hit" && Number.isInteger(item.index) && (item.index as number) >= 0 && (item.index as number) < 9) history.push({ kind: "hit", index: item.index as number });
      else return null;
    }
    const state = replayWhack(source.seed as number, history);
    if (!state || state.status !== "playing" || JSON.stringify(state) !== JSON.stringify(source)) return null;
    return { version: 1, state, savedAtEpochMs: value.savedAtEpochMs as number };
  } catch { return null; }
}

export function loadWhackSave(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage) { try { return storage ? parseWhackSave(storage.getItem(WHACK_SAVE_KEY), now) : null; } catch { return null; } }
export function storeWhackSave(state: WhackState, savedAtEpochMs = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage) { if (!storage || state.status !== "playing" || !state.history.length) return; try { storage.setItem(WHACK_SAVE_KEY, JSON.stringify({ version: 1, state, savedAtEpochMs })); } catch { /* best effort */ } }
export function clearWhackSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage) { try { storage?.removeItem(WHACK_SAVE_KEY); } catch { /* best effort */ } }
