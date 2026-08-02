import { describe, expect, it } from "vitest";
import { createMemoryGame, flipMemoryCard, resolveMemoryPair } from "./memory-card-game";
import { parseMemoryCardSave } from "./memory-card-game-save";

const now = 2_000_000_000_000;
const raw = (state: ReturnType<typeof createMemoryGame>, extra = {}) => JSON.stringify({ version: 1, state, elapsedMs: 1234, savedAtEpochMs: now, ...extra });
describe("memory card save", () => {
  it("round trips replay-valid active progress", () => { let state = createMemoryGame(42, "4x4"); const ids = state.cards.filter((card) => card.symbolId === 0).map((card) => card.id); state = resolveMemoryPair(flipMemoryCard(flipMemoryCard(state, ids[0]), ids[1])); expect(parseMemoryCardSave(raw(state), now)?.state).toEqual(state); });
  it("restores a single open card", () => { const state = flipMemoryCard(createMemoryGame(7, "6x4"), 3); expect(parseMemoryCardSave(raw(state), now)?.state.flipped).toEqual([3]); });
  it("rejects forged layouts, counters, two-open and terminal states", () => { const base = createMemoryGame(1, "4x4"); expect(parseMemoryCardSave(raw({ ...base, flips: 9 }), now)).toBeNull(); expect(parseMemoryCardSave(raw({ ...base, cards: base.cards.map((c, i) => i ? c : { ...c, symbolId: 7 }) }), now)).toBeNull(); let two = flipMemoryCard(flipMemoryCard(base, 0), 1); expect(parseMemoryCardSave(raw(two), now)).toBeNull(); expect(parseMemoryCardSave(raw({ ...base, status: "won" }), now)).toBeNull(); });
  it("rejects malformed, future, and expired payloads", () => { expect(parseMemoryCardSave("{}", now)).toBeNull(); expect(parseMemoryCardSave(raw(createMemoryGame(1, "4x4"), { savedAtEpochMs: now + 400_000 }), now)).toBeNull(); expect(parseMemoryCardSave(raw(createMemoryGame(1, "4x4"), { savedAtEpochMs: now - 8 * 86_400_000 }), now)).toBeNull(); });
});
