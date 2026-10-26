import { describe, it, expect, beforeEach } from "vitest";
import { SandBallsEngine } from "./sand-balls";

describe("SandBallsEngine", () => {
  let engine: SandBallsEngine;

  beforeEach(() => {
    engine = new SandBallsEngine(400, 650, 8);
  });

  it("초기 레벨 상태(볼 35개, 게이지, 트럭 용량)를 올바르게 초기화해야 함", () => {
    const state = engine.getState();
    expect(state.balls.length).toBe(35);
    expect(state.collectedCount).toBe(0);
    expect(state.truckCapacity).toBe(25);
    expect(state.status).toBe("playing");
    expect(state.gates.length).toBe(1);
    expect(state.pegs.length).toBe(3);
  });

  it("모래 절삭(carve) 시 해당 영역의 dugMask가 true로 변경되어야 함", () => {
    const state = engine.getState();
    const midX = 200;
    const midY = 300;
    const cellC = Math.floor(midX / state.cellSize);
    const cellR = Math.floor(midY / state.cellSize);

    expect(state.dugMask[cellR][cellC]).toBe(false);

    engine.carve(midX, midY, 20);
    expect(state.dugMask[cellR][cellC]).toBe(true);
  });

  it("컬러 볼과 회색 무채색 볼이 충돌하면 회색 볼이 컬러로 감염되어야 함", () => {
    const state = engine.getState();
    const b1 = state.balls.find((b) => b.isColored)!;
    const b2 = state.balls.find((b) => !b.isColored)!;

    // 두 볼을 겹치도록 강제 배치
    b1.x = 200;
    b1.y = 200;
    b1.vx = 0;
    b1.vy = 0;

    b2.x = 203;
    b2.y = 200;
    b2.vx = 0;
    b2.vy = 0;

    engine.update(0.05);

    expect(b2.isColored).toBe(true);
    expect(b2.color).toBe(b1.color);
  });

  it("배율 게이트 통과 시 복제 볼이 추가 생성되어야 함", () => {
    const state = engine.getState();
    const initialCount = state.balls.length;
    const gate = state.gates[0];

    const testBall = state.balls[0];
    testBall.x = gate.x;
    testBall.y = gate.y;

    engine.update(0.05);

    expect(state.balls.length).toBeGreaterThan(initialCount);
    expect(gate.passedBallIds.has(testBall.id)).toBe(true);
  });

  it("하단 트럭 구역에 목표치(25개) 이상 도달 시 승리 판정", () => {
    const state = engine.getState();
    for (let i = 0; i < 26; i++) {
      state.balls[i].y = state.height - 50;
    }

    engine.update(0.1);

    expect(state.collectedCount).toBeGreaterThanOrEqual(25);
    expect(state.status).toBe("victory");
  });
});
