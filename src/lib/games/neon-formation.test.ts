import { describe, expect, it } from "vitest";
import {
  clampShipX,
  divePoint,
  enemyScore,
  formationSlots,
  inTractorBeam,
  nextExtraLifeThreshold,
  tractorRadius,
  waveBonus,
} from "./neon-formation";

describe("neon formation rules", () => {
  it("builds a symmetric 24-enemy opening formation", () => {
    const slots = formationSlots(1);
    expect(slots).toHaveLength(24);
    expect(slots[0].x).toBe(-slots[7].x);
    expect(slots.filter((slot) => slot.kind === "warden")).toHaveLength(4);
  });

  it("adds rows at later waves without exceeding five", () => {
    expect(formationSlots(3)).toHaveLength(32);
    expect(formationSlots(99)).toHaveLength(40);
  });

  it("creates a curved dive that exits beneath the player", () => {
    expect(divePoint(0, 2, -3, 1)).toEqual({ x: 2, y: 5, z: 0 });
    expect(divePoint(1, 2, -3, 1).y).toBeLessThan(-7);
    expect(divePoint(0.5, 2, -3, 1).x).toBeGreaterThan(4);
  });

  it("widens tractor beams and detects capture honestly", () => {
    expect(tractorRadius(1)).toBeGreaterThan(tractorRadius(0));
    expect(inTractorBeam(0.5, 0, 1)).toBe(true);
    expect(inTractorBeam(5, 0, 1)).toBe(false);
  });

  it("rewards dangerous dive shots and chains", () => {
    expect(enemyScore("warden", true, 5)).toBeGreaterThan(enemyScore("warden", false, 0));
    expect(enemyScore("scout", false, 99)).toBe(enemyScore("scout", false, 10));
  });

  it("computes wave/rescue bonuses and safe bounds", () => {
    expect(waveBonus(3, true)).toBe(3_000);
    expect(nextExtraLifeThreshold(20_000)).toBe(40_000);
    expect(clampShipX(99)).toBe(7.2);
  });
});

