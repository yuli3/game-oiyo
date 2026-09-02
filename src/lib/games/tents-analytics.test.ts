import { describe, expect, it } from 'vitest';
import { tentsAnalyticsPayload } from './tents-analytics';

describe('Tents & Trees analytics contract', () => {
  it('identifies daily play without puzzle state', () => {
    expect(tentsAnalyticsPayload({ mode: 'daily', locale: 'en' })).toEqual({
      game_id: 'tents-and-trees',
      game_mode: 'daily',
      locale: 'en',
    });
  });

  it('identifies free play without seed or cell coordinates', () => {
    expect(tentsAnalyticsPayload({ mode: 'free', locale: 'ko' })).toEqual({
      game_id: 'tents-and-trees',
      game_mode: 'free',
      locale: 'ko',
    });
  });
});
