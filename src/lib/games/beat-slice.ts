/**
/**
 * 비트 슬라이스 3D (Beat Slice 3D) 코어 게임 엔진
 *
 * Beat Saber & Beatstar 스타일의 3D 리듬 액션 엔진.
 * - 0ms Web Audio 정밀 클럭 동기화
 * - 3D 퍼스펙티브 원근 투영 (Z-depth 1200 -> 0)
 * - 4개 레인(L2, L1, R1, R2) 및 4방향 슬라이스 벡터(UP, DOWN, LEFT, RIGHT, ANY)
 * - 블록 양분(Half-slice) 물리 시뮬레이션: 절단면에 따른 좌/우(상/하) 분리 회전 및 비산
 * - 판정 윈도우: PERFECT (±60ms), GREAT (±120ms), GOOD (±180ms), MISS
 * - 콤보 및 피버 게이지(FEVER 2x/4x/8x), 네온 펄스 비트 반응
 */

export type SliceDirection = "up" | "down" | "left" | "right" | "any";

export type Judgment = "PERFECT" | "GREAT" | "GOOD" | "MISS";

export interface BeatNote {
  id: string;
  lane: number; // 0, 1, 2, 3
  beat: number; // 박자 위치 (예: 1.0, 1.5, 2.0...)
  targetTime: number; // 판정 도달 시간(초)
  direction: SliceDirection;
  color: "cyan" | "magenta";
  hit: boolean;
  missed: boolean;
  sliceAngle?: number;
}

export interface SplitBlock {
  id: string;
  x: number;
  y: number;
  z: number;
  color: "cyan" | "magenta";
  direction: SliceDirection;
  vx1: number;
  vy1: number;
  vz1: number;
  vx2: number;
  vy2: number;
  vz2: number;
  rot1: number;
  rot2: number;
  vRot1: number;
  vRot2: number;
  sliceAngle: number;
  opacity: number;
  lifetime: number;
}

export interface SongTrack {
  id: string;
  title: string;
  bpm: number;
  notes: BeatNote[];
  totalDuration: number;
}

export interface BeatSliceState {
  score: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  feverGauge: number; // 0 ~ 100
  isFever: boolean;
  feverTimeRemaining: number;
  judgmentCounts: Record<Judgment, number>;
  lastJudgment: { type: Judgment; time: number } | null;
  activeNotes: BeatNote[];
  splitBlocks: SplitBlock[];
  currentTime: number;
  isPlaying: boolean;
  isComplete: boolean;
  accuracy: number; // 0 ~ 100%
  rank: "S+" | "S" | "A" | "B" | "C" | "F";
}

export const JUDGMENT_WINDOWS = {
  PERFECT: 0.065, // 65ms
  GREAT: 0.125, // 125ms
  GOOD: 0.19, // 190ms
} as const;

export const SPAWN_LOOKAHEAD_SECONDS = 2.0; // 2초 전에 생성되어 플레이어 쪽으로 날아옴
export const LANE_X_POSITIONS = [-180, -60, 60, 180]; // 4개 레인의 X 좌표

/**
 * 절차적 비트맵 음원 차트 생성
 */
export function generateProceduralChart(id: string, bpm = 130, bars = 24): SongTrack {
  const secondsPerBeat = 60 / bpm;
  const totalBeats = bars * 4;
  const notes: BeatNote[] = [];
  const directions: SliceDirection[] = ["down", "up", "left", "right", "any"];

  let noteId = 0;
  // 초기 4비트(1마디)는 카운트다운 여유
  for (let b = 4; b < totalBeats; b += 0.5) {
    // 확률적 비트 생성 패턴
    const isQuarter = b % 1 === 0;
    const spawnChance = isQuarter ? 0.75 : 0.35;

    // 간단한 의사난수 (seed 기반)
    const seed = (b * 9301 + 49297) % 233280;
    const rand = seed / 233280;

    if (rand < spawnChance) {
      const lane = Math.floor(rand * 4) % 4;
      const color: "cyan" | "magenta" = lane < 2 ? "cyan" : "magenta";
      const dirIndex = Math.floor((rand * 13) % directions.length);
      const direction = directions[dirIndex];

      notes.push({
        id: `note_${noteId++}`,
        lane,
        beat: b,
        targetTime: b * secondsPerBeat,
        direction,
        color,
        hit: false,
        missed: false,
      });
    }
  }

  return {
    id,
    title: id === "cyber-rush" ? "Cyber Rush (138 BPM)" : "Neon Overdrive (128 BPM)",
    bpm,
    notes,
    totalDuration: (totalBeats + 4) * secondsPerBeat,
  };
}

export class BeatSliceEngine {
  private track: SongTrack;
  private state: BeatSliceState;

  constructor(track: SongTrack) {
    this.track = track;
    this.state = this.getInitialState();
  }

  public getInitialState(): BeatSliceState {
    return {
      score: 0,
      combo: 0,
      maxCombo: 0,
      multiplier: 1,
      feverGauge: 0,
      isFever: false,
      feverTimeRemaining: 0,
      judgmentCounts: {
        PERFECT: 0,
        GREAT: 0,
        GOOD: 0,
        MISS: 0,
      },
      lastJudgment: null,
      activeNotes: [...this.track.notes.map((n) => ({ ...n }))],
      splitBlocks: [],
      currentTime: 0,
      isPlaying: false,
      isComplete: false,
      accuracy: 100,
      rank: "S+",
    };
  }

  public getState(): BeatSliceState {
    return this.state;
  }

  public start(): void {
    this.state.isPlaying = true;
  }

  public pause(): void {
    this.state.isPlaying = false;
  }

  /**
   * 오디오 시간 동기화 업데이트 루프
   */
  public update(dt: number, audioTime?: number): BeatSliceState {
    if (!this.state.isPlaying || this.state.isComplete) {
      return this.state;
    }

    if (audioTime !== undefined && audioTime >= 0) {
      this.state.currentTime = audioTime;
    } else {
      this.state.currentTime += dt;
    }

    const t = this.state.currentTime;

    // 피버 모드 처리
    if (this.state.isFever) {
      this.state.feverTimeRemaining -= dt;
      if (this.state.feverTimeRemaining <= 0) {
        this.state.isFever = false;
        this.state.feverGauge = 0;
        this.updateMultiplier();
      }
    }

    // 지나간 노트 미스 처리
    for (const note of this.state.activeNotes) {
      if (!note.hit && !note.missed) {
        // 판정선을 너무 지나침 (GOOD 윈도우 초과)
        if (t - note.targetTime > JUDGMENT_WINDOWS.GOOD) {
          note.missed = true;
          this.registerJudgment("MISS");
        }
      }
    }

    // 분리된 블록 물리 업데이트
    const remainingSplitBlocks: SplitBlock[] = [];
    for (const b of this.state.splitBlocks) {
      b.lifetime -= dt;
      if (b.lifetime > 0) {
        b.x += (b.vx1 + b.vx2) * 0.5 * dt;
        b.y += (b.vy1 + b.vy2) * 0.5 * dt;
        b.z -= 400 * dt; // 플레이어 뒤편으로 빠르게 날아감
        b.rot1 += b.vRot1 * dt;
        b.rot2 += b.vRot2 * dt;
        b.opacity = Math.max(0, b.lifetime / 0.65);
        remainingSplitBlocks.push(b);
      }
    }
    this.state.splitBlocks = remainingSplitBlocks;

    // 곡 종료 확인
    if (t >= this.track.totalDuration) {
      this.state.isComplete = true;
      this.state.isPlaying = false;
      this.calculateFinalRank();
    }

    return this.state;
  }

  /**
   * 플레이어 슬라이스 액션 판정
   * @param lane 대상 레인 (0, 1, 2, 3)
   * @param swipeDir 슬라이스 방향 ("up" | "down" | "left" | "right")
   */
  public slice(lane: number, swipeDir: SliceDirection): { judgment: Judgment; note?: BeatNote } | null {
    if (!this.state.isPlaying || this.state.isComplete) {
      return null;
    }

    const t = this.state.currentTime;

    // 해당 레인에서 아직 치지 않은 가장 가까운 노트 탐색
    let bestNote: BeatNote | null = null;
    let minTimeDiff = Infinity;

    for (const note of this.state.activeNotes) {
      if (note.lane === lane && !note.hit && !note.missed) {
        const timeDiff = Math.abs(t - note.targetTime);
        if (timeDiff <= JUDGMENT_WINDOWS.GOOD && timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          bestNote = note;
        }
      }
    }

    if (!bestNote) {
      return null;
    }

    // 방향 일치 검사
    const dirMatches =
      bestNote.direction === "any" ||
      bestNote.direction === swipeDir ||
      (bestNote.direction === "up" && swipeDir === "up") ||
      (bestNote.direction === "down" && swipeDir === "down") ||
      (bestNote.direction === "left" && swipeDir === "left") ||
      (bestNote.direction === "right" && swipeDir === "right");

    if (!dirMatches) {
      bestNote.missed = true;
      this.registerJudgment("MISS");
      return { judgment: "MISS", note: bestNote };
    }

    // 타이밍 윈도우 판정
    let judgment: Judgment = "GOOD";
    if (minTimeDiff <= JUDGMENT_WINDOWS.PERFECT) {
      judgment = "PERFECT";
    } else if (minTimeDiff <= JUDGMENT_WINDOWS.GREAT) {
      judgment = "GREAT";
    }

    bestNote.hit = true;
    this.registerJudgment(judgment);

    // 블록 양분 물리 생성
    this.spawnSplitBlock(bestNote, swipeDir);

    return { judgment, note: bestNote };
  }

  private registerJudgment(type: Judgment): void {
    this.state.judgmentCounts[type]++;
    this.state.lastJudgment = { type, time: this.state.currentTime };

    if (type === "MISS") {
      this.state.combo = 0;
      this.updateMultiplier();
      if (!this.state.isFever) {
        this.state.feverGauge = Math.max(0, this.state.feverGauge - 15);
      }
    } else {
      this.state.combo++;
      if (this.state.combo > this.state.maxCombo) {
        this.state.maxCombo = this.state.combo;
      }

      // 피버 게이지 충전
      if (!this.state.isFever) {
        const feverGain = type === "PERFECT" ? 5 : type === "GREAT" ? 3 : 1.5;
        this.state.feverGauge = Math.min(100, this.state.feverGauge + feverGain);
        if (this.state.feverGauge >= 100) {
          this.state.isFever = true;
          this.state.feverTimeRemaining = 7.0; // 7초 피버 타임
        }
      }

      this.updateMultiplier();

      // 점수 계산
      const baseScore = type === "PERFECT" ? 100 : type === "GREAT" ? 70 : 40;
      this.state.score += baseScore * this.state.multiplier;
    }

    this.calculateAccuracy();
  }

  private updateMultiplier(): void {
    const feverBonus = this.state.isFever ? 2 : 1;
    if (this.state.combo >= 30) {
      this.state.multiplier = 4 * feverBonus;
    } else if (this.state.combo >= 15) {
      this.state.multiplier = 3 * feverBonus;
    } else if (this.state.combo >= 8) {
      this.state.multiplier = 2 * feverBonus;
    } else {
      this.state.multiplier = 1 * feverBonus;
    }
  }

  private calculateAccuracy(): void {
    const counts = this.state.judgmentCounts;
    const total = counts.PERFECT + counts.GREAT + counts.GOOD + counts.MISS;
    if (total === 0) {
      this.state.accuracy = 100;
      return;
    }

    const earned = counts.PERFECT * 100 + counts.GREAT * 70 + counts.GOOD * 40;
    const maxPossible = total * 100;
    this.state.accuracy = Math.round((earned / maxPossible) * 100);
  }

  private calculateFinalRank(): void {
    const acc = this.state.accuracy;
    if (acc >= 98 && this.state.judgmentCounts.MISS === 0) {
      this.state.rank = "S+";
    } else if (acc >= 94) {
      this.state.rank = "S";
    } else if (acc >= 85) {
      this.state.rank = "A";
    } else if (acc >= 75) {
      this.state.rank = "B";
    } else if (acc >= 60) {
      this.state.rank = "C";
    } else {
      this.state.rank = "F";
    }
  }

  private spawnSplitBlock(note: BeatNote, swipeDir: SliceDirection): void {
    const laneX = LANE_X_POSITIONS[note.lane];
    const isHorizontal = swipeDir === "left" || swipeDir === "right";
    const sliceAngle = isHorizontal ? 0 : Math.PI / 2;

    // 분리되는 블록 2조각의 반대 방향 척력 계산
    const pushSpeed = 220;
    let vx1 = -pushSpeed;
    let vx2 = pushSpeed;
    let vy1 = -80;
    let vy2 = -80;

    if (!isHorizontal) {
      vx1 = -40;
      vx2 = 40;
      vy1 = -pushSpeed;
      vy2 = pushSpeed;
    }

    this.state.splitBlocks.push({
      id: `split_${note.id}`,
      x: laneX,
      y: 0,
      z: 50,
      color: note.color,
      direction: note.direction,
      vx1,
      vy1,
      vz1: -150,
      vx2,
      vy2,
      vz2: -150,
      rot1: 0,
      rot2: 0,
      vRot1: -4.5,
      vRot2: 4.5,
      sliceAngle,
      opacity: 1.0,
      lifetime: 0.65,
    });
  }
}
