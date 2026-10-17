import { describe, it, expect } from 'vitest';
import {
  createInitialMarbleState,
  updateMarblePhysics,
  COURSE_TILES,
} from './marble-roll';

describe('3D Marble Roll Engine', () => {
  it('initializes in ready state with zero velocities and on ground', () => {
    const state = createInitialMarbleState();
    expect(state.status).toBe('ready');
    expect(state.vx).toBe(0);
    expect(state.vz).toBe(0);
    expect(state.score).toBe(0);
    expect(state.starsCollected).toBe(0);
    expect(state.isGrounded).toBe(true);
  });

  it('transitions to playing state and accelerates forward with throttle', () => {
    const initial = createInitialMarbleState();
    const updated = updateMarblePhysics(initial, { steerX: 0, throttleZ: 1 }, 0.05);

    expect(updated.status).toBe('playing');
    expect(updated.vz).toBeGreaterThan(0);
    expect(updated.z).toBeGreaterThan(0);
    expect(updated.elapsedTime).toBeGreaterThan(0);
  });

  it('accelerates sideways with steering input', () => {
    const initial = createInitialMarbleState();
    const left = updateMarblePhysics(initial, { steerX: -1, throttleZ: 0 }, 0.05);
    expect(left.vx).toBeLessThan(0);
    expect(left.x).toBeLessThan(0);

    const right = updateMarblePhysics(initial, { steerX: 1, throttleZ: 0 }, 0.05);
    expect(right.vx).toBeGreaterThan(0);
    expect(right.x).toBeGreaterThan(0);
  });

  it('boosts velocity when crossing a boost tile', () => {
    let state = createInitialMarbleState();
    // Place marble right above the boost tile (tile id 2 at z=26)
    state.x = 0;
    state.z = 25.8;
    state.y = 1.1;
    state.vz = 5;

    const boosted = updateMarblePhysics(state, { steerX: 0, throttleZ: 1 }, 0.05);
    expect(boosted.vz).toBeGreaterThanOrEqual(30);
    expect(boosted.score).toBeGreaterThan(0);
  });

  it('launches upward on a jump tile', () => {
    let state = createInitialMarbleState();
    // Place marble over jump tile (tile id 7 at x=8, z=74)
    state.x = 8;
    state.z = 74;
    state.y = 3.1;
    state.vz = 5;

    const jumped = updateMarblePhysics(state, { steerX: 0, throttleZ: 1 }, 0.05);
    expect(jumped.vy).toBeGreaterThan(10);
  });

  it('clears the game and awards score upon reaching finish tile', () => {
    let state = createInitialMarbleState();
    // Finish tile is at z=170
    state.x = 0;
    state.z = 170;
    state.y = 2.1;
    state.vz = 5;
    state.status = 'playing';

    const finished = updateMarblePhysics(state, { steerX: 0, throttleZ: 0 }, 0.05);
    expect(finished.status).toBe('cleared');
    expect(finished.score).toBeGreaterThan(0);
  });

  it('respawns at checkpoint if falling below threshold', () => {
    let state = createInitialMarbleState();
    state.currentCheckpoint = [8, 3, 110];
    state.y = -16;
    state.x = 20; // off track
    state.z = 80;

    const respawned = updateMarblePhysics(state, { steerX: 0, throttleZ: 0 }, 0.05);
    expect(respawned.x).toBe(8);
    expect(respawned.y).toBe(3);
    expect(respawned.z).toBe(110);
    expect(respawned.vx).toBe(0);
  });
});
