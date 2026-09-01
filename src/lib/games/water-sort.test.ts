import { describe, expect, it } from "vitest";
import {
  WATER_SORT_CAPACITY,
  createWaterSort,
  generateWaterSortPuzzle,
  isWaterSortSolved,
  moveWaterSort,
  pourWater,
  pouredLayerCount,
  topGroupSize,
  legalWaterSortMoves,
  waterSortHint,
  isWaterSortDeadEnd,
  type WaterSortDifficulty,
} from "./water-sort";

describe("water sort engine", () => {
  it("generates deterministic, non-solved puzzles with a physical color multiset", () => {
    for (const difficulty of ["easy", "medium", "hard"] as WaterSortDifficulty[]) {
      const first = createWaterSort(0x12345678, difficulty);
      expect(createWaterSort(0x12345678, difficulty)).toEqual(first);
      expect(first.status).toBe("playing");
      const counts = new Array(5).fill(0);
      for (const color of first.tubes.flat()) counts[color] += 1;
      expect(counts).toEqual(new Array(5).fill(WATER_SORT_CAPACITY));
      expect(first.tubes.every((tube) => tube.length <= WATER_SORT_CAPACITY)).toBe(true);
    }
  });

  it("replays the generator's known legal solution to completion", () => {
    for (const difficulty of ["easy", "medium", "hard"] as WaterSortDifficulty[]) {
      const generated = generateWaterSortPuzzle(77, difficulty);
      let state = createWaterSort(77, difficulty);
      for (const move of generated.solution) {
        const next = moveWaterSort(state, move);
        expect(next).not.toBe(state);
        state = next;
      }
      expect(state.status).toBe("solved");
      expect(isWaterSortSolved(state.tubes)).toBe(true);
    }
  });

  it("pours the maximal contiguous top group up to destination capacity", () => {
    const tubes = [[0, 1, 1, 1], [1], [], [], [], [], []];
    expect(topGroupSize(tubes[0])).toBe(3);
    expect(pourWater(tubes, 0, 1)).toEqual([[0], [1, 1, 1, 1], [], [], [], [], []]);
    expect(tubes).toEqual([[0, 1, 1, 1], [1], [], [], [], [], []]);
  });

  it("counts only layers that landed in the destination tube", () => {
    const before = [[0, 1, 1, 1], [1], [], [], [], [], []];
    const after = pourWater(before, 0, 1);
    expect(after).not.toBeNull();
    expect(pouredLayerCount(before, after!, 1)).toBe(3);
    expect(pouredLayerCount(before, after!, 0)).toBe(0);
    expect(pouredLayerCount(before, after!, 2)).toBe(0);
    expect(pouredLayerCount(before, after!, -1)).toBe(0);
  });

  it("rejects mismatched, full, empty, same-tube, and out-of-range moves", () => {
    const tubes = [[0], [1], [2, 2, 2, 2], [], [], [], []];
    expect(pourWater(tubes, 0, 1)).toBeNull();
    expect(pourWater(tubes, 0, 2)).toBeNull();
    expect(pourWater(tubes, 3, 0)).toBeNull();
    expect(pourWater(tubes, 0, 0)).toBeNull();
    expect(pourWater(tubes, -1, 3)).toBeNull();
  });

  it("freezes a solved terminal state", () => {
    const state = { ...createWaterSort(5), tubes: [[0,0,0,0],[1,1,1,1],[2,2,2,2],[3,3,3,3],[4,4,4,4],[],[]], status: "solved" as const };
    expect(moveWaterSort(state, { from: 0, to: 5 })).toBe(state);
  });

  it("keeps invalid state transitions as identity no-ops", () => {
    const state = createWaterSort(9, "easy");
    const next = moveWaterSort(state, { from: -1, to: 99 });
    expect(next).toBe(state);
    expect(next.moves).toBe(0);
  });

  it("returns a deterministic legal hint that merges matching groups", () => {
    const tubes = [[0, 1], [1], [2,2,2,2], [3,3,3,3], [4,4,4,4], [0,0,0], []];
    const hint = waterSortHint(tubes);
    expect(hint).toEqual({ from: 0, to: 1 });
    expect(legalWaterSortMoves(tubes)).toContainEqual(hint);
    expect(waterSortHint(tubes)).toEqual(hint);
  });

  it("reports a dead end only when no legal move remains", () => {
    const dead = { ...createWaterSort(2), tubes: [[0,1,2,3],[1,2,3,4],[2,3,4,0],[3,4,0,1],[4,0,1,2],[0,1,2,3],[4,4,4,4]], status: "playing" as const };
    expect(legalWaterSortMoves(dead.tubes)).toHaveLength(0);
    expect(isWaterSortDeadEnd(dead)).toBe(true);
    expect(isWaterSortDeadEnd(createWaterSort(2))).toBe(false);
  });
});
