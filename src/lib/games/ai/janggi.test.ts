import { describe, expect, it } from 'vitest';
import { janggiBestMove, type JanggiBoard } from './janggi';

const board = (): JanggiBoard => Array.from({ length: 10 }, () => Array<string | null>(9).fill(null));
const levels = [1, 2, 3] as const;

describe('Janggi tactical move quality', () => {
  const budgets = { 1: 200, 2: 600, 3: 1500 } as const;
  for (const level of levels) {
    it(`level ${level} takes a free general`, () => {
      const b = board(); b[9][4] = 'K'; b[0][4] = 'k'; b[8][4] = 'R';
      expect(janggiBestMove(b, false, level, 7)).toEqual({ from: [8, 4], to: [0, 4] });
    });
  }

  it('is deterministic for the same position and seed', () => {
    const b = board(); b[9][4] = 'K'; b[0][4] = 'k'; b[8][4] = 'R'; b[7][0] = 'N';
    expect(janggiBestMove(b, false, 1, 3)).toEqual(janggiBestMove(b, false, 1, 3));
  });

  it('decides within the explicit per-level budget', () => {
    const b = board(); b[9][4] = 'K'; b[0][4] = 'k'; b[8][4] = 'R';
    for (const level of levels) {
      const start = performance.now(); janggiBestMove(b, false, level, 19);
      expect(performance.now() - start).toBeLessThan(budgets[level]);
    }
  });
});
