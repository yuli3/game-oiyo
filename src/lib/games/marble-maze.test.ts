import { describe, expect, it } from 'vitest';
import { generateMaze, updateBallPhysics, calculateScore } from './marble-maze';

describe('marble-maze', () => {
  it('generates a valid maze with start, goal, and walls', () => {
    const config = generateMaze(11, 11, 100);
    expect(config.width).toBe(11);
    expect(config.height).toBe(11);
    expect(config.grid[config.startZ][config.startX]).toBe(4); // Start
    expect(config.grid[config.goalZ][config.goalX]).toBe(5); // Goal
    expect(config.gemTotal).toBeGreaterThan(0);
  });

  it('updates ball physics with tilt in open space', () => {
    // Open room 5x5 with walls only on outer borders
    const openConfig = {
      width: 5,
      height: 5,
      grid: [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
      ],
      startX: 2,
      startZ: 2,
      goalX: 3,
      goalZ: 3,
      gemTotal: 0,
    };

    const initialBall = {
      x: 2,
      z: 2,
      vx: 0,
      vz: 0,
      radius: 0.2,
    };

    // Tilt positive X (move right)
    const step1 = updateBallPhysics(initialBall, 1.0, 0, openConfig, 1 / 60);
    expect(step1.ball.vx).toBeGreaterThan(0);
    expect(step1.ball.x).toBeGreaterThan(initialBall.x);
  });

  it('calculates score based on time and gems', () => {
    const fastScore = calculateScore(10, 3, 3);
    const slowScore = calculateScore(50, 1, 3);
    expect(fastScore).toBeGreaterThan(slowScore);
    expect(fastScore).toBeGreaterThan(5000);
  });
});
