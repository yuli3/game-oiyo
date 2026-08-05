import { describe, expect, it } from "vitest";
import { ENEMY_HEALTH, WEAPONS, applyTempestDamage, blastDamage, cameraShake, missionScore, structureStage, weaponDrop } from "./iron-tempest";

describe("Iron Tempest combat rules", () => {
  it("keeps all three weapons mechanically distinct", () => {
    expect(new Set(Object.values(WEAPONS).map((w) => `${w.damage}/${w.cooldown}/${w.speed}`)).size).toBe(3);
    expect(WEAPONS.heavy.cooldown).toBeLessThan(WEAPONS.rifle.cooldown);
    expect(WEAPONS.rocket.damage).toBeGreaterThan(WEAPONS.heavy.damage);
  });
  it("drops alternating arcade power-ups at deterministic milestones", () => {
    expect(weaponDrop(7)).toBe("heavy");
    expect(weaponDrop(14)).toBe("rocket");
    expect(weaponDrop(13)).toBeNull();
  });
  it("reduces armored damage and never creates negative health", () => {
    expect(applyTempestDamage(100, 20, true).dealt).toBe(9);
    expect(applyTempestDamage(10, 99).health).toBe(0);
    expect(ENEMY_HEALTH.boss).toBeGreaterThan(ENEMY_HEALTH.shield);
  });
  it("falls off explosive damage and advances destruction stages", () => {
    expect(blastDamage(100, 0, 100)).toBe(100);
    expect(blastDamage(100, 50, 100)).toBe(50);
    expect(blastDamage(100, 100, 100)).toBe(0);
    expect(structureStage(100, 100)).toBe(0);
    expect(structureStage(50, 100)).toBe(1);
    expect(structureStage(0, 100)).toBe(3);
  });
  it("scores objectives and bounds screen shake", () => {
    expect(missionScore(10, 2, 400, 100)).toBe(4250);
    expect(cameraShake(999, 1)).toBe(22);
    expect(cameraShake(0, 10)).toBe(0);
  });
});
