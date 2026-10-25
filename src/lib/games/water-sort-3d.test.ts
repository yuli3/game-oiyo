import { describe, it, expect } from "vitest";
import {
  initWaterSort,
  canPour,
  pourLiquid,
  selectTube,
  checkVictory,
  undoMove,
  type Tube,
} from "./water-sort-3d";

describe("Water Sort 3D Core Engine", () => {
  it("initializes a valid level with populated tubes and empty buffer tubes", () => {
    const game = initWaterSort(1);
    expect(game.level).toBe(1);
    expect(game.tubes.length).toBeGreaterThanOrEqual(4);
    expect(game.status).toBe("playing");
    expect(game.moves).toBe(0);

    const emptyTubes = game.tubes.filter((t) => t.layers.length === 0);
    expect(emptyTubes.length).toBeGreaterThanOrEqual(1);
  });

  it("checks pouring legality: valid to empty tube or matching color with capacity", () => {
    const tubes: Tube[] = [
      { id: "t1", layers: ["crimson", "azure", "emerald", "emerald"] },
      { id: "t2", layers: ["crimson", "emerald"] },
      { id: "t3", layers: [] }, // empty
      { id: "t4", layers: ["amber", "amber", "amber", "amber"] }, // full
    ];

    // t1 -> t2: top color is emerald on both, and t2 has capacity (2/4)
    expect(canPour(tubes, 0, 1)).toBe(true);
    // t1 -> t3: t3 is empty, always valid
    expect(canPour(tubes, 0, 2)).toBe(true);
    // t1 -> t4: t4 is full (4/4), invalid
    expect(canPour(tubes, 0, 3)).toBe(false);
    // t4 -> t2: amber into emerald, mismatch color, invalid
    expect(canPour(tubes, 3, 1)).toBe(false);
  });

  it("pours contiguous matching color units into target tube and records history", () => {
    const tubes: Tube[] = [
      { id: "t1", layers: ["crimson", "azure", "emerald", "emerald"] },
      { id: "t2", layers: ["crimson", "emerald"] },
    ];
    let game = initWaterSort(1);
    game.tubes = tubes;

    const result = pourLiquid(game, 0, 1);
    expect(result.pouredUnits).toBe(2); // both top emeralds poured
    expect(result.pouredColor).toBe("emerald");
    expect(result.state.tubes[0]!.layers).toEqual(["crimson", "azure"]);
    expect(result.state.tubes[1]!.layers).toEqual(["crimson", "emerald", "emerald", "emerald"]);
    expect(result.state.moves).toBe(1);
    expect(result.state.history.length).toBe(1);
  });

  it("handles two-step tap selection via selectTube helper", () => {
    let game = initWaterSort(1);
    game.tubes = [
      { id: "t1", layers: ["crimson", "azure"] },
      { id: "t2", layers: [] },
    ];

    // First tap on t1: select
    const tap1 = selectTube(game, 0);
    expect(tap1.action).toBe("selected");
    expect(tap1.state.selectedTubeIndex).toBe(0);

    // Second tap on t2: pour!
    const tap2 = selectTube(tap1.state, 1);
    expect(tap2.action).toBe("poured");
    expect(tap2.state.selectedTubeIndex).toBeNull();
    expect(tap2.state.tubes[1]!.layers).toEqual(["azure"]);
  });

  it("detects victory condition when all tubes are sorted or empty", () => {
    const solvedTubes: Tube[] = [
      { id: "t1", layers: ["crimson", "crimson", "crimson", "crimson"] },
      { id: "t2", layers: ["azure", "azure", "azure", "azure"] },
      { id: "t3", layers: [] },
    ];
    expect(checkVictory(solvedTubes)).toBe(true);

    const unsolvedTubes: Tube[] = [
      { id: "t1", layers: ["crimson", "azure", "crimson", "crimson"] },
      { id: "t2", layers: ["azure", "azure", "azure"] },
      { id: "t3", layers: [] },
    ];
    expect(checkVictory(unsolvedTubes)).toBe(false);
  });

  it("supports undoing previous moves cleanly", () => {
    let game = initWaterSort(1);
    game.tubes = [
      { id: "t1", layers: ["crimson", "azure"] },
      { id: "t2", layers: [] },
    ];

    const poured = pourLiquid(game, 0, 1).state;
    expect(poured.tubes[0]!.layers.length).toBe(1);

    const undone = undoMove(poured);
    expect(undone.tubes[0]!.layers).toEqual(["crimson", "azure"]);
    expect(undone.tubes[1]!.layers).toEqual([]);
    expect(undone.moves).toBe(0);
  });
});
