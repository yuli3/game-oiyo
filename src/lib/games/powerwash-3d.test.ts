import { describe, it, expect, beforeEach } from "vitest";
import { PowerWashEngine } from "./powerwash-3d";

describe("PowerWashEngine", () => {
  let engine: PowerWashEngine;

  beforeEach(() => {
    engine = new PowerWashEngine(0);
  });

  it("스테이지 0(클래식 캠핑 밴) 파츠와 초기 오염 상태를 올바르게 생성해야 함", () => {
    const state = engine.getState();
    expect(state.stageIndex).toBe(0);
    expect(state.parts.length).toBeGreaterThanOrEqual(6);
    expect(state.totalCleanPercent).toBe(0);
    expect(state.selectedNozzle).toBe("15deg");
    expect(state.orientation).toBe("horizontal");
    expect(state.status).toBe("washing");
  });

  it("노즐 변경 및 분사 방향(수평/수직) 회전이 정상 작동해야 함", () => {
    engine.selectNozzle("0deg");
    expect(engine.getState().selectedNozzle).toBe("0deg");

    engine.toggleOrientation();
    expect(engine.getState().orientation).toBe("vertical");

    engine.toggleOrientation();
    expect(engine.getState().orientation).toBe("horizontal");
  });

  it("고압수 분사(sprayAt) 시 해당 파츠의 오염도가 감소하고 청결도가 상승해야 함", () => {
    const part = engine.getState().parts[0];
    const centerX = part.x + part.w / 2;
    const centerY = part.y + part.h / 2;

    engine.selectNozzle("40deg");
    engine.sprayAt(centerX, centerY, 0.5);

    expect(part.cleanPercent).toBeGreaterThan(0);
  });

  it("비누 거품(soap) 도포 후 고압 노즐 분사 시 세척 효율이 증가해야 함", () => {
    const part = engine.getState().parts[0];
    const cx = part.x + 20;
    const cy = part.y + 20;

    engine.selectNozzle("soap");
    engine.sprayAt(cx, cy, 0.3);
    expect(part.soapGrid[2][2]).toBe(true);

    engine.selectNozzle("15deg");
    engine.sprayAt(cx, cy, 0.5);
    expect(part.dirtGrid[2][2]).toBeLessThan(0.5);
  });

  it("파츠 전체를 골고루 세척하여 95% 이상 깨끗해지면 100% 자동 완결 및 보상이 지급되어야 함", () => {
    const part = engine.getState().parts[1]; // 전면 파노라마 윈도우
    engine.selectNozzle("40deg");

    let completedInfo = null;
    for (let y = part.y; y <= part.y + part.h; y += 12) {
      for (let x = part.x; x <= part.x + part.w; x += 20) {
        const res = engine.sprayAt(x, y, 1.0);
        if (res) completedInfo = res;
      }
    }

    expect(part.isCompleted).toBe(true);
    expect(part.cleanPercent).toBe(100);
    expect(completedInfo).not.toBeNull();
    expect(engine.getState().cashEarned).toBe(part.rewardCash);
  });

  it("잔여 오염 하이라이트(Show Dirt) 스캔 타이머가 정상 작동해야 함", () => {
    engine.triggerDirtHighlight();
    expect(engine.getState().isHighlightingDirt).toBe(true);
    expect(engine.getState().highlightTimer).toBe(2.5);

    engine.update(3.0);
    expect(engine.getState().isHighlightingDirt).toBe(false);
  });
});
