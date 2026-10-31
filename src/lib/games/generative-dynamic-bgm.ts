/**
 * @file generative-dynamic-bgm.ts
 * @description 절차적 칩튠/신스 다이내믹 BGM 생성기
 * - 외부 음원 다운로드 0B (Web Audio API 순수 합성)
 * - 4마디 절차적 펜타토닉/도리안 스케일 아르페지에이터 & 808 킥/스네어
 * - 텐션 단계별 다이내믹 스템 믹서 (Dynamic Stem Mixer: Ambient -> Groove -> Fever)
 */

export const SCALE_A_MINOR_PENTATONIC = [
  220.0, // A3
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.0, // G4
  440.0, // A4
  523.25, // C5
  587.33, // D5
];

export type StemLayer = "bass" | "arp" | "drums" | "lead";

export class DynamicStemMixer {
  private stemVolumes: Record<StemLayer, number> = {
    bass: 1.0,
    arp: 0.0,
    drums: 0.0,
    lead: 0.0,
  };

  private currentIntensity = 1; // 1: 평상시, 2: 콤보, 3: 피버

  /**
   * 게임 플레이 텐션 강도에 따른 스템별 볼륨 타겟 설정
   * - Level 1 (Ambient): 베이스만 은은하게 재생
   * - Level 2 (Groove): 베이스 + 아르페지오 + 가벼운 드럼
   * - Level 3 (Fever/Boss): 모든 레이어(베이스 + 아르프 + 드럼 풀비트 + 신스 리드) 풀가동
   */
  public setTensionLevel(level: 1 | 2 | 3): void {
    this.currentIntensity = level;

    switch (level) {
      case 1:
        this.stemVolumes.bass = 0.8;
        this.stemVolumes.arp = 0.0;
        this.stemVolumes.drums = 0.0;
        this.stemVolumes.lead = 0.0;
        break;
      case 2:
        this.stemVolumes.bass = 0.9;
        this.stemVolumes.arp = 0.7;
        this.stemVolumes.drums = 0.6;
        this.stemVolumes.lead = 0.0;
        break;
      case 3:
        this.stemVolumes.bass = 1.0;
        this.stemVolumes.arp = 0.85;
        this.stemVolumes.drums = 0.95;
        this.stemVolumes.lead = 0.8;
        break;
    }
  }

  public getStemVolume(layer: StemLayer): number {
    return this.stemVolumes[layer];
  }

  public getTensionLevel(): number {
    return this.currentIntensity;
  }
}

/**
 * 4마디 패턴 시퀀서 헬퍼
 */
export class ProceduralPatternSequencer {
  private currentStep = 0;
  private readonly totalSteps = 16; // 16비트 (4/4 박자 1마디당 4스텝)

  /**
   * 현재 16비트 스텝에서의 음정 및 드럼 트리거 계산
   */
  public advanceStep(): {
    step: number;
    bassFreq: number;
    arpFreq: number;
    isKick: boolean;
    isSnare: boolean;
  } {
    const step = this.currentStep;
    this.currentStep = (this.currentStep + 1) % this.totalSteps;

    // 베이스: 매 4스텝마다 루트음 연주
    const bassIdx = Math.floor(step / 4) % 2 === 0 ? 0 : 2; // A3 또는 D4
    const bassFreq = SCALE_A_MINOR_PENTATONIC[bassIdx];

    // 아르페지오: 16비트 단위 펜타토닉 순환
    const arpIdx = (step * 3) % SCALE_A_MINOR_PENTATONIC.length;
    const arpFreq = SCALE_A_MINOR_PENTATONIC[arpIdx];

    // 드럼: 4비트 킥 (스텝 0, 4, 8, 12), 스네어 (스텝 4, 12)
    const isKick = step % 4 === 0;
    const isSnare = step === 4 || step === 12;

    return {
      step,
      bassFreq,
      arpFreq,
      isKick,
      isSnare,
    };
  }

  public reset(): void {
    this.currentStep = 0;
  }
}
