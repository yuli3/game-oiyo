import { describe, expect, it } from 'vitest';
import { wordleAnalyticsPayload } from './wordle-analytics';

describe('Wordle analytics contract', () => {
  it('uses aggregate gameplay fields without target, seed, or typed letters', () => {
    expect(wordleAnalyticsPayload({ mode: 'daily', hardMode: true, attempts: 4, result: 'won' })).toEqual({
      game_id: 'wordle',
      mode: 'daily',
      hard_mode: 1,
      attempts: 4,
      result: 'won',
    });
  });

  it('omits completion-only fields before a run completes', () => {
    expect(wordleAnalyticsPayload({ mode: 'random', hardMode: false })).toEqual({
      game_id: 'wordle',
      mode: 'random',
      hard_mode: 0,
    });
  });
});
