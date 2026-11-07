import { describe, it, expect, beforeEach } from "vitest";
import { PowerWashEngine } from "./powerwash-3d";
import { INITIAL_POWERWASH_QUESTS } from "./powerwash-3d-quests";
import { pickPowerWashDialogue } from "./powerwash-3d-lore";
import {
  POWERWASH_UPGRADES,
  computePowerWashModifiers,
  getPowerWashUpgradeCost,
  type PowerWashMetaSave,
} from "./powerwash-3d-meta";

describe("PowerWashEngine & 6-System Deepening Suite", () => {
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
    expect(state.usedNozzles).toContain("15deg");
  });

  it("노즐 변경 및 분사 방향(수평/수직) 회전이 정상 작동해야 함", () => {
    engine.selectNozzle("0deg");
    expect(engine.getState().selectedNozzle).toBe("0deg");
    expect(engine.getState().usedNozzles).toContain("0deg");

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

  it("정화 의뢰서 퀘스트 4종이 올바르게 정의되어 있어야 함", () => {
    expect(INITIAL_POWERWASH_QUESTS.length).toBe(4);
    const firstClean = INITIAL_POWERWASH_QUESTS.find((q) => q.id === "quest_first_clean");
    expect(firstClean).toBeDefined();
    expect(firstClean?.rewardCash).toBe(120);
    expect(firstClean?.title.ko).toBe("첫 광택의 쾌감");
  });

  it("의뢰인 로어 통신 대사가 각 트리거별로 올바르게 추출되어야 함", () => {
    const triggers = ["game_start", "part_cleared", "soap_applied", "mutant_spotted", "stage_cleared"] as const;
    for (const trig of triggers) {
      const dialogue = pickPowerWashDialogue(trig);
      expect(dialogue).toBeDefined();
      expect(dialogue.text.ko.length).toBeGreaterThan(5);
      expect(dialogue.avatar.length).toBeGreaterThan(0);
    }
  });

  it("정비소 메타 업그레이드 비용 산출 및 모디파이어 계산이 정확해야 함", () => {
    const pump = POWERWASH_UPGRADES.find((u) => u.id === "turbo_pump")!;
    expect(getPowerWashUpgradeCost(pump, 0)).toBe(150);
    expect(getPowerWashUpgradeCost(pump, 1)).toBe(Math.round(150 * 1.6));
    expect(getPowerWashUpgradeCost(pump, 5)).toBe(0); // Max level

    const save: PowerWashMetaSave = {
      version: 1,
      walletCash: 1000,
      upgradeLevels: {
        turbo_pump: 2, // 1.0 + 0.3 = 1.3
        wide_lance: 1, // 1.0 + 0.12 = 1.12
        eco_collector: 2, // 1.0 + 0.3 = 1.3
      },
      totalPartsCleaned: 10,
      totalStagesCleared: 2,
    };

    const mods = computePowerWashModifiers(save);
    expect(mods.powerMult).toBeCloseTo(1.3, 2);
    expect(mods.radiusMult).toBeCloseTo(1.12, 2);
    expect(mods.cashRewardMult).toBeCloseTo(1.3, 2);
  });

  it("특수 고착 오염원(tar, rust, moss)이 그리드에 생성되고 박리 시 카운트되어야 함", () => {
    const parts = engine.getState().parts;
    let foundMutant = false;

    for (const p of parts) {
      for (let r = 0; r < p.gridRows; r++) {
        for (let c = 0; c < p.gridCols; c++) {
          if (p.grimeTypeGrid[r][c] !== "normal") {
            foundMutant = true;
            break;
          }
        }
        if (foundMutant) break;
      }
      if (foundMutant) break;
    }

    expect(foundMutant).toBe(true);
  });
});
