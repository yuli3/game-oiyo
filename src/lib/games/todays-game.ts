// "Today's game" on the portal home: one pick per KST calendar day, the same for
// every visitor, derived only from the date and the catalog order — no server.
import { mulberry32, previousDayKey, shuffle } from "./daily";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const EPOCH_ORDINAL = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

/** The Korea Standard Time calendar date as "YYYY-MM-DD" (KST has no DST). */
export function kstDateKey(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The KST day before `dateKey`, for the DailyStreak "yesterday" argument. */
export function kstPreviousDateKey(dateKey: string): string {
  return previousDayKey(dateKey);
}

/** Whole days from 2024-01-01 to a "YYYY-MM-DD" key (pure calendar math). */
export function dateKeyIndex(dateKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error(`Invalid date key: ${dateKey}`);
  const ordinal = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Math.floor((ordinal - EPOCH_ORDINAL) / DAY_MS);
}

/**
 * Picks the game for `dateKey`. The catalog is walked in cycles: each cycle is a
 * seeded shuffle of every slug, so no game repeats until all have appeared, and the
 * pick depends only on the date and the slug list (sorted, so card order on the
 * page does not change the result).
 */
export function pickTodaysGame(slugs: readonly string[], dateKey: string): string {
  const pool = [...new Set(slugs)].sort();
  if (pool.length === 0) throw new Error("pickTodaysGame needs at least one slug");
  const day = dateKeyIndex(dateKey);
  const cycle = Math.floor(day / pool.length);
  const slot = day - cycle * pool.length; // non-negative even before the epoch
  const order = shuffle(pool, mulberry32(0x0d1e5eed ^ cycle));
  return order[slot];
}
