import { describe, it, expect } from "vitest";
import {
  CellularAutomataSand2D,
  ELEMENT_EMPTY,
  ELEMENT_SAND,
  ELEMENT_WATER,
  ELEMENT_FIRE,
  ELEMENT_SMOKE,
  ELEMENT_WALL,
} from "./cellular-automata-sand";

describe("Cellular Automata Falling Sand 2D Engine", () => {
  it("drops sand particle under gravity into empty space", () => {
    const sim = new CellularAutomataSand2D(10, 10);
    sim.set(5, 2, ELEMENT_SAND);

    expect(sim.get(5, 2)).toBe(ELEMENT_SAND);

    // 1 스텝 후 y=3으로 낙하
    sim.step();
    expect(sim.get(5, 2)).toBe(ELEMENT_EMPTY);
    expect(sim.get(5, 3)).toBe(ELEMENT_SAND);
  });

  it("displaces water upward when sand falls into water (density physics)", () => {
    const sim = new CellularAutomataSand2D(10, 10);
    // 튜브 형태의 벽 구축 (좌우 x=4, x=6은 벽으로 차단)
    for (let y = 6; y <= 9; y++) {
      sim.set(4, y, ELEMENT_WALL);
      sim.set(6, y, ELEMENT_WALL);
    }
    sim.set(5, 9, ELEMENT_WALL); // 바닥 벽
    sim.set(5, 8, ELEMENT_WATER); // 물
    sim.set(5, 7, ELEMENT_SAND); // 모래

    // 시뮬레이션 스텝
    sim.step();

    // 모래는 가라앉고(y=8), 물은 튜브 안에서 위로 치환(y=7)되어야 함
    expect(sim.get(5, 8)).toBe(ELEMENT_SAND);
    expect(sim.get(5, 7)).toBe(ELEMENT_WATER);
  });

  it("extinguishes fire into smoke when contacting water", () => {
    const sim = new CellularAutomataSand2D(10, 10);
    sim.set(5, 5, ELEMENT_FIRE);
    sim.set(5, 4, ELEMENT_WATER); // 불 바로 위에 물

    sim.step();

    // 물과 접촉하여 불이 꺼지고 연기로 기화
    expect(sim.get(5, 5)).toBe(ELEMENT_SMOKE);
    expect(sim.get(5, 4)).toBe(ELEMENT_EMPTY); // 물 증발
  });
});
