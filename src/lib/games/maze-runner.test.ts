import { describe, it, expect } from 'vitest';
import {
  generateMaze,
  createInitialMazeRunnerState,
  tryMovePlayer,
  updateMazeRunner,
} from './maze-runner';

describe('MazeRunner Engine', () => {
  it('generates a valid maze grid with start, exit and walls', () => {
    const { grid, exitX, exitZ } = generateMaze(11);
    expect(grid.length).toBe(11);
    expect(grid[0].length).toBe(11);
    expect(grid[1][1]).toBe(0); // Player start cell is open
    expect(grid[exitZ][exitX]).toBe(0); // Exit cell is open
  });

  it('initializes game state with player, gems and timer', () => {
    const state = createInitialMazeRunnerState(1, 200);
    expect(state.playerX).toBe(1);
    expect(state.playerZ).toBe(1);
    expect(state.highScore).toBe(200);
    expect(state.status).toBe('playing');
    expect(state.timeLeft).toBeGreaterThan(0);
    expect(state.gems.length).toBeGreaterThan(0);
  });

  it('rejects movement into walls', () => {
    let state = createInitialMazeRunnerState(1);
    // (0, 1) is outer border wall
    const moved = tryMovePlayer(state, -1, 0);
    expect(moved.targetX).toBe(state.playerX);
    expect(moved.targetZ).toBe(state.playerZ);
  });

  it('allows movement into open corridors and rotates player angle', () => {
    const state = createInitialMazeRunnerState(1);
    // Find an open neighbor from (1, 1)
    const dirs = [
      [1, 0],
      [0, 1],
    ];
    let validDir: number[] | null = null;
    for (const [dx, dz] of dirs) {
      if (state.grid[1 + dz][1 + dx] === 0) {
        validDir = [dx, dz];
        break;
      }
    }

    if (validDir) {
      const moved = tryMovePlayer(state, validDir[0], validDir[1]);
      expect(moved.targetX).toBe(1 + validDir[0]);
      expect(moved.targetZ).toBe(1 + validDir[1]);
    }
  });

  it('collects gems and awards score when player touches gem', () => {
    let state = createInitialMazeRunnerState(1);
    const firstGem = state.gems[0];
    state.playerX = firstGem.x;
    state.playerZ = firstGem.z;

    const updated = updateMazeRunner(state, 0.016);
    expect(updated.score).toBeGreaterThan(0);
    expect(updated.gemsCollected).toBe(1);
  });

  it('triggers escaped status when player reaches exit portal', () => {
    let state = createInitialMazeRunnerState(1);
    state.playerX = state.exitX;
    state.playerZ = state.exitZ;

    const updated = updateMazeRunner(state, 0.016);
    expect(updated.status).toBe('escaped');
    expect(updated.score).toBeGreaterThan(500);
  });

  it('triggers timeout status when timer expires', () => {
    let state = createInitialMazeRunnerState(1);
    state.timeLeft = 0.01;

    const updated = updateMazeRunner(state, 0.05);
    expect(updated.status).toBe('timeout');
    expect(updated.timeLeft).toBe(0);
  });
});
