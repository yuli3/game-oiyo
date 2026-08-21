import { describe, expect, it } from 'vitest';
import { gomokuBestMove, gomokuThreatAt } from './gomoku';

const empty = () => Array<number | null>(225).fill(null);
const put = (b: (number | null)[], cells: Array<[number, number]>, player: number) => {
  for (const [x, y] of cells) b[y * 15 + x] = player;
};

describe('Gomoku tactical move quality', () => {
  it('names the threat created by a move', () => {
    const five = empty(); put(five, [[3, 7], [4, 7], [5, 7], [6, 7], [7, 7]], 2);
    expect(gomokuThreatAt(five, 7 + 7 * 15, 2)).toBe('five');
    const openFour = empty(); put(openFour, [[4, 7], [5, 7], [6, 7], [7, 7]], 2);
    expect(gomokuThreatAt(openFour, 6 + 7 * 15, 2)).toBe('open-four');
    const openThree = empty(); put(openThree, [[5, 7], [6, 7], [7, 7]], 2);
    expect(gomokuThreatAt(openThree, 6 + 7 * 15, 2)).toBe('open-three');
  });

  const budgets = { 1: 200, 2: 600, 3: 1500 } as const;
  for (const level of [1, 2, 3] as const) {
    it(`level ${level} completes its five`, () => {
      const b = empty(); put(b, [[4, 7], [5, 7], [6, 7], [7, 7]], 1);
      expect(gomokuBestMove(b, 1, level, 11)).toBe(3 + 7 * 15);
    });
    it(`level ${level} blocks an immediate loss`, () => {
      const b = empty(); put(b, [[4, 7], [5, 7], [6, 7], [7, 7]], 2);
      expect(gomokuBestMove(b, 1, level, 11)).toBe(3 + 7 * 15);
    });
  }

  it('is deterministic for the same seed', () => {
    const b = empty(); put(b, [[7, 7]], 1);
    expect(gomokuBestMove(b, 1, 1, 42)).toBe(gomokuBestMove(b, 1, 1, 42));
  });

  it('decides within the explicit per-level budget', () => {
    const b = empty(); put(b, [[7, 7], [8, 8], [6, 8]], 1);
    for (const level of [1, 2, 3] as const) {
      const start = performance.now(); gomokuBestMove(b, 2, level, 19);
      expect(performance.now() - start).toBeLessThan(budgets[level]);
    }
  });
});
