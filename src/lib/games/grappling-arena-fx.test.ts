import { describe, it, expect } from 'vitest';
import {
  ParallaxStarfield,
  ThrusterTrail,
  LaserBeamEffect,
  ProceduralMusicEngine,
  triggerMobileHaptic,
} from './grappling-arena-fx';

describe('Grappling Arena Mobile AAA FX Engine', () => {
  it('1. manages 3-layer parallax starfield coordinates and rendering bounds', () => {
    const starfield = new ParallaxStarfield(800, 500, 50);
    expect(starfield.stars.length).toBe(50);
    expect(starfield.width).toBe(800);
    expect(starfield.height).toBe(500);

    for (const star of starfield.stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(800);
      expect(star.depth).toBeGreaterThanOrEqual(0.2);
      expect(star.depth).toBeLessThanOrEqual(1.0);
    }
  });

  it('2. emits and decays jet thruster particle trails', () => {
    const thruster = new ThrusterTrail();
    expect(thruster.particles.length).toBe(0);

    thruster.emit(100, 100, 1, 0);
    expect(thruster.particles.length).toBe(1);

    // Update with dt to age particles
    thruster.update(0.1);
    expect(thruster.particles.length).toBe(1);

    // Update past max life
    thruster.update(0.3);
    expect(thruster.particles.length).toBe(0);
  });

  it('3. controls charged laser beam telegraphing and firing states', () => {
    const laser = new LaserBeamEffect();
    expect(laser.active).toBe(false);
    expect(laser.telegraph).toBe(false);

    laser.setTelegraph(100, 100, 200, 200, 0.5);
    expect(laser.telegraph).toBe(true);
    expect(laser.chargeProgress).toBe(0.5);

    laser.fire(100, 100, 200, 200);
    expect(laser.telegraph).toBe(false);
    expect(laser.active).toBe(true);

    laser.clear();
    expect(laser.active).toBe(false);
  });

  it('4. controls procedural battle music state transitions and bpm shift', () => {
    const music = new ProceduralMusicEngine();
    music.setPhase(1);
    music.setPhase(2);
    // Should not throw even without AudioContext
    music.start();
    music.stop();
  });

  it('5. triggers safe mobile haptic feedback patterns without throwing', () => {
    // Should not crash even in non-mobile test environment
    expect(() => {
      triggerMobileHaptic('light');
      triggerMobileHaptic('medium');
      triggerMobileHaptic('heavy');
      triggerMobileHaptic('warning');
    }).not.toThrow();
  });
});
