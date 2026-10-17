import { describe, it, expect } from 'vitest';
import {
  createInitialHighwayState,
  updateHighway,
  getLaneX,
  LANE_WIDTH,
} from './retro-highway';

describe('3D Retro Highway Drive Engine', () => {
  it('initializes in ready state in center lane with base speed', () => {
    const state = createInitialHighwayState();
    expect(state.player.status).toBe('ready');
    expect(state.player.lane).toBe(0);
    expect(state.player.targetLane).toBe(0);
    expect(state.player.speed).toBeGreaterThan(0);
    expect(state.traffic.length).toBeGreaterThan(0);
  });

  it('switches lanes when steering input is applied', () => {
    const initial = createInitialHighwayState();
    // Steer left
    const left = updateHighway(initial, { steer: -1, boost: false, brake: false }, 0.05);
    expect(left.player.targetLane).toBe(-1);
    expect(left.player.status).toBe('playing');

    // Steer right
    const right = updateHighway(initial, { steer: 1, boost: false, brake: false }, 0.05);
    expect(right.player.targetLane).toBe(1);
  });

  it('accelerates speed and consumes boost energy when boosting', () => {
    const initial = createInitialHighwayState();
    initial.player.status = 'playing';
    const beforeSpeed = initial.player.speed;
    const beforeEnergy = initial.player.boostEnergy;

    const boosted = updateHighway(initial, { steer: 0, boost: true, brake: false }, 0.05);
    expect(boosted.player.speed).toBeGreaterThan(beforeSpeed);
    expect(boosted.player.boostEnergy).toBeLessThan(beforeEnergy);
    expect(boosted.player.isBoosting).toBe(true);
  });

  it('triggers gameover when colliding with a traffic car in the same lane', () => {
    const state = createInitialHighwayState();
    state.player.status = 'playing';
    state.player.x = 0;
    state.player.targetLane = 0;
    state.player.lane = 0;

    // Put a traffic car right at the player's bumper in the same lane
    state.traffic = [
      { id: 99, lane: 0, z: 1.0, speed: 20, color: '#ec4899' },
    ];

    const crashed = updateHighway(state, { steer: 0, boost: false, brake: false }, 0.05);
    expect(crashed.player.status).toBe('gameover');
  });

  it('awards near-miss score when passing a traffic car closely in an adjacent lane', () => {
    const state = createInitialHighwayState();
    state.player.status = 'playing';
    state.player.x = getLaneX(0);
    state.player.targetLane = 0;
    state.player.lane = 0;

    // Traffic car in lane 1 crossing the player (z moves from 0.5 to -0.5)
    state.traffic = [
      { id: 101, lane: 1, z: 0.1, speed: 10, color: '#3b82f6' },
    ];

    const passed = updateHighway(state, { steer: 0, boost: false, brake: false }, 0.05);
    expect(passed.player.status).toBe('playing');
    expect(passed.player.nearMissCount).toBe(1);
    expect(passed.player.score).toBeGreaterThanOrEqual(100);
  });

  it('collects power cell to restore boost energy', () => {
    const state = createInitialHighwayState();
    state.player.status = 'playing';
    state.player.boostEnergy = 40;
    state.player.x = 0;

    state.powerCells = [
      { id: 50, lane: 0, z: 1.0, collected: false },
    ];

    const collected = updateHighway(state, { steer: 0, boost: false, brake: false }, 0.05);
    expect(collected.player.boostEnergy).toBeGreaterThan(40);
    expect(collected.powerCells[0]?.collected).toBe(true);
  });
});
