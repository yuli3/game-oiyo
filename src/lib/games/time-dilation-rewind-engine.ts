/**
 * @file time-dilation-rewind-engine.ts
 * @description 시간 조작 & 되감기 엔진
 * - Superhot 스타일 플레이어 조작 연동 동적 타임스케일 (Dynamic Time Dilation)
 * - 링 버퍼 기반 초경량 상태 스냅샷 저장소 (Circular State Buffer)
 * - 시간 역재생 및 분기 복원 컨트롤러 (Rewind & State Restoration Controller)
 */

export interface EntitySnapshot {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp?: number;
  flags?: number;
}

export interface FrameSnapshot {
  tick: number;
  timestampMs: number;
  timeScale: number;
  entities: EntitySnapshot[];
}

/**
 * 메모리 누수가 없는 고정 크기 순환 링 버퍼
 */
export class CircularStateBuffer {
  private buffer: (FrameSnapshot | null)[];
  private head = 0;
  private count = 0;
  private readonly capacity: number;

  constructor(capacity = 300) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(null);
  }

  public push(snapshot: FrameSnapshot): void {
    this.buffer[this.head] = snapshot;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  public popRecent(): FrameSnapshot | null {
    if (this.count === 0) return null;
    this.head = (this.head - 1 + this.capacity) % this.capacity;
    const item = this.buffer[this.head];
    this.buffer[this.head] = null;
    this.count--;
    return item;
  }

  public peekRecent(): FrameSnapshot | null {
    if (this.count === 0) return null;
    const idx = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[idx];
  }

  public getCount(): number {
    return this.count;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public clear(): void {
    this.buffer.fill(null);
    this.head = 0;
    this.count = 0;
  }
}

/**
 * Superhot 스타일 동적 시간 지연 관리자
 */
export class TimeDilationManager {
  private currentTimeScale = 1.0;
  private targetTimeScale = 1.0;
  private readonly minTimeScale: number;
  private readonly maxTimeScale: number;
  private readonly transitionSpeed: number;

  constructor(options?: {
    minTimeScale?: number;
    maxTimeScale?: number;
    transitionSpeed?: number;
  }) {
    this.minTimeScale = options?.minTimeScale ?? 0.05; // 완전 정지 시 5% 슬로우모션
    this.maxTimeScale = options?.maxTimeScale ?? 1.0;
    this.transitionSpeed = options?.transitionSpeed ?? 10.0; // 초당 보간 속도
  }

  /**
   * 플레이어 조작 속도(0.0 ~ 1.0)에 따라 목표 타임스케일 계산
   * @param playerSpeedNorm 정규화된 플레이어 속도 (0: 정지, 1: 최대 질주)
   */
  public updatePlayerActivity(playerSpeedNorm: number, dtSeconds: number): number {
    const clampedSpeed = Math.min(1.0, Math.max(0.0, playerSpeedNorm));
    // 속도에 비례하여 min ~ max 타임스케일 보간
    this.targetTimeScale =
      this.minTimeScale + clampedSpeed * (this.maxTimeScale - this.minTimeScale);

    // 부드러운 지수 보간 (Exponential Smoothing)
    const factor = 1 - Math.exp(-this.transitionSpeed * dtSeconds);
    this.currentTimeScale += (this.targetTimeScale - this.currentTimeScale) * factor;

    return this.currentTimeScale;
  }

  public getTimeScale(): number {
    return this.currentTimeScale;
  }

  public setTimeScaleImmediate(scale: number): void {
    this.currentTimeScale = Math.min(this.maxTimeScale, Math.max(this.minTimeScale, scale));
    this.targetTimeScale = this.currentTimeScale;
  }
}

/**
 * 되감기 오케스트레이터
 */
export class RewindController {
  private isRewinding = false;
  private readonly buffer: CircularStateBuffer;
  private rewindPlaybackSpeed = 2; // 되감기 시 프레임 스킵 속도 (2x 배속)

  constructor(bufferCapacity = 300, playbackSpeed = 2) {
    this.buffer = new CircularStateBuffer(bufferCapacity);
    this.rewindPlaybackSpeed = playbackSpeed;
  }

  public recordFrame(snapshot: FrameSnapshot): void {
    if (this.isRewinding) return; // 되감기 중에는 새 프레임 저장 금지
    this.buffer.push(snapshot);
  }

  public startRewind(): boolean {
    if (this.buffer.getCount() === 0) return false;
    this.isRewinding = true;
    return true;
  }

  public stopRewind(): FrameSnapshot | null {
    this.isRewinding = false;
    return this.buffer.peekRecent();
  }

  /**
   * 되감기 단계 실행: 과거 프레임을 팝하여 복원 상태 반환
   */
  public stepRewind(): FrameSnapshot | null {
    if (!this.isRewinding || this.buffer.getCount() === 0) {
      this.isRewinding = false;
      return null;
    }

    let lastPopped: FrameSnapshot | null = null;
    for (let i = 0; i < this.rewindPlaybackSpeed; i++) {
      const popped = this.buffer.popRecent();
      if (popped) lastPopped = popped;
      if (this.buffer.getCount() === 0) {
        this.isRewinding = false;
        break;
      }
    }

    return lastPopped;
  }

  public getIsRewinding(): boolean {
    return this.isRewinding;
  }

  public getAvailableFrames(): number {
    return this.buffer.getCount();
  }
}
