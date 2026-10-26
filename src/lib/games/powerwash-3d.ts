/**
 * 파워워시 클린 3D (PowerWash Mini 3D) 코어 게임 엔진
 *
 * PowerWash Simulator 스타일의 고압 세척 시뮬레이션 및 파츠별 오염도 마스크 엔진.
 * - 3종 고압 노즐(0° 초고압 직사, 15° 집중 분사, 40° 광역 분사) + 세제 폼 캐논(Soap)
 * - 노즐 각도 회전(수평/수직 부채꼴 분사 패턴)
 * - 오브젝트 파츠 분할 시스템: 각 파츠(차체, 유리창, 휠, 범퍼 등)가 독립된 오염 그리드를 보유
 * - 파츠별 청결도 96% 도달 시 100% 자동 스냅 완결 및 청량한 '딩!(Ding!)' 보상 트리거
 * - 잔여 오염 하이라이트(Show Dirt) 스캔 기능
 */

export type NozzleType = "0deg" | "15deg" | "40deg" | "soap";
export type SprayOrientation = "horizontal" | "vertical";

export interface NozzleSpec {
  id: NozzleType;
  name: string;
  radiusX: number;
  radiusY: number;
  power: number; // 초당 세척력
  color: string;
}

export const NOZZLE_SPECS: Record<NozzleType, NozzleSpec> = {
  "0deg": {
    id: "0deg",
    name: "0° 초고압 적색 노즐",
    radiusX: 14,
    radiusY: 14,
    power: 4.5,
    color: "#ef4444",
  },
  "15deg": {
    id: "15deg",
    name: "15° 중압 황색 노즐",
    radiusX: 36,
    radiusY: 16,
    power: 2.8,
    color: "#eab308",
  },
  "40deg": {
    id: "40deg",
    name: "40° 광역 백색 노즐",
    radiusX: 58,
    radiusY: 22,
    power: 1.8,
    color: "#f8fafc",
  },
  soap: {
    id: "soap",
    name: "비누 거품 폼 캐논",
    radiusX: 44,
    radiusY: 44,
    power: 1.8,
    color: "#38bdf8",
  },
};

export interface WashablePart {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  baseColor: string;
  accentColor: string;
  toughness: number; // 1.0 = 일반 먼지, 2.0 = 찌든 진흙/녹
  rewardCash: number;
  gridCols: number;
  gridRows: number;
  /** 각 셀의 오염도 (0.0 = 완전 깨끗, 1.0 = 완전히 더러움) */
  dirtGrid: number[][];
  /** 비누 거품 도포 여부 */
  soapGrid: boolean[][];
  cleanPercent: number;
  isCompleted: boolean;
}

export interface WashStage {
  id: string;
  title: string;
  parts: WashablePart[];
}

export interface PowerWashState {
  stageIndex: number;
  stageTitle: string;
  parts: WashablePart[];
  selectedNozzle: NozzleType;
  orientation: SprayOrientation;
  totalCleanPercent: number;
  cashEarned: number;
  isHighlightingDirt: boolean;
  highlightTimer: number;
  hoveredPartId: string | null;
  justCompletedPart: { id: string; name: string; reward: number } | null;
  status: "washing" | "stage_clear";
}

const CELL_RESOLUTION = 8; // 8px 단위 오염 셀

function createPart(
  id: string,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  baseColor: string,
  accentColor: string,
  toughness: number,
  rewardCash: number
): WashablePart {
  const cols = Math.max(1, Math.ceil(w / CELL_RESOLUTION));
  const rows = Math.max(1, Math.ceil(h / CELL_RESOLUTION));
  const dirtGrid: number[][] = [];
  const soapGrid: boolean[][] = [];

  for (let r = 0; r < rows; r++) {
    dirtGrid[r] = [];
    soapGrid[r] = [];
    for (let c = 0; c < cols; c++) {
      dirtGrid[r][c] = 1.0;
      soapGrid[r][c] = false;
    }
  }

  return {
    id,
    name,
    x,
    y,
    w,
    h,
    baseColor,
    accentColor,
    toughness,
    rewardCash,
    gridCols: cols,
    gridRows: rows,
    dirtGrid,
    soapGrid,
    cleanPercent: 0,
    isCompleted: false,
  };
}

export function buildStageParts(stageIndex: number): { title: string; parts: WashablePart[] } {
  if (stageIndex === 0) {
    return {
      title: "클래식 캠핑 밴 (Vintage Camper Van)",
      parts: [
        createPart("van_roof", "루프 캐리어 & 천장", 130, 85, 340, 45, "#f8fafc", "#cbd5e1", 1.2, 40),
        createPart("van_windshield", "전면 파노라마 윈도우", 145, 130, 145, 75, "#38bdf8", "#bae6fd", 1.0, 35),
        createPart("van_sidewindow", "측면 승객석 창문", 305, 130, 150, 75, "#38bdf8", "#bae6fd", 1.0, 35),
        createPart("van_body_upper", "상단 크림 화이트 차체", 115, 205, 370, 55, "#fef3c7", "#fde68a", 1.3, 50),
        createPart("van_body_lower", "하단 민트 클래식 패널", 110, 260, 380, 80, "#10b981", "#059669", 1.6, 65),
        createPart("van_bumper", "전후면 크롬 범퍼", 95, 330, 410, 26, "#e2e8f0", "#94a3b8", 1.8, 40),
        createPart("van_wheel_front", "전륜 화이트월 타이어", 150, 340, 76, 76, "#334155", "#f8fafc", 2.2, 45),
        createPart("van_wheel_rear", "후륜 화이트월 타이어", 370, 340, 76, 76, "#334155", "#f8fafc", 2.2, 45),
      ],
    };
  } else if (stageIndex === 1) {
    return {
      title: "고대 정원 황금 분수대 (Royal Fountain)",
      parts: [
        createPart("fountain_spire", "최상단 황금 보주 첨탑", 260, 65, 80, 65, "#facc15", "#eab308", 1.4, 45),
        createPart("fountain_upper_bowl", "상단 천사 조각 수반", 190, 130, 220, 55, "#e2e8f0", "#cbd5e1", 1.5, 55),
        createPart("fountain_pillar", "중앙 코린트식 대리석 기둥", 240, 185, 120, 85, "#f1f5f9", "#94a3b8", 1.7, 50),
        createPart("fountain_main_basin", "메인 팔각 대리석 분수조", 120, 270, 360, 75, "#cbd5e1", "#64748b", 1.8, 75),
        createPart("fountain_base_steps", "하단 이끼 낀 화강암 계단", 90, 345, 420, 55, "#94a3b8", "#475569", 2.3, 65),
      ],
    };
  } else {
    return {
      title: "메카닉 가디언 로봇 (Mecha Guardian RX)",
      parts: [
        createPart("mech_head", "듀얼 센서 헤드 유닛", 245, 65, 110, 65, "#3b82f6", "#60a5fa", 1.3, 50),
        createPart("mech_chest", "아크 원자로 흉부 장갑", 195, 130, 210, 95, "#ef4444", "#facc15", 1.6, 70),
        createPart("mech_arm_left", "좌측 플라즈마 건틀릿", 115, 140, 75, 140, "#64748b", "#38bdf8", 1.8, 55),
        createPart("mech_arm_right", "우측 타이탄 실드 암", 410, 140, 75, 140, "#64748b", "#38bdf8", 1.8, 55),
        createPart("mech_legs", "하부 부스터 레그 모듈", 185, 225, 230, 165, "#1e293b", "#3b82f6", 2.1, 80),
      ],
    };
  }
}

export class PowerWashEngine {
  private state: PowerWashState;

  constructor(stageIndex = 0) {
    this.state = this.initStage(stageIndex);
  }

  public getState(): PowerWashState {
    return this.state;
  }

  public initStage(stageIndex: number): PowerWashState {
    const { title, parts } = buildStageParts(stageIndex);
    return {
      stageIndex,
      stageTitle: title,
      parts,
      selectedNozzle: "15deg",
      orientation: "horizontal",
      totalCleanPercent: 0,
      cashEarned: this.state ? this.state.cashEarned : 0,
      isHighlightingDirt: false,
      highlightTimer: 0,
      hoveredPartId: null,
      justCompletedPart: null,
      status: "washing",
    };
  }

  public selectNozzle(nozzle: NozzleType): void {
    this.state.selectedNozzle = nozzle;
  }

  public toggleOrientation(): void {
    this.state.orientation = this.state.orientation === "horizontal" ? "vertical" : "horizontal";
  }

  public triggerDirtHighlight(): void {
    this.state.isHighlightingDirt = true;
    this.state.highlightTimer = 2.5; // 2.5초간 잔여 먼지 발광 표시
  }

  public updateHoveredPart(x: number, y: number): string | null {
    for (let i = this.state.parts.length - 1; i >= 0; i--) {
      const p = this.state.parts[i];
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
        this.state.hoveredPartId = p.id;
        return p.id;
      }
    }
    this.state.hoveredPartId = null;
    return null;
  }

  /**
   * 특정 좌표(x, y)에 고압수 분사 적용
   * @returns 이번 프레임에 완결된 파츠가 있으면 반환
   */
  public sprayAt(x: number, y: number, dt: number): { id: string; name: string; reward: number } | null {
    if (this.state.status !== "washing") return null;

    const spec = NOZZLE_SPECS[this.state.selectedNozzle];
    const rx = this.state.orientation === "horizontal" ? spec.radiusX : spec.radiusY;
    const ry = this.state.orientation === "horizontal" ? spec.radiusY : spec.radiusX;

    let newlyCompleted: { id: string; name: string; reward: number } | null = null;

    for (const part of this.state.parts) {
      if (part.isCompleted) continue;

      // 바운딩 박스 교차 확인
      if (x + rx < part.x || x - rx > part.x + part.w || y + ry < part.y || y - ry > part.y + part.h) {
        continue;
      }

      const startC = Math.max(0, Math.floor((x - rx - part.x) / CELL_RESOLUTION));
      const endC = Math.min(part.gridCols - 1, Math.floor((x + rx - part.x) / CELL_RESOLUTION));
      const startR = Math.max(0, Math.floor((y - ry - part.y) / CELL_RESOLUTION));
      const endR = Math.min(part.gridRows - 1, Math.floor((y + ry - part.y) / CELL_RESOLUTION));

      let modified = false;

      for (let r = startR; r <= endR; r++) {
        for (let c = startC; c <= endC; c++) {
          const cellCenterX = part.x + c * CELL_RESOLUTION + CELL_RESOLUTION / 2;
          const cellCenterY = part.y + r * CELL_RESOLUTION + CELL_RESOLUTION / 2;

          // 타원형 분사 범위 판정
          const normDx = (cellCenterX - x) / rx;
          const normDy = (cellCenterY - y) / ry;
          const distSq = normDx * normDx + normDy * normDy;

          if (distSq <= 1.0 && part.dirtGrid[r][c] > 0) {
            const falloff = 1.0 - distSq * 0.4;
            if (this.state.selectedNozzle === "soap") {
              part.soapGrid[r][c] = true;
              // 비누 거품은 오염도를 40%까지 부드럽게 불려줌
              part.dirtGrid[r][c] = Math.max(0.35, part.dirtGrid[r][c] - spec.power * dt * falloff);
              modified = true;
            } else {
              const soapBonus = part.soapGrid[r][c] ? 2.2 : 1.0;
              const cleanDelta = ((spec.power * soapBonus) / part.toughness) * dt * falloff;
              part.dirtGrid[r][c] = Math.max(0, part.dirtGrid[r][c] - cleanDelta);
              if (part.dirtGrid[r][c] === 0) {
                part.soapGrid[r][c] = false;
              }
              modified = true;
            }
          }
        }
      }

      if (modified) {
        this.recalculatePartCleanliness(part);
        if (part.isCompleted) {
          newlyCompleted = { id: part.id, name: part.name, reward: part.rewardCash };
          this.state.justCompletedPart = newlyCompleted;
          this.state.cashEarned += part.rewardCash;
        }
      }
    }

    this.recalculateTotalProgress();
    return newlyCompleted;
  }

  public update(dt: number): PowerWashState {
    if (this.state.isHighlightingDirt) {
      this.state.highlightTimer -= dt;
      if (this.state.highlightTimer <= 0) {
        this.state.isHighlightingDirt = false;
        this.state.highlightTimer = 0;
      }
    }
    return this.state;
  }

  private recalculatePartCleanliness(part: WashablePart): void {
    let totalDirt = 0;
    const totalCells = part.gridRows * part.gridCols;

    for (let r = 0; r < part.gridRows; r++) {
      for (let c = 0; c < part.gridCols; c++) {
        totalDirt += part.dirtGrid[r][c];
      }
    }

    const rawCleanRatio = 1.0 - totalDirt / totalCells;

    // 95% 이상 세척되면 잔여 미세 도트를 자동 완결(Auto-complete Snap)하여 쾌감 부여
    if (rawCleanRatio >= 0.95) {
      for (let r = 0; r < part.gridRows; r++) {
        for (let c = 0; c < part.gridCols; c++) {
          part.dirtGrid[r][c] = 0;
          part.soapGrid[r][c] = false;
        }
      }
      part.cleanPercent = 100;
      part.isCompleted = true;
    } else {
      part.cleanPercent = Math.min(99, Math.floor((rawCleanRatio / 0.95) * 100));
    }
  }

  private recalculateTotalProgress(): void {
    const parts = this.state.parts;
    if (parts.length === 0) return;

    const sumPercent = parts.reduce((acc, p) => acc + p.cleanPercent, 0);
    this.state.totalCleanPercent = Math.floor(sumPercent / parts.length);

    if (parts.every((p) => p.isCompleted)) {
      this.state.totalCleanPercent = 100;
      this.state.status = "stage_clear";
    }
  }
}
