/**
 * weekly-league.ts
 *
 * Weekly Deterministic Seed Championship & League System.
 * Generates ISO week-based competition seeds and tracks weekly PB & league tier.
 */

export type LeagueTier = "BRONZE" | "SILVER" | "GOLD" | "MASTER" | "CHAMPION";

export interface WeeklyLeagueRecord {
  weekKey: string; // e.g. "2026-W43"
  gameSlug: string;
  bestScore: number;
  tier: LeagueTier;
  updatedAt: number;
}

/**
 * Returns ISO week key string (YYYY-Www) for any given date.
 */
export function getWeeklyLeagueKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Derives a deterministic integer seed from a week key for fair rival challenges.
 */
export function weeklySeedFromKey(weekKey: string, gameOffset = 0): number {
  let hash = 1779033703 ^ gameOffset;
  for (let i = 0; i < weekKey.length; i++) {
    hash = Math.imul(hash ^ weekKey.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return (hash >>> 0) % 1_000_000;
}

/**
 * Evaluates league tier based on relative score thresholds.
 */
export function calculateLeagueTier(score: number, masterThreshold = 2000): LeagueTier {
  if (score >= masterThreshold * 1.5) return "CHAMPION";
  if (score >= masterThreshold) return "MASTER";
  if (score >= masterThreshold * 0.6) return "GOLD";
  if (score >= masterThreshold * 0.3) return "SILVER";
  return "BRONZE";
}

const STORAGE_PREFIX = "oiyo_weekly_league_";
const memStore = new Map<string, string>();

function getStorage(): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memStore.set(k, v);
    },
  };
}

export function getWeeklyLeagueRecord(weekKey: string, gameSlug: string): WeeklyLeagueRecord | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${STORAGE_PREFIX}${weekKey}_${gameSlug}`);
    if (!raw) return null;
    return JSON.parse(raw) as WeeklyLeagueRecord;
  } catch {
    return null;
  }
}

export function recordWeeklyLeagueScore(
  weekKey: string,
  gameSlug: string,
  score: number,
  masterThreshold = 2000
): WeeklyLeagueRecord {
  const existing = getWeeklyLeagueRecord(weekKey, gameSlug);
  const bestScore = Math.max(score, existing?.bestScore ?? 0);
  const tier = calculateLeagueTier(bestScore, masterThreshold);

  const updated: WeeklyLeagueRecord = {
    weekKey,
    gameSlug,
    bestScore,
    tier,
    updatedAt: Date.now(),
  };

  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(`${STORAGE_PREFIX}${weekKey}_${gameSlug}`, JSON.stringify(updated));
    } catch {}
  }

  return updated;
}
