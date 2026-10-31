import { describe, it, expect } from 'vitest';
import {
  HybridCameraSynchronizer,
  HybridLayerCompositor,
} from './hybrid-2d-3d';

describe('2.5D Hybrid Three.js Background + 2D Action (Research Goal 4)', () => {
  it('1. calculates parallax camera position and banking roll tilt from 2D coordinates', () => {
    const synchronizer = new HybridCameraSynchronizer({
      arenaWidth: 800,
      arenaHeight: 500,
      parallaxScaleX: 0.2,
      parallaxScaleY: 0.2,
      maxBankRollRad: 0.15,
    });

    expect(synchronizer.camera).toBeDefined();
    expect(synchronizer.camera.position.z).toBeGreaterThan(0);

    // Player at center: camera centered
    synchronizer.sync(400, 250, 0, 0);
    expect(synchronizer.camera.position.x).toBeCloseTo(0, 2);
    expect(synchronizer.camera.position.y).toBeCloseTo(0, 2);
    expect(synchronizer.camera.rotation.z).toBeCloseTo(0, 2);

    // Player flying fast to the right (X: 700, vx: 400)
    synchronizer.sync(700, 250, 400, 0);
    expect(synchronizer.camera.position.x).toBeGreaterThan(0); // Parallax shifted
    expect(synchronizer.camera.rotation.z).toBeLessThan(0); // Banking roll applied

    // Player flying fast downwards (Y: 450, vy: 300)
    synchronizer.sync(400, 450, 0, 300);
    expect(synchronizer.camera.position.y).toBeLessThan(0); // Inverted Y coordinate
    expect(synchronizer.camera.rotation.x).toBeLessThan(0);
  });

  it('2. manages HybridLayerCompositor scene and camera lifecycle', () => {
    const compositor = new HybridLayerCompositor({
      arenaWidth: 800,
      arenaHeight: 500,
    });

    expect(compositor.scene3D).toBeDefined();
    expect(compositor.cameraSync).toBeDefined();

    expect(() => {
      compositor.render3DBackground(); // No-op if renderer not attached
      compositor.dispose();
    }).not.toThrow();
  });
});
