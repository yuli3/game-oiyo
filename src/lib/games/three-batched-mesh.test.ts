import { describe, it, expect } from 'vitest';
import {
  BoxGeometry,
  SphereGeometry,
  MeshBasicMaterial,
  Vector3,
  Euler,
  Color,
} from 'three';
import {
  BatchedPropManager,
  InstancedParticleField3D,
} from './three-batched-mesh';

describe('Three.js r185 BatchedMesh & GPU Instancing (Research Goal 2)', () => {
  it('1. registers multiple geometries and spawns batched instances in single drawcall', () => {
    const mat = new MeshBasicMaterial({ color: 0xffffff });
    const manager = new BatchedPropManager({
      maxInstances: 50,
      maxVertices: 10000,
      maxIndices: 20000,
      material: mat,
    });

    const boxGeom = new BoxGeometry(2, 2, 2);
    const sphereGeom = new SphereGeometry(1, 8, 8);

    const boxId = manager.registerGeometry('crate', boxGeom);
    const sphereId = manager.registerGeometry('asteroid', sphereGeom);

    expect(boxId).toBeGreaterThanOrEqual(0);
    expect(sphereId).toBeGreaterThanOrEqual(0);
    expect(boxId).not.toBe(sphereId);

    // Spawn 10 boxes and 10 spheres
    for (let i = 0; i < 10; i++) {
      const instBox = manager.spawn(
        'crate',
        new Vector3(i * 5, 0, 0),
        new Euler(0, Math.PI / 4, 0),
        new Vector3(1, 1, 1),
        new Color(0xff0000)
      );
      expect(instBox).toBeGreaterThanOrEqual(0);

      const instSphere = manager.spawn(
        'asteroid',
        new Vector3(0, i * 5, 0),
        new Euler(),
        new Vector3(1.5, 1.5, 1.5)
      );
      expect(instSphere).toBeGreaterThanOrEqual(0);
    }

    expect(manager.getInstanceCount()).toBe(20);

    // Update transform
    expect(() => {
      manager.updateTransform(0, 100, 200, 300, 0, 0, 0, 2);
      manager.setVisible(0, false);
      manager.setVisible(0, true);
    }).not.toThrow();

    manager.dispose();
  });

  it('2. initializes InstancedParticleField3D without errors', () => {
    const geom = new BoxGeometry(1, 1, 1);
    const mat = new MeshBasicMaterial();
    const field = new InstancedParticleField3D(geom, mat, 100);

    expect(field.count).toBe(100);
    expect(() => {
      field.initializeRandomField(50);
    }).not.toThrow();
  });
});
