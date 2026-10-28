import { describe, expect, it } from "vitest";
import { createTileRummy, firstMeldOf, checkPlay, numberTile, validateMeld, type Meld } from "./tile-rummy";
import {
  AUGMENTS,
  CHAOS_CHANCE,
  resultStars,
  rollAugments,
  rollChaos,
  shiftedLevel,
  tableVariant,
  titleTier,
  unlockedThemes,
} from "./tile-rummy-augments";
import { hitDrop, hitTile, layoutTable } from "./tile-rummy-layout";
import { dropDraft } from "./tile-rummy-draft";

describe("tile rummy variants", () => {
  it("deals the same table as before when no variant is given", () => {
    const plain = createTileRummy({ seed: 77, opponents: 2 });
    const empty = createTileRummy({ seed: 77, opponents: 2, variant: {} });
    expect(empty).toEqual(plain);
    expect(plain.firstMeld).toBeUndefined();
    expect(firstMeldOf(plain)).toBe(30);
  });

  it("keeps all 106 tiles once each across hands and pool", () => {
    const state = createTileRummy({ seed: 5, opponents: 3, variant: { handSize: 13, rivalHandSize: 15, startJoker: true, jokersNearTop: true } });
    const ids = [...state.hands.flat(), ...state.pool].map((tile) => tile.id);
    expect(new Set(ids).size).toBe(106);
    expect(ids.length).toBe(106);
    expect(state.hands[0]).toHaveLength(13);
    expect(state.hands[1]).toHaveLength(15);
  });

  it("puts a wild tile in the opening hand", () => {
    for (let seed = 1; seed < 40; seed++) {
      const state = createTileRummy({ seed, opponents: 1, variant: { startJoker: true } });
      expect(state.hands[0].some((tile) => tile.kind === "joker")).toBe(true);
    }
  });

  it("moves pool wild tiles into the top ten", () => {
    for (let seed = 1; seed < 40; seed++) {
      const state = createTileRummy({ seed, opponents: 1, variant: { jokersNearTop: true } });
      state.pool.forEach((tile, index) => {
        if (tile.kind === "joker") expect(index).toBeLessThan(11);
      });
    }
  });

  it("cuts the pool for the short-pool table", () => {
    expect(createTileRummy({ seed: 3, opponents: 1, variant: { poolLimit: 24 } }).pool).toHaveLength(24);
  });

  it("lets a 25-point opener through only with the augment", () => {
    const meld: Meld = { tiles: [numberTile(1, "crimson", 7), numberTile(2, "crimson", 8), numberTile(3, "crimson", 10 - 1)], shape: "run" };
    const base = createTileRummy({ seed: 1, opponents: 1 });
    const hand = meld.tiles;
    expect(checkPlay({ ...base, hands: [hand, base.hands[1]] }, 0, [meld]).reason).toBe("under-thirty");
    const eased = createTileRummy({ seed: 1, opponents: 1, variant: { firstMeld: 24 } });
    expect(checkPlay({ ...eased, hands: [hand, eased.hands[1]] }, 0, [meld]).ok).toBe(true);
  });
});

describe("tile rummy augments", () => {
  it("offers three different augments, and the offer varies by seed", () => {
    const offers = new Set<string>();
    for (let seed = 1; seed <= 1000; seed++) {
      const roll = rollAugments(seed);
      expect(new Set(roll).size).toBe(3);
      offers.add(roll.slice().sort().join(","));
    }
    // 8 choose 3 = 56 possible offers; a thousand seeds should reach nearly all.
    expect(offers.size).toBeGreaterThan(50);
    expect(AUGMENTS.length).toBeGreaterThanOrEqual(8);
  });

  it("bends about one table in five", () => {
    let bent = 0;
    for (let seed = 1; seed <= 2000; seed++) if (rollChaos(seed)) bent += 1;
    expect(bent / 2000).toBeGreaterThan(CHAOS_CHANCE - 0.05);
    expect(bent / 2000).toBeLessThan(CHAOS_CHANCE + 0.05);
  });

  it("lets the augment win over the chaos rule it overlaps", () => {
    expect(tableVariant("opener25", "shortPool")).toEqual({ poolLimit: 24, firstMeld: 25 });
    expect(tableVariant(null, null)).toEqual({});
  });

  it("floors the calm rival at the first level", () => {
    expect(shiftedLevel(1, "calmRival")).toBe(1);
    expect(shiftedLevel(3, "calmRival")).toBe(2);
    expect(shiftedLevel(2, "peek")).toBe(2);
  });

  it("unlocks titles and themes by wins", () => {
    expect(titleTier(0)).toBe(0);
    expect(titleTier(5)).toBe(1);
    expect(titleTier(39)).toBe(2);
    expect(titleTier(40)).toBe(3);
    expect(unlockedThemes(4)).toEqual(["felt"]);
    expect(unlockedThemes(15)).toEqual(["felt", "walnut", "midnight"]);
  });

  it("grades results", () => {
    expect(resultStars("w", 8)).toBe(3);
    expect(resultStars("w", 20)).toBe(2);
    expect(resultStars("d", 20)).toBe(1);
    expect(resultStars("l", 3)).toBe(0);
  });
});

describe("tile rummy layout", () => {
  const run = (from: number, length: number, idBase: number): Meld => ({
    tiles: Array.from({ length }, (_, index) => numberTile(idBase + index, "teal", from + index)),
    shape: "run",
  });

  it("fits every tile inside the width at phone sizes", () => {
    const state = createTileRummy({ seed: 9, opponents: 3 });
    for (const width of [320, 360, 375, 414, 768]) {
      const layout = layoutTable({ width, table: [run(1, 13, 500), run(2, 4, 600)], loose: [], hand: state.hands[0], rivals: 3 });
      for (const spot of layout.spots) {
        expect(spot.x).toBeGreaterThanOrEqual(0);
        expect(spot.x + layout.tileW).toBeLessThanOrEqual(width);
      }
      expect(layout.spots.filter((spot) => spot.zone === "hand")).toHaveLength(14);
      expect(layout.newZone.x + layout.newZone.w).toBeLessThanOrEqual(width);
      expect(layout.height).toBeGreaterThan(layout.handBox.y);
    }
  });

  it("grows the table to a play-canvas floor without moving table tiles", () => {
    const hand = [numberTile(1, "amber", 4)];
    const bare = layoutTable({ width: 375, table: [run(3, 3, 100)], loose: [], hand, rivals: 1 });
    const raised = layoutTable({ width: 375, table: [run(3, 3, 100)], loose: [], hand, rivals: 1, minHeight: bare.height + 120 });
    const bareTile = bare.spots.find((spot) => spot.zone === "table");
    const raisedTile = raised.spots.find((spot) => spot.id === bareTile?.id);
    expect(raised.height).toBe(bare.height + 120);
    expect(raised.tableBox.h).toBe(bare.tableBox.h + 120);
    expect(raisedTile?.y).toBe(bareTile?.y);
    expect(raised.handBox.y).toBe(bare.handBox.y + 120);
  });

  it("keeps tiles at least the touch size", () => {
    const layout = layoutTable({ width: 320, table: [], loose: [], hand: [], rivals: 1 });
    expect(layout.tileW).toBeGreaterThanOrEqual(34);
    expect(layout.tileH).toBeGreaterThanOrEqual(44);
  });

  it("hit-tests tiles and drop targets", () => {
    const hand = [numberTile(1, "amber", 4), numberTile(2, "amber", 5)];
    const layout = layoutTable({ width: 375, table: [run(3, 3, 100)], loose: [], hand, rivals: 1 });
    const first = layout.spots.find((spot) => spot.id === 1);
    expect(first).toBeDefined();
    if (!first) return;
    expect(hitTile(layout, first.x + 3, first.y + 3)?.id).toBe(1);
    const meld = layout.melds[0];
    expect(hitDrop(layout, meld.x + 2, meld.y + 4)).toEqual({ type: "meld", index: 0, side: "start" });
    expect(hitDrop(layout, meld.x + meld.w - 2, meld.y + 4)).toEqual({ type: "meld", index: 0, side: "end" });
    expect(hitDrop(layout, layout.newZone.x + 4, layout.newZone.y + 4)).toEqual({ type: "new" });
    expect(hitDrop(layout, first.x + 3, first.y + 3)).toEqual({ type: "hand" });
  });
});

describe("tile rummy drag drops", () => {
  const hand = [numberTile(1, "crimson", 10), numberTile(2, "amber", 10), numberTile(3, "teal", 10), numberTile(4, "teal", 11), numberTile(5, "violet", 2)];
  const base = (opened: boolean, table: Meld[] = []) => {
    const state = createTileRummy({ seed: 1, opponents: 1 });
    return { ...state, hands: [hand, state.hands[1]], table, opened: [opened, false] };
  };
  const spot = (id: number, zone: "hand" | "table" | "loose", meld: number | null = null) => ({ id, zone, meld, x: 0, y: 0 });

  it("starts a new line from the selection plus the dragged tile", () => {
    const state = base(false);
    const result = dropDraft(state, { table: [], loose: [] }, spot(3, "hand"), { type: "new" }, [1, 2]);
    expect(result?.draft.table).toHaveLength(1);
    expect(result?.laid.sort()).toEqual([1, 2, 3]);
    expect(validateMeld(result!.draft.table[0]).ok).toBe(true);
  });

  it("refuses a new line that is not a meld", () => {
    expect(dropDraft(base(false), { table: [], loose: [] }, spot(5, "hand"), { type: "new" }, [1, 2])).toBeNull();
    expect(dropDraft(base(false), { table: [], loose: [] }, spot(1, "hand"), { type: "new" }, [])).toBeNull();
  });

  it("extends a line at the dropped end only when legal", () => {
    const run: Meld = { tiles: [numberTile(10, "teal", 8), numberTile(11, "teal", 9), numberTile(12, "teal", 10)], shape: "run" };
    const state = base(true, [run]);
    const draft = { table: [run], loose: [] };
    expect(dropDraft(state, draft, spot(4, "hand"), { type: "meld", index: 0, side: "end" }, [])?.draft.table[0].tiles.map((tile) => tile.id)).toEqual([10, 11, 12, 4]);
    expect(dropDraft(state, draft, spot(4, "hand"), { type: "meld", index: 0, side: "start" }, [])).toBeNull();
  });

  it("keeps table lines locked before the first meld", () => {
    const run: Meld = { tiles: [numberTile(10, "teal", 8), numberTile(11, "teal", 9), numberTile(12, "teal", 10)], shape: "run" };
    const state = base(false, [run]);
    expect(dropDraft(state, { table: [run], loose: [] }, spot(4, "hand"), { type: "meld", index: 0, side: "end" }, [])).toBeNull();
    expect(dropDraft(state, { table: [run], loose: [] }, spot(12, "table", 0), { type: "hand" }, [])).toBeNull();
  });

  it("lifts a table tile back once opened, and never drops a hand tile on the hand", () => {
    const run: Meld = { tiles: [numberTile(10, "teal", 7), numberTile(11, "teal", 8), numberTile(12, "teal", 9), numberTile(13, "teal", 10)], shape: "run" };
    const state = base(true, [run]);
    const lifted = dropDraft(state, { table: [run], loose: [] }, spot(13, "table", 0), { type: "hand" }, []);
    expect(lifted?.draft.loose.map((tile) => tile.id)).toEqual([13]);
    expect(lifted?.draft.table[0].tiles).toHaveLength(3);
    expect(dropDraft(state, { table: [run], loose: [] }, spot(1, "hand"), { type: "hand" }, [])).toBeNull();
  });
});
