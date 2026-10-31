import { describe, it, expect } from "vitest";
import {
  VectorFlowField2D,
  FlockingSwarm2D,
  type BoidAgent,
} from "./flow-field-boids-engine";

describe("Flow Field & Boids Engine", () => {
  it("generates flow vectors directing towards target cell avoiding obstacles", () => {
    const field = new VectorFlowField2D({ cols: 10, rows: 10, cellSize: 20 });
    // (5, 5)에 장애물 설치
    field.setObstacle(5, 5, true);

    // (8, 8)을 목적지로 필드 생성
    field.generateTowardsCell(8, 8);

    // 목적지 바로 왼쪽 (7, 8) 셀의 벡터는 오른쪽(+x)을 가리켜야 함
    const [dx, dy] = field.sampleVector(7 * 20 + 10, 8 * 20 + 10);
    expect(dx).toBeGreaterThan(0.5);
    expect(Math.abs(dy)).toBeLessThan(0.5);

    // 장애물(5, 5) 위치는 벡터 0
    const [obsDx, obsDy] = field.sampleVector(5 * 20 + 10, 5 * 20 + 10);
    expect(obsDx).toBe(0);
    expect(obsDy).toBe(0);
  });

  it("updates boids swarm towards target while preventing overlap with separation", () => {
    const field = new VectorFlowField2D({ cols: 20, rows: 20, cellSize: 10 });
    // 타겟: (100, 100)
    field.generateTowardsWorld(100, 100);

    const swarm = new FlockingSwarm2D(field, 15, 30);

    // 두 개의 보이드가 거의 겹치는 위치 (10, 10)과 (11, 10)에 생성
    const boid1: BoidAgent = {
      id: 1,
      x: 10,
      y: 10,
      vx: 0,
      vy: 0,
      maxSpeed: 50,
      maxForce: 200,
      radius: 5,
    };
    const boid2: BoidAgent = {
      id: 2,
      x: 11,
      y: 10,
      vx: 0,
      vy: 0,
      maxSpeed: 50,
      maxForce: 200,
      radius: 5,
    };

    swarm.addBoid(boid1);
    swarm.addBoid(boid2);

    // 0.1초 시뮬레이션
    swarm.update(0.1);

    // 군집 전체의 무게 중심은 타겟 방향(+x, +y)으로 전진
    const avgX = (boid1.x + boid2.x) / 2;
    expect(avgX).toBeGreaterThan(10.5);

    // 강력한 분리 반발력으로 두 보이드 사이의 거리가 초기 1px보다 훨씬 더 벌어짐
    const distance = Math.hypot(boid1.x - boid2.x, boid1.y - boid2.y);
    expect(distance).toBeGreaterThan(1.5);
  });
});
