import { describe, it, expect } from "vitest";
import { DynamicDifficultyAdjustmentEngine } from "./dynamic-difficulty-adjustment";

describe("Dynamic Difficulty Adjustment (DDA) Engine", () => {
  it("adapts and softens game difficulty when player suffers consecutive deaths", () => {
    const dda = new DynamicDifficultyAdjustmentEngine();

    // 3회 연속 사망
    dda.registerPlayerDeath();
    dda.registerPlayerDeath();
    dda.registerPlayerDeath();

    const modifiers = dda.evaluateModifiers();

    expect(modifiers.flowCategory).toBe("frustrated");
    expect(modifiers.tensionScore).toBeLessThan(0.35);
    expect(modifiers.enemySpeedMultiplier).toBeLessThan(1.0); // 적 속도 감속
    expect(modifiers.magneticAimRadiusBonus).toBeGreaterThan(1.0); // 자석 조준 범위 확대
    expect(modifiers.healthDropBonusChance).toBeGreaterThan(0.1); // 힐 드랍 확률 상승
  });

  it("hardens difficulty into exciting flow when player plays flawlessly for extended periods", () => {
    const dda = new DynamicDifficultyAdjustmentEngine();

    // 40초 동안 무피격 생존 및 다수 액션 수행
    for (let sec = 0; sec < 40; sec++) {
      dda.updateTime(1.0);
      dda.registerPlayerAction();
      dda.registerPlayerAction();
    }

    const modifiers = dda.evaluateModifiers();

    expect(modifiers.flowCategory).toBe("bored");
    expect(modifiers.tensionScore).toBeGreaterThan(0.7);
    expect(modifiers.enemySpeedMultiplier).toBeGreaterThan(1.0); // 적 속도 가속
    expect(modifiers.enemySpawnIntervalMultiplier).toBeLessThan(1.0); // 적 스폰 간격 단축
  });
});
