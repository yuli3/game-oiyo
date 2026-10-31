import { describe, it, expect } from 'vitest';
import Matter from 'matter-js';
import {
  SoftBodyLattice2D,
  ModularRagdoll2D,
} from './matter-ragdoll-softbody';

const { Bodies, Body } = Matter;

describe('Matter.js Soft-Body Lattice & Destructible Ragdoll (Research Goal 6)', () => {
  it('1. creates SoftBodyLattice2D with interconnected particles and calculates center of mass', () => {
    const jelly = new SoftBodyLattice2D({
      x: 200,
      y: 200,
      columns: 3,
      rows: 3,
      columnGap: 20,
      rowGap: 20,
      particleRadius: 6,
      stiffness: 0.15,
      damping: 0.1,
    });

    expect(jelly.particles.length).toBe(9); // 3x3 particles
    expect(jelly.constraints.length).toBeGreaterThan(12); // Grid + cross springs

    const com = jelly.getCenterOfMass();
    expect(com.x).toBeCloseTo(200, 1);
    expect(com.y).toBeCloseTo(200, 1);
  });

  it('2. severs ModularRagdoll2D joint when stress impulse exceeds break threshold', () => {
    const ragdoll = new ModularRagdoll2D();

    const torso = Bodies.rectangle(100, 100, 40, 60);
    const leftArm = Bodies.rectangle(60, 100, 20, 20);

    ragdoll.addPart('torso', torso);
    ragdoll.addPart('leftArm', leftArm);

    ragdoll.addJoint('shoulder_L', 'torso', 'leftArm', {
      breakImpulseThreshold: 100,
    });

    expect(ragdoll.joints.length).toBe(1);
    expect(ragdoll.joints[0].intact).toBe(true);

    // Low relative velocity: joint remains intact
    Body.setVelocity(torso, { x: 0, y: 0 });
    Body.setVelocity(leftArm, { x: 1, y: 0 });
    const severedLow = ragdoll.evaluateJointStress();
    expect(severedLow.length).toBe(0);
    expect(ragdoll.joints[0].intact).toBe(true);

    // Extreme relative velocity: joint snaps
    Body.setVelocity(leftArm, { x: 100, y: 0 });
    const severedHigh = ragdoll.evaluateJointStress();
    expect(severedHigh).toContain('shoulder_L');
    expect(ragdoll.joints[0].intact).toBe(false);
  });
});
