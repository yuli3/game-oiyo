import { describe, expect, it } from "vitest";
import {
  createCameraShake,
  addTrauma,
  updateCameraShake,
} from "./screen-shake";

describe("screen-shake procedural trauma engine", () => {
  it("initializes with zero trauma and default configurations", () => {
    const shake = createCameraShake();
    expect(shake.trauma).toBe(0);
    expect(shake.config.decayRate).toBe(1.5);
    expect(shake.config.exponent).toBe(2);
    expect(shake.config.maxOffsetPx).toBe(16);
  });

  it("adds trauma and clamps between 0 and 1.0", () => {
    let shake = createCameraShake();
    shake = addTrauma(shake, 0.4);
    expect(shake.trauma).toBeCloseTo(0.4, 4);

    shake = addTrauma(shake, 0.8);
    // 0.4 + 0.8 = 1.2, clamped to 1.0
    expect(shake.trauma).toBe(1.0);

    // Negative trauma addition is ignored
    shake = addTrauma(shake, -0.5);
    expect(shake.trauma).toBe(1.0);
  });

  it("decays trauma linearly over time and stops cleanly at zero", () => {
    let shake = createCameraShake({ decayRate: 2.0 });
    shake = addTrauma(shake, 1.0);

    // Step 0.2s -> decay = 2.0 * 0.2 = 0.4 -> trauma = 0.6
    const res1 = updateCameraShake(shake, 0.2);
    expect(res1.state.trauma).toBeCloseTo(0.6, 4);
    expect(res1.offset.isShaking).toBe(true);

    // Step 0.3s -> decay = 2.0 * 0.3 = 0.6 -> trauma = 0.0
    const res2 = updateCameraShake(res1.state, 0.3);
    expect(res2.state.trauma).toBe(0);
    expect(res2.offset.isShaking).toBe(false);
    expect(res2.offset.offsetX).toBe(0);
    expect(res2.offset.offsetY).toBe(0);
    expect(res2.offset.rotationDeg).toBe(0);
  });

  it("applies quadratic power curve Shake = Trauma^2 for non-linear juice", () => {
    // Constant noise = 1.0 to test exact peak math
    const shake = createCameraShake({
      exponent: 2,
      maxOffsetPx: 20,
      maxAngleDeg: 4,
      noiseFn: () => 1.0,
      decayRate: 0, // no decay in this test
    });

    const withTrauma = addTrauma(shake, 0.5);
    const { offset } = updateCameraShake(withTrauma, 0);

    // Trauma = 0.5 -> Shake = 0.5^2 = 0.25
    expect(offset.shake).toBeCloseTo(0.25, 4);
    // Offset = 20 * 0.25 * 1.0 = 5.0 px
    expect(offset.offsetX).toBeCloseTo(5.0, 4);
    expect(offset.offsetY).toBeCloseTo(5.0, 4);
    // Rotation = 4 * 0.25 * 1.0 = 1.0 deg
    expect(offset.rotationDeg).toBeCloseTo(1.0, 4);
  });
});
