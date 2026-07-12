import { describe, expect, it } from "vitest";

import { handPips, isDouble, legalMoves, makeSet, newEndValue, pips, shuffle, tileFits, type Ends } from "./dominoes";

describe("dominoes: tile set", () => {
  it("builds the standard double-six set of 28 tiles", () => {
    expect(makeSet()).toHaveLength(28);
  });

  it("shuffle preserves the same multiset of tile ids", () => {
    const set = makeSet();
    const shuffled = shuffle(set, () => 0.17);
    expect(shuffled).toHaveLength(set.length);
    expect(shuffled.map((t) => t.id).sort((a, b) => a - b)).toEqual(set.map((t) => t.id).sort((a, b) => a - b));
  });
});

describe("dominoes: tile helpers", () => {
  it("isDouble is true only when both pip values match", () => {
    expect(isDouble({ id: 0, a: 3, b: 3 })).toBe(true);
    expect(isDouble({ id: 1, a: 3, b: 4 })).toBe(false);
  });

  it("pips sums the two ends; handPips sums a whole hand", () => {
    expect(pips({ id: 0, a: 2, b: 5 })).toBe(7);
    expect(handPips([{ id: 0, a: 2, b: 5 }, { id: 1, a: 0, b: 0 }, { id: 2, a: 6, b: 6 }])).toBe(19);
  });

  it("tileFits checks either end of the tile against the open pip value", () => {
    expect(tileFits({ id: 0, a: 3, b: 5 }, 3)).toBe(true);
    expect(tileFits({ id: 0, a: 3, b: 5 }, 5)).toBe(true);
    expect(tileFits({ id: 0, a: 3, b: 5 }, 4)).toBe(false);
  });

  it("newEndValue returns the tile's other pip value", () => {
    expect(newEndValue({ id: 0, a: 3, b: 5 }, 3)).toBe(5);
    expect(newEndValue({ id: 0, a: 3, b: 5 }, 5)).toBe(3);
  });
});

describe("dominoes: legalMoves", () => {
  it("finds every hand tile that fits either open end", () => {
    const hand = [
      { id: 0, a: 3, b: 5 }, // fits left (3)
      { id: 1, a: 2, b: 6 }, // fits right (6)
      { id: 2, a: 1, b: 1 }, // fits neither
    ];
    const ends: Ends = { left: 3, right: 6 };
    const moves = legalMoves(hand, ends);
    expect(moves).toHaveLength(2);
    expect(moves.map((m) => m.tile.id).sort()).toEqual([0, 1]);
  });

  it("a double that matches both ends produces two distinct moves", () => {
    const hand = [{ id: 0, a: 4, b: 4 }];
    const ends: Ends = { left: 4, right: 4 };
    const moves = legalMoves(hand, ends);
    expect(moves).toHaveLength(2);
    expect(moves.map((m) => m.end).sort()).toEqual(["left", "right"]);
  });

  it("returns an empty array when nothing in hand fits", () => {
    const hand = [{ id: 0, a: 1, b: 1 }];
    const ends: Ends = { left: 5, right: 6 };
    expect(legalMoves(hand, ends)).toEqual([]);
  });
});
