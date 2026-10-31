import { describe, it, expect } from "vitest";
import {
  CircularStateBuffer,
  TimeDilationManager,
  RewindController,
} from "./time-dilation-rewind-engine";

describe("Time Dilation & Rewind Engine", () => {
  it("stores and pops state snapshots without memory overflow", () => {
    const buffer = new CircularStateBuffer(5);

    for (let i = 0; i < 10; i++) {
      buffer.push({
        tick: i,
        timestampMs: i * 16.6,
        timeScale: 1.0,
        entities: [{ id: "player", x: i, y: 0, vx: 1, vy: 0, angle: 0 }],
      });
    }

    // 버퍼 용량은 5로 고정
    expect(buffer.getCount()).toBe(5);

    // 가장 최근 항목부터 역순으로 pop
    const recent = buffer.popRecent();
    expect(recent?.tick).toBe(9);
    const nextRecent = buffer.popRecent();
    expect(nextRecent?.tick).toBe(8);
  });

  it("dynamically modulates timescale based on player activity", () => {
    const manager = new TimeDilationManager({
      minTimeScale: 0.1,
      maxTimeScale: 1.0,
      transitionSpeed: 20,
    });

    // 정지 상태 (속도 = 0)
    for (let i = 0; i < 10; i++) {
      manager.updatePlayerActivity(0.0, 0.05);
    }
    expect(manager.getTimeScale()).toBeLessThan(0.2);

    // 급가속 (속도 = 1.0)
    for (let i = 0; i < 10; i++) {
      manager.updatePlayerActivity(1.0, 0.05);
    }
    expect(manager.getTimeScale()).toBeGreaterThan(0.8);
  });

  it("orchestrates rewind rewinding back in time with speed multiplier", () => {
    const controller = new RewindController(50, 2);

    for (let i = 0; i < 10; i++) {
      controller.recordFrame({
        tick: i,
        timestampMs: i * 16.6,
        timeScale: 1.0,
        entities: [{ id: "hero", x: i * 10, y: 0, vx: 10, vy: 0, angle: 0 }],
      });
    }

    expect(controller.getAvailableFrames()).toBe(10);

    controller.startRewind();
    expect(controller.getIsRewinding()).toBe(true);

    // 2x 배속으로 첫 번째 스텝 실행 (9와 8이 소비되고 8이 반환됨)
    const frame = controller.stepRewind();
    expect(frame?.tick).toBe(8);
    expect(controller.getAvailableFrames()).toBe(8);

    controller.stopRewind();
    expect(controller.getIsRewinding()).toBe(false);
  });
});
