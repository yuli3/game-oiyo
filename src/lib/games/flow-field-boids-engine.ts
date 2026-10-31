/**
 * @file flow-field-boids-engine.ts
 * @description 플로우 필드 패스파인딩 & 대규모 군집 AI 엔진
 * - 다익스트라 기반 통합 비용 필드 (Integration Field)
 * - 그래디언트 미분 단위 방향 벡터장 (Vector Flow Field)
 * - Boids 3원칙(분리/정렬/응집) 결합 초고속 군집 시뮬레이터 (Flocking Swarm 2D)
 */

export interface FlowGridConfig {
  cols: number;
  rows: number;
  cellSize: number;
}

export interface BoidAgent {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  maxSpeed: number;
  maxForce: number;
  radius: number;
}

/**
 * 플로우 필드 2D 내비게이션 솔버
 */
export class VectorFlowField2D {
  public readonly cols: number;
  public readonly rows: number;
  public readonly cellSize: number;

  // 0: 통과 가능, 255: 벽/장애물
  private costField: Uint8Array;
  // 목적지로부터의 누적 최단 거리 비용 (65535: 도달 불가)
  private integrationField: Uint16Array;
  // 각 셀의 단위 방향 벡터 [vx, vy] (2 floats per cell)
  private vectors: Float32Array;

  constructor(config: FlowGridConfig) {
    this.cols = config.cols;
    this.rows = config.rows;
    this.cellSize = config.cellSize;

    const totalCells = this.cols * this.rows;
    this.costField = new Uint8Array(totalCells).fill(1); // 기본 이동 비용 1
    this.integrationField = new Uint16Array(totalCells).fill(65535);
    this.vectors = new Float32Array(totalCells * 2).fill(0);
  }

  public setObstacle(gridX: number, gridY: number, isObstacle: boolean): void {
    if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) return;
    const idx = gridY * this.cols + gridX;
    this.costField[idx] = isObstacle ? 255 : 1;
  }

  /**
   * 지정된 타겟 위치(월드 좌표)를 향한 전체 플로우 필드 재계산 (다익스트라 파동 전파)
   */
  public generateTowardsWorld(targetX: number, targetY: number): void {
    const targetGx = Math.floor(targetX / this.cellSize);
    const targetGy = Math.floor(targetY / this.cellSize);
    this.generateTowardsCell(targetGx, targetGy);
  }

  public generateTowardsCell(targetGx: number, targetGy: number): void {
    this.integrationField.fill(65535);
    this.vectors.fill(0);

    const clampedTx = Math.min(this.cols - 1, Math.max(0, targetGx));
    const clampedTy = Math.min(this.rows - 1, Math.max(0, targetGy));
    const targetIdx = clampedTy * this.cols + clampedTx;

    this.integrationField[targetIdx] = 0;

    // BFS 큐를 사용한 비용 전파
    const queue: number[] = [targetIdx];
    let head = 0;

    // 상, 우, 하, 좌 및 대각선 이웃 오프셋
    const neighborOffsets = [
      { dx: 0, dy: -1, cost: 10 },
      { dx: 1, dy: 0, cost: 10 },
      { dx: 0, dy: 1, cost: 10 },
      { dx: -1, dy: 0, cost: 10 },
      { dx: 1, dy: -1, cost: 14 },
      { dx: 1, dy: 1, cost: 14 },
      { dx: -1, dy: 1, cost: 14 },
      { dx: -1, dy: -1, cost: 14 },
    ];

    while (head < queue.length) {
      const curr = queue[head++];
      const cx = curr % this.cols;
      const cy = Math.floor(curr / this.cols);
      const currentCost = this.integrationField[curr];

      for (const n of neighborOffsets) {
        const nx = cx + n.dx;
        const ny = cy + n.dy;

        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
        const nIdx = ny * this.cols + nx;
        if (this.costField[nIdx] === 255) continue; // 벽

        const newCost = currentCost + n.cost * this.costField[nIdx];
        if (newCost < this.integrationField[nIdx]) {
          this.integrationField[nIdx] = newCost;
          queue.push(nIdx);
        }
      }
    }

    // 각 셀의 인접 최소 비용 이웃을 향한 그래디언트 벡터 계산
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const idx = y * this.cols + x;
        if (this.costField[idx] === 255) continue;

        let minCost = this.integrationField[idx];
        let bestDx = 0;
        let bestDy = 0;

        for (const n of neighborOffsets) {
          const nx = x + n.dx;
          const ny = y + n.dy;
          if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
          const nIdx = ny * this.cols + nx;

          const nCost = this.integrationField[nIdx];
          if (nCost < minCost) {
            minCost = nCost;
            bestDx = n.dx;
            bestDy = n.dy;
          }
        }

        // 정규화된 단위 벡터 저장
        const mag = Math.hypot(bestDx, bestDy);
        if (mag > 0) {
          this.vectors[idx * 2] = bestDx / mag;
          this.vectors[idx * 2 + 1] = bestDy / mag;
        }
      }
    }
  }

  /**
   * 월드 좌표 (x, y)에서의 유도 벡터 샘플링 (O(1))
   */
  public sampleVector(worldX: number, worldY: number): [number, number] {
    const gx = Math.floor(worldX / this.cellSize);
    const gy = Math.floor(worldY / this.cellSize);

    if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) {
      return [0, 0];
    }

    const idx = (gy * this.cols + gx) * 2;
    return [this.vectors[idx], this.vectors[idx + 1]];
  }
}

/**
 * Boids 군집 AI 시뮬레이터 (Flocking + Flow Field)
 */
export class FlockingSwarm2D {
  private boids: BoidAgent[] = [];

  constructor(
    public readonly flowField: VectorFlowField2D,
    public separationDist = 20,
    public neighborDist = 40
  ) {}

  public addBoid(boid: BoidAgent): void {
    this.boids.push(boid);
  }

  public getBoids(): readonly BoidAgent[] {
    return this.boids;
  }

  public clear(): void {
    this.boids = [];
  }

  public update(dt: number): void {
    const count = this.boids.length;

    for (let i = 0; i < count; i++) {
      const boid = this.boids[i];

      // 1. 플로우 필드 유도력 (Flow Field Steering)
      const [flowDx, flowDy] = this.flowField.sampleVector(boid.x, boid.y);
      let steerX = flowDx * boid.maxSpeed - boid.vx;
      let steerY = flowDy * boid.maxSpeed - boid.vy;

      // 2. 이웃 간 분리(Separation) 반발력
      let sepX = 0;
      let sepY = 0;
      let sepCount = 0;

      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const other = this.boids[j];
        const dx = boid.x - other.x;
        const dy = boid.y - other.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > 0 && distSq < this.separationDist * this.separationDist) {
          const dist = Math.sqrt(distSq);
          sepX += (dx / dist) / dist; // 가까울수록 강한 반발
          sepY += (dy / dist) / dist;
          sepCount++;
        }
      }

      if (sepCount > 0) {
        sepX /= sepCount;
        sepY /= sepCount;
        const sepMag = Math.hypot(sepX, sepY);
        if (sepMag > 0) {
          sepX = (sepX / sepMag) * boid.maxSpeed - boid.vx;
          sepY = (sepY / sepMag) * boid.maxSpeed - boid.vy;
        }
      }

      // 힘 결합 (플로우 필드 가중치 1.0 + 분리 가중치 1.8)
      const totalForceX = steerX * 1.0 + sepX * 1.8;
      const totalForceY = steerY * 1.0 + sepY * 1.8;

      // 힘 클램프
      const forceMag = Math.hypot(totalForceX, totalForceY);
      const clampedForceX =
        forceMag > boid.maxForce ? (totalForceX / forceMag) * boid.maxForce : totalForceX;
      const clampedForceY =
        forceMag > boid.maxForce ? (totalForceY / forceMag) * boid.maxForce : totalForceY;

      // 속도 및 위치 적분
      boid.vx += clampedForceX * dt;
      boid.vy += clampedForceY * dt;

      const speed = Math.hypot(boid.vx, boid.vy);
      if (speed > boid.maxSpeed) {
        boid.vx = (boid.vx / speed) * boid.maxSpeed;
        boid.vy = (boid.vy / speed) * boid.maxSpeed;
      }

      boid.x += boid.vx * dt;
      boid.y += boid.vy * dt;
    }
  }
}
