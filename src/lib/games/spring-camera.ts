/**
 * Spring-Damper Camera Controller (Unity-grade critically damped 3rd-person follow camera).
 *
 * Provides smooth, organic tracking with:
 * - Second-order spring-damper position interpolation
 * - Damped look-ahead focus point
 * - Airspeed-coupled dynamic Field-of-View (FOV) expansion
 * - Horizon banking compensation in turns
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SpringCameraConfig {
  /** Distance behind the target along forward heading */
  distance: number;
  /** Height above target */
  height: number;
  /** Spring stiffness (higher = faster snap, lower = smoother lag) */
  stiffness: number;
  /** Damping coefficient (2 * sqrt(stiffness) = critical damping) */
  damping: number;
  /** Distance ahead of target for look-at point */
  lookAheadDistance: number;
  /** Look-at damping rate [0..1] */
  lookAtDamping: number;
  /** Base camera FOV in degrees */
  baseFov: number;
  /** Maximum FOV expansion at high speed */
  maxFovBonus: number;
  /** Speed threshold where FOV expansion begins */
  minSpeedFov: number;
  /** Speed threshold where FOV expansion reaches maximum */
  maxSpeedFov: number;
  /** Roll bank tilt compensation ratio [0..1] */
  rollBankFactor: number;
}

export const DEFAULT_SPRING_CAMERA_CONFIG: SpringCameraConfig = {
  distance: 6.5,
  height: 2.2,
  stiffness: 14.0,
  damping: 7.5,
  lookAheadDistance: 12.0,
  lookAtDamping: 10.0,
  baseFov: 55,
  maxFovBonus: 22,
  minSpeedFov: 10,
  maxSpeedFov: 40,
  rollBankFactor: 0.35,
};

export interface CameraTarget {
  position: Vector3;
  velocity: Vector3;
  yaw: number;
  pitch: number;
  roll: number;
  speed: number;
}

export class SpringCamera {
  public position: Vector3;
  public velocity: Vector3;
  public lookAt: Vector3;
  public currentFov: number;
  public currentRoll: number;
  public config: SpringCameraConfig;

  constructor(initialTarget: CameraTarget, config: Partial<SpringCameraConfig> = {}) {
    this.config = { ...DEFAULT_SPRING_CAMERA_CONFIG, ...config };

    const initialPos = this.calculateIdealPosition(initialTarget);
    this.position = { ...initialPos };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.lookAt = this.calculateIdealLookAt(initialTarget);
    this.currentFov = this.config.baseFov;
    this.currentRoll = 0;
  }

  /**
   * Calculates ideal camera position behind the target based on target yaw & pitch.
   */
  public calculateIdealPosition(target: CameraTarget): Vector3 {
    const { distance, height } = this.config;
    const cosPitch = Math.cos(target.pitch);
    const sinPitch = Math.sin(target.pitch);
    const sinYaw = Math.sin(target.yaw);
    const cosYaw = Math.cos(target.yaw);

    // Forward direction: (sinYaw * cosPitch, sinPitch, -cosYaw * cosPitch)
    const forwardX = sinYaw * cosPitch;
    const forwardY = sinPitch;
    const forwardZ = -cosYaw * cosPitch;

    // Camera sits behind and above
    return {
      x: target.position.x - forwardX * distance,
      y: target.position.y - forwardY * distance + height,
      z: target.position.z - forwardZ * distance,
    };
  }

  /**
   * Calculates ideal look-at point ahead of the target.
   */
  public calculateIdealLookAt(target: CameraTarget): Vector3 {
    const cosPitch = Math.cos(target.pitch);
    const sinPitch = Math.sin(target.pitch);
    const forwardX = Math.sin(target.yaw) * cosPitch;
    const forwardY = sinPitch;
    const forwardZ = -Math.cos(target.yaw) * cosPitch;

    return {
      x: target.position.x + forwardX * this.config.lookAheadDistance,
      y: target.position.y + forwardY * this.config.lookAheadDistance,
      z: target.position.z + forwardZ * this.config.lookAheadDistance,
    };
  }

  /**
   * Step the spring-damper simulation forward in time.
   */
  public update(dt: number, target: CameraTarget): void {
    const clampedDt = Math.min(dt, 0.05); // Prevent instability on large time jumps
    const idealPos = this.calculateIdealPosition(target);

    // 1. Spring-damper force for position: F = -k * displacement - c * velocity
    const dispX = this.position.x - idealPos.x;
    const dispY = this.position.y - idealPos.y;
    const dispZ = this.position.z - idealPos.z;

    const springAccelX = -this.config.stiffness * dispX - this.config.damping * this.velocity.x;
    const springAccelY = -this.config.stiffness * dispY - this.config.damping * this.velocity.y;
    const springAccelZ = -this.config.stiffness * dispZ - this.config.damping * this.velocity.z;

    this.velocity.x += springAccelX * clampedDt;
    this.velocity.y += springAccelY * clampedDt;
    this.velocity.z += springAccelZ * clampedDt;

    this.position.x += this.velocity.x * clampedDt;
    this.position.y += this.velocity.y * clampedDt;
    this.position.z += this.velocity.z * clampedDt;

    // 2. Exponential damp for look-at point
    const idealLookAt = this.calculateIdealLookAt(target);
    const lookAtFactor = 1 - Math.exp(-this.config.lookAtDamping * clampedDt);
    this.lookAt.x += (idealLookAt.x - this.lookAt.x) * lookAtFactor;
    this.lookAt.y += (idealLookAt.y - this.lookAt.y) * lookAtFactor;
    this.lookAt.z += (idealLookAt.z - this.lookAt.z) * lookAtFactor;

    // 3. Dynamic speed-coupled FOV
    const speedRatio = Math.max(
      0,
      Math.min(
        1,
        (target.speed - this.config.minSpeedFov) /
          Math.max(1, this.config.maxSpeedFov - this.config.minSpeedFov),
      ),
    );
    const targetFov = this.config.baseFov + speedRatio * this.config.maxFovBonus;
    this.currentFov += (targetFov - this.currentFov) * (1 - Math.exp(-6 * clampedDt));

    // 4. Horizon roll tilt banking
    const targetRoll = target.roll * this.config.rollBankFactor;
    this.currentRoll += (targetRoll - this.currentRoll) * (1 - Math.exp(-8 * clampedDt));
  }

  /**
   * Resets camera immediately to the ideal position and look-at point.
   */
  public snapTo(target: CameraTarget): void {
    const idealPos = this.calculateIdealPosition(target);
    this.position = { ...idealPos };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.lookAt = this.calculateIdealLookAt(target);
    this.currentFov = this.config.baseFov;
    this.currentRoll = target.roll * this.config.rollBankFactor;
  }
}
