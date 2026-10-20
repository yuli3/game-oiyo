import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyRummy,
  arrangeMeld,
  checkPlay,
  createTileRummy,
  dailyBestConditions,
  handPenalty,
  humanOutcome,
  jokerTile,
  meldOptions,
  meldShapes,
  numberTile,
  seedFromDateKey,
  shareGrid,
  validateMeld,
  type Meld,
  type RummyState,
  type Tile,
} from "./tile-rummy";

function state(partial: Partial<RummyState> & Pick<RummyState, "hands" | "table">): RummyState {
  const seats = partial.hands.length;
  return {
    seed: 1,
    seats,
    pool: [],
    opened: Array.from({ length: seats }, () => false),
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

const c = (id: number, value: number) => numberTile(id, "crimson", value);
const a = (id: number, value: number) => numberTile(id, "amber", value);
const t = (id: number, value: number) => numberTile(id, "teal", value);
const v = (id: number, value: number) => numberTile(id, "violet", value);

describe("tile rummy melds", () => {
  it("accepts a same-number group of different colors and rejects a repeated color", () => {
    expect(validateMeld({ tiles: [c(1, 7), a(2, 7), t(3, 7)], shape: "group" }).ok).toBe(true);
    expect(validateMeld({ tiles: [c(1, 7), c(2, 7), a(3, 7)], shape: "group" }).ok).toBe(false);
    expect(validateMeld({ tiles: [c(1, 7), a(2, 7), t(3, 7), v(4, 7), jokerTile(5)] }).ok).toBe(false);
  });

  it("accepts a same-color run and rejects a gap, a wrap, and a short line", () => {
    expect(validateMeld({ tiles: [c(1, 5), c(2, 6), c(3, 7)], shape: "run" }).ok).toBe(true);
    expect(validateMeld({ tiles: [c(1, 5), c(2, 6), c(3, 8)], shape: "run" }).ok).toBe(false);
    expect(validateMeld({ tiles: [c(1, 13), c(2, 1), c(3, 2)], shape: "run" }).ok).toBe(false);
    expect(validateMeld({ tiles: [c(1, 4), c(2, 5)] }).ok).toBe(false);
  });

  it("lets a wild tile fill a run gap and scores the number it stands for", () => {
    const check = validateMeld({ tiles: [c(1, 5), jokerTile(2), c(3, 7)], shape: "run" });
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.roles.map((role) => role.value)).toEqual([5, 6, 7]);
      expect(check.points).toBe(18);
    }
  });

  it("keeps the printed number when one natural and wild tiles can be read two ways", () => {
    const tiles = [jokerTile(1), jokerTile(2), c(3, 5)];
    expect(meldShapes(tiles)).toEqual(["group", "run"]);
    const check = validateMeld({ tiles });
    expect(check.ok && check.shape).toBe("group");
    expect(check.ok && check.points).toBe(15);
    const asRun = validateMeld({ tiles, shape: "run" });
    expect(asRun.ok && asRun.points).toBe(12);
  });

  it("orders a selection into the same run, with spare wild tiles on the high side", () => {
    const run = arrangeMeld([c(3, 7), c(1, 5), c(2, 6)], "run");
    expect(run?.tiles.map((tile) => tile.value)).toEqual([5, 6, 7]);
    const gap = arrangeMeld([c(1, 5), jokerTile(9), c(3, 7)], "run");
    expect(gap?.tiles.map((tile) => tile.id)).toEqual([1, 9, 3]);
    const high = arrangeMeld([c(4, 5), jokerTile(8), jokerTile(9)], "run");
    expect(high?.tiles.map((tile) => tile.id)).toEqual([4, 8, 9]);
    expect(arrangeMeld([c(1, 7), c(2, 7), a(3, 8)], "group")).toBeNull();
  });

  it("finds the group and the run in a small hand", () => {
    const hand = [c(1, 9), a(2, 9), t(3, 9), c(4, 1), c(5, 2), c(6, 3)];
    const shapes = meldOptions(hand).map((meld) => meld.tiles.map((tile) => tile.id).join(","));
    expect(shapes).toContain("1,2,3");
    expect(shapes).toContain("4,5,6");
  });
});

describe("tile rummy plays", () => {
  it("rejects a first meld under 30 and accepts one that reaches 30", () => {
    const low = state({ hands: [[c(1, 9), a(2, 9), t(3, 9)], []], table: [] });
    expect(checkPlay(low, 0, [{ tiles: low.hands[0], shape: "group" }]).reason).toBe("under-thirty");
    expect(applyRummy(low, { type: "play", table: [{ tiles: low.hands[0], shape: "group" }] })).toBeNull();

    const exact = state({ hands: [[c(1, 10), a(2, 10), t(3, 10)], []], table: [] });
    const next = applyRummy(exact, { type: "play", table: [{ tiles: exact.hands[0], shape: "group" }] });
    expect(next?.opened[0]).toBe(true);
    expect(next?.hands[0]).toEqual([]);
    expect(next?.status).toBe("over");
    expect(humanOutcome(next!)).toBe("w");
    expect(exact.hands[0]).toHaveLength(3);
  });

  it("does not let the first meld rearrange tiles already on the table", () => {
    const tableMeld: Meld = { tiles: [c(1, 10), a(2, 10), t(3, 10)], shape: "group" };
    const hand = [v(4, 10), c(5, 1), c(6, 2), c(7, 3)];
    const game = state({ hands: [hand, []], table: [tableMeld] });
    const rearranged: Meld[] = [
      { tiles: [...tableMeld.tiles, v(4, 10)], shape: "group" },
      { tiles: [c(5, 1), c(6, 2), c(7, 3)], shape: "run" },
    ];
    expect(checkPlay(game, 0, rearranged).reason).toBe("initial-locked");
  });

  it("allows a rearrangement that keeps every table tile and adds a hand tile", () => {
    const run = [c(1, 1), c(2, 2), c(3, 3), c(4, 4), c(5, 5), c(6, 6)];
    const hand = [a(7, 6), t(8, 6)];
    const game = state({ hands: [hand, [c(9, 13)]], table: [{ tiles: run, shape: "run" }], opened: [true, true] });
    const nextTable: Meld[] = [
      { tiles: run.slice(0, 5), shape: "run" },
      { tiles: [run[5], ...hand], shape: "group" },
    ];
    const check = checkPlay(game, 0, nextTable);
    expect(check.ok).toBe(true);
    const next = applyRummy(game, { type: "play", table: nextTable });
    expect(next?.hands[0]).toEqual([]);
    expect(next?.table.flatMap((meld) => meld.tiles.map((tile) => tile.id)).sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(validateMeld(next!.table[0]).ok).toBe(true);
    expect(validateMeld(next!.table[1]).ok).toBe(true);
  });

  it("rejects a rearrangement that drops a table tile or leaves a broken meld", () => {
    const run = [c(1, 1), c(2, 2), c(3, 3), c(4, 4)];
    const game = state({ hands: [[a(5, 4), t(6, 4), v(7, 4)], []], table: [{ tiles: run, shape: "run" }], opened: [true, false] });
    expect(checkPlay(game, 0, [{ tiles: [a(5, 4), t(6, 4), v(7, 4)], shape: "group" }]).reason).toBe("missing-table");
    expect(checkPlay(game, 0, [{ tiles: [c(1, 1), c(2, 2), a(5, 4)], shape: "run" }, { tiles: [c(3, 3), c(4, 4), t(6, 4)], shape: "run" }]).reason).toBe("invalid-meld");
  });

  it("draws one pool tile and, with an empty pool, ends on the lower hand", () => {
    const pool = [c(3, 8)];
    const game = state({ hands: [[c(1, 1)], [c(2, 9)]], table: [], pool });
    const drawn = applyRummy(game, { type: "draw" });
    expect(drawn?.hands[0].map((tile) => tile.id)).toEqual([1, 3]);
    expect(drawn?.pool).toEqual([]);
    expect(drawn?.turn).toBe(1);
    expect(game.pool).toHaveLength(1);

    const stalled = state({ hands: [[c(1, 2)], [c(2, 9), jokerTile(4)]], table: [], pool: [] });
    const once = applyRummy(stalled, { type: "draw" });
    expect(once?.status).toBe("playing");
    const twice = applyRummy(once!, { type: "draw" });
    expect(twice?.status).toBe("over");
    expect(humanOutcome(twice!)).toBe("w");
    expect(handPenalty([jokerTile(4)])).toBe(30);
  });

  it("records a draw when the stalled hands tie", () => {
    const stalled = state({ hands: [[c(1, 4)], [a(2, 4)]], table: [], pool: [], opened: [true, true] });
    const done = applyRummy(applyRummy(stalled, { type: "draw" })!, { type: "draw" });
    expect(humanOutcome(done!)).toBe("d");
  });
});

describe("tile rummy deal", () => {
  it("deals 106 tiles, 14 to each seat, from a date seed", () => {
    expect(seedFromDateKey("2026-10-20")).toBe(seedFromDateKey("2026-10-20"));
    expect(seedFromDateKey("2026-10-20")).not.toBe(seedFromDateKey("2026-10-21"));
    const first = createTileRummy({ seed: seedFromDateKey("2026-10-20"), opponents: 2, mode: "daily", dateKey: "2026-10-20" });
    const second = createTileRummy({ seed: seedFromDateKey("2026-10-20"), opponents: 2, mode: "daily", dateKey: "2026-10-20" });
    expect(first.hands.map((hand) => hand.map((tile) => tile.id))).toEqual(second.hands.map((hand) => hand.map((tile) => tile.id)));
    const ids = [...first.hands.flat(), ...first.pool].map((tile) => tile.id);
    expect(new Set(ids).size).toBe(106);
    expect(first.hands.every((hand) => hand.length === 14)).toBe(true);
    expect(dailyBestConditions("2026-10-20")).toEqual({ seed: "2026-10-20", difficulty: "daily", assist: "none" });
  });

  it("keeps the trademark out of the table, the page, and the guide", () => {
    const page = readFileSync(new URL("../../pages/[...lang]/tile-rummy.astro", import.meta.url), "utf8");
    const view = readFileSync(new URL("../../components/games/TileRummy.tsx", import.meta.url), "utf8");
    const guide = readFileSync(new URL("../../data/game-guides.ts", import.meta.url), "utf8");
    const blob = `${page}\n${view}\n${guide}`;
    expect(blob).not.toMatch(/Rummikub|루미큐브|ラミキューブ/);
    expect(page).toContain("숫자 타일 게임");
    expect(page).toContain("타일 러미 무료");
    expect(page).toContain("러미 게임 온라인");
    expect(view).toContain('const GAME_ID = "tile-rummy"');
    expect(view).toContain("recordResult(GAME_ID");
    expect(view).toContain("dailyBestConditions");
    expect(view).toContain("useArcadePortal");
    expect(view).toContain("kstDateKey");
  });

  it("shares the table as one emoji row per meld", () => {
    const tiles: Tile[] = [c(1, 7), a(2, 7), t(3, 7)];
    const game = state({ hands: [[], []], table: [{ tiles, shape: "group" }], status: "over", winner: 0 });
    expect(shareGrid(game, "숫자 타일", "승리")).toBe("숫자 타일\n승리\n🟥7 🟧7 🟦7");
  });
});
