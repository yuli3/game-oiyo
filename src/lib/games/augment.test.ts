import { describe, expect, it } from "vitest";
import {
  augmentCount,
  parseAugmentOffer,
  parseAugmentOwned,
  rollAugmentOffer,
  takeAugment,
  type AugmentDef,
} from "./augment";

const DEFS = [
  { id: "a", tier: "silver", max: 2 },
  { id: "b", tier: "silver", max: 1 },
  { id: "c", tier: "gold", max: 1 },
  { id: "d", tier: "prismatic", max: 1 },
] as const satisfies readonly AugmentDef[];

describe("augment draft", () => {
  it("offers three distinct cards and repeats for the same seed", () => {
    for (let seed = 1; seed < 200; seed++) {
      const first = rollAugmentOffer(DEFS, {}, seed);
      expect(first.offer).toHaveLength(3);
      expect(new Set(first.offer).size).toBe(3);
      expect(rollAugmentOffer(DEFS, {}, seed)).toEqual(first);
    }
  });

  it("draws silver more often than prismatic", () => {
    const seen = { a: 0, b: 0, c: 0, d: 0 };
    let rng = 7;
    for (let i = 0; i < 2000; i++) {
      const rolled = rollAugmentOffer(DEFS, {}, rng, 1);
      rng = rolled.rng;
      seen[rolled.offer[0]] += 1;
    }
    expect(seen.a).toBeGreaterThan(seen.c);
    expect(seen.c).toBeGreaterThan(seen.d);
    expect(seen.d).toBeGreaterThan(0);
  });

  it("stops offering a card at its cap and runs dry instead of looping", () => {
    let owned = takeAugment(DEFS, {}, "a");
    owned = takeAugment(DEFS, owned, "a");
    expect(takeAugment(DEFS, owned, "a")).toBe(owned);
    expect(rollAugmentOffer(DEFS, owned, 3).offer).not.toContain("a");
    owned = takeAugment(DEFS, takeAugment(DEFS, takeAugment(DEFS, owned, "b"), "c"), "d");
    expect(augmentCount(owned)).toBe(5);
    expect(rollAugmentOffer(DEFS, owned, 3).offer).toEqual([]);
  });

  it("keeps only known ids from a saved pick list and clamps the stack", () => {
    expect(parseAugmentOwned(DEFS, { a: 9, b: -1, c: 1.5, zz: 1, d: 1 })).toEqual({ a: 2, d: 1 });
    expect(parseAugmentOwned(DEFS, null)).toEqual({});
    expect(parseAugmentOwned(DEFS, [1, 2])).toEqual({});
  });

  it("rejects a saved offer that names a capped, unknown or repeated card", () => {
    expect(parseAugmentOffer(DEFS, {}, ["a", "c", "d"])).toEqual(["a", "c", "d"]);
    expect(parseAugmentOffer(DEFS, { b: 1 }, ["a", "b"])).toBeNull();
    expect(parseAugmentOffer(DEFS, {}, ["a", "a"])).toBeNull();
    expect(parseAugmentOffer(DEFS, {}, ["zz"])).toBeNull();
    expect(parseAugmentOffer(DEFS, {}, [])).toBeNull();
    expect(parseAugmentOffer(DEFS, {}, "a")).toBeNull();
  });
});
