import { replayBlackjack, type BlackjackAction, type BlackjackState } from "./blackjack";
export const BLACKJACK_SAVE_KEY = "oiyo:blackjack-state:v1";
export interface BlackjackSaveV1 { version: 1; state: BlackjackState; savedAtEpochMs: number }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export function parseBlackjackSave(raw: string | null, now = Date.now()): BlackjackSaveV1 | null {
  if (!raw || !Number.isFinite(now)) return null;
  try {
    const value: unknown = JSON.parse(raw); if (!object(value) || value.version !== 1 || !object(value.state) || !Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) > now + 300_000 || now - (value.savedAtEpochMs as number) > 7 * 86_400_000) return null;
    if (!Number.isInteger(value.state.seed) || !Array.isArray(value.state.actions) || value.state.actions.length > 48 || value.state.actions.some(action => action !== "hit" && action !== "stand")) return null;
    const state = replayBlackjack(value.state.seed as number, value.state.actions as BlackjackAction[]);
    if (!state || state.status !== "playing" || JSON.stringify(state) !== JSON.stringify(value.state)) return null;
    return { version: 1, state, savedAtEpochMs: value.savedAtEpochMs as number };
  } catch { return null; }
}
export function loadBlackjackSave(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage) { try { return storage ? parseBlackjackSave(storage.getItem(BLACKJACK_SAVE_KEY), now) : null; } catch { return null; } }
export function storeBlackjackSave(state: BlackjackState, savedAtEpochMs = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage) { if (!storage || state.status !== "playing") return; try { storage.setItem(BLACKJACK_SAVE_KEY, JSON.stringify({ version: 1, state, savedAtEpochMs })); } catch { /* best effort */ } }
export function clearBlackjackSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage) { try { storage?.removeItem(BLACKJACK_SAVE_KEY); } catch { /* best effort */ } }
