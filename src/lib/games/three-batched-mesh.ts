/**
 * OIYO Three.js r185 BatchedMesh & GPU Instancing Engine (`three-batched-mesh.ts`)
 *
 * Implements Research Goal 2:
 * - BatchedMesh single-drawcall rendering for heterogeneous 3D meshes (Asteroids, Debris, Props)
 * - Zero-GC matrix transformation updates
 * - Ultra-low mobile overhead (1 drawcall for 1,000+ props)
 */

import {
  BatchedMesh,
  BufferGeometry,
  Material,
  Matrix4,
  Vector3,
  Euler,
  Quaternion,
  Color,
  InstancedMesh,
} from 'three';

// ============================================================================
// 1. BatchedPropManager (Single-Drawcall Heterogeneous Mesh Batcher)
// ============================================================================

export interface BatchedPropConfig {
  maxInstances: number;
  maxVertices: number;
  maxIndices: number;
  material: Material;
}

export class BatchedPropManager {
  private batchedMesh: BatchedMesh;
  private geometryMap: Map<string, number> = new Map(); // key -> geometryId
  private instanceCount: number = 0;
  private readonly maxInstances: number;

  // Reusable math objects to eliminate GC allocation
  private static tempMatrix = new Matrix4();
  private static tempPosition = new Vector3();
  private static tempRotation = new Quaternion();
  private static tempScale = new Vector3(1, 1, 1);
  private static tempEuler = new Euler();

  constructor(config: BatchedPropConfig) {
    this.maxInstances = config.maxInstances;
    this.batchedMesh = new BatchedMesh(
      config.maxInstances,
      config.maxVertices,
      config.maxIndices,
      config.material
    );
  }

  /**
   * Registers a unique geometry into the GPU batch.
   */
  public registerGeometry(key: string, geometry: BufferGeometry): number {
    if (this.geometryMap.has(key)) {
      return this.geometryMap.get(key)!;
    }
    const geomId = this.batchedMesh.addGeometry(geometry);
    this.geometryMap.set(key, geomId);
    return geomId;
  }

  /**
   * Spawns an instance of a registered geometry.
   */
  public spawn(
    geomKey: string,
    position: Vector3,
    rotation: Euler = new Euler(),
    scale: Vector3 = new Vector3(1, 1, 1),
    color?: Color
  ): number {
    const geomId = this.geometryMap.get(geomKey);
    if (geomId === undefined) {
      throw new Error(`Geometry key '${geomKey}' not registered in BatchedPropManager`);
    }

    if (this.instanceCount >= this.maxInstances) {
      return -1; // Capacity reached
    }

    const instanceId = this.batchedMesh.addInstance(geomId);

    BatchedPropManager.tempRotation.setFromEuler(rotation);
    BatchedPropManager.tempMatrix.compose(position, BatchedPropManager.tempRotation, scale);
    this.batchedMesh.setMatrixAt(instanceId, BatchedPropManager.tempMatrix);

    if (color) {
      this.batchedMesh.setColorAt(instanceId, color);
    }

    this.instanceCount++;
    return instanceId;
  }

  /**
   * Updates instance transform without garbage collection.
   */
  public updateTransform(
    instanceId: number,
    x: number,
    y: number,
    z: number,
    rotX: number = 0,
    rotY: number = 0,
    rotZ: number = 0,
    scale: number = 1
  ): void {
    BatchedPropManager.tempPosition.set(x, y, z);
    BatchedPropManager.tempEuler.set(rotX, rotY, rotZ);
    BatchedPropManager.tempRotation.setFromEuler(BatchedPropManager.tempEuler);
    BatchedPropManager.tempScale.set(scale, scale, scale);

    BatchedPropManager.tempMatrix.compose(
      BatchedPropManager.tempPosition,
      BatchedPropManager.tempRotation,
      BatchedPropManager.tempScale
    );

    this.batchedMesh.setMatrixAt(instanceId, BatchedPropManager.tempMatrix);
  }

  public setVisible(instanceId: number, visible: boolean): void {
    this.batchedMesh.setVisibleAt(instanceId, visible);
  }

  public getMesh(): BatchedMesh {
    return this.batchedMesh;
  }

  public getInstanceCount(): number {
    return this.instanceCount;
  }

  public dispose(): void {
    this.batchedMesh.dispose();
  }
}

// ============================================================================
// 2. InstancedParticleField3D (GPU-Accelerated 3D Debris & Cosmic Field)
// ============================================================================

export class InstancedParticleField3D {
  public instancedMesh: InstancedMesh;
  public readonly count: number;
  private dummyMatrix = new Matrix4();

  constructor(geometry: BufferGeometry, material: Material, count: number = 500) {
    this.count = count;
    this.instancedMesh = new InstancedMesh(geometry, material, count);
  }

  public initializeRandomField(radius: number = 200): void {
    const pos = new Vector3();
    const rot = new Quaternion();
    const scale = new Vector3();

    for (let i = 0; i < this.count; i++) {
      pos.set(
        (Math.random() - 0.5) * radius * 2,
        (Math.random() - 0.5) * radius * 2,
        (Math.random() - 0.5) * radius * 2
      );
      rot.set(Math.random(), Math.random(), Math.random(), Math.random()).normalize();
      const s = 0.5 + Math.random() * 1.5;
      scale.set(s, s, s);

      this.dummyMatrix.compose(pos, rot, scale);
      this.instancedMesh.setMatrixAt(i, this.dummyMatrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }
}
