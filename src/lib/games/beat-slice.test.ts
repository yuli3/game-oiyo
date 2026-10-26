import { describe, it, expect, beforeEach } from "vitest";
import {
  BeatSliceEngine,
  generateProceduralChart,
  JUDGMENT_WINDOWS,
  type SongTrack,
} from "./beat-slice";

describe("BeatSliceEngine", () => {
  let track: SongTrack;
  let engine: BeatSliceEngine;

  beforeEach(() => {
    track = {
      id: "test-track",
      title: "Test Track",
      bpm: 120, // 0.5s per beat
      notes: [
        {
          id: "note_0",
          lane: 0,
          beat: 2,
          targetTime: 1.0,
          direction: "down",
          color: "cyan",
          hit: false,
          missed: false,
        },
        {
          id: "note_1",
          lane: 1,
          beat: 3,
          targetTime: 1.5,
          direction: "left",
          color: "cyan",
          hit: false,
          missed: false,
        },
        {
          id: "note_2",
          lane: 2,
          beat: 4,
          targetTime: 2.0,
          direction: "any",
          color: "magenta",
          hit: false,
          missed: false,
        },
      ],
      totalDuration: 4.0,
    };
    engine = new BeatSliceEngine(track);
  });

  it("초기 상태를 정확히 생성해야 함", () => {
    const state = engine.getState();
    expect(state.score).toBe(0);
    expect(state.combo).toBe(0);
    expect(state.multiplier).toBe(1);
    expect(state.isFever).toBe(false);
    expect(state.activeNotes.length).toBe(3);
    expect(state.rank).toBe("S+");
  });

  it("PERFECT 윈도우 타이밍에서 정확한 방향 슬라이스 시 PERFECT 판정", () => {
    engine.start();
    // note_0 targetTime = 1.0s, 현재 시간을 1.01s (10ms 오차)로 설정
    engine.update(1.01);

    const result = engine.slice(0, "down");
    expect(result).not.toBeNull();
    expect(result?.judgment).toBe("PERFECT");

    const state = engine.getState();
    expect(state.score).toBe(100);
    expect(state.combo).toBe(1);
    expect(state.judgmentCounts.PERFECT).toBe(1);
    expect(state.splitBlocks.length).toBe(1);
  });

  it("GREAT 윈도우 및 GOOD 윈도우 타이밍 정확 판정", () => {
    engine.start();
    // note_0 targetTime = 1.0s, 현재 시간을 1.08s (80ms 차이: GREAT 구간)
    engine.update(1.08);

    const result = engine.slice(0, "down");
    expect(result?.judgment).toBe("GREAT");

    const state = engine.getState();
    expect(state.score).toBe(70);
    expect(state.combo).toBe(1);
    expect(state.judgmentCounts.GREAT).toBe(1);
  });

  it("틀린 방향으로 슬라이스하면 MISS 판정 및 콤보 초기화", () => {
    engine.start();
    engine.update(1.0);

    // note_0의 방향은 'down'인데 'up'으로 슬라이스
    const result = engine.slice(0, "up");
    expect(result?.judgment).toBe("MISS");

    const state = engine.getState();
    expect(state.combo).toBe(0);
    expect(state.judgmentCounts.MISS).toBe(1);
    expect(state.activeNotes[0].missed).toBe(true);
  });

  it("판정 시간을 초과한 노드는 엔진 업데이트 시 자동으로 MISS 처리", () => {
    engine.start();
    // note_0 targetTime = 1.0s, 1.25s까지 시간을 흘려 GOOD 윈도우(0.19s) 초과
    engine.update(1.25);

    const state = engine.getState();
    expect(state.activeNotes[0].missed).toBe(true);
    expect(state.judgmentCounts.MISS).toBe(1);
    expect(state.combo).toBe(0);
  });

  it("any 방향 노드는 어떤 슬라이스 방향으로도 타격 가능해야 함", () => {
    engine.start();
    engine.update(2.0); // note_2 targetTime = 2.0s, direction = 'any'

    const result = engine.slice(2, "right");
    expect(result?.judgment).toBe("PERFECT");
    expect(engine.getState().combo).toBe(1);
  });

  it("절차적 차트 생성 함수가 유효한 노트 목록을 생성해야 함", () => {
    const proceduralTrack = generateProceduralChart("cyber-rush", 135, 16);
    expect(proceduralTrack.bpm).toBe(135);
    expect(proceduralTrack.notes.length).toBeGreaterThan(10);
    expect(proceduralTrack.totalDuration).toBeGreaterThan(15);
  });
});
