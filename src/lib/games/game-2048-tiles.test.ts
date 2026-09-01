import { describe, expect, it } from "vitest";
import { createGame2048, moveGame2048 } from "./game-2048";
import { advance2048Tiles, tilesFromBoard, tilesMatchBoard } from "./game-2048-tiles";

describe("2048 visual tiles", () => {
  it("keeps the surviving id when two tiles merge", () => {
    const prev = tilesFromBoard([2, 2, null, null, ...Array(12).fill(null)]).tiles;
    const next = advance2048Tiles(prev, [4, null, null, null, ...Array(12).fill(null)], "left", 10);
    expect(next.tiles.filter((tile) => !tile.spawned)).toEqual([
      { id: prev[0].id, value: 4, index: 0, merged: true, spawned: false },
    ]);
  });

  it("slides a tile without changing its id", () => {
    const prev = tilesFromBoard([2, null, null, null, ...Array(12).fill(null)]).tiles;
    const next = advance2048Tiles(prev, [null, null, null, 2, ...Array(12).fill(null)], "right", 10);
    expect(next.tiles.find((tile) => !tile.spawned)).toMatchObject({ id: prev[0].id, value: 2, index: 3, merged: false });
  });

  it("marks the spawned cell and still matches the engine board", () => {
    const start = createGame2048(42);
    const visual = tilesFromBoard(start.board);
    expect(tilesMatchBoard(visual.tiles, start.board)).toBe(true);
    for (const direction of ["left", "right", "up", "down"] as const) {
      let state = start;
      let tiles = visual.tiles;
      let nextId = visual.nextId;
      for (let step = 0; step < 8; step += 1) {
        const moved = moveGame2048(state, direction);
        if (moved === state) break;
        const advanced = advance2048Tiles(tiles, moved.board, direction, nextId);
        expect(tilesMatchBoard(advanced.tiles, moved.board), `${direction} step ${step}`).toBe(true);
        expect(advanced.tiles.some((tile) => tile.spawned)).toBe(true);
        state = moved;
        tiles = advanced.tiles;
        nextId = advanced.nextId;
      }
    }
  });
});
