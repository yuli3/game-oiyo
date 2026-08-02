import { describe, expect, it } from "vitest";
import { createMemoryGame, flipMemoryCard, memoryPairCount, resolveMemoryPair, type MemoryState } from "./memory-card-game";

function pair(state: MemoryState, symbolId: number) { return state.cards.filter((card) => card.symbolId === symbolId).map((card) => card.id); }
describe("memory card engine", () => {
  it("builds deterministic grids with exactly two of every symbol", () => {
    for (const size of ["4x4", "6x4", "6x6"] as const) { const a = createMemoryGame(42, size); expect(a).toEqual(createMemoryGame(42, size)); expect(a.cards).toHaveLength(memoryPairCount(a) * 2); expect([...new Set(a.cards.map((card) => card.symbolId))]).toHaveLength(a.cards.length / 2); for (const id of new Set(a.cards.map((card) => card.symbolId))) expect(pair(a, id)).toHaveLength(2); }
  });
  it("flips immutably and rejects duplicate, missing, and third cards", () => {
    const initial = createMemoryGame(7, "4x4"); const first = flipMemoryCard(initial, 0); expect(first.cards[0].isFlipped).toBe(true); expect(initial.cards[0].isFlipped).toBe(false); expect(flipMemoryCard(first, 0)).toBe(first); expect(flipMemoryCard(first, -1)).toBe(first); const second = flipMemoryCard(first, 1); expect(flipMemoryCard(second, 2)).toBe(second);
  });
  it("turns a mismatch back over and permanently marks a pair", () => {
    let state = createMemoryGame(11, "4x4"); const first = state.cards[0]; const mismatch = state.cards.find((card) => card.symbolId !== first.symbolId)!; state = resolveMemoryPair(flipMemoryCard(flipMemoryCard(state, first.id), mismatch.id)); expect(state.matchedPairs).toBe(0); expect(state.cards[first.id].isFlipped).toBe(false);
    const ids = pair(state, first.symbolId); state = resolveMemoryPair(flipMemoryCard(flipMemoryCard(state, ids[0]), ids[1])); expect(state.matchedPairs).toBe(1); expect(state.cards[ids[0]].isMatched).toBe(true); expect(flipMemoryCard(state, ids[0])).toBe(state);
  });
  it("reaches terminal won after every pair and freezes input", () => {
    let state = createMemoryGame(19, "4x4"); for (let symbol = 0; symbol < 8; symbol += 1) { const ids = pair(state, symbol); state = resolveMemoryPair(flipMemoryCard(flipMemoryCard(state, ids[0]), ids[1])); } expect(state.status).toBe("won"); expect(state.matchedPairs).toBe(8); expect(flipMemoryCard(state, 0)).toBe(state); expect(resolveMemoryPair(state)).toBe(state);
  });
});
