import { describe, it, expect, beforeEach } from "vitest";
import { BadNorthEngine } from "./bad-north";

describe("BadNorthEngine", () => {
  let engine: BadNorthEngine;

  beforeEach(() => {
    engine = new BadNorthEngine(10, 10);
  });

  it("10x10 섬 지형 및 초기 가옥, 3개 병과 분대를 올바르게 초기화해야 함", () => {
    const state = engine.getState();
    expect(state.tiles.length).toBe(100);
    expect(state.houses.length).toBe(3);
    expect(state.squads.length).toBe(3);
    expect(state.squads.find((s) => s.type === "infantry")).toBeDefined();
    expect(state.squads.find((s) => s.type === "archers")).toBeDefined();
    expect(state.squads.find((s) => s.type === "pikes")).toBeDefined();
    expect(state.gameStatus).toBe("playing");
    expect(state.wave).toBe(1);
  });

  it("분대 선택 후 육지 타일로 이동 명령 시 목표 위치가 설정되어야 함", () => {
    engine.selectSquad("squad_infantry");
    const moved = engine.moveSelectedSquad(5, 5);
    expect(moved).toBe(true);

    const infantry = engine.getState().squads.find((s) => s.id === "squad_infantry");
    expect(infantry?.targetX).toBe(5);
    expect(infantry?.targetY).toBe(5);
    expect(infantry?.isBraced).toBe(false);
  });

  it("바다(높이 0) 타일로는 분대가 이동할 수 없어야 함", () => {
    engine.selectSquad("squad_infantry");
    // 외곽 (0, 0) 타일은 바다(height: 0)
    const moved = engine.moveSelectedSquad(0, 0);
    expect(moved).toBe(false);
  });

  it("정지 상태의 창병은 방진(Braced) 상태가 되어야 함", () => {
    const pikes = engine.getState().squads.find((s) => s.type === "pikes");
    expect(pikes?.isBraced).toBe(true);

    // 이동 명령
    engine.selectSquad("squad_pikes");
    engine.moveSelectedSquad(5, 5);
    expect(pikes?.isBraced).toBe(false);

    // 업데이트로 목표지에 도달하면 다시 방진 구축
    for (let i = 0; i < 50; i++) {
      engine.update(0.1);
    }
    expect(pikes?.isBraced).toBe(true);
  });

  it("상륙한 침략자와의 전투에서 창병 방진이 침략자에게 치명타와 넉백을 가해야 함", () => {
    const state = engine.getState();
    const pikes = state.squads.find((s) => s.type === "pikes")!;
    pikes.x = 5;
    pikes.y = 5;
    pikes.targetX = 5;
    pikes.targetY = 5;
    pikes.isBraced = true;

    // 인접 침략자 직접 생성
    state.raiders.push({
      id: "test_raider",
      type: "militia",
      x: 5.2,
      y: 5.2,
      hp: 100,
      speed: 1.0,
      targetHouseId: null,
      targetSquadId: null,
      hasShield: false,
    });

    engine.update(0.2);
    // 침략자 체력이 감소하고 밀려나야 함
    expect(state.raiders[0].hp).toBeLessThan(100);
    expect(state.raiders[0].x).toBeGreaterThan(5.2);
  });

  it("모든 가옥이 파괴되면 패배(defeat) 상태로 전환되어야 함", () => {
    const state = engine.getState();
    state.houses.forEach((h) => {
      h.hp = 0;
      h.destroyed = true;
    });

    engine.update(0.1);
    expect(engine.getState().gameStatus).toBe("defeat");
  });
});
