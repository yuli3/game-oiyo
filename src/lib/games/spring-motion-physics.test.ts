import { describe, it, expect } from "vitest";
import {
  DampedSpringOscillator,
  Card3DTiltSolver,
  JellySquashStretch2D,
} from "./spring-motion-physics";

describe("Spring Motion Physics & 3D Card Tilt Engine", () => {
  it("oscillates and converges stably to the target value", () => {
    const spring = new DampedSpringOscillator(0, { stiffness: 100, damping: 10 });
    spring.setTarget(10);

    // 시간에 따라 타겟(10)을 향해 전진
    for (let i = 0; i < 20; i++) {
      spring.step(0.016);
    }

    expect(spring.value).toBeGreaterThan(0);

    // 충분한 시간이 지나면 정확히 10에 수렴
    for (let i = 0; i < 200; i++) {
      spring.step(0.016);
    }
    expect(spring.value).toBeCloseTo(10, 2);
    expect(spring.isSettled()).toBe(true);
  });

  it("calculates 3D card tilt and generates valid perspective CSS transform", () => {
    const card = new Card3DTiltSolver();

    // 마우스를 카드 우측 하단(0.4, 0.4)에 오버
    const result = card.updatePointer(0.4, 0.4, true, false, 0.05);

    expect(result.transformCss).toContain("perspective(800px)");
    expect(result.scale).toBeGreaterThan(1.0);
    expect(result.rollDeg).toBeGreaterThan(0); // 우측 롤 기울임
    expect(result.pitchDeg).toBeLessThan(0); // 하단 피치 기울임
  });

  it("exhibits volume-preserving squash and stretch under impact", () => {
    const jelly = new JellySquashStretch2D();
    jelly.impactSquash(0.4);

    const firstStep = jelly.step(0.016);
    // Y축은 찌그러짐(<1.0), X축은 팽창(>1.0)
    expect(firstStep.sy).toBeLessThan(1.0);
    expect(firstStep.sx).toBeGreaterThan(1.0);

    // 시간이 지나면 둘 다 원래 크기 1.0으로 복원
    for (let i = 0; i < 150; i++) {
      jelly.step(0.016);
    }
    const finalStep = jelly.step(0.016);
    expect(finalStep.sx).toBeCloseTo(1.0, 1);
    expect(finalStep.sy).toBeCloseTo(1.0, 1);
  });
});
