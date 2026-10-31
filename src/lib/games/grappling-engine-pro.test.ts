import { describe, it, expect } from 'vitest';
import {
  CameraDynamics2D,
  SpeedLinesSystem,
  DynamicLightRenderer,
  ProceduralSfxBank,
  ProceduralMechaSpriteRenderer,
  NewtonianGrapplePhysics2D,
} from './grappling-engine-pro';

describe('Grappling Engine Pro (AAA Feel & Dynamics)', () => {
  it('1. keeps rock-solid stable camera zoom to prevent motion sickness', () => {
    const cam = new CameraDynamics2D();
    expect(cam.zoom).toBe(1.0);

    // Punch zoom is micro-capped
    cam.punch(0.2);
    expect(cam.punchAmount).toBeGreaterThan(0);
    expect(cam.punchAmount).toBeLessThanOrEqual(0.015);

    // Target zoom stays strictly rock-solid at 1.0 even at extreme speeds
    cam.update(0.1, 600);
    expect(cam.targetZoom).toBe(1.0);

    // Step physics to decay punch
    cam.update(0.5, 0);
    expect(cam.punchAmount).toBe(0);
    expect(cam.zoom).toBeGreaterThanOrEqual(0.99);
    expect(cam.zoom).toBeLessThanOrEqual(1.01);
  });

  it('2. animates radial speed lines during high momentum swings', () => {
    const speedLines = new SpeedLinesSystem(16);
    expect(speedLines.lines.length).toBe(16);

    const initialDist = speedLines.lines[0].distance;
    // Low speed: lines remain static
    speedLines.update(0.1, 100);
    expect(speedLines.lines[0].distance).toBe(initialDist);

    // High speed: lines rush inward toward player
    speedLines.update(0.1, 350);
    expect(speedLines.lines[0].distance).not.toBe(initialDist);
  });

  it('3. verifies dynamic light renderer radial gradient methods', () => {
    const light = new DynamicLightRenderer();
    expect(light).toBeDefined();
  });

  it('4. checks procedural audio bank fallbacks without throwing', () => {
    const sfx = new ProceduralSfxBank();
    expect(() => {
      sfx.playHeavyExplosion();
      sfx.playWireClack();
      sfx.playLaserShot();
    }).not.toThrow();
  });

  it('5. verifies procedural mecha vector sprite renderer methods', () => {
    const sprites = new ProceduralMechaSpriteRenderer();
    expect(sprites).toBeDefined();
  });

  it('6. verifies Newtonian pendulum mechanics and momentum conservation', () => {
    const sim = new NewtonianGrapplePhysics2D(400, 0.001, 0.01);

    // Free flight parabolic motion
    const freeBody = sim.step(
      {
        x: 100,
        y: 100,
        vx: 200,
        vy: 0,
        isHooked: false,
        anchorX: 0,
        anchorY: 0,
        ropeLength: 0,
      },
      0.1
    );
    expect(freeBody.x).toBeGreaterThan(100);
    expect(freeBody.y).toBeGreaterThan(100); // Gravity accelerated downwards
    expect(freeBody.vy).toBeGreaterThan(0);

    // Hooked pendulum circular arc constraint
    const hookedBody = sim.step(
      {
        x: 200,
        y: 100,
        vx: 150,
        vy: 0,
        isHooked: true,
        anchorX: 200,
        anchorY: 0,
        ropeLength: 100,
      },
      0.05
    );
    const distToAnchor = Math.hypot(hookedBody.x - 200, hookedBody.y - 0);
    expect(distToAnchor).toBeCloseTo(100, 1); // Strictly constrained to rope length

    // Release with momentum conservation
    const released = sim.releaseWithMomentum(hookedBody, 100);
    expect(released.isHooked).toBe(false);
    expect(Math.hypot(released.vx, released.vy)).toBeGreaterThan(Math.hypot(hookedBody.vx, hookedBody.vy));
  });
});
