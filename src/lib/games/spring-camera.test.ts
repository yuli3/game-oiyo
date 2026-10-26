import { describe, it, expect, beforeEach } from 'vitest';
import { SpringCamera, type CameraTarget } from './spring-camera';

describe('SpringCamera', () => {
  let initialTarget: CameraTarget;

  beforeEach(() => {
    initialTarget = {
      position: { x: 0, y: 10, z: 0 },
      velocity: { x: 0, y: 0, z: -15 },
      yaw: 0,
      pitch: 0,
      roll: 0,
      speed: 15,
    };
  });

  it('initializes camera behind target at configured distance and height', () => {
    const camera = new SpringCamera(initialTarget, { distance: 5, height: 2 });
    // In our coordinate system, forward is -Z when yaw=0, pitch=0
    // So camera behind target is at +Z
    expect(camera.position.x).toBeCloseTo(0, 1);
    expect(camera.position.y).toBeCloseTo(12, 1); // 10 + 2
    expect(camera.position.z).toBeCloseTo(5, 1); // 0 + 5
  });

  it('smoothly follows target displacement over several steps', () => {
    const camera = new SpringCamera(initialTarget);
    const startZ = camera.position.z;

    // Move target forward along -Z
    const movingTarget = {
      ...initialTarget,
      position: { x: 0, y: 10, z: -20 },
    };

    for (let i = 0; i < 20; i++) {
      camera.update(0.016, movingTarget);
    }

    // Camera should have moved forward toward new ideal position
    expect(camera.position.z).toBeLessThan(startZ);
  });

  it('widens FOV when airspeed increases', () => {
    const camera = new SpringCamera(initialTarget, {
      baseFov: 55,
      maxFovBonus: 20,
      minSpeedFov: 10,
      maxSpeedFov: 30,
    });
    expect(camera.currentFov).toBeCloseTo(55, 1);

    // High speed target
    const fastTarget = {
      ...initialTarget,
      speed: 35,
    };

    for (let i = 0; i < 30; i++) {
      camera.update(0.016, fastTarget);
    }

    expect(camera.currentFov).toBeGreaterThan(65);
  });

  it('compensates horizon roll with bank tilt factor', () => {
    const camera = new SpringCamera(initialTarget, { rollBankFactor: 0.5 });
    const bankingTarget = {
      ...initialTarget,
      roll: 0.8,
    };

    for (let i = 0; i < 20; i++) {
      camera.update(0.016, bankingTarget);
    }

    expect(camera.currentRoll).toBeGreaterThan(0.2);
    expect(camera.currentRoll).toBeLessThan(0.8);
  });

  it('snapTo resets position and eliminates velocity instantaneously', () => {
    const camera = new SpringCamera(initialTarget);
    camera.velocity = { x: 10, y: 15, z: 20 };

    const newTarget = {
      ...initialTarget,
      position: { x: 100, y: 50, z: -200 },
    };

    camera.snapTo(newTarget);
    expect(camera.velocity.x).toBe(0);
    expect(camera.velocity.y).toBe(0);
    expect(camera.velocity.z).toBe(0);
    expect(camera.position.x).toBeCloseTo(100, 1);
  });
});
