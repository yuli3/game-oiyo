import type { TentsMode } from './tents-save';

export type TentsAnalyticsEvent =
  | 'game_start'
  | 'game_resume'
  | 'game_complete'
  | 'play_again'
  | 'hint_used'
  | 'mode_change';

interface TentsAnalyticsContext {
  mode: TentsMode;
  locale: string;
}

export function tentsAnalyticsPayload(context: TentsAnalyticsContext): Record<string, string> {
  return {
    game_id: 'tents-and-trees',
    game_mode: context.mode,
    locale: context.locale,
  };
}
