import { describe, it, expect, vi } from "vitest";
import {
  Card3DTiltSolver,
  DynamicDifficultyAdjustmentEngine,
  GhostReplayRecorder,
  GhostReplayPlayer,
  TimeAttackDeltaSolver,
  MobileHapticsPro,
  InputGenerosity,
  createInputGenerosity,
  getShakeCssVars,
  playComboSfx,
  playGlobalSfx,
} from "./engine-suite-unified";

describe("Unified Engine Suite Facade", () => {
  it("exposes all core pro classes cleanly for game injection", () => {
    expect(Card3DTiltSolver).toBeDefined();
    expect(DynamicDifficultyAdjustmentEngine).toBeDefined();
    expect(GhostReplayRecorder).toBeDefined();
    expect(GhostReplayPlayer).toBeDefined();
    expect(TimeAttackDeltaSolver).toBeDefined();
    expect(MobileHapticsPro).toBeDefined();
    expect(InputGenerosity).toBeDefined();
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

  it("handles InputGenerosity buffer and coyote timings cleanly", () => {
    const input = createInputGenerosity();
    input.bufferPress("jump", 0.16);
    expect(input.consumeBufferedPress("jump")).toBe(true);
    expect(input.consumeBufferedPress("jump")).toBe(false);

    // Coyote time test
    input.startCoyote("ground", 0.14);
    expect(input.consumeCoyote("ground")).toBe(true);
    expect(input.consumeCoyote("ground")).toBe(false);

    // Expiration test
    input.bufferPress("jump", 0.1);
    input.update(0.12);
    expect(input.consumeBufferedPress("jump")).toBe(false);
  });

  it("computes hardware-accelerated shake CSS variables", () => {
    const cssVars = getShakeCssVars({ x: 4.25, y: -2.81, angle: 1.48 });
    expect(cssVars["--shake-x"]).toBe("4.3px");
    expect(cssVars["--shake-y"]).toBe("-2.8px");
    expect(cssVars["--shake-rot"]).toBe("1.5deg");
  });

  it("handles playGlobalSfx and playComboSfx safely in non-DOM/mock environments", () => {
    expect(() => playGlobalSfx("coin")).not.toThrow();
    expect(() => playComboSfx(null, "coin", 3)).not.toThrow();
  });
});
