import { describe, expect, it } from "vitest";
import {
  addTrauma,
  createHitStopState,
  createShakeState,
  triggerHitStop,
  updateHitStop,
  updateShake,
} from "./juice-engine";

describe("juice-engine", () => {
  describe("screen shake (Trauma^2)", () => {
    it("initializes with zero trauma and zero offset", () => {
      const shake = createShakeState();
      expect(shake.trauma).toBe(0);
      const { state, offset } = updateShake(shake, 0.016, 1.0);
      expect(state.trauma).toBe(0);
      expect(offset).toEqual({ x: 0, y: 0, angle: 0 });
    });

    it("clamps trauma to 1.0 maximum", () => {
      let shake = createShakeState();
      shake = addTrauma(shake, 0.7);
      expect(shake.trauma).toBe(0.7);
      shake = addTrauma(shake, 0.5);
      expect(shake.trauma).toBe(1.0);
    });

    it("decays trauma over time and computes non-linear offset", () => {
      let shake = createShakeState({ decay: 1.0, maxOffset: 20 });
      shake = addTrauma(shake, 0.8);

      const { state: s1, offset: o1 } = updateShake(shake, 0.2, 1.0);
      // Trauma was 0.8, decayed by 1.0 * 0.2 = 0.2 -> 0.6
      expect(s1.trauma).toBeCloseTo(0.6, 2);
      // Shake amount is 0.6^2 = 0.36
      expect(Math.abs(o1.x)).toBeGreaterThan(0);
      expect(Math.abs(o1.y)).toBeGreaterThan(0);
    });

    it("resets to zero when decayed below threshold", () => {
      let shake = createShakeState({ decay: 5.0 });
      shake = addTrauma(shake, 0.1);
      const { state, offset } = updateShake(shake, 0.1, 1.0);
      expect(state.trauma).toBe(0);
      expect(offset).toEqual({ x: 0, y: 0, angle: 0 });
    });
  });

  describe("hit-stop frame freeze", () => {
    it("starts inactive", () => {
      const hitStop = createHitStopState();
      expect(hitStop.active).toBe(false);
      const { isPaused } = updateHitStop(hitStop, 16);
      expect(isPaused).toBe(false);
    });

    it("pauses game when triggered and resumes after elapsed duration", () => {
      let hitStop = createHitStopState();
      hitStop = triggerHitStop(hitStop, 60);
      expect(hitStop.active).toBe(true);
      expect(hitStop.remainingMs).toBe(60);

      const step1 = updateHitStop(hitStop, 30);
      expect(step1.isPaused).toBe(true);
      expect(step1.state.remainingMs).toBe(30);

      const step2 = updateHitStop(step1.state, 35);
      expect(step2.state.active).toBe(false);
      expect(step2.state.remainingMs).toBe(0);

      const step3 = updateHitStop(step2.state, 16);
      expect(step3.isPaused).toBe(false);
    });
  });
});
