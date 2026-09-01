import type { PartySize, RaidType } from './distribution';

export type DistributionAnalyticsEvent =
  | 'distribution_complete'
  | 'distribution_error'
  | 'result_copy'
  | 'room_code_generate';

interface DistributionAnalyticsContext {
  raidType: RaidType;
  partySize: PartySize;
  gameCount: number;
  playerCount?: number;
  errorType?: 'count' | 'invalid';
}

export function distributionAnalyticsPayload(context: DistributionAnalyticsContext): Record<string, string | number> {
  const payload: Record<string, string | number> = {
    tool_id: 'lostark-raid-distribution',
    raid_type: context.raidType,
    party_size: Number(context.partySize),
    game_count: context.gameCount,
  };
  if (context.playerCount !== undefined) payload.player_count = context.playerCount;
  if (context.errorType !== undefined) payload.error_type = context.errorType;
  return payload;
}
