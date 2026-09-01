import type { WordleMode, WordleStatus } from './wordle';

export type WordleAnalyticsEvent = 'game_start' | 'game_complete' | 'game_resume' | 'play_again' | 'share_click';

interface WordleAnalyticsContext {
  mode: WordleMode;
  hardMode: boolean;
  attempts?: number;
  result?: Exclude<WordleStatus, 'playing'>;
}

export function wordleAnalyticsPayload(context: WordleAnalyticsContext): Record<string, string | number> {
  const payload: Record<string, string | number> = {
    game_id: 'wordle',
    mode: context.mode,
    hard_mode: context.hardMode ? 1 : 0,
  };
  if (context.attempts !== undefined) payload.attempts = context.attempts;
  if (context.result !== undefined) payload.result = context.result;
  return payload;
}
