import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { AudioPhysicsImpactSynthesizer } from './audio-physics-impact';
import { SpatialHashGrid3D, HomingMissileSteering3D } from './three-spatial-raycast';
import { MotionGestureController } from './motion-gesture-controller';

describe('Engine Upgrade Suite 8, 9, 10 Final', () => {
  it('1. verifies AudioPhysicsImpactSynthesizer kinetic energy calculation without errors', () => {
    const energy = AudioPhysicsImpactSynthesizer.computeKineticEnergy(2.0, 100, 50);
    expect(energy).toBe(0.5 * 2.0 * (100 * 100 + 50 * 50));

    const synth = new AudioPhysicsImpactSynthesizer();
    expect(() => {
      synth.playPhysicsImpact(500);
    }).not.toThrow();
  });

  it('2. verifies SpatialHashGrid3D insertion and radius queries', () => {
    const grid = new SpatialHashGrid3D<{ id: string; x: number; y: number; z: number; radius: number }>(30);

    grid.insert({ id: 'target-1', x: 10, y: 10, z: 10, radius: 5 });
    grid.insert({ id: 'target-2', x: 200, y: 200, z: 200, radius: 5 });

    const closeResults = grid.queryRadius(new Vector3(0, 0, 0), 30);
    expect(closeResults.length).toBe(1);
    expect(closeResults[0].id).toBe('target-1');

    grid.clear();
  });

  it('3. verifies HomingMissileSteering3D turns towards target', () => {
    const currentPos = new Vector3(0, 0, 0);
    const currentVel = new Vector3(0, 0, 100);
    const targetPos = new Vector3(100, 0, 100); // Target at 45 degrees right

    const newVel = HomingMissileSteering3D.computeHomingVelocity(
      currentPos,
      currentVel,
      targetPos,
      100,
      0.1,
      4.0
    );

    expect(newVel.x).toBeGreaterThan(0); // Steered right towards target
    expect(newVel.length()).toBeCloseTo(100, 1);
  });

  it('4. verifies MotionGestureController rubber-banding and swipe detection', () => {
    // Rubber band overdrag
    const overdrag = MotionGestureController.computeRubberBand(100, 0, 100, 50);
    expect(overdrag).toBeGreaterThan(100);
    expect(overdrag).toBeLessThan(150); // Scaled by rubber band factor

    // Swipe detection
    const swipeRight = MotionGestureController.detectSwipe(100, 100, 200, 110);
    expect(swipeRight).toBe('right');

    const swipeUp = MotionGestureController.detectSwipe(100, 200, 105, 100);
    expect(swipeUp).toBe('up');

    // Haptic trigger safety
    expect(() => {
      MotionGestureController.triggerHaptic('heavy');
    }).not.toThrow();
  });
});
