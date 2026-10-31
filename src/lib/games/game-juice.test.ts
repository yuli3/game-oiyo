import { describe, it, expect } from 'vitest';
import {
  CameraShake2D,
  HitStopController,
  ParticleSystem2D,
  SpringScale2D,
  JuiceFloatingText,
  GameJuice,
} from './game-juice';

describe('Game Juice & Game-Feel Engine (v1.0)', () => {
  it('1. applies trauma-based non-linear camera shake with frequency damping', () => {
    const shake = new CameraShake2D({ decayRate: 1.0, maxTranslationX: 20 });
    expect(shake.trauma).toBe(0);
    expect(shake.x).toBe(0);

    // Add trauma
    shake.addTrauma(0.5);
    expect(shake.trauma).toBe(0.5);

    // Step forward
    shake.update(0.1);
    expect(shake.trauma).toBeCloseTo(0.4, 2);
    expect(shake.x).not.toBe(0);

    // Full decay back to zero
    shake.update(1.0);
    expect(shake.trauma).toBe(0);
    expect(shake.x).toBe(0);
    expect(shake.y).toBe(0);
  });

  it('2. controls micro hit-stop freeze frames and effective delta time', () => {
    const hitStop = new HitStopController();
    expect(hitStop.isFreezing()).toBe(false);

    // Trigger 50ms freeze
    hitStop.trigger(0.05);
    expect(hitStop.isFreezing()).toBe(true);

    const step1 = hitStop.update(0.02);
    expect(step1.isFrozen).toBe(true);
    expect(step1.effectiveDt).toBe(0);

    const step2 = hitStop.update(0.04);
    expect(hitStop.isFreezing()).toBe(false);
    expect(step2.isFrozen).toBe(false);
    expect(step2.effectiveDt).toBe(0.04);
  });

  it('3. manages zero-GC SoA particles with physics, rings and gravity', () => {
    const ps = new ParticleSystem2D(64);
    expect(ps.getActiveCount()).toBe(0);

    const spawned = ps.emit(100, 100, {
      count: 10,
      kind: 'spark',
      gravity: 200,
    });
    expect(spawned).toBe(10);
    expect(ps.getActiveCount()).toBe(10);

    // Update particles
    ps.update(0.1);
    expect(ps.y[0]).toBeGreaterThan(100); // affected by velocity & gravity

    // Age particles to death
    ps.update(2.0);
    expect(ps.getActiveCount()).toBe(0);
  });

  it('4. calculates Hooke law spring squash and stretch oscillations', () => {
    const spring = new SpringScale2D(200, 15);
    expect(spring.scaleX).toBe(1.0);
    expect(spring.scaleY).toBe(1.0);

    // Punch scale to squash (wide and flat landing)
    spring.punch(1.5, 0.6);
    expect(spring.scaleX).toBe(1.5);
    expect(spring.scaleY).toBe(0.6);

    // Update steps oscillate towards 1.0
    for (let i = 0; i < 30; i++) {
      spring.update(0.02);
    }
    expect(spring.scaleX).toBeCloseTo(1.0, 1);
    expect(spring.scaleY).toBeCloseTo(1.0, 1);
  });

  it('5. spawns floating combat damage text with crits and decays life', () => {
    const textPool = new JuiceFloatingText();
    expect(textPool.getCount()).toBe(0);

    textPool.spawn(50, 50, '150 CRIT!', true);
    expect(textPool.getCount()).toBe(1);

    textPool.update(0.1);
    expect(textPool.getCount()).toBe(1);

    textPool.update(1.5);
    expect(textPool.getCount()).toBe(0);
  });

  it('6. orchestrates master GameJuice impact with shake, hit-stop, particles and text', () => {
    const juice = new GameJuice(128);

    // Trigger heavy impact
    juice.impact(200, 150, 'heavy', '9999');

    expect(juice.camera.trauma).toBeGreaterThan(0.5);
    expect(juice.hitStop.isFreezing()).toBe(true);
    expect(juice.particles.getActiveCount()).toBeGreaterThan(20);
    expect(juice.combatText.getCount()).toBe(1);

    // Step simulation
    const effectiveDt = juice.update(0.016);
    expect(effectiveDt).toBe(0); // simulation frozen by hit-stop!
  });
});
