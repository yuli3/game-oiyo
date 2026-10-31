import { describe, it, expect } from "vitest";
import {
  GhostReplayRecorder,
  GhostReplayPlayer,
  TimeAttackDeltaSolver,
} from "./ghost-replay-engine";

describe("Ghost Replay Engine", () => {
  it("records samples at 60Hz intervals and exports valid payload", () => {
    const recorder = new GhostReplayRecorder(60);

    // 100ms 경과 (약 6 프레임)
    for (let i = 0; i < 6; i++) {
      recorder.recordSample(16.66, {
        x: i * 10,
        y: 0,
        angle: 0,
        speed: 50,
        progress: (i + 1) / 10,
      });
    }

    const payload = recorder.exportPayload("track-01", "SpeedRacer");
    expect(payload.version).toBe(1);
    expect(payload.meta.trackId).toBe("track-01");
    expect(payload.meta.playerTag).toBe("SpeedRacer");
    expect(payload.frames.length).toBeGreaterThanOrEqual(5);
    expect(payload.frames[0].x).toBe(0);
  });

  it("smoothly interpolates ghost state across timeMs", () => {
    const recorder = new GhostReplayRecorder(60);
    // 0ms -> 1000ms 동안 x=0 -> x=100 이동
    for (let t = 0; t <= 60; t++) {
      recorder.recordSample(16.666, {
        x: (t / 60) * 100,
        y: 0,
        angle: 0,
        speed: 100,
        progress: t / 60,
      });
    }

    const payload = recorder.exportPayload("linear-track");
    const player = new GhostReplayPlayer();
    player.load(payload);

    // 중간 지점 (500ms) 샘플링
    const midSample = player.sampleAt(500);
    expect(midSample).not.toBeNull();
    if (midSample) {
      expect(midSample.x).toBeGreaterThan(45);
      expect(midSample.x).toBeLessThan(55);
      expect(midSample.progress).toBeCloseTo(0.5, 1);
    }
  });

  it("calculates real-time time-attack delta correctly", () => {
    const recorder = new GhostReplayRecorder(60);
    // 고스트: 120프레임 (2000ms) 동안 progress 0.0 -> 1.0 (50%인 0.5는 1000ms에 도달)
    for (let t = 0; t <= 120; t++) {
      recorder.recordSample(16.666, {
        x: 0,
        y: 0,
        angle: 0,
        speed: 50,
        progress: t / 120,
      });
    }
    const ghostPayload = recorder.exportPayload("track-delta");

    // 시나리오 A: 플레이어가 800ms만에 progress 0.5 도달 (고스트의 1000ms보다 약 200ms 빠름)
    const resultAhead = TimeAttackDeltaSolver.calculateDelta(
      0.5,
      800,
      ghostPayload
    );
    expect(resultAhead.isAhead).toBe(true);
    expect(resultAhead.deltaMs).toBeLessThanOrEqual(-150);
    expect(resultAhead.formatted).toContain("-");

    // 시나리오 B: 플레이어가 1300ms에 progress 0.5 도달 (고스트의 1000ms보다 약 300ms 느림)
    const resultBehind = TimeAttackDeltaSolver.calculateDelta(
      0.5,
      1300,
      ghostPayload
    );
    expect(resultBehind.isAhead).toBe(false);
    expect(resultBehind.deltaMs).toBeGreaterThanOrEqual(250);
    expect(resultBehind.formatted).toContain("+");
  });
});
