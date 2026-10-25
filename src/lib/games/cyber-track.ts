/**
 * @file cyber-track.ts
 * @description Pure physics and track management engine for CyberTrack 3D (Polytrack-style low-poly time-attack racer).
 * Features: Realistic arcade car physics, drift mechanics, checkpoint lap-timing, and ghost recording/playback.
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Checkpoint {
  id: number;
  x: number;
  z: number;
  radius: number;
  isFinish?: boolean;
}

export interface TrackDefinition {
  id: string;
  name: Record<string, string>;
  difficulty: "easy" | "medium" | "hard";
  parTimeMs: number;
  checkpoints: Checkpoint[];
  waypoints: Vector3D[];
  startPos: Vector3D;
  startAngle: number;
}

export interface CarPhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  angle: number; // In radians, 0 is along +Z axis
  speed: number; // km/h
  rpm: number; // 0..8000
  steerAngle: number;
  isDrifting: boolean;
  driftScore: number;
  isGrounded: boolean;
  currentCheckpointIdx: number;
  lapTimeMs: number;
  status: "ready" | "racing" | "finished" | "crashed";
}

export interface CarInput {
  throttle: number; // -1 (reverse/brake) to 1 (full forward)
  steer: number; // -1 (full left) to 1 (full right)
  drift: boolean;
  boost: boolean;
}

export interface GhostFrame {
  timeMs: number;
  x: number;
  y: number;
  z: number;
  angle: number;
}

export const OFFICIAL_TRACKS: TrackDefinition[] = [
  {
    id: "alpha-circuit",
    name: { ko: "알파 서킷", en: "Circuit Alpha", ja: "サーキット・アルファ", zh: "阿尔法赛道", fr: "Circuit Alpha", es: "Circuito Alfa" },
    difficulty: "easy",
    parTimeMs: 25000,
    startPos: { x: 0, y: 0, z: 0 },
    startAngle: 0,
    checkpoints: [
      { id: 1, x: 0, z: 60, radius: 12 },
      { id: 2, x: 50, z: 100, radius: 14 },
      { id: 3, x: 100, z: 50, radius: 14 },
      { id: 4, x: 80, z: -30, radius: 12 },
      { id: 5, x: 0, z: -10, radius: 12, isFinish: true },
    ],
    waypoints: [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 60 },
      { x: 50, y: 0, z: 100 },
      { x: 100, y: 0, z: 50 },
      { x: 80, y: 0, z: -30 },
      { x: 20, y: 0, z: -20 },
      { x: 0, y: 0, z: 0 },
    ],
  },
  {
    id: "neon-heights",
    name: { ko: "네온 하이츠", en: "Neon Heights", ja: "ネオン・ハイツ", zh: "霓虹高地", fr: "Hauteurs Néon", es: "Alturas Neón" },
    difficulty: "medium",
    parTimeMs: 32000,
    startPos: { x: -40, y: 0, z: 0 },
    startAngle: 0,
    checkpoints: [
      { id: 1, x: -40, z: 70, radius: 12 },
      { id: 2, x: 20, z: 120, radius: 14 },
      { id: 3, x: 80, z: 80, radius: 12 },
      { id: 4, x: 60, z: -20, radius: 14 },
      { id: 5, x: -20, z: -60, radius: 14 },
      { id: 6, x: -40, z: -10, radius: 12, isFinish: true },
    ],
    waypoints: [
      { x: -40, y: 0, z: 0 },
      { x: -40, y: 0, z: 70 },
      { x: 20, y: 0, z: 120 },
      { x: 80, y: 0, z: 80 },
      { x: 60, y: 0, z: -20 },
      { x: -20, y: 0, z: -60 },
      { x: -40, y: 0, z: 0 },
    ],
  },
  {
    id: "poly-roller",
    name: { ko: "폴리 롤러코스터", en: "Poly Roller", ja: "ポリ・ローラー", zh: "多边形过山车", fr: "Grand Huit Poly", es: "Montaña Rusa Poli" },
    difficulty: "hard",
    parTimeMs: 40000,
    startPos: { x: 0, y: 0, z: -50 },
    startAngle: 0,
    checkpoints: [
      { id: 1, x: 0, z: 30, radius: 12 },
      { id: 2, x: -60, z: 80, radius: 14 },
      { id: 3, x: -30, z: 140, radius: 14 },
      { id: 4, x: 60, z: 120, radius: 14 },
      { id: 5, x: 80, z: 20, radius: 14 },
      { id: 6, x: 30, z: -40, radius: 14 },
      { id: 7, x: 0, z: -55, radius: 12, isFinish: true },
    ],
    waypoints: [
      { x: 0, y: 0, z: -50 },
      { x: 0, y: 0, z: 30 },
      { x: -60, y: 0, z: 80 },
      { x: -30, y: 0, z: 140 },
      { x: 60, y: 0, z: 120 },
      { x: 80, y: 0, z: 20 },
      { x: 30, y: 0, z: -40 },
      { x: 0, y: 0, z: -50 },
    ],
  },
];

export const MAX_FORWARD_SPEED = 180; // km/h
export const MAX_REVERSE_SPEED = 45; // km/h
export const ACCELERATION_RATE = 55; // km/h per second
export const BRAKE_RATE = 90; // km/h per second
export const NATURAL_DECEL = 18; // km/h per second friction
export const STEER_SPEED = 2.4; // rad/s
export const DRIFT_FACTOR = 0.55;

export function createInitialCarState(track: TrackDefinition): CarPhysicsState {
  return {
    x: track.startPos.x,
    y: track.startPos.y,
    z: track.startPos.z,
    vx: 0,
    vy: 0,
    vz: 0,
    angle: track.startAngle,
    speed: 0,
    rpm: 1000,
    steerAngle: 0,
    isDrifting: false,
    driftScore: 0,
    isGrounded: true,
    currentCheckpointIdx: 0,
    lapTimeMs: 0,
    status: "ready",
  };
}

/**
 * Discrete time-step vehicle physics simulation
 */
export function stepCarPhysics(
  car: CarPhysicsState,
  input: CarInput,
  dtSeconds: number,
  track: TrackDefinition
): { nextCar: CarPhysicsState; checkpointPassed?: Checkpoint; isLapFinished: boolean } {
  if (car.status === "finished" || car.status === "crashed") {
    return { nextCar: car, isLapFinished: car.status === "finished" };
  }

  const dt = Math.min(0.1, Math.max(0.001, dtSeconds));
  let status: CarPhysicsState["status"] = car.status;
  let lapTime = car.lapTimeMs;

  // Start race on first throttle input
  if (status === "ready" && (input.throttle !== 0 || input.steer !== 0)) {
    status = "racing";
  }

  if (status === "racing") {
    lapTime += dt * 1000;
  }

  // 1. Acceleration / Deceleration
  let speed = car.speed;
  const isDrifting = input.drift && Math.abs(speed) > 30;

  if (input.throttle > 0) {
    const boostMultiplier = input.boost ? 1.4 : 1.0;
    const accel = ACCELERATION_RATE * input.throttle * boostMultiplier;
    speed = Math.min(MAX_FORWARD_SPEED * boostMultiplier, speed + accel * dt);
  } else if (input.throttle < 0) {
    if (speed > 5) {
      // Braking
      speed = Math.max(0, speed - BRAKE_RATE * Math.abs(input.throttle) * dt);
    } else {
      // Reverse
      speed = Math.max(-MAX_REVERSE_SPEED, speed - ACCELERATION_RATE * 0.6 * dt);
    }
  } else {
    // Natural friction deceleration
    if (speed > 0) {
      speed = Math.max(0, speed - NATURAL_DECEL * dt);
    } else if (speed < 0) {
      speed = Math.min(0, speed + NATURAL_DECEL * dt);
    }
  }

  // Drift friction slowdown
  if (isDrifting) {
    speed = Math.max(20, speed - NATURAL_DECEL * 1.5 * dt);
  }

  // 2. Steering & Angle
  let angle = car.angle;
  let steerAngle = input.steer * (isDrifting ? 1.4 : 1.0);

  if (Math.abs(speed) > 1) {
    const steerDirection = speed > 0 ? 1 : -1;
    const speedRatio = Math.min(1.0, Math.abs(speed) / 60);
    const turnRate = STEER_SPEED * steerAngle * speedRatio * steerDirection;
    angle += turnRate * dt;
  }

  // 3. Velocity in world coordinates (Speed km/h -> m/s is / 3.6)
  const speedMps = speed / 3.6;
  const forwardX = Math.sin(angle);
  const forwardZ = Math.cos(angle);

  const vx = forwardX * speedMps;
  const vz = forwardZ * speedMps;

  const nextX = car.x + vx * dt;
  const nextZ = car.z + vz * dt;

  // 4. Drift score accumulation
  let driftScore = car.driftScore;
  if (isDrifting && Math.abs(input.steer) > 0.2) {
    driftScore += Math.round(Math.abs(speed) * dt * 2);
  }

  // 5. Engine RPM simulation
  const speedNorm = Math.abs(speed) / MAX_FORWARD_SPEED;
  const gear = Math.min(5, Math.floor(speedNorm * 5) + 1);
  const gearRatio = (speedNorm * 5) % 1;
  const rpm = Math.round(1000 + gearRatio * 6000 + (input.throttle > 0 ? 500 : 0));

  // 6. Checkpoint collision detection
  let currentCheckpointIdx = car.currentCheckpointIdx;
  let checkpointPassed: Checkpoint | undefined;
  let isLapFinished = false;

  const targetCheckpoint = track.checkpoints[currentCheckpointIdx];
  if (targetCheckpoint) {
    const distSq =
      Math.pow(nextX - targetCheckpoint.x, 2) + Math.pow(nextZ - targetCheckpoint.z, 2);

    if (distSq <= Math.pow(targetCheckpoint.radius, 2)) {
      checkpointPassed = targetCheckpoint;
      if (targetCheckpoint.isFinish) {
        status = "finished";
        isLapFinished = true;
      } else {
        currentCheckpointIdx++;
      }
    }
  }

  const nextCar: CarPhysicsState = {
    ...car,
    x: nextX,
    z: nextZ,
    vx,
    vz,
    angle,
    speed: Math.round(speed * 10) / 10,
    rpm,
    steerAngle,
    isDrifting,
    driftScore,
    currentCheckpointIdx,
    lapTimeMs: Math.round(lapTime),
    status,
  };

  return { nextCar, checkpointPassed, isLapFinished };
}

/**
 * Sample ghost replay position at a given elapsed time
 */
export function sampleGhostFrame(
  frames: GhostFrame[],
  currentTimeMs: number
): { x: number; y: number; z: number; angle: number } | null {
  if (frames.length === 0) return null;
  if (currentTimeMs <= frames[0].timeMs) {
    return frames[0];
  }
  if (currentTimeMs >= frames[frames.length - 1].timeMs) {
    return frames[frames.length - 1];
  }

  // Binary search for surrounding frames
  let low = 0;
  let high = frames.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (frames[mid].timeMs === currentTimeMs) {
      return frames[mid];
    }
    if (frames[mid].timeMs < currentTimeMs) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const f0 = frames[Math.max(0, high)];
  const f1 = frames[Math.min(frames.length - 1, low)];
  const span = f1.timeMs - f0.timeMs;
  if (span <= 0) return f0;

  const alpha = (currentTimeMs - f0.timeMs) / span;

  return {
    x: f0.x + (f1.x - f0.x) * alpha,
    y: f0.y + (f1.y - f0.y) * alpha,
    z: f0.z + (f1.z - f0.z) * alpha,
    angle: f0.angle + (f1.angle - f0.angle) * alpha,
  };
}

export function formatLapTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);

  const mStr = minutes.toString().padStart(2, "0");
  const sStr = seconds.toString().padStart(2, "0");
  const hStr = hundredths.toString().padStart(2, "0");

  return `${mStr}:${sStr}.${hStr}`;
}
