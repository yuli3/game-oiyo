import { createMemoryGame, flipMemoryCard, resolveMemoryPair, type MemoryGridSize, type MemoryState } from "./memory-card-game";

export const MEMORY_CARD_SAVE_KEY = "oiyo:memory-card-game-state:v1";
export interface MemoryCardSaveV1 { version: 1; state: MemoryState; elapsedMs: number; savedAtEpochMs: number }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

function replayState(value: unknown): MemoryState | null {
  if (!record(value) || !integer(value.seed, 0, 0xffff_ffff) || !integer(value.rngState, 0, 0xffff_ffff) ||
    !["4x4", "6x4", "6x6"].includes(value.gridSize as string) || !Array.isArray(value.cards) || !Array.isArray(value.flipped) ||
    !integer(value.flips, 0, 1_000_000) || !integer(value.matchedPairs, 0, 18) || value.status !== "playing" || value.flipped.length > 1) return null;
  let replay = createMemoryGame(value.seed as number, value.gridSize as MemoryGridSize);
  if (replay.rngState !== value.rngState || value.cards.length !== replay.cards.length) return null;
  const matchedSymbols = new Set<number>();
  for (const card of value.cards) {
    if (!record(card) || !integer(card.id, 0, replay.cards.length - 1) || !integer(card.symbolId, 0, replay.cards.length / 2 - 1) ||
      typeof card.isFlipped !== "boolean" || typeof card.isMatched !== "boolean" || replay.cards[card.id].symbolId !== card.symbolId) return null;
    if (card.isMatched) matchedSymbols.add(card.symbolId as number);
  }
  for (const symbol of matchedSymbols) {
    const ids = replay.cards.filter((card) => card.symbolId === symbol).map((card) => card.id);
    replay = resolveMemoryPair(flipMemoryCard(flipMemoryCard(replay, ids[0]), ids[1]));
  }
  const open = value.flipped[0]; if (open !== undefined) replay = flipMemoryCard(replay, open);
  const minimumFlips = replay.flips;
  if ((value.flips as number) < minimumFlips || ((value.flips as number) - minimumFlips) % 2 !== 0 || replay.matchedPairs !== value.matchedPairs) return null;
  const restored = { ...replay, flips: value.flips as number };
  if (JSON.stringify(restored) !== JSON.stringify(value)) return null;
  return restored;
}

export function parseMemoryCardSave(raw: string | null, nowEpochMs = Date.now()): MemoryCardSaveV1 | null {
  if (!raw || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || !integer(value.elapsedMs, 0, 86_400_000) || !integer(value.savedAtEpochMs, 0, nowEpochMs + 300_000) || nowEpochMs - (value.savedAtEpochMs as number) > 7 * 86_400_000) return null;
    const state = replayState(value.state); return state ? { version: 1, state, elapsedMs: value.elapsedMs as number, savedAtEpochMs: value.savedAtEpochMs as number } : null;
  } catch { return null; }
}
export function loadMemoryCardSave(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): MemoryCardSaveV1 | null { try { return storage ? parseMemoryCardSave(storage.getItem(MEMORY_CARD_SAVE_KEY), now) : null; } catch { return null; } }
export function storeMemoryCardSave(state: MemoryState, elapsedMs: number, savedAtEpochMs = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void { if (!storage || state.status !== "playing" || state.flipped.length > 1) return; try { storage.setItem(MEMORY_CARD_SAVE_KEY, JSON.stringify({ version: 1, state, elapsedMs: Math.max(0, Math.floor(elapsedMs)), savedAtEpochMs })); } catch { /* best effort */ } }
export function clearMemoryCardSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void { try { storage?.removeItem(MEMORY_CARD_SAVE_KEY); } catch { /* best effort */ } }
