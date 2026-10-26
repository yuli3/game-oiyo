/**
/**
 * 샌드 볼스 3D (Sand Balls Physics) 코어 게임 엔진
 *
 * SayGames 스타일의 모래 파기 & 구체 물리 낙하 시뮬레이션.
 * - 터치/마우스 드래그를 통한 실시간 모래 지형 절삭(Carving)
 * - 2D 구체 물리 엔진 (중력, 마찰, 탄성 반발, 볼-볼 상호 탄성 충돌)
 * - 컬러 감염(Color Infection): 채색된 볼이 회색 무채색 볼과 접촉 시 같은 색상으로 활성화
 * - 배율 게이트 (x2 Gate, +10 Gate) 및 회전 장애물/반발 핀
 * - 하단 수송 트럭 적재함 안착 판정 및 100% 충전 시 레벨 클리어
 */

export interface PhysicsBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isColored: boolean;
  collected: boolean;
}

export interface Gate {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: "multiply" | "add";
  value: number;
  passedBallIds: Set<number>;
}

export interface PegObstacle {
  x: number;
  y: number;
  radius: number;
  bounciness: number;
}

export interface SandBallsState {
  width: number;
  height: number;
  balls: PhysicsBall[];
  gates: Gate[];
  pegs: PegObstacle[];
  dugMask: boolean[][]; // [gridY][gridX] true이면 파낸 구멍
  gridCols: number;
  gridRows: number;
  cellSize: number;
  truckCapacity: number;
  collectedCount: number;
  status: "playing" | "victory" | "gameover";
  level: number;
  totalSpawned: number;
}

export class SandBallsEngine {
  private state: SandBallsState;
  private gravity = 480; // px/s^2

  constructor(width = 400, height = 650, cellSize = 8) {
    this.state = this.initLevel(1, width, height, cellSize);
  }

  public getState(): SandBallsState {
    return this.state;
  }

  public initLevel(level: number, width = 400, height = 650, cellSize = 8): SandBallsState {
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);

    // 기본적으로 상단 일부와 하단 트럭 구역을 제외하고 전체가 모래로 채워짐
    const dugMask: boolean[][] = [];
    for (let r = 0; r < rows; r++) {
      dugMask[r] = [];
      for (let c = 0; c < cols; c++) {
        // y < 90 (시작 포켓) 또는 y > height - 70 (트럭 구역)은 기본 파여있음
        const y = r * cellSize;
        dugMask[r][c] = y < 90 || y > height - 70;
      }
    }

    // 초기 볼 생성 (상단에 모여있는 채색 볼 + 중간중간 모래에 갇힌 회색 볼)
    const balls: PhysicsBall[] = [];
    let ballId = 0;

    // 상단 활성 컬러 볼 (20개)
    const activeColors = ["#f43f5e", "#06b6d4", "#a855f7", "#eab308", "#10b981"];
    for (let i = 0; i < 20; i++) {
      const colIndex = i % activeColors.length;
      balls.push({
        id: ballId++,
        x: width * 0.35 + (i % 5) * 16 + (Math.random() - 0.5) * 4,
        y: 40 + Math.floor(i / 5) * 15,
        vx: (Math.random() - 0.5) * 10,
        vy: 0,
        radius: 6.5,
        color: activeColors[colIndex],
        isColored: true,
        collected: false,
      });
    }

    // 중간 모래 주머니에 갇힌 무채색(회색) 볼 (15개)
    for (let i = 0; i < 15; i++) {
      balls.push({
        id: ballId++,
        x: width * 0.2 + (i % 5) * 18 + (Math.random() - 0.5) * 4,
        y: 220 + Math.floor(i / 5) * 16,
        vx: 0,
        vy: 0,
        radius: 6.5,
        color: "#94a3b8", // grey
        isColored: false,
        collected: false,
      });
    }

    // 배율 게이트 (x2)
    const gates: Gate[] = [
      {
        id: "gate_1",
        x: width * 0.45,
        y: 380,
        w: 60,
        h: 22,
        type: "multiply",
        value: 2,
        passedBallIds: new Set<number>(),
      },
    ];

    // 반발 핀 장애물
    const pegs: PegObstacle[] = [
      { x: width * 0.3, y: 310, radius: 10, bounciness: 0.6 },
      { x: width * 0.7, y: 310, radius: 10, bounciness: 0.6 },
      { x: width * 0.5, y: 470, radius: 12, bounciness: 0.6 },
    ];

    return {
      width,
      height,
      balls,
      gates,
      pegs,
      dugMask,
      gridCols: cols,
      gridRows: rows,
      cellSize,
      truckCapacity: 25,
      collectedCount: 0,
      status: "playing",
      level,
      totalSpawned: balls.length,
    };
  }

  /**
   * 터치/마우스 위치에서 원형 반경으로 모래 절삭
   */
  public carve(x: number, y: number, radius = 24): void {
    if (this.state.status !== "playing") return;

    const { cellSize, gridCols, gridRows, dugMask } = this.state;
    const rCells = Math.ceil(radius / cellSize);
    const centerC = Math.floor(x / cellSize);
    const centerR = Math.floor(y / cellSize);

    for (let r = Math.max(0, centerR - rCells); r <= Math.min(gridRows - 1, centerR + rCells); r++) {
      for (let c = Math.max(0, centerC - rCells); c <= Math.min(gridCols - 1, centerC + rCells); c++) {
        const cellX = c * cellSize + cellSize / 2;
        const cellY = r * cellSize + cellSize / 2;
        if (Math.hypot(cellX - x, cellY - y) <= radius) {
          dugMask[r][c] = true; // 모래 제거
        }
      }
    }
  }

  /**
   * 60fps 물리 시뮬레이션 스텝
   */
  public update(dt: number): SandBallsState {
    if (this.state.status !== "playing") return this.state;

    const { width, height, cellSize, gridCols, gridRows, dugMask, balls, pegs, gates } = this.state;
    const subSteps = 3;
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      // 1. 볼 중력 및 속도 적분
      for (const b of balls) {
        if (b.collected) continue;

        b.vy += this.gravity * subDt;
        b.x += b.vx * subDt;
        b.y += b.vy * subDt;

        // 벽 충돌 (좌우)
        if (b.x < b.radius) {
          b.x = b.radius;
          b.vx = -b.vx * 0.4;
        } else if (b.x > width - b.radius) {
          b.x = width - b.radius;
          b.vx = -b.vx * 0.4;
        }

        // 모래 지형과의 충돌 (모래가 아직 차있는 셀에서는 멈춤)
        const cellC = Math.floor(b.x / cellSize);
        const cellR = Math.floor(b.y / cellSize);

        if (cellR >= 0 && cellR < gridRows && cellC >= 0 && cellC < gridCols) {
          if (!dugMask[cellR][cellC]) {
            // 모래 안에 갇힘: 속도 급감 및 정지
            b.vx *= 0.7;
            b.vy *= 0.7;
            // 위쪽이나 비어있는 셀 방향으로 가볍게 밀려남
            b.y -= b.vy * subDt * 1.5;
            b.x -= b.vx * subDt * 1.5;
          }
        }

        // 반발 핀 장애물 충돌
        for (const peg of pegs) {
          const dx = b.x - peg.x;
          const dy = b.y - peg.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b.radius + peg.radius;
          if (dist < minDist && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;
            b.x = peg.x + nx * minDist;
            b.y = peg.y + ny * minDist;

            const dot = b.vx * nx + b.vy * ny;
            b.vx = (b.vx - 2 * dot * nx) * peg.bounciness;
            b.vy = (b.vy - 2 * dot * ny) * peg.bounciness;
          }
        }

        // 배율 게이트 통과 검사
        for (const gate of gates) {
          if (
            b.x >= gate.x - gate.w / 2 &&
            b.x <= gate.x + gate.w / 2 &&
            b.y >= gate.y - gate.h / 2 &&
            b.y <= gate.y + gate.h / 2
          ) {
            if (!gate.passedBallIds.has(b.id)) {
              gate.passedBallIds.add(b.id);
              if (gate.type === "multiply") {
                // 복제 볼 1개 생성
                this.spawnClonedBall(b);
              }
            }
          }
        }

        // 하단 트럭 적재함 도착 검사
        if (b.y >= height - 60) {
          b.collected = true;
          this.state.collectedCount++;

          if (this.state.collectedCount >= this.state.truckCapacity) {
            this.state.status = "victory";
          }
        }
      }

      // 2. 볼 상호 간 탄성 충돌 & 컬러 감염
      for (let i = 0; i < balls.length; i++) {
        const b1 = balls[i];
        if (b1.collected) continue;

        for (let j = i + 1; j < balls.length; j++) {
          const b2 = balls[j];
          if (b2.collected) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b1.radius + b2.radius;

          if (dist < minDist && dist > 0.001) {
            // 위치 분리
            const overlap = (minDist - dist) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;

            b1.x -= nx * overlap;
            b1.y -= ny * overlap;
            b2.x += nx * overlap;
            b2.y += ny * overlap;

            // 탄성 충돌 속도 교환
            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = 2 * (nx * kx + ny * ky) / 2;

            b1.vx -= p * nx * 0.8;
            b1.vy -= p * ny * 0.8;
            b2.vx += p * nx * 0.8;
            b2.vy += p * ny * 0.8;

            // 컬러 감염 (Colored 볼과 Grey 볼이 닿으면 둘 다 컬러화)
            if (b1.isColored && !b2.isColored) {
              b2.isColored = true;
              b2.color = b1.color;
            } else if (!b1.isColored && b2.isColored) {
              b1.isColored = true;
              b1.color = b2.color;
            }
          }
        }
      }
    }

    return this.state;
  }

  private spawnClonedBall(parent: PhysicsBall): void {
    const newBall: PhysicsBall = {
      id: this.state.balls.length + 1000,
      x: parent.x + (Math.random() - 0.5) * 6,
      y: parent.y + (Math.random() - 0.5) * 6,
      vx: parent.vx + (Math.random() - 0.5) * 20,
      vy: parent.vy,
      radius: parent.radius,
      color: parent.color,
      isColored: parent.isColored,
      collected: false,
    };
    this.state.balls.push(newBall);
    this.state.totalSpawned++;
  }
}
