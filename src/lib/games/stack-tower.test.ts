import { describe, expect, it } from 'vitest';
import {
  createInitialMovingBlock,
  INITIAL_SIZE,
  type MovingBlock,
  PERFECT_TOLERANCE,
  sliceBlock,
  type TowerBlock,
  updateMovingBlock,
} from './stack-tower';

describe('stack-tower physics & slicing', () => {
  const baseBlock: TowerBlock = {
    x: 0,
    y: 0,
    z: 0,
    width: INITIAL_SIZE,
    depth: INITIAL_SIZE,
    color: '#3b82f6',
  };

  it('detects a perfect alignment within tolerance', () => {
    const moving: MovingBlock = {
      axis: 'x',
      position: PERFECT_TOLERANCE * 0.5,
      direction: 1,
      speed: 5,
      width: INITIAL_SIZE,
      depth: INITIAL_SIZE,
      color: '#ec4899',
    };

    const res = sliceBlock(moving, baseBlock, 0);
    expect(res.success).toBe(true);
    expect(res.isPerfect).toBe(true);
    expect(res.placedBlock?.width).toBe(INITIAL_SIZE);
    expect(res.placedBlock?.x).toBe(baseBlock.x);
    expect(res.cutPiece).toBeUndefined();
  });

  it('slices an overlapping block along x axis', () => {
    const offset = 1.0;
    const moving: MovingBlock = {
      axis: 'x',
      position: offset,
      direction: 1,
      speed: 5,
      width: INITIAL_SIZE,
      depth: INITIAL_SIZE,
      color: '#ec4899',
    };

    const res = sliceBlock(moving, baseBlock, 0);
    expect(res.success).toBe(true);
    expect(res.isPerfect).toBe(false);
    expect(res.placedBlock).toBeDefined();
    expect(res.placedBlock?.width).toBeCloseTo(INITIAL_SIZE - offset);
    expect(res.cutPiece).toBeDefined();
    expect(res.cutPiece?.width).toBeCloseTo(offset);
  });

  it('fails when block completely misses the tower', () => {
    const moving: MovingBlock = {
      axis: 'x',
      position: INITIAL_SIZE + 2.0,
      direction: 1,
      speed: 5,
      width: INITIAL_SIZE,
      depth: INITIAL_SIZE,
      color: '#ec4899',
    };

    const res = sliceBlock(moving, baseBlock, 0);
    expect(res.success).toBe(false);
    expect(res.isPerfect).toBe(false);
  });

  it('bounces moving block at boundary', () => {
    const moving: MovingBlock = {
      axis: 'x',
      position: 4.9,
      direction: 1,
      speed: 5,
      width: INITIAL_SIZE,
      depth: INITIAL_SIZE,
      color: '#ec4899',
    };

    const updated = updateMovingBlock(moving, 0.1);
    expect(updated.direction).toBe(-1);
    expect(updated.position).toBe(5.0);
  });

  it('alternates axes when creating subsequent moving blocks', () => {
    const m0 = createInitialMovingBlock(baseBlock, 0);
    expect(m0.axis).toBe('x');
    const m1 = createInitialMovingBlock(baseBlock, 1);
    expect(m1.axis).toBe('z');
  });
});
