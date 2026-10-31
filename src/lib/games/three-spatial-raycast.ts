/**
 * OIYO Three.js 3D Spatial Hash Grid & Fast Homing AI (`three-spatial-raycast.ts`)
 *
 * Implements Research Goal 9:
 * - SpatialHashGrid3D: O(1) broadphase spatial hashing for 3D projectiles and obstacles
 * - 3D Homing Missile Steering AI with angular rate clamping
 */

import { Vector3, Quaternion } from 'three';

// ============================================================================
// 1. SpatialHashGrid3D (Voxel Partitioning for Fast Collision / Proximity)
// ============================================================================

export interface SpatialEntity3D {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
}

export class SpatialHashGrid3D<T extends SpatialEntity3D> {
  public readonly cellSize: number;
  private grid: Map<string, T[]> = new Map();

  constructor(cellSize: number = 40) {
    this.cellSize = cellSize;
  }

  private hash(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx}:${cy}:${cz}`;
  }

  public clear(): void {
    this.grid.clear();
  }

  public insert(item: T): void {
    const key = this.hash(item.x, item.y, item.z);
    let cell = this.grid.get(key);
    if (!cell) {
      cell = [];
      this.grid.set(key, cell);
    }
    cell.push(item);
  }

  /**
   * Queries entities within search radius around center.
   */
  public queryRadius(center: Vector3, radius: number): T[] {
    const results: T[] = [];
    const radSq = radius * radius;

    const minCx = Math.floor((center.x - radius) / this.cellSize);
    const maxCx = Math.floor((center.x + radius) / this.cellSize);
    const minCy = Math.floor((center.y - radius) / this.cellSize);
    const maxCy = Math.floor((center.y + radius) / this.cellSize);
    const minCz = Math.floor((center.z - radius) / this.cellSize);
    const maxCz = Math.floor((center.z + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          const cell = this.grid.get(`${cx}:${cy}:${cz}`);
          if (!cell) continue;

          for (const item of cell) {
            const dx = item.x - center.x;
            const dy = item.y - center.y;
            const dz = item.z - center.z;
            if (dx * dx + dy * dy + dz * dz <= radSq) {
              results.push(item);
            }
          }
        }
      }
    }

    return results;
  }
}

// ============================================================================
// 2. Fast 3D Homing Missile Steering AI
// ============================================================================

export class HomingMissileSteering3D {
  private static tempTargetDir = new Vector3();
  private static tempCurrentDir = new Vector3();

  /**
   * Calculates new velocity direction smoothly steering towards target.
   * maxTurnRateRad: Max turn angle allowed per second
   */
  public static computeHomingVelocity(
    currentPos: Vector3,
    currentVel: Vector3,
    targetPos: Vector3,
    speed: number,
    dtSeconds: number,
    maxTurnRateRad: number = 3.5
  ): Vector3 {
    HomingMissileSteering3D.tempCurrentDir.copy(currentVel).normalize();
    HomingMissileSteering3D.tempTargetDir.subVectors(targetPos, currentPos).normalize();

    // Slerp towards target direction
    const currentQuat = new Quaternion().setFromUnitVectors(
      new Vector3(0, 0, 1),
      HomingMissileSteering3D.tempCurrentDir
    );
    const targetQuat = new Quaternion().setFromUnitVectors(
      new Vector3(0, 0, 1),
      HomingMissileSteering3D.tempTargetDir
    );

    const maxStepAngle = maxTurnRateRad * dtSeconds;
    const angleDiff = currentQuat.angleTo(targetQuat);
    const t = angleDiff > 0.0001 ? Math.min(1.0, maxStepAngle / angleDiff) : 1.0;

    currentQuat.slerp(targetQuat, t);

    const newDir = new Vector3(0, 0, 1).applyQuaternion(currentQuat);
    return newDir.multiplyScalar(speed);
  }
}
