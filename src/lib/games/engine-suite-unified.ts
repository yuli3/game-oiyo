/**
 * @file engine-suite-unified.ts
 * @description 차세대 20대 엔진 모듈 통합 퍼사드 (Unified Engine Suite Facade)
 * - 모든 React 컴포넌트 및 게임 루프에서 1줄로 호출 가능한 훅 & 유틸리티
 * - useCardTiltPro: Balatro 스타일 3D 쿼터니언 틸트 & 젤리 바운스
 * - useDynamicDifficultyPro: Left 4 Dead 스타일 적응형 DDA 난이도 보정
 * - useGhostReplayPro: Polytrack 스타일 틱 기반 고스트 리플레이 & 실시간 PB 델타
 * - useProceduralBgmPro: 0B 외장 오디오 칩튠 시퀀서 & 다이내믹 스템 믹서
 * - useMobileHapticsPro: 6단계 모바일 네이티브 햅틱 진동 피드백
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Card3DTiltSolver, JellySquashStretch2D } from "./spring-motion-physics";
import { DynamicDifficultyAdjustmentEngine, type DifficultyModifiers } from "./dynamic-difficulty-adjustment";
import { GhostReplayRecorder, GhostReplayPlayer, TimeAttackDeltaSolver, type ReplayPayload } from "./ghost-replay-engine";
import { DynamicStemMixer, ProceduralPatternSequencer } from "./generative-dynamic-bgm";
import { MotionGestureController } from "./motion-gesture-controller";

export class MobileHapticsPro {
  public static lightImpact(): void {
    MotionGestureController.triggerHaptic("light");
  }

  public static mediumImpact(): void {
    MotionGestureController.triggerHaptic("medium");
  }

  public static heavyImpact(): void {
    MotionGestureController.triggerHaptic("heavy");
  }

  public static selectionClick(): void {
    MotionGestureController.triggerHaptic("selection");
  }

  public static successPattern(): void {
    MotionGestureController.triggerHaptic("success");
  }

  public static warningPattern(): void {
    MotionGestureController.triggerHaptic("warning");
  }

  // Developer convenience aliases
  public static light(): void {
    MotionGestureController.triggerHaptic("light");
  }

  public static medium(): void {
    MotionGestureController.triggerHaptic("medium");
  }

  public static heavy(): void {
    MotionGestureController.triggerHaptic("heavy");
  }

  public static impact(): void {
    MotionGestureController.triggerHaptic("medium");
  }

  public static click(): void {
    MotionGestureController.triggerHaptic("selection");
  }

  public static success(): void {
    MotionGestureController.triggerHaptic("success");
  }

  public static warning(): void {
    MotionGestureController.triggerHaptic("warning");
  }

  public static error(): void {
    MotionGestureController.triggerHaptic("heavy");
  }
}

/**
 * 1. Balatro 스타일 3D 카드/타일 틸트 훅
 */
export function useCardTiltPro() {
  const solverRef = useRef<Card3DTiltSolver | null>(null);
  if (!solverRef.current) solverRef.current = new Card3DTiltSolver();

  const [transformCss, setTransformCss] = useState("perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)");

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;

    const res = solverRef.current!.updatePointer(normX, normY, true, false, 0.016);
    setTransformCss(res.transformCss);
  }, []);

  const onPointerLeave = useCallback(() => {
    const res = solverRef.current!.updatePointer(0, 0, false, false, 0.016);
    setTransformCss(res.transformCss);
  }, []);

  const triggerPop = useCallback((intensity = 0.25) => {
    solverRef.current!.triggerJuicePop(intensity);
    MobileHapticsPro.lightImpact();
  }, []);

  return {
    transformCss,
    onPointerMove,
    onPointerLeave,
    triggerPop,
  };
}

/**
 * 2. Left 4 Dead 스타일 실시간 적응형 DDA 난이도 훅
 */
export function useDynamicDifficultyPro() {
  const engineRef = useRef<DynamicDifficultyAdjustmentEngine | null>(null);
  if (!engineRef.current) engineRef.current = new DynamicDifficultyAdjustmentEngine();

  const [modifiers, setModifiers] = useState<DifficultyModifiers>(() =>
    engineRef.current!.evaluateModifiers()
  );

  const reportAction = useCallback(() => {
    engineRef.current?.registerPlayerAction();
  }, []);

  const reportHit = useCallback(() => {
    engineRef.current?.registerPlayerHit();
    setModifiers(engineRef.current!.evaluateModifiers());
    MobileHapticsPro.mediumImpact();
  }, []);

  const reportDeath = useCallback(() => {
    engineRef.current?.registerPlayerDeath();
    setModifiers(engineRef.current!.evaluateModifiers());
    MobileHapticsPro.heavyImpact();
  }, []);

  const reportVictory = useCallback(() => {
    engineRef.current?.registerRoundVictory();
    setModifiers(engineRef.current!.evaluateModifiers());
    MobileHapticsPro.selectionClick();
  }, []);

  const updateTime = useCallback((dtSeconds: number) => {
    if (engineRef.current) {
      engineRef.current.updateTime(dtSeconds);
      setModifiers(engineRef.current.evaluateModifiers());
    }
  }, []);

  const flowState: "flow" | "danger" | "chill" =
    modifiers.flowCategory === "optimal"
      ? "flow"
      : modifiers.flowCategory === "frustrated"
        ? "danger"
        : "chill";

  return {
    modifiers,
    flowState,
    currentMultiplier: modifiers.enemySpeedMultiplier,
    reportAction,
    reportHit,
    reportDeath,
    reportVictory,
    reportSuccess: reportAction,
    reportFailure: reportDeath,
    updateTime,
    recordHit: reportHit,
    recordKill: reportVictory,
    recordDeath: reportDeath,
    recordSurvivalTime: updateTime,
  };
}

/**
 * 3. Polytrack 스타일 결정론적 고스트 리플레이 & 타임어택 델타 훅
 */
export function useGhostTimeAttackPro(trackId: string) {
  const recorderRef = useRef<GhostReplayRecorder>(new GhostReplayRecorder(60));
  const playerRef = useRef<GhostReplayPlayer>(new GhostReplayPlayer());
  const [bestGhost, setBestGhost] = useState<ReplayPayload | null>(null);

  // 로컬 스토리지에서 최고 기록(PB) 고스트 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`oiyo:ghost:${trackId}`);
      if (saved) {
        const payload: ReplayPayload = JSON.parse(saved);
        setBestGhost(payload);
        playerRef.current.load(payload);
      }
    } catch {
      // ignore
    }
  }, [trackId]);

  const recordFrame = useCallback(
    (dtMs: number, state: { x: number; y: number; z?: number; angle: number; speed: number; progress: number }) => {
      recorderRef.current.recordSample(dtMs, state);
    },
    []
  );

  const saveBestIfFaster = useCallback(
    (finalTimeMs: number): boolean => {
      if (!bestGhost || finalTimeMs < bestGhost.meta.totalTimeMs) {
        const payload = recorderRef.current.exportPayload(trackId);
        try {
          localStorage.setItem(`oiyo:ghost:${trackId}`, JSON.stringify(payload));
          setBestGhost(payload);
          playerRef.current.load(payload);
          MobileHapticsPro.heavyImpact();
          return true;
        } catch {
          // ignore
        }
      }
      return false;
    },
    [bestGhost, trackId]
  );

  const getGhostSample = useCallback((timeMs: number) => {
    return playerRef.current.sampleAt(timeMs);
  }, []);

  const getLiveDelta = useCallback(
    (currentProgress: number, currentTimeMs: number) => {
      if (!bestGhost) return { deltaMs: 0, formatted: "PB 없음", isAhead: true };
      return TimeAttackDeltaSolver.calculateDelta(currentProgress, currentTimeMs, bestGhost);
    },
    [bestGhost]
  );

  const resetRun = useCallback(() => {
    recorderRef.current.reset();
  }, []);

  const [liveDelta, setLiveDelta] = useState<{
    deltaSec: number;
    deltaMs: number;
    formatted: string;
    isAhead: boolean;
  } | null>(null);

  const updateProgress = useCallback(
    (currentProgress: number, currentTimeSec: number) => {
      const res = getLiveDelta(currentProgress, currentTimeSec * 1000);
      setLiveDelta({
        deltaSec: res.deltaMs / 1000,
        deltaMs: res.deltaMs,
        formatted: res.formatted,
        isAhead: res.isAhead,
      });
    },
    [getLiveDelta]
  );

  const recordLap = useCallback(
    (finalLapSec: number): boolean => {
      return saveBestIfFaster(finalLapSec * 1000);
    },
    [saveBestIfFaster]
  );

  return {
    bestGhost,
    hasPersonalBest: Boolean(bestGhost),
    liveDelta,
    recordFrame,
    saveBestIfFaster,
    getGhostSample,
    getLiveDelta,
    resetRun,
    updateProgress,
    recordLap,
  };
}

/**
 * 4. 0B 외장 오디오 칩튠 다이내믹 BGM 믹서 훅
 */
export function useProceduralBgmPro() {
  const mixerRef = useRef<DynamicStemMixer>(new DynamicStemMixer());
  const sequencerRef = useRef<ProceduralPatternSequencer>(new ProceduralPatternSequencer());

  const setTension = useCallback((level: 1 | 2 | 3) => {
    mixerRef.current.setTensionLevel(level);
  }, []);

  const advanceBeat = useCallback(() => {
    return sequencerRef.current.advanceStep();
  }, []);

  return {
    setTension,
    advanceBeat,
    getStemVolume: (layer: "bass" | "arp" | "drums" | "lead") => mixerRef.current.getStemVolume(layer),
  };
}

export {
  JellySquashStretch2D,
  Card3DTiltSolver,
  DynamicDifficultyAdjustmentEngine,
  GhostReplayRecorder,
  GhostReplayPlayer,
  TimeAttackDeltaSolver,
};
