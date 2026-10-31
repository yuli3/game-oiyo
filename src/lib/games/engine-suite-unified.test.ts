import { describe, it, expect } from "vitest";
import {
  Card3DTiltSolver,
  DynamicDifficultyAdjustmentEngine,
  GhostReplayRecorder,
  GhostReplayPlayer,
  TimeAttackDeltaSolver,
  MobileHapticsPro,
} from "./engine-suite-unified";

describe("Unified Engine Suite Facade", () => {
  it("exposes all core pro classes cleanly for game injection", () => {
    expect(Card3DTiltSolver).toBeDefined();
    expect(DynamicDifficultyAdjustmentEngine).toBeDefined();
    expect(GhostReplayRecorder).toBeDefined();
    expect(GhostReplayPlayer).toBeDefined();
    expect(TimeAttackDeltaSolver).toBeDefined();
    expect(MobileHapticsPro).toBeDefined();
  });

  it("orchestrates tilt and DDA without throwing", () => {
    const tilt = new Card3DTiltSolver();
    const res = tilt.updatePointer(0.2, 0.2, true, false, 0.016);
    expect(res.transformCss).toContain("perspective");

    const dda = new DynamicDifficultyAdjustmentEngine();
    dda.registerPlayerHit();
    const mod = dda.evaluateModifiers();
    expect(mod.flowCategory).toBeDefined();
  });
});
