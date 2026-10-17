import { describe, expect, it } from 'vitest';
import {
  generateFlightCourse,
  updateShipPhysics,
  checkRingPass,
  checkAsteroidCollision,
  type ShipState,
} from './cosmic-flight';

describe('cosmic-flight', () => {
  it('generates procedural rings and asteroids', () => {
    const course = generateFlightCourse(999, 15);
    expect(course.rings.length).toBe(15);
    expect(course.asteroids.length).toBeGreaterThan(10);
    expect(course.courseLength).toBeGreaterThan(500);
  });

  it('updates ship physics forward and steers left/right', () => {
    const initialShip: ShipState = {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: -45,
      pitch: 0,
      roll: 0,
      boost: 100,
      isBoosting: false,
    };

    // Steer right with boost
    const updated = updateShipPhysics(initialShip, { x: 1, y: 0, boost: true }, 1 / 60);
    expect(updated.z).toBeLessThan(0); // moving forward in -Z
    expect(updated.vx).toBeGreaterThan(0); // moving right in +X
    expect(updated.isBoosting).toBe(true);
    expect(updated.boost).toBeLessThan(100);
  });

  it('detects ring passage when ship center is inside ring radius', () => {
    const ring = { id: 0, x: 2, y: 3, z: -100, radius: 4.5, passed: false };
    const insideShip: ShipState = {
      x: 2.5,
      y: 3.2,
      z: -101,
      vx: 0,
      vy: 0,
      vz: -50,
      pitch: 0,
      roll: 0,
      boost: 50,
      isBoosting: false,
    };

    expect(checkRingPass(insideShip, ring)).toBe(true);
  });

  it('detects collision with nearby asteroid', () => {
    const asteroid = { id: 0, x: 0, y: 0, z: -50, radius: 2.0, rotSpeed: 1 };
    const collidingShip: ShipState = {
      x: 0.5,
      y: 0.5,
      z: -50,
      vx: 0,
      vy: 0,
      vz: -50,
      pitch: 0,
      roll: 0,
      boost: 50,
      isBoosting: false,
    };

    expect(checkAsteroidCollision(collidingShip, asteroid)).toBe(true);
  });
});
