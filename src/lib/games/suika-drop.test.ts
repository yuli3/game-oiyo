import { describe, expect, it } from 'vitest';
import {
  CONTAINER_HEIGHT,
  createInitialSuikaState,
  DEADLINE_Y,
  dropSuikaFruit,
  FRUIT_TIERS,
  moveSuikaDropper,
  shakeSuikaContainer,
  stepSuikaPhysics,
} from './suika-drop';

describe('Suika Fruit Drop Physics (#137)', () => {
  it('initializes empty container with 10 evolution tiers and dropper in center', () => {
    const state = createInitialSuikaState();
    expect(state.status).toBe('playing');
    expect(state.fruits).toHaveLength(0);
    expect(FRUIT_TIERS).toHaveLength(10);
    expect(FRUIT_TIERS[9].nameKey).toBe('watermelon');
  });

  it('clamps dropper X within container bounds and drops a fruit with cooldown', () => {
    let state = createInitialSuikaState();
    state = moveSuikaDropper(state, -50);
    expect(state.dropperX).toBeGreaterThanOrEqual(FRUIT_TIERS[0].radius + 8);

    state = dropSuikaFruit(state);
    expect(state.fruits).toHaveLength(1);
    expect(state.dropCooldown).toBeGreaterThan(0);
  });

  it('merges two colliding fruits of the same tier into the next tier and awards score', () => {
    let state = createInitialSuikaState();
    // Place two overlapping Cherries (tier 0) at the bottom of the container
    state = {
      ...state,
      fruits: [
        {
          id: 1,
          tier: 0,
          x: 180,
          y: CONTAINER_HEIGHT - 30,
          vx: 10,
          vy: 0,
          radius: FRUIT_TIERS[0].radius,
          angle: 0,
          omega: 0,
          age: 0.5,
          popScale: 1,
        },
        {
          id: 2,
          tier: 0,
          x: 190,
          y: CONTAINER_HEIGHT - 30,
          vx: -10,
          vy: 0,
          radius: FRUIT_TIERS[0].radius,
          angle: 0,
          omega: 0,
          age: 0.5,
          popScale: 1,
        },
      ],
      nextId: 3,
    };

    state = stepSuikaPhysics(state, 0.03);
    expect(state.fruits).toHaveLength(1);
    expect(state.fruits[0].tier).toBe(1); // Evolved to Strawberry
    expect(state.mergesCount).toBe(1);
    expect(state.score).toBe(FRUIT_TIERS[1].score);
  });

  it('supports container shake impulse and triggers gameover when settled fruit exceeds deadline', () => {
    let state = createInitialSuikaState();
    state = dropSuikaFruit(state);
    state = shakeSuikaContainer(state);
    expect(state.shakesLeft).toBe(1);

    // Simulate settled fruit above DEADLINE_Y
    state = {
      ...state,
      fruits: [
        {
          id: 99,
          tier: 5,
          x: 180,
          y: DEADLINE_Y - 10,
          vx: 0,
          vy: -600,
          radius: FRUIT_TIERS[5].radius,
          angle: 0,
          omega: 0,
          age: 2.0,
          popScale: 1,
        },
      ],
      overfillTimer: 2.18,
    };
    state = stepSuikaPhysics(state, 0.04);
    expect(state.status).toBe('gameover');
  });
});
