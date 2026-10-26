import { describe, expect, it } from 'vitest';
import {
  advanceFixedTimestep,
  computeAdaptiveFmodMix,
  computeDijkstraFlowField2D,
  computeSailThrustEfficiency,
  createFixedTimestep,
  createSeededRng,
  evaluateAdaptiveQualityTier,
  evaluateAnimationCurve,
  evaluateEasing,
  isPointInViewCone2D,
  rollWithPity,
  selectHighestUtilityAction,
  setTimeScale,
  ShuffleBag,
  stepVerletPendulum2D,
  ZeroGcObjectPool,
} from './engine-v2';

describe('OIYO Web-Unity Engine v2.0 Core SDK (engine-v2)', () => {
  it('runs deterministic FixedUpdate steps and supports Bullet-Time timeScale', () => {
    let clock = createFixedTimestep(16, 1.0);
    const step1 = advanceFixedTimestep(clock, 36);
    expect(step1.stepsToRun).toBe(2);
    expect(step1.alpha).toBeCloseTo(4 / 16, 3);

    // Switch to 0.25x Bullet-Time slow-motion
    clock = setTimeScale(step1.state, 0.25);
    const step2 = advanceFixedTimestep(clock, 32);
    expect(step2.stepsToRun).toBe(0);
    expect(step2.alpha).toBeCloseTo(12 / 16, 3);
  });

  it('recycles slots in ZeroGcObjectPool without heap allocation', () => {
    const pool = new ZeroGcObjectPool(3, (idx) => ({ id: idx, active: false, value: 0 }));
    pool.acquire((item) => {
      item.value = 10;
    });
    pool.acquire((item) => {
      item.value = 20;
    });
    expect(pool.getActiveCount()).toBe(2);

    pool.acquire((item) => {
      item.value = 30;
    });
    expect(pool.getActiveCount()).toBe(3);

    // Acquiring 4th recycles oldest slot
    const recycled = pool.acquire((item) => {
      item.value = 99;
    });
    expect(recycled.value).toBe(99);
    expect(pool.getActiveCount()).toBe(3);
  });

  it('computes Dijkstra Flow-Field vectors around obstacles', () => {
    const field = computeDijkstraFlowField2D(
      4,
      4,
      (x, y) => x === 1 && y === 1,
      [{ x: 3, y: 3 }]
    );
    expect(field[3][3].distance).toBe(0);
    expect(field[0][0].distance).toBe(6);
    expect(field[0][0].dirX + field[0][0].dirY).toBe(1);
    expect(field[1][1].distance).toBe(-1);
  });

  it('detects targets inside 2D stealth view cone and distinguishes alert vs suspicion zones', () => {
    const cone = {
      originX: 0,
      originY: 0,
      facingRad: 0,
      fovRad: Math.PI / 2,
      maxRange: 100,
    };

    const closeHit = isPointInViewCone2D(cone, 50, 10);
    expect(closeHit.detected).toBe(true);
    expect(closeHit.zone).toBe('alert');

    const outerHit = isPointInViewCone2D(cone, 85, 0);
    expect(outerHit.detected).toBe(true);
    expect(outerHit.zone).toBe('suspicion');

    const occludedHit = isPointInViewCone2D(cone, 50, 0, () => true);
    expect(occludedHit.detected).toBe(false);
  });

  it('constrains grappling hook pendulum and computes sail thrust + FMOD adaptive audio mix', () => {
    const body = stepVerletPendulum2D(
      {
        x: 100,
        y: 0,
        vx: 50,
        vy: 0,
        anchorX: 0,
        anchorY: 0,
        ropeLength: 100,
        isHooked: true,
      },
      0.1
    );
    const distFromAnchor = Math.hypot(body.x, body.y);
    expect(distFromAnchor).toBeCloseTo(100, 1);

    const beamReach = computeSailThrustEfficiency(0, Math.PI / 2, 0);
    expect(beamReach.mode).toBe('beam-reach');
    expect(beamReach.thrustMultiplier).toBeGreaterThan(1.0);

    const mix = computeAdaptiveFmodMix(0.9, 0.15);
    expect(mix.combatArpGain).toBeGreaterThan(0.5);
    expect(mix.heartbeatSubGain).toBeGreaterThan(0.3);
    expect(mix.tempoBpm).toBeGreaterThan(130);
  });

  it('evaluates AnimationCurve keyframes, Utility AI scorer, ShuffleBag/Pity RNG, and Adaptive Quality tier', () => {
    expect(evaluateEasing(0.5, 'easeOutBack')).toBeGreaterThan(1.0);
    const curveVal = evaluateAnimationCurve(
      [
        { time: 0, value: 0 },
        { time: 0.5, value: 100, easing: 'linear' },
        { time: 1.0, value: 50, easing: 'linear' },
      ],
      0.25
    );
    expect(curveVal).toBeCloseTo(50, 2);

    const aiChoice = selectHighestUtilityAction(
      [
        { id: 'heal', evaluateScore: (ctx: { hp: number }) => (100 - ctx.hp) * 2 },
        { id: 'attack', evaluateScore: () => 80 },
      ],
      { hp: 20 }
    );
    expect(aiChoice?.selectedId).toBe('heal');

    const rng = createSeededRng(20261026);
    const bag = new ShuffleBag(['crit', 'hit', 'hit'], rng);
    const drawn = [bag.next(), bag.next(), bag.next()];
    expect(drawn.filter((x) => x === 'crit').length).toBe(1);

    const pityRoll = rollWithPity(
      { baseChance: 0.05, softPityStart: 5, hardPityLimit: 10, currentDryStreak: 9 },
      0.99
    );
    expect(pityRoll.hit).toBe(true);
    expect(pityRoll.nextState.currentDryStreak).toBe(0);

    const ultraProfile = evaluateAdaptiveQualityTier([16.1, 16.5, 16.8, 17.2]);
    expect(ultraProfile.tier).toBe('ultra');
    const batteryProfile = evaluateAdaptiveQualityTier([33.0, 35.2, 38.1, 40.0]);
    expect(batteryProfile.tier).toBe('battery-saver');
    expect(batteryProfile.particleBudgetScale).toBe(0.25);
  });
});
