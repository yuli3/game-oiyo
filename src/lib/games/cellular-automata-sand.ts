/**
 * @file cellular-automata-sand.ts
 * @description 샌드박스 픽셀 입자 물리 엔진 (Noita / Powder Game 스타일)
 * - TypedArray 기반 2D 셀룰러 오토마타 (Cellular Automata)
 * - 모래(중력/안식각), 물(유체 확산), 불/연기(상승 및 상호작용)
 * - 밀도 차이에 의한 치환 물리 (모래 > 물 > 공기)
 */

export const ELEMENT_EMPTY = 0;
export const ELEMENT_WALL = 1;
export const ELEMENT_SAND = 2;
export const ELEMENT_WATER = 3;
export const ELEMENT_FIRE = 4;
export const ELEMENT_SMOKE = 5;

export interface ParticleConfig {
  width: number;
  height: number;
}

export class CellularAutomataSand2D {
  public readonly width: number;
  public readonly height: number;
  public readonly grid: Uint8Array;
  public readonly lifetime: Uint8Array; // 불/연기 수명 타이머

  constructor(width = 120, height = 120) {
    this.width = width;
    this.height = height;
    const size = width * height;
    this.grid = new Uint8Array(size).fill(ELEMENT_EMPTY);
    this.lifetime = new Uint8Array(size).fill(0);
  }

  public set(x: number, y: number, element: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = y * this.width + x;
    this.grid[idx] = element;
    if (element === ELEMENT_FIRE) {
      this.lifetime[idx] = 15; // 15틱 수명
    } else if (element === ELEMENT_SMOKE) {
      this.lifetime[idx] = 30; // 30틱 수명
    }
  }

  public get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return ELEMENT_WALL;
    return this.grid[y * this.width + x];
  }

  /**
   * 단일 물리 시뮬레이션 스텝 (하단에서 상단으로 스캔하여 이중 낙하 방지)
   */
  public step(): void {
    const w = this.width;
    const h = this.height;

    // 모래와 물은 아래에서 위로(y = h-2 down to 0) 시뮬레이션
    for (let y = h - 2; y >= 0; y--) {
      // 좌우 편향을 방지하기 위해 홀수/짝수 프레임 또는 랜덤 방향 스캔
      const startX = Math.random() < 0.5 ? 0 : w - 1;
      const stepX = startX === 0 ? 1 : -1;

      for (let i = 0; i < w; i++) {
        const x = startX + i * stepX;
        const idx = y * w + x;
        const elem = this.grid[idx];

        if (elem === ELEMENT_SAND) {
          this.updateSand(x, y, idx);
        } else if (elem === ELEMENT_WATER) {
          this.updateWater(x, y, idx);
        }
      }
    }

    // 불과 연기는 위로 상승하므로 위에서 아래로(y = 0 up to h-1) 시뮬레이션
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const elem = this.grid[idx];
        if (elem === ELEMENT_FIRE) {
          this.updateFire(x, y, idx);
        } else if (elem === ELEMENT_SMOKE) {
          this.updateSmoke(x, y, idx);
        }
      }
    }
  }

  private updateSand(x: number, y: number, idx: number): void {
    const below = (y + 1) * this.width + x;
    const belowElem = this.grid[below];

    // 1. 바로 아래가 비어있거나 물이면 낙하 (밀도 차이로 물을 위로 치환)
    if (belowElem === ELEMENT_EMPTY || belowElem === ELEMENT_WATER) {
      this.grid[idx] = belowElem;
      this.grid[below] = ELEMENT_SAND;
      return;
    }

    // 2. 대각선 미끄러짐 (안식각)
    const dir = Math.random() < 0.5 ? 1 : -1;
    const diagA = (y + 1) * this.width + (x + dir);
    const diagB = (y + 1) * this.width + (x - dir);

    if (x + dir >= 0 && x + dir < this.width && this.canSandDisplace(diagA)) {
      const target = this.grid[diagA];
      this.grid[idx] = target;
      this.grid[diagA] = ELEMENT_SAND;
    } else if (x - dir >= 0 && x - dir < this.width && this.canSandDisplace(diagB)) {
      const target = this.grid[diagB];
      this.grid[idx] = target;
      this.grid[diagB] = ELEMENT_SAND;
    }
  }

  private canSandDisplace(idx: number): boolean {
    const elem = this.grid[idx];
    return elem === ELEMENT_EMPTY || elem === ELEMENT_WATER;
  }

  private updateWater(x: number, y: number, idx: number): void {
    const below = (y + 1) * this.width + x;
    if (this.grid[below] === ELEMENT_EMPTY) {
      this.grid[idx] = ELEMENT_EMPTY;
      this.grid[below] = ELEMENT_WATER;
      return;
    }

    // 대각선 아래 흐름
    const dir = Math.random() < 0.5 ? 1 : -1;
    const diagA = (y + 1) * this.width + (x + dir);
    if (x + dir >= 0 && x + dir < this.width && this.grid[diagA] === ELEMENT_EMPTY) {
      this.grid[idx] = ELEMENT_EMPTY;
      this.grid[diagA] = ELEMENT_WATER;
      return;
    }

    // 수평 좌우 확산 (유체)
    const sideA = y * this.width + (x + dir);
    const sideB = y * this.width + (x - dir);
    if (x + dir >= 0 && x + dir < this.width && this.grid[sideA] === ELEMENT_EMPTY) {
      this.grid[idx] = ELEMENT_EMPTY;
      this.grid[sideA] = ELEMENT_WATER;
    } else if (x - dir >= 0 && x - dir < this.width && this.grid[sideB] === ELEMENT_EMPTY) {
      this.grid[idx] = ELEMENT_EMPTY;
      this.grid[sideB] = ELEMENT_WATER;
    }
  }

  private updateFire(x: number, y: number, idx: number): void {
    if (this.lifetime[idx] <= 0) {
      // 불 소멸 시 50% 확률로 연기 생성
      this.grid[idx] = Math.random() < 0.5 ? ELEMENT_SMOKE : ELEMENT_EMPTY;
      this.lifetime[idx] = this.grid[idx] === ELEMENT_SMOKE ? 20 : 0;
      return;
    }
    this.lifetime[idx]--;

    // 주변 물 접촉 시 소멸 (치익 연기)
    const neighbors = [
      y * this.width + (x + 1),
      y * this.width + (x - 1),
      (y + 1) * this.width + x,
      (y - 1) * this.width + x,
    ];

    for (const n of neighbors) {
      if (this.grid[n] === ELEMENT_WATER) {
        this.grid[idx] = ELEMENT_SMOKE;
        this.lifetime[idx] = 15;
        this.grid[n] = ELEMENT_EMPTY; // 물도 증발
        return;
      }
    }

    // 위로 상승
    if (y > 0) {
      const up = (y - 1) * this.width + x;
      if (this.grid[up] === ELEMENT_EMPTY) {
        this.grid[idx] = ELEMENT_EMPTY;
        this.grid[up] = ELEMENT_FIRE;
        this.lifetime[up] = this.lifetime[idx];
      }
    }
  }

  private updateSmoke(x: number, y: number, idx: number): void {
    if (this.lifetime[idx] <= 0) {
      this.grid[idx] = ELEMENT_EMPTY;
      return;
    }
    this.lifetime[idx]--;

    if (y > 0) {
      const dir = (Math.random() - 0.5) * 2 > 0 ? 1 : -1;
      const targetX = x + dir;
      const targetY = y - 1;
      if (targetX >= 0 && targetX < this.width) {
        const upDiag = targetY * this.width + targetX;
        if (this.grid[upDiag] === ELEMENT_EMPTY) {
          this.grid[idx] = ELEMENT_EMPTY;
          this.grid[upDiag] = ELEMENT_SMOKE;
          this.lifetime[upDiag] = this.lifetime[idx];
        }
      }
    }
  }
}
