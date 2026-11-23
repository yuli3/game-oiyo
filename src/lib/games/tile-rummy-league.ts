/**
 * Tile rummy league (stage range 10-50, 2026-11-23): twenty fixed tables.
 * Each stage pins the seed, the rival count and the rival level, so a stage is the same deal every time.
 * Only append stages. Existing indices keep their table.
 */

import type { AiLevel } from "./ai/types";
import type { OpponentCount } from "./tile-rummy";

export const TILE_RUMMY_LEAGUE_SLUG = "tile-rummy-league";

export interface LeagueStage {
  readonly opponents: OpponentCount;
  readonly level: AiLevel;
  readonly seed: number;
}

/** [rivals, level]: one easy rival first, three sharp rivals last. */
const TABLES: readonly (readonly [OpponentCount, AiLevel])[] = [
  [1, 1], [1, 1], [1, 1], [1, 2], [1, 2],
  [2, 1], [2, 1], [1, 2], [2, 2], [1, 3],
  [2, 2], [3, 1], [1, 3], [3, 1], [2, 3],
  [3, 2], [2, 3], [3, 2], [3, 3], [3, 3],
];

export const TILE_RUMMY_LEAGUE: readonly LeagueStage[] = TABLES.map(([opponents, level], index) => ({
  opponents,
  level,
  seed: (0x7472_6c00 ^ Math.imul(index + 1, 2654435761)) >>> 0,
}));

export const TILE_RUMMY_LEAGUE_COUNT = TILE_RUMMY_LEAGUE.length;

export function leagueStage(index: number): LeagueStage | null {
  return Number.isInteger(index) ? TILE_RUMMY_LEAGUE[index] ?? null : null;
}
