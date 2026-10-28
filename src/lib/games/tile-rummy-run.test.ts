import { describe, expect, it } from "vitest";
import { AUGMENT_TIER, rollTieredOffer, runLevel, runOffersAugment, sharedAugmentDefs } from "./tile-rummy-run";
import { tileRummyAnalyticsPayload } from "./tile-rummy-analytics";

describe("tile rummy run", () => {
  it("keeps eight existing ids split into silver 4, gold 3, prism 1", () => {
    const defs = sharedAugmentDefs();
    expect(defs).toHaveLength(8);
    expect(defs.filter((def) => def.tier === "silver")).toHaveLength(4);
    expect(defs.filter((def) => def.tier === "gold")).toHaveLength(3);
    expect(defs.filter((def) => def.tier === "prismatic")).toHaveLength(1);
    expect(AUGMENT_TIER.starJoker).toBe("prismatic");
  });

  it("offers an augment at the start and every third game", () => {
    expect([0, 1, 2, 3, 4, 6].map(runOffersAugment)).toEqual([true, false, false, true, false, true]);
  });

  it("raises the existing level by one win and stops at 3", () => {
    expect(runLevel(1, 0)).toBe(1);
    expect(runLevel(1, 1)).toBe(2);
    expect(runLevel(2, 5)).toBe(3);
  });

  it("draws three tiered cards without inventing a new id", () => {
    const offer = rollTieredOffer(7);
    expect(offer).toHaveLength(3);
    expect(new Set(offer).size).toBe(3);
  });
});

describe("tile rummy analytics", () => {
  it("sends the seven-event fields and never a seed or a name", () => {
    const end = tileRummyAnalyticsPayload("game_end", { mode: "run", result: "w", duration: 12 });
    expect(end).toEqual({ game_id: "tile-rummy", mode: "run", result: "w", duration: 12 });
    expect(tileRummyAnalyticsPayload("augment_pick", { id: "peek", tier: "silver" })).toEqual({
      game_id: "tile-rummy",
      id: "peek",
      tier: "silver",
    });
    expect(JSON.stringify(end)).not.toMatch(/seed|name|account|birthday/i);
  });
});
