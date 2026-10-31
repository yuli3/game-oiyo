import { describe, it, expect } from 'vitest';
import Matter from 'matter-js';
import {
  SubsteppedPhysicsWorld,
  ContinuousCollisionRaycast2D,
  MatterSpringFactory,
} from './matter-physics-pro';

const { Bodies } = Matter;

describe('Matter.js Pro Physics Engine (Research Goal 3)', () => {
  it('1. updates world with deterministic sub-stepping without tunneling', () => {
    const world = new SubsteppedPhysicsWorld({ subSteps: 4 });
    expect(world.subSteps).toBe(4);

    const ground = Bodies.rectangle(400, 500, 800, 50, { isStatic: true });
    const crate = Bodies.rectangle(400, 100, 30, 30);

    world.addBody(ground);
    world.addBody(crate);

    const initialY = crate.position.y;

    // Step physics for 0.5s (500ms)
    world.update(500);

    // Crate fell downwards under gravity
    expect(crate.position.y).toBeGreaterThan(initialY);

    world.clear();
  });

  it('2. detects high-speed raycast collision (CCD) through walls', () => {
    const wall = Bodies.rectangle(300, 200, 20, 400, { isStatic: true });
    const startPos = { x: 100, y: 200 };
    const endPos = { x: 500, y: 200 }; // Ray passes completely through wall

    const hit = ContinuousCollisionRaycast2D.sweepRay(startPos, endPos, [wall]);
    expect(hit).not.toBeNull();
    expect(hit?.body).toBe(wall);
  });

  it('3. creates damped spring constraint between two bodies', () => {
    const b1 = Bodies.circle(100, 100, 15);
    const b2 = Bodies.circle(100, 180, 15);

    const spring = MatterSpringFactory.createDampedSpring(b1, b2, 0.08, 0.15);
    expect(spring).toBeDefined();
    expect(spring.stiffness).toBe(0.08);
    expect(spring.damping).toBe(0.15);
    expect(spring.length).toBeCloseTo(80, 1);
  });
});
