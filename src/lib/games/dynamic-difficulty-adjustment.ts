/**
 * @file dynamic-difficulty-adjustment.ts
 * @description 플레이어 맞춤형 동적 난이도 조절 시스템 (DDA Engine - Left 4 Dead AI Director 스타일)
 * - 실시간 플레이어 텐션 & 숙련도 추적기 (Performance Tracker)
 * - 몰입(Flow) 상태 판정기 (Flow State Evaluator)
 * - 게임플레이 파라미터 미세 보정기 (Dynamic Difficulty Modifiers)
 */

export interface PlayerSessionMetrics {
  consecutiveDeaths: number; // 연속 사망 횟수
  survivalSeconds: number; // 현재 라운드 생존 시간
  hitlessStreakSeconds: number; // 피격 없이 버틴 시간
  apm: number; // 분당 액션 수 (Actions Per Minute)
}

export interface DifficultyModifiers {
  enemySpeedMultiplier: number; // 적 및 투사체 속도 (0.80 ~ 1.25)
  enemySpawnIntervalMultiplier: number; // 스폰 주기 (1.25 느림 ~ 0.75 빠름)
  magneticAimRadiusBonus: number; // 자석 조준 반경 배율 (1.35 넓음 ~ 0.90 좁음)
  healthDropBonusChance: number; // 체력/실드 아이템 드랍률 보정 (-0.10 ~ +0.20)
  flowCategory: "frustrated" | "optimal" | "bored";
  tensionScore: number; // 0.0 (극도 좌절) ~ 1.0 (극도 여유/압도)
}

export class DynamicDifficultyAdjustmentEngine {
  private consecutiveDeaths = 0;
  private currentSurvivalSeconds = 0;
  private hitlessSeconds = 0;
  private actionCount = 0;
  private sessionElapsedSeconds = 0;

  public registerPlayerAction(): void {
    this.actionCount++;
  }

  public registerPlayerHit(): void {
    this.hitlessSeconds = 0;
  }

  public registerPlayerDeath(): void {
    this.consecutiveDeaths++;
    this.currentSurvivalSeconds = 0;
    this.hitlessSeconds = 0;
  }

  public registerRoundVictory(): void {
    this.consecutiveDeaths = 0;
  }

  public updateTime(dtSeconds: number): void {
    this.currentSurvivalSeconds += dtSeconds;
    this.hitlessSeconds += dtSeconds;
    this.sessionElapsedSeconds += dtSeconds;
  }

  /**
   * 실시간 플레이어 텐션 점수 및 동적 난이도 수정자 계산
   */
  public evaluateModifiers(): DifficultyModifiers {
    // 텐션 산출 공식
    // 연속 사망이 많을수록 0에 수렴, 무피격 생존이 길고 APM이 높을수록 1에 수렴
    let score = 0.5; // 기본 중립

    // 연속 사망 페널티 (사망당 -0.15)
    score -= Math.min(0.45, this.consecutiveDeaths * 0.15);

    // 무피격 생존 보너스 (10초당 +0.08)
    score += Math.min(0.3, (this.hitlessSeconds / 10) * 0.08);

    // 전체 생존 시간 보너스
    score += Math.min(0.2, (this.currentSurvivalSeconds / 30) * 0.1);

    const tensionScore = Math.min(1.0, Math.max(0.0, Math.round(score * 100) / 100));

    let flowCategory: "frustrated" | "optimal" | "bored" = "optimal";
    let enemySpeedMultiplier = 1.0;
    let enemySpawnIntervalMultiplier = 1.0;
    let magneticAimRadiusBonus = 1.0;
    let healthDropBonusChance = 0.0;

    if (tensionScore < 0.35) {
      // 좌절 상태 -> 난이도 긴급 완화
      flowCategory = "frustrated";
      enemySpeedMultiplier = 0.85; // 탄속 15% 감속
      enemySpawnIntervalMultiplier = 1.25; // 적 출현 25% 지연
      magneticAimRadiusBonus = 1.35; // 자석 조준 35% 확대
      healthDropBonusChance = 0.18; // 힐 드랍 18% 추가
    } else if (tensionScore > 0.70) {
      // 지루함/압도 상태 -> 도전 과제 강화
      flowCategory = "bored";
      enemySpeedMultiplier = 1.18; // 탄속 18% 가속
      enemySpawnIntervalMultiplier = 0.82; // 적 출현 18% 단축
      magneticAimRadiusBonus = 0.95; // 정밀 조준 요구
      healthDropBonusChance = -0.05;
    } else {
      // 이상적 몰입 상태
      flowCategory = "optimal";
      enemySpeedMultiplier = 1.0;
      enemySpawnIntervalMultiplier = 1.0;
      magneticAimRadiusBonus = 1.0;
      healthDropBonusChance = 0.0;
    }

    return {
      enemySpeedMultiplier,
      enemySpawnIntervalMultiplier,
      magneticAimRadiusBonus,
      healthDropBonusChance,
      flowCategory,
      tensionScore,
    };
  }

  public getMetrics(): PlayerSessionMetrics {
    const apm =
      this.sessionElapsedSeconds > 0
        ? (this.actionCount / this.sessionElapsedSeconds) * 60
        : 60;
    return {
      consecutiveDeaths: this.consecutiveDeaths,
      survivalSeconds: this.currentSurvivalSeconds,
      hitlessStreakSeconds: this.hitlessSeconds,
      apm,
    };
  }
}
