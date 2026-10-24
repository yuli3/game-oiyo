import { describe, it, expect } from "vitest";
import {
  AUGMENTS_CATALOG,
  isAugmentMilestone,
  rollAugmentChoices,
  calculateAugmentedTickInterval,
  type AugmentId,
} from "./snake-augments";
import type { Locale } from "../i18n";

describe("snake-augments contracts and mechanics", () => {
  const locales: Locale[] = ["ko", "en", "ja", "zh", "fr", "es"];

  it("contains 5 distinct augments with 6-locale names and descriptions", () => {
    expect(AUGMENTS_CATALOG.length).toBe(5);
    for (const aug of AUGMENTS_CATALOG) {
      expect(aug.icon).toBeTruthy();
      for (const loc of locales) {
        expect(aug.name[loc], `Missing name for ${aug.id} in ${loc}`).toBeTruthy();
        expect(aug.desc[loc], `Missing desc for ${aug.id} in ${loc}`).toBeTruthy();
      }
    }
  });

  it("detects 50-point milestones accurately", () => {
    expect(isAugmentMilestone(0, 0)).toBe(false);
    expect(isAugmentMilestone(40, 0)).toBe(false);
    expect(isAugmentMilestone(50, 0)).toBe(true);
    expect(isAugmentMilestone(50, 50)).toBe(false); // already drafted at 50
    expect(isAugmentMilestone(60, 50)).toBe(false);
    expect(isAugmentMilestone(100, 50)).toBe(true);
    expect(isAugmentMilestone(150, 100)).toBe(true);
  });

  it("rolls 3 unique augment choices prioritizing unowned ones", () => {
    const rolled = rollAugmentChoices([]);
    expect(rolled.length).toBe(3);
    const ids = rolled.map((r) => r.id);
    expect(new Set(ids).size).toBe(3);

    // If 2 already owned, the remaining 3 unowned are guaranteed
    const owned: AugmentId[] = ["magnet", "ghost"];
    const rolledWithOwned = rollAugmentChoices(owned);
    expect(rolledWithOwned.length).toBe(3);
    for (const r of rolledWithOwned) {
      expect(owned.includes(r.id)).toBe(false);
    }
  });

  it("calculates augmented tick interval with overclock slow multiplier", () => {
    const normal50 = calculateAugmentedTickInterval(50, false);
    const slow50 = calculateAugmentedTickInterval(50, true);
    expect(slow50).toBeGreaterThan(normal50);
    expect(slow50).toBe(Math.round(normal50 * 1.3));
  });
});
