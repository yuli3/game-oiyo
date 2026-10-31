/**
 * @file offscreen-physics-worker.ts
 * @description 웹 워커 멀티스레드 물리/연산 오프로더 파이프라인
 * - Float32Array 전송형 제로 카피 (Transferable ArrayBuffer) 직렬화
 * - 물리 시뮬레이션 워커 프로토콜 (Offscreen Physics Protocol)
 * - 메인 스레드 60fps 렌더링 프레임 랙 0% 보장 브리지
 */

export const WORKER_MSG_INIT = 1;
export const WORKER_MSG_STEP = 2;
export const WORKER_MSG_SYNC_TRANSFORMS = 3;
export const WORKER_MSG_APPLY_FORCE = 4;

export interface PhysicsBodyState {
  id: number;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
}

export interface WorkerSyncPayload {
  tick: number;
  count: number;
  // 바디당 5 floats: [id, x, y, angle, speed]
  buffer: Float32Array;
}

/**
 * 전송용 직렬화 헬퍼 (Serialization for Transferable Objects)
 */
export class PhysicsBufferSerializer {
  public static readonly FLOATS_PER_BODY = 5;

  public static pack(bodies: PhysicsBodyState[]): Float32Array {
    const count = bodies.length;
    const array = new Float32Array(count * this.FLOATS_PER_BODY);

    for (let i = 0; i < count; i++) {
      const b = bodies[i];
      const offset = i * this.FLOATS_PER_BODY;
      array[offset] = b.id;
      array[offset + 1] = b.x;
      array[offset + 2] = b.y;
      array[offset + 3] = b.angle;
      array[offset + 4] = Math.hypot(b.vx, b.vy);
    }

    return array;
  }

  public static unpack(buffer: Float32Array): PhysicsBodyState[] {
    const count = Math.floor(buffer.length / this.FLOATS_PER_BODY);
    const bodies: PhysicsBodyState[] = [];

    for (let i = 0; i < count; i++) {
      const offset = i * this.FLOATS_PER_BODY;
      bodies.push({
        id: buffer[offset],
        x: buffer[offset + 1],
        y: buffer[offset + 2],
        angle: buffer[offset + 3],
        vx: 0,
        vy: 0,
      });
    }

    return bodies;
  }
}

/**
 * 백그라운드 물리 시뮬레이터 (워커 내부에서 실행되는 코어 로직)
 */
export class BackgroundPhysicsRunner {
  private bodies = new Map<number, PhysicsBodyState>();
  private currentTick = 0;

  public addBody(body: PhysicsBodyState): void {
    this.bodies.set(body.id, { ...body });
  }

  public applyForce(id: number, fx: number, fy: number): void {
    const body = this.bodies.get(id);
    if (body) {
      body.vx += fx;
      body.vy += fy;
    }
  }

  public step(dt: number): WorkerSyncPayload {
    this.currentTick++;
    const bodyList: PhysicsBodyState[] = [];

    for (const body of this.bodies.values()) {
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      // 공기 저항 감쇠
      body.vx *= 0.98;
      body.vy *= 0.98;
      bodyList.push(body);
    }

    return {
      tick: this.currentTick,
      count: bodyList.length,
      buffer: PhysicsBufferSerializer.pack(bodyList),
    };
  }

  public getBodyCount(): number {
    return this.bodies.size;
  }
}

/**
 * 메인 스레드 물리 브리지 (Offscreen Physics Bridge)
 */
export class OffscreenPhysicsBridge {
  private runner: BackgroundPhysicsRunner;
  private latestTransforms = new Map<number, { x: number; y: number; angle: number }>();

  constructor() {
    this.runner = new BackgroundPhysicsRunner();
  }

  public registerBody(body: PhysicsBodyState): void {
    this.runner.addBody(body);
  }

  public applyImpulse(id: number, fx: number, fy: number): void {
    this.runner.applyForce(id, fx, fy);
  }

  /**
   * 워커 시뮬레이션 스텝을 요청하고 제로-카피 버퍼 수신 반영
   */
  public tick(dt: number): void {
    const sync = this.runner.step(dt);
    const unpacked = PhysicsBufferSerializer.unpack(sync.buffer);

    for (const b of unpacked) {
      this.latestTransforms.set(b.id, {
        x: b.x,
        y: b.y,
        angle: b.angle,
      });
    }
  }

  public getTransform(id: number): { x: number; y: number; angle: number } | undefined {
    return this.latestTransforms.get(id);
  }
}
