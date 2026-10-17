import { describe, expect, it } from 'vitest';
import {
  checkCollision,
  createInitialPlayer,
  duck,
  jump,
  type Obstacle,
  spawnObstacleWave,
  switchLane,
  updatePlayer,
} from './voxel-runner';

describe('voxel-runner mechanics', () => {
  it('switches lanes within bounds [-1, 1]', () => {
    let p = createInitialPlayer();
    expect(p.lane).toBe(0);

    p = switchLane(p, 'left');
    expect(p.lane).toBe(-1);

    // cannot go past -1
    p = switchLane(p, 'left');
    expect(p.lane).toBe(-1);

    p = switchLane(p, 'right');
    expect(p.lane).toBe(0);

    p = switchLane(p, 'right');
    expect(p.lane).toBe(1);

    // cannot go past 1
    p = switchLane(p, 'right');
    expect(p.lane).toBe(1);
  });

  it('jumps and updates gravity', () => {
    let p = createInitialPlayer();
    p = jump(p);
    expect(p.isJumping).toBe(true);
    expect(p.vy).toBeGreaterThan(0);

    // Update forward in time
    p = updatePlayer(p, 0.1);
    expect(p.y).toBeGreaterThan(0);

    // After enough time, lands back at y = 0
    for (let i = 0; i < 20; i++) {
      p = updatePlayer(p, 0.1);
    }
    expect(p.y).toBe(0);
    expect(p.isJumping).toBe(false);
  });

  it('ducks for a timed duration', () => {
    let p = createInitialPlayer();
    p = duck(p);
    expect(p.isDucking).toBe(true);
    expect(p.duckTimer).toBeGreaterThan(0);

    // After duration passes, recovers
    p = updatePlayer(p, 0.8);
    expect(p.isDucking).toBe(false);
  });

  it('detects collision with low barrier when not jumping', () => {
    const p = createInitialPlayer();
    const obs: Obstacle = {
      id: 'o1',
      lane: 0,
      z: 0,
      type: 'barrier_low',
    };

    const res = checkCollision(p, obs);
    expect(res.collision).toBe(true);
  });

  it('evades low barrier when jumping above threshold', () => {
    let p = createInitialPlayer();
    p.y = 1.0;
    p.isJumping = true;
    const obs: Obstacle = {
      id: 'o1',
      lane: 0,
      z: 0,
      type: 'barrier_low',
    };

    const res = checkCollision(p, obs);
    expect(res.collision).toBe(false);
  });

  it('detects collision with high barrier when not ducking', () => {
    const p = createInitialPlayer();
    const obs: Obstacle = {
      id: 'o2',
      lane: 0,
      z: 0,
      type: 'barrier_high',
    };

    const res = checkCollision(p, obs);
    expect(res.collision).toBe(true);
  });

  it('evades high barrier when ducking', () => {
    let p = createInitialPlayer();
    p = duck(p);
    const obs: Obstacle = {
      id: 'o2',
      lane: 0,
      z: 0,
      type: 'barrier_high',
    };

    const res = checkCollision(p, obs);
    expect(res.collision).toBe(false);
  });

  it('collects crystal cubes', () => {
    const p = createInitialPlayer();
    const crystal: Obstacle = {
      id: 'c1',
      lane: 0,
      z: 0,
      type: 'cube_collectible',
    };

    const res = checkCollision(p, crystal);
    expect(res.collision).toBe(false);
    expect(res.collect).toBe(true);
  });

  it('spawns obstacle waves', () => {
    const wave = spawnObstacleWave(-50, 42);
    expect(wave.length).toBeGreaterThanOrEqual(2);
    expect(wave.some((o) => o.type === 'cube_collectible')).toBe(true);
  });
});
