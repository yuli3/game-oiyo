import { describe, expect, it } from 'vitest';
import { distributionAnalyticsPayload } from './distribution-analytics';

describe('Lost Ark distribution analytics contract', () => {
  it('describes a successful aggregate result without party input or room credentials', () => {
    expect(distributionAnalyticsPayload({ raidType: '1-3', partySize: '16', gameCount: 4, playerCount: 16 })).toEqual({
      tool_id: 'lostark-raid-distribution',
      raid_type: '1-3',
      party_size: 16,
      game_count: 4,
      player_count: 16,
    });
  });

  it('reports only the validation error category', () => {
    expect(distributionAnalyticsPayload({ raidType: '1-1', partySize: '8', gameCount: 2, errorType: 'invalid' })).toEqual({
      tool_id: 'lostark-raid-distribution',
      raid_type: '1-1',
      party_size: 8,
      game_count: 2,
      error_type: 'invalid',
    });
  });
});
