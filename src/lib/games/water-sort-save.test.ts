import { describe, expect, it } from "vitest";
import { createWaterSort, legalWaterSortMoves, moveWaterSort } from "./water-sort";
import { clearWaterSortSave, loadWaterSortSave, parseWaterSortSave, storeWaterSortSave } from "./water-sort-save";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

function progress() {
  const initial = createWaterSort(77, "medium");
  const first = moveWaterSort(initial, legalWaterSortMoves(initial.tubes)[0]);
  const second = moveWaterSort(first, legalWaterSortMoves(first.tubes)[0]);
  return { initial, first, second };
}

describe("water sort save", () => {
  it("round-trips a validated state and executable undo chain as clones", () => {
    const storage = new MemoryStorage(); const { initial, first, second } = progress();
    storeWaterSortSave(second, [initial, first], 12, "hint", 1_000, storage);
    const loaded = loadWaterSortSave(1_000, storage);
    expect(loaded).toEqual({ version: 1, state: second, undo: [initial, first], elapsedSeconds: 12, assist: "hint", savedAtEpochMs: 1_000 });
    expect(loaded?.state).not.toBe(second);
  });

  it("rejects future/stale, color-count, seed contract, terminal, and forged undo transitions", () => {
    const { initial, first, second } = progress();
    const wrap = (state: unknown, undo: unknown[] = [initial, first], savedAtEpochMs = 10) => JSON.stringify({ version: 1, state, undo, elapsedSeconds: 12, assist: "none", savedAtEpochMs });
    expect(parseWaterSortSave(wrap(second, undefined, 300_011), 10)).toBeNull();
    expect(parseWaterSortSave(wrap(second, undefined, 10), 8 * 24 * 60 * 60 * 1_000)).toBeNull();
    expect(parseWaterSortSave(wrap({ ...second, tubes: second.tubes.map((tube, index) => index ? tube : tube.slice(1)) }), 10)).toBeNull();
    expect(parseWaterSortSave(wrap({ ...second, rngState: second.rngState + 1 }), 10)).toBeNull();
    expect(parseWaterSortSave(wrap({ ...second, status: "solved" }), 10)).toBeNull();
    expect(parseWaterSortSave(wrap(second, [first, initial]), 10)).toBeNull();
    expect(parseWaterSortSave(JSON.stringify({ ...JSON.parse(wrap(second)), assist: "solver" }), 10)).toBeNull();
    expect(parseWaterSortSave(JSON.stringify({ ...JSON.parse(wrap(second)), elapsedSeconds: -1 }), 10)).toBeNull();
  });

  it("caps stored undo history and clears only its own key", () => {
    const storage = new MemoryStorage(); const { initial } = progress();
    storage.setItem("other", "keep");
    storeWaterSortSave(initial, new Array(60).fill(initial), 0, "none", 1, storage);
    expect(JSON.parse(storage.getItem("oiyo:water-sort-state:v1")!).undo).toHaveLength(50);
    clearWaterSortSave(storage);
    expect(storage.getItem("other")).toBe("keep");
  });
});
