import { describe, expect, it } from "vitest";
import { chooseRummyAction } from "./rummy";
import {
  applyRummy,
  createTileRummy,
  numberTile,
  validateMeld,
  type Meld,
  type RummyState,
} from "../tile-rummy";

const c = (id: number, value: number) => numberTile(id, "crimson", value);
const a = (id: number, value: number) => numberTile(id, "amber", value);
const t = (id: number, value: number) => numberTile(id, "teal", value);

function playing(partial: Partial<RummyState> & Pick<RummyState, "hands" | "table" | "opened">): RummyState {
  return {
    seed: 3,
    seats: partial.hands.length,
    pool: partial.pool ?? [c(90, 8), a(91, 8), t(92, 8)],
    turn: 0,
    status: "playing",
    winner: null,
    passes: 0,
    turnCount: 0,
    mode: "match",
    dateKey: null,
    ...partial,
  };
}

function idsOf(table: Meld[]): number[] {
  return table.flatMap((meld) => meld.tiles.map((tile) => tile.id)).sort((x, y) => x - y);
}

describe("rummy AI", () => {
  it("returns a legal action at every difficulty on a dealt board", () => {
    const dealt = createTileRummy({ seed: 11, opponents: 1 });
    for (const level of [1, 2, 3] as const) {
      const action = chooseRummyAction(dealt, level);
      expect(applyRummy(dealt, action)).not.toBeNull();
    }
  });

  it("opens with two melds only when the search can look past a single set", () => {
    const hand = [c(1, 9), a(2, 9), t(3, 9), c(4, 1), c(5, 2), c(6, 3)];
    const game = playing({ hands: [hand, [c(7, 13)]], table: [], opened: [false, false] });
    expect(chooseRummyAction(game, 1).type).toBe("draw");
    const action = chooseRummyAction(game, 2);
    expect(action.type).toBe("play");
    if (action.type === "play") {
      const next = applyRummy(game, action);
      expect(next?.opened[0]).toBe(true);
      expect(next?.hands[0]).toEqual([]);
      expect(next?.status).toBe("over");
      expect(next?.table.every((meld) => validateMeld(meld).ok)).toBe(true);
    }
  });

  it("rearranges a run to free a tile for a new group", () => {
    const run = [c(1, 1), c(2, 2), c(3, 3), c(4, 4), c(5, 5), c(6, 6)];
    const hand = [a(7, 6), t(8, 6)];
    const game = playing({
      hands: [hand, [c(9, 13)]],
      table: [{ tiles: run, shape: "run" }],
      opened: [true, true],
    });
    expect(chooseRummyAction(game, 1).type).toBe("draw");
    const action = chooseRummyAction(game, 3);
    expect(action.type).toBe("play");
    if (action.type === "play") {
      const next = applyRummy(game, action);
      expect(next).not.toBeNull();
      expect(idsOf(next!.table)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(next?.table.every((meld) => validateMeld(meld).ok)).toBe(true);
      expect(next?.hands[0]).toEqual([]);
    }
  });

  it("plays a short match without dropping or duplicating a tile", () => {
    let game = createTileRummy({ seed: 4, opponents: 1 });
    for (let turn = 0; turn < 240 && game.status === "playing"; turn++) {
      const action = chooseRummyAction(game, 1);
      const next = applyRummy(game, action);
      expect(next).not.toBeNull();
      game = next!;
      const ids = [...game.hands.flat(), ...game.pool, ...game.table.flatMap((meld) => meld.tiles)].map((tile) => tile.id);
      expect(new Set(ids).size).toBe(106);
      expect(game.table.every((meld) => validateMeld(meld).ok)).toBe(true);
    }
    expect(game.status).toBe("over");
  });
});
