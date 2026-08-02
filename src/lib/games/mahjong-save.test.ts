import { describe, expect, it } from "vitest";
import { createMahjong, discardMahjong, drawMahjong } from "./mahjong";
import { clearMahjongSave, loadMahjongSave, parseMahjongSave, storeMahjongSave } from "./mahjong-save";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

describe("mahjong save", () => {
  it("round-trips a nonterminal deterministic decision state as a clone", () => {
    const storage = new MemoryStorage();
    const state = drawMahjong(createMahjong(44));
    storeMahjongSave(state, 3, 1_000, storage);
    const loaded = loadMahjongSave(1_000, storage);
    expect(loaded).toEqual({ version: 1, state, level: 3, savedAtEpochMs: 1_000 });
    expect(loaded?.state).not.toBe(state);
  });

  it("accepts a valid draw state after a discard", () => {
    const state = discardMahjong(drawMahjong(createMahjong(9)), 0);
    expect(parseMahjongSave(JSON.stringify({ version: 1, state, level: 2, savedAtEpochMs: 10 }), 10)?.state).toEqual(state);
  });

  it("rejects terminal, future, physical-copy, accounting, and phase corruption", () => {
    const state = drawMahjong(createMahjong(5));
    const wrap = (next: unknown, savedAtEpochMs = 10) => JSON.stringify({ version: 1, state: next, level: 2, savedAtEpochMs });
    expect(parseMahjongSave(wrap({ ...state, phase: "over", winner: -1 }), 10)).toBeNull();
    expect(parseMahjongSave(wrap(state, 400_011), 10)).toBeNull();
    expect(parseMahjongSave(wrap({ ...state, wall: state.wall.map(() => 0) }), 10)).toBeNull();
    expect(parseMahjongSave(wrap({ ...state, hands: state.hands.map((hand, seat) => seat ? hand : hand.slice(1)) }), 10)).toBeNull();
    expect(parseMahjongSave(wrap({ ...state, drawn: null }), 10)).toBeNull();
  });

  it("clears only its own key", () => {
    const storage = new MemoryStorage();
    storage.setItem("other", "keep");
    storeMahjongSave(createMahjong(1), 1, 1, storage);
    clearMahjongSave(storage);
    expect(storage.getItem("other")).toBe("keep");
  });
});
