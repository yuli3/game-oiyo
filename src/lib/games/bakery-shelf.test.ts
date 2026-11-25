import { describe, expect, it } from "vitest";
import { EMPTY, SHELF_STAGES, STAGE_COUNT, itemsLeft, move, newBakery, pilot, starsFor, type ShelfStage } from "./bakery-shelf";

const T = 60_000;
// think less carefully than the shoppers each deal was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.15, seed }));
const _ = EMPTY;

describe("bakery-shelf", () => {
  it("sells three of a kind on a shelf and slides the next tray forward", () => {
    const st: ShelfStage = {
      stage: 0,
      shelves: [
        [[0, 0, _], [1, 2, 2]],
        [[0, 1, _]],
        [[1, 2, _]],
      ],
      plan: [],
      par: 4,
      limit: 20,
    };
    const b = newBakery(st);
    expect(move(b, 1, 0, 0, 2)).toBe(1); // 0 0 0 sells, the tray 1 2 2 slides in
    expect(b.sold).toBe(1);
    expect(b.front[0]).toEqual([1, 2, 2]);
    expect(b.back[0]).toHaveLength(0);
    expect(move(b, 0, 0, 0, 1)).toBe(-1); // not to its own shelf
    expect(move(b, 1, 0, 2, 0)).toBe(-1); // spot taken
  }, T);

  it("wins when every bread is sold, and scores stars by moves", () => {
    const st: ShelfStage = { stage: 0, shelves: [[[0, 0, _]], [[0, _, _]]], plan: [[1, 0, 0, 2]], par: 1, limit: 5 };
    const b = newBakery(st);
    move(b, 1, 0, 0, 2);
    expect(itemsLeft(b)).toBe(0);
    expect(b.won).toBe(true);
    expect(starsFor(b)).toBe(3);
  }, T);

  it("runs out of moves at the limit", () => {
    const st: ShelfStage = { stage: 0, shelves: [[[0, 1, _]], [[1, 0, _]], [[0, 1, _]]], plan: [], par: 2, limit: 2 };
    const b = newBakery(st);
    move(b, 0, 0, 1, 2);
    move(b, 1, 2, 0, 0);
    expect(b.over).toBe(true);
    expect(b.won).toBe(false);
  }, T);

  it("has 30 deals that grow from 4 shelves to 9, with trays stacking up behind", () => {
    expect(SHELF_STAGES).toHaveLength(STAGE_COUNT);
    expect(SHELF_STAGES[0].shelves).toHaveLength(4);
    expect(SHELF_STAGES[0].shelves.every((s) => s.length === 1)).toBe(true);
    expect(SHELF_STAGES[29].shelves).toHaveLength(9);
    expect(Math.max(...SHELF_STAGES[29].shelves.map((s) => s.length))).toBeGreaterThan(3);
    for (const st of SHELF_STAGES) {
      const all = st.shelves.flat(2).filter((v) => v !== EMPTY);
      const counts = new Map<number, number>();
      for (const v of all) counts.set(v, (counts.get(v) ?? 0) + 1);
      for (const n of counts.values()) expect(n % 3).toBe(0);
      expect(st.limit).toBeGreaterThan(st.par);
    }
  }, T);

  it("sells out every deal with its plan, in par, for three stars", () => {
    for (const st of SHELF_STAGES) {
      const b = pilot(st, { mode: "plan" });
      expect(b.won).toBe(true);
      expect(b.moves).toBe(st.par);
      expect(starsFor(b)).toBe(3);
    }
  }, T);

  it("lets human-like shoppers who think less carefully sell out most deals in stages 1–15", () => {
    let wins = 0;
    for (const st of SHELF_STAGES.slice(0, 15)) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(48);
  }, T);

  it("lets human-like shoppers who think less carefully sell out most deals in stages 16–30", () => {
    let wins = 0;
    for (const st of SHELF_STAGES.slice(15)) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(42);
  }, T);

  it("never sells out moving bread at random", () => {
    let wins = 0;
    for (const st of SHELF_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of SHELF_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
