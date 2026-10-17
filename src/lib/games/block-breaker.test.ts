import { describe, it, expect } from 'vitest';
import {
  createInitialBlockBreakerState,
  launchBall,
  movePaddle,
  updateBlockBreaker,
  nextLevel,
  PLAY_WIDTH,
} from './block-breaker';

describe('BlockBreaker Engine', () => {
  it('initializes game in ready state with blocks, ball and lives', () => {
    const state = createInitialBlockBreakerState(100);
    expect(state.status).toBe('ready');
    expect(state.lives).toBe(3);
    expect(state.highScore).toBe(100);
    expect(state.balls.length).toBe(1);
    expect(state.blocks.length).toBeGreaterThan(15);
  });

  it('moves paddle and clamps within playfield bounds', () => {
    let state = createInitialBlockBreakerState();
    state = movePaddle(state, 100);
    expect(state.paddleX).toBeLessThanOrEqual(PLAY_WIDTH / 2);

    state = movePaddle(state, -100);
    expect(state.paddleX).toBeGreaterThanOrEqual(-PLAY_WIDTH / 2);
  });

  it('launches ball into playing state with upward velocity', () => {
    let state = createInitialBlockBreakerState();
    state = launchBall(state);
    expect(state.status).toBe('playing');
    expect(state.balls[0].vy).toBeGreaterThan(0);
  });

  it('bounces ball off walls and preserves speed', () => {
    let state = createInitialBlockBreakerState();
    state.status = 'playing';
    state.balls = [
      {
        id: 1,
        x: PLAY_WIDTH / 2 - 0.1,
        y: 6,
        vx: 5,
        vy: 2,
        radius: 0.2,
        speed: 5,
      },
    ];

    state = updateBlockBreaker(state, 0.05);
    expect(state.balls[0].vx).toBeLessThan(0); // Bounced off right wall
  });

  it('detects block collision, decreases durability, and awards points', () => {
    let state = createInitialBlockBreakerState();
    state.status = 'playing';
    const targetBlock = state.blocks[0];

    // Place ball right at the block boundary moving upwards
    state.balls = [
      {
        id: 1,
        x: targetBlock.x,
        y: targetBlock.y - targetBlock.height / 2 - 0.1,
        vx: 0,
        vy: 4,
        radius: 0.2,
        speed: 4,
      },
    ];

    const initialScore = state.score;
    state = updateBlockBreaker(state, 0.05);

    expect(state.score).toBeGreaterThan(initialScore);
    expect(state.balls[0].vy).toBeLessThan(0); // Reflected downwards
  });

  it('triggers cleared status when all blocks are destroyed', () => {
    let state = createInitialBlockBreakerState();
    state.status = 'playing';
    state.blocks = []; // No blocks left
    state = updateBlockBreaker(state, 0.016);
    expect(state.status).toBe('cleared');
  });

  it('resets to next level with fresh blocks and ready status', () => {
    let state = createInitialBlockBreakerState();
    state.level = 1;
    state = nextLevel(state);
    expect(state.level).toBe(2);
    expect(state.status).toBe('ready');
    expect(state.blocks.length).toBeGreaterThan(0);
  });

  it('decreases life when ball falls below bottom', () => {
    let state = createInitialBlockBreakerState();
    state.status = 'playing';
    state.lives = 3;
    state.balls = [
      {
        id: 1,
        x: 0,
        y: 0.1,
        vx: 0,
        vy: -5,
        radius: 0.2,
        speed: 5,
      },
    ];

    state = updateBlockBreaker(state, 0.05);
    expect(state.lives).toBe(2);
    expect(state.status).toBe('ready');
  });
});
