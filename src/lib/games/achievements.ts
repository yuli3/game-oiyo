// Cross-game achievements — a pure evaluator over a snapshot of the existing
// per-game record stores (records.ts). No new tracking hooks are added to any
// game component; every achievement is derived from data already collected
// (win/loss counts, personal bests, daily streaks, win streaks), so nothing
// here can be gamed by data that was never real.
import {
  getAllAchievementEvents,
  getAllBests,
  getAllConditionalBests,
  getAllDailyStreaks,
  getAllOpened,
  getAllRecords,
  getAllStreaks,
} from "./records";

export interface AchievementSnapshot {
  totalWins: number;
  totalPlays: number;
  distinctGamesPlayed: number;
  distinctGamesOpened: number;
  bestRecordCount: number;
  bestDailyStreak: number;
  bestWinStreak: number;
}

export type AchievementCategory = "milestone" | "streak" | "collection" | "record";

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  icon: string;
  /** Value the snapshot must reach, and which snapshot field measures it. */
  metric: keyof AchievementSnapshot;
  target: number;
}

export interface EvaluatedAchievement extends AchievementDef {
  progress: number;
  unlocked: boolean;
}

// Ordered weakest → strongest within each category; component groups by category.
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: "first-steps", category: "milestone", icon: "🎮", metric: "totalPlays", target: 1 },
  { id: "first-win", category: "milestone", icon: "🏅", metric: "totalWins", target: 1 },
  { id: "veteran", category: "milestone", icon: "🏆", metric: "totalPlays", target: 50 },
  { id: "centurion", category: "milestone", icon: "💯", metric: "totalPlays", target: 100 },
  { id: "grandmaster", category: "milestone", icon: "⭐", metric: "totalWins", target: 25 },

  { id: "streak-3", category: "streak", icon: "🔥", metric: "bestDailyStreak", target: 3 },
  { id: "streak-7", category: "streak", icon: "🔥", metric: "bestDailyStreak", target: 7 },
  { id: "streak-30", category: "streak", icon: "🔥", metric: "bestDailyStreak", target: 30 },
  { id: "win-streak-5", category: "streak", icon: "🎯", metric: "bestWinStreak", target: 5 },
  { id: "win-streak-10", category: "streak", icon: "🎯", metric: "bestWinStreak", target: 10 },

  { id: "explorer", category: "collection", icon: "🕹️", metric: "distinctGamesPlayed", target: 5 },
  { id: "completionist", category: "collection", icon: "🗺️", metric: "distinctGamesPlayed", target: 15 },
  { id: "arcade-atlas", category: "collection", icon: "🌏", metric: "distinctGamesOpened", target: 40 },

  { id: "record-holder", category: "record", icon: "⏱️", metric: "bestRecordCount", target: 1 },
] as const;

/** Pure: derive the unlocked/progress state of every achievement from a snapshot. */
export function evaluateAchievements(snapshot: AchievementSnapshot): EvaluatedAchievement[] {
  return ACHIEVEMENTS.map((def) => {
    const value = snapshot[def.metric];
    return { ...def, progress: Math.min(value, def.target), unlocked: value >= def.target };
  });
}

/** Browser-only: read every per-game store and fold it into one snapshot. */
export function buildAchievementSnapshot(): AchievementSnapshot {
  const records = getAllRecords();
  const dailyStreaks = getAllDailyStreaks();
  const streaks = getAllStreaks();
  const bests = getAllBests();
  const opened = getAllOpened();
  const events = getAllAchievementEvents();
  const conditionalBests = getAllConditionalBests();
  const conditionalBestGameIds = new Set(conditionalBests.map(({ game }) => game));

  const playedGameIds = new Set<string>();
  for (const [id, r] of Object.entries(records)) if (r.w + r.l + r.d > 0) playedGameIds.add(id);
  for (const [id, stats] of Object.entries(dailyStreaks)) if (stats.played > 0) playedGameIds.add(id);
  for (const [id, stats] of Object.entries(streaks)) if (stats.played > 0) playedGameIds.add(id);
  for (const id of Object.keys(bests)) playedGameIds.add(id);
  for (const game of conditionalBestGameIds) playedGameIds.add(game);
  for (const [id, counts] of Object.entries(events)) {
    if (counts.played + counts.cleared + counts["personal-best"] > 0) playedGameIds.add(id);
  }

  // A game may write more than one compatible store on completion (for
  // example a daily solve can update both a best time and a calendar streak).
  // Taking the maximum known counter per game avoids double-counting while
  // still letting PB-only and daily-only games participate in global totals.
  let totalWins = 0;
  let totalPlays = 0;
  for (const id of playedGameIds) {
    const record = records[id];
    totalWins += Math.max(record?.w ?? 0, dailyStreaks[id]?.played ?? 0, streaks[id]?.won ?? 0);
    totalPlays += Math.max(
      record ? record.w + record.l + record.d : 0,
      dailyStreaks[id]?.played ?? 0,
      streaks[id]?.played ?? 0,
      events[id]?.played ?? 0,
      bests[id] || conditionalBestGameIds.has(id) ? 1 : 0,
    );
  }

  const bestDailyStreak = Math.max(0, ...Object.values(dailyStreaks).map((s) => s.maxStreak));
  const bestWinStreak = Math.max(0, ...Object.values(streaks).map((s) => s.maxStreak));
  const bestRecordCount = Object.keys(bests).length + conditionalBests.length;

  return {
    totalWins,
    totalPlays,
    distinctGamesPlayed: playedGameIds.size,
    distinctGamesOpened: Object.keys(opened).length,
    bestRecordCount,
    bestDailyStreak,
    bestWinStreak,
  };
}
