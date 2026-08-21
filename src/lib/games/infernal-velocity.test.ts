import { describe, expect, it } from "vitest";
import {
  DEMON_HEALTH,
  INFERNAL_WEAPONS,
  applyDamage,
  accelerateVelocity,
  applyGroundFriction,
  arenaBound,
  canJump,
  comboMultiplier,
  dashVelocity,
  demonForSpawn,
  eliminationScore,
  shotIntervalMs,
  splashDamage,
  waveBudget,
  reviewInfernalRun,
} from "./infernal-velocity";

describe("Infernal Velocity combat rules", () => {
  it("scales waves with a bounded encounter budget", () => {
    expect(waveBudget(1)).toBe(7);
    expect(waveBudget(6)).toBeGreaterThan(waveBudget(3));
    expect(waveBudget(99)).toBe(32);
  });

  it("introduces distinct monsters as waves rise", () => {
    expect(demonForSpawn(1, 6)).toBe("crawler");
    expect(demonForSpawn(2, 3)).toBe("wraith");
    expect(demonForSpawn(3, 6)).toBe("brute");
    expect(DEMON_HEALTH.brute).toBeGreaterThan(DEMON_HEALTH.wraith);
  });

  it("allows exactly two jumps before landing", () => {
    expect(canJump(0)).toBe(true);
    expect(canJump(1)).toBe(true);
    expect(canJump(2)).toBe(false);
  });

  it("normalizes directional dash and falls back to forward", () => {
    expect(dashVelocity({ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 0 })).toEqual({ x: 0, z: -17 });
    const diagonal = dashVelocity({ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 1, z: 1 });
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(17);
  });

  it("caps combo score and never creates negative health", () => {
    expect(comboMultiplier(99)).toBe(2);
    expect(eliminationScore("brute", 4)).toBe(800);
    expect(applyDamage(20, 99)).toEqual({ health: 0, killed: true });
  });

  it("keeps all weapons mechanically distinct", () => {
    expect(new Set(Object.values(INFERNAL_WEAPONS).map((weapon) => `${weapon.damage}/${weapon.pellets}/${weapon.rpm}`)).size).toBe(3);
    expect(shotIntervalMs(INFERNAL_WEAPONS.plasma)).toBeLessThan(shotIntervalMs(INFERNAL_WEAPONS.scattergun));
    expect(arenaBound(90)).toBe(28);
  });

  it("preserves momentum while air-strafing and adds speed along the wish direction", () => {
    const next = accelerateVelocity({ x: 12, z: 0 }, { x: 0, z: -1 }, 4.2, 9.4, 1 / 60);
    expect(next.x).toBe(12);
    expect(next.z).toBeLessThan(0);
    expect(Math.hypot(next.x, next.z)).toBeGreaterThan(12);
  });

  it("applies friction only when requested and supports bunny-hop speed retention", () => {
    expect(applyGroundFriction({ x: 10, z: 0 }, 8, 1 / 60).x).toBeLessThan(10);
    expect(applyGroundFriction({ x: 10, z: 0 }, 0, 1 / 60)).toEqual({ x: 10, z: 0 });
  });

  it("reviews aim, eliminations, then wave progress", () => {
    expect(reviewInfernalRun({ accuracy: 20, kills: 20, wave: 3 })).toBe("accuracy");
    expect(reviewInfernalRun({ accuracy: 50, kills: 4, wave: 3 })).toBe("kills");
    expect(reviewInfernalRun({ accuracy: 50, kills: 20, wave: 3 })).toBe("wave");
    expect(splashDamage(120, 3, 6)).toBe(60);
  });
});
