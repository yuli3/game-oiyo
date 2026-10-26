import { describe, expect, it } from 'vitest';
import {
  applyPresetGrandIsland,
  createTownscaperState,
  interactIslandCell,
} from './townscaper-island';

describe('Townscaper Island Builder (#141)', () => {
  it('initializes an 8x8 coastal grid with a starter pier', () => {
    const state = createTownscaperState();
    expect(state.grid).toHaveLength(8);
    expect(state.grid[0]).toHaveLength(8);
    expect(state.totalBlocks).toBe(5);
    expect(state.grid[3][3].feature).toBe('quay');
    expect(state.grid[3][4].feature).toBe('cottage');
  });

  it('stacks blocks up to height 5 to procedurally form a Coastal Lighthouse', () => {
    let state = createTownscaperState();
    for (let i = 0; i < 5; i++) {
      state = interactIslandCell(state, 1, 1, 'build');
    }
    expect(state.grid[1][1].height).toBe(5);
    expect(state.grid[1][1].feature).toBe('lighthouse');
    expect(state.completedChallenges).toContain('lighthouse-spire');
  });

  it('auto-forms a Canal Arch Bridge when a 2F cell connects opposing E-W neighbors over water', () => {
    let state = createTownscaperState();
    state = interactIslandCell(state, 1, 2, 'build');
    state = interactIslandCell(state, 1, 4, 'build');
    state = interactIslandCell(state, 1, 3, 'build');
    state = interactIslandCell(state, 1, 3, 'build');
    expect(state.grid[1][3].feature).toBe('arch-bridge');
    expect(state.completedChallenges).toContain('canal-arch');
  });

  it('loads the Grand Mediterranean preset and completes all 3 architectural challenges', () => {
    const state = applyPresetGrandIsland(createTownscaperState());
    expect(state.completedChallenges).toEqual(
      expect.arrayContaining(['lighthouse-spire', 'canal-arch', 'enclosed-garden'])
    );
    expect(state.totalBlocks).toBeGreaterThanOrEqual(15);
  });
});
