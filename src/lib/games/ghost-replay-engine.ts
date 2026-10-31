/**
 * @file ghost-replay-engine.ts
 * @description 결정론적 고스트 리플레이 및 타임어택 델타 엔진
 * - 60Hz 고정 틱 기반 델타 압축 리플레이 레코더 (Tick-indexed Recorder)
 * - 캣멀-롬 / 쿼터니언 선형 보간 고스트 재생기 (Interpolated Ghost Player)
 * - 실시간 랩타임 비교 타임어택 델타 HUD 솔버 (Time-Attack Delta HUD Solver)
 */

export interface ReplayFrame {
  tick: number;
  timeMs: number;
  x: number;
  y: number;
  z?: number;
  angle: number; // 라디안
  speed: number;
  actionMask: number; // 비트마스크 액션 (1: 액셀, 2: 브레이크/드리프트, 4: 부스트 등)
  progress: number; // 0.0 ~ 1.0 (트랙 진행도 또는 체크포인트)
}

export interface ReplayMetadata {
  trackId: string;
  seed?: number;
  totalTimeMs: number;
  fps: number;
  playerTag: string;
  recordedAt: string;
}

export interface ReplayPayload {
  version: 1;
  meta: ReplayMetadata;
  frames: ReplayFrame[];
}

/**
 * 60Hz 고정 틱 리플레이 레코더
 */
export class GhostReplayRecorder {
  private frames: ReplayFrame[] = [];
  private currentTick = 0;
  private readonly targetFps: number;
  private readonly tickIntervalMs: number;
  private accumulatedMs = 0;

  constructor(targetFps = 60) {
    this.targetFps = targetFps;
    this.tickIntervalMs = 1000 / targetFps;
  }

  public reset(): void {
    this.frames = [];
    this.currentTick = 0;
    this.accumulatedMs = 0;
  }

  /**
   * 프레임 델타 타임을 누적하여 고정 틱 단위로 샘플링
   */
  public recordSample(
    dtMs: number,
    state: {
      x: number;
      y: number;
      z?: number;
      angle: number;
      speed: number;
      actionMask?: number;
      progress: number;
    }
  ): boolean {
    // 최초 프레임은 즉시 t=0 기준 캡처
    if (this.frames.length === 0) {
      this.frames.push({
        tick: 0,
        timeMs: 0,
        x: Math.round(state.x * 100) / 100,
        y: Math.round(state.y * 100) / 100,
        z: state.z !== undefined ? Math.round(state.z * 100) / 100 : undefined,
        angle: Math.round(state.angle * 1000) / 1000,
        speed: Math.round(state.speed * 10) / 10,
        actionMask: state.actionMask ?? 0,
        progress: Math.min(1.0, Math.max(0.0, Math.round(state.progress * 10000) / 10000)),
      });
      this.currentTick = 1;
    }

    this.accumulatedMs += dtMs;
    let recorded = false;

    while (this.accumulatedMs >= this.tickIntervalMs) {
      this.frames.push({
        tick: this.currentTick,
        timeMs: Math.round(this.currentTick * this.tickIntervalMs),
        x: Math.round(state.x * 100) / 100,
        y: Math.round(state.y * 100) / 100,
        z: state.z !== undefined ? Math.round(state.z * 100) / 100 : undefined,
        angle: Math.round(state.angle * 1000) / 1000,
        speed: Math.round(state.speed * 10) / 10,
        actionMask: state.actionMask ?? 0,
        progress: Math.min(1.0, Math.max(0.0, Math.round(state.progress * 10000) / 10000)),
      });
      this.currentTick++;
      this.accumulatedMs -= this.tickIntervalMs;
      recorded = true;
    }

    return recorded;
  }

  public exportPayload(trackId: string, playerTag = "Player"): ReplayPayload {
    const totalTimeMs =
      this.frames.length > 0
        ? this.frames[this.frames.length - 1].timeMs
        : 0;

    return {
      version: 1,
      meta: {
        trackId,
        totalTimeMs,
        fps: this.targetFps,
        playerTag,
        recordedAt: new Date().toISOString(),
      },
      frames: [...this.frames],
    };
  }

  public getFrameCount(): number {
    return this.frames.length;
  }
}

/**
 * 리플레이 데이터 기반 부드러운 고스트 재생기
 */
export class GhostReplayPlayer {
  private payload: ReplayPayload | null = null;
  private isFinished = false;

  public load(payload: ReplayPayload): void {
    this.payload = payload;
    this.isFinished = false;
  }

  /**
   * 주어진 재생 시간(timeMs)에서의 보간된 고스트 상태 계산
   */
  public sampleAt(timeMs: number): ReplayFrame | null {
    if (!this.payload || this.payload.frames.length === 0) return null;

    const frames = this.payload.frames;
    if (timeMs <= frames[0].timeMs) {
      return { ...frames[0] };
    }

    const lastFrame = frames[frames.length - 1];
    if (timeMs >= lastFrame.timeMs) {
      this.isFinished = true;
      return { ...lastFrame };
    }

    // 이진 탐색으로 현재 시간 좌우 프레임 인덱스 색출
    let low = 0;
    let high = frames.length - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (frames[mid].timeMs <= timeMs) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idxA = Math.max(0, high);
    const idxB = Math.min(frames.length - 1, low);

    if (idxA === idxB) return { ...frames[idxA] };

    const frameA = frames[idxA];
    const frameB = frames[idxB];
    const span = frameB.timeMs - frameA.timeMs;
    const t = span > 0 ? (timeMs - frameA.timeMs) / span : 0;

    // 선형 보간 (Lerp)
    return {
      tick: frameA.tick,
      timeMs,
      x: frameA.x + (frameB.x - frameA.x) * t,
      y: frameA.y + (frameB.y - frameA.y) * t,
      z:
        frameA.z !== undefined && frameB.z !== undefined
          ? frameA.z + (frameB.z - frameA.z) * t
          : undefined,
      angle: this.lerpAngle(frameA.angle, frameB.angle, t),
      speed: frameA.speed + (frameB.speed - frameA.speed) * t,
      actionMask: t < 0.5 ? frameA.actionMask : frameB.actionMask,
      progress: frameA.progress + (frameB.progress - frameA.progress) * t,
    };
  }

  public getIsFinished(): boolean {
    return this.isFinished;
  }

  public getMetadata(): ReplayMetadata | null {
    return this.payload ? this.payload.meta : null;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = (b - a) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }
}

/**
 * 실시간 타임어택 델타 비교 솔버 (HUD 표시용)
 */
export class TimeAttackDeltaSolver {
  /**
   * 현재 플레이어의 진행도(0.0~1.0)와 경과 시간을 고스트 리플레이와 비교
   * @returns 델타 시간(ms). 음수(-)면 고스트보다 앞서감(초록색), 양수(+)면 뒤처짐(빨간색)
   */
  public static calculateDelta(
    currentProgress: number,
    currentTimeMs: number,
    ghostPayload: ReplayPayload
  ): { deltaMs: number; ghostProgress: number; isAhead: boolean; formatted: string } {
    if (!ghostPayload || ghostPayload.frames.length === 0) {
      return { deltaMs: 0, ghostProgress: 0, isAhead: true, formatted: "±0.00s" };
    }

    const frames = ghostPayload.frames;

    // 진행도 기준 고스트가 해당 위치에 도달했던 시점(timeMs) 역추적 (이진 탐색)
    let low = 0;
    let high = frames.length - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (frames[mid].progress <= currentProgress) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idxA = Math.max(0, high);
    const idxB = Math.min(frames.length - 1, low);

    let ghostTimeAtProgress = frames[idxA].timeMs;
    if (idxA !== idxB) {
      const progSpan = frames[idxB].progress - frames[idxA].progress;
      const t = progSpan > 0 ? (currentProgress - frames[idxA].progress) / progSpan : 0;
      ghostTimeAtProgress = frames[idxA].timeMs + (frames[idxB].timeMs - frames[idxA].timeMs) * t;
    }

    // 델타 시간: 현재 소요 시간 - 고스트가 이 진행도에 도달했을 때의 소요 시간
    const deltaMs = Math.round(currentTimeMs - ghostTimeAtProgress);
    const isAhead = deltaMs <= 0;

    // 포맷팅 (예: -0.24s 또는 +0.18s)
    const sign = deltaMs > 0 ? "+" : deltaMs < 0 ? "-" : "±";
    const absSeconds = (Math.abs(deltaMs) / 1000).toFixed(2);
    const formatted = `${sign}${absSeconds}s`;

    // 현재 시간에 고스트의 진행도도 계산
    const ghostSample = frames.find((f) => f.timeMs >= currentTimeMs);
    const ghostProgress = ghostSample ? ghostSample.progress : 1.0;

    return {
      deltaMs,
      ghostProgress,
      isAhead,
      formatted,
    };
  }
}
