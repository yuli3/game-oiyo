import { describe, it, expect } from "vitest";
import {
  COSMIC_TIERS,
  MAX_TIER_INDEX,
  getNextDropTier,
  canMergeTiers,
  computeMergeResult,
  clampDropperX,
  ARENA_WIDTH,
} from "./cosmic-merge";
import type { Locale } from "../i18n";

describe("cosmic-merge core contracts", () => {
  const locales: Locale[] = ["ko", "en", "ja", "zh", "fr", "es"];

  it("defines exactly 11 celestial tiers from Asteroid up to Sun", () => {
    expect(COSMIC_TIERS.length).toBe(11);
    expect(MAX_TIER_INDEX).toBe(10);
  });

  it("strictly increases radii and scores across tiers", () => {
    for (let i = 1; i < COSMIC_TIERS.length; i++) {
      expect(COSMIC_TIERS[i].radius).toBeGreaterThan(COSMIC_TIERS[i - 1].radius);
      expect(COSMIC_TIERS[i].score).toBeGreaterThan(COSMIC_TIERS[i - 1].score);
    }
  });

  it("provides localized names across all 6 supported languages for every tier", () => {
    for (const tier of COSMIC_TIERS) {
      for (const loc of locales) {
        expect(tier.name[loc], `Missing name for tier ${tier.id} in ${loc}`).toBeDefined();
        expect(tier.name[loc].length).toBeGreaterThan(0);
      }
    }
  });

  it("validates mergeability between matching tiers", () => {
    expect(canMergeTiers(0, 0)).toBe(true);
    expect(canMergeTiers(3, 3)).toBe(true);
    expect(canMergeTiers(0, 1)).toBe(false);
    expect(canMergeTiers(5, 6)).toBe(false);
    expect(canMergeTiers(MAX_TIER_INDEX, MAX_TIER_INDEX)).toBe(false); // Max tier cannot merge further
  });

  it("computes merge results correctly", () => {
    const res0 = computeMergeResult(0);
    expect(res0).toEqual({ nextTier: 1, addedScore: COSMIC_TIERS[1].score });

    const res5 = computeMergeResult(5);
    expect(res5).toEqual({ nextTier: 6, addedScore: COSMIC_TIERS[6].score });

    const resMax = computeMergeResult(MAX_TIER_INDEX);
    expect(resMax).toBeNull();
  });

  it("restricts dropped items to early tiers only (0 through 3)", () => {
    // Deterministic random checks
    expect(getNextDropTier(() => 0.05)).toBe(0);
    expect(getNextDropTier(() => 0.35)).toBe(0);
    expect(getNextDropTier(() => 0.55)).toBe(1);
    expect(getNextDropTier(() => 0.85)).toBe(2);
    expect(getNextDropTier(() => 0.95)).toBe(3);

    // Monte Carlo distribution check
    for (let i = 0; i < 50; i++) {
      const tier = getNextDropTier();
      expect(tier).toBeGreaterThanOrEqual(0);
      expect(tier).toBeLessThanOrEqual(3);
    }
  });

  it("clamps dropper coordinates accurately within walls", () => {
    const radius = 20;
    const minExpected = 20 + radius;
    const maxExpected = ARENA_WIDTH - 20 - radius;

    expect(clampDropperX(0, radius)).toBe(minExpected);
    expect(clampDropperX(minExpected - 10, radius)).toBe(minExpected);
    expect(clampDropperX(ARENA_WIDTH / 2, radius)).toBe(ARENA_WIDTH / 2);
    expect(clampDropperX(ARENA_WIDTH + 50, radius)).toBe(maxExpected);
  });
});
