// Per-game vs-AI records in localStorage (new key, no collision with oiyo:* profile keys).
export type GameRecord = { w: number; l: number; d: number };

const KEY = "oiyo:game-records:v1";

function readAll(): Record<string, GameRecord> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function getRecord(game: string): GameRecord {
  const r = readAll()[game];
  return r && typeof r.w === "number" ? r : { w: 0, l: 0, d: 0 };
}

export function recordResult(game: string, result: "w" | "l" | "d"): GameRecord {
  const all = readAll();
  const r = all[game] ?? { w: 0, l: 0, d: 0 };
  r[result] += 1;
  all[game] = r;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* quota/private mode — records are best-effort */
  }
  return r;
}

// ─── Personal bests (score / time) — separate store, no overlap with GameRecord above ────
// Score-based games (higher wins, e.g. 2048/Snake) and time-based games (lower wins, e.g.
// Minesweeper/Sudoku/Puzzle15) share this shape; `unit` tells callers how to compare/format.
// `extra` carries freeform context shown next to the number (e.g. move count, difficulty).
export type BestRecord = { value: number; unit: "score" | "seconds"; extra?: string };

const BEST_KEY = "oiyo:game-bests:v1";

function readAllBests(): Record<string, BestRecord> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getBest(game: string): BestRecord | null {
  return readAllBests()[game] ?? null;
}

// Saves `value` as the new best if it beats the stored one (higher for "score", lower for "seconds").
export function recordBest(game: string, value: number, unit: "score" | "seconds", extra?: string): BestRecord {
  const all = readAllBests();
  const cur = all[game];
  const isBetter = !cur || cur.unit !== unit || (unit === "score" ? value > cur.value : value < cur.value);
  const next: BestRecord = isBetter ? { value, unit, extra } : cur;
  all[game] = next;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(all));
  } catch {
    /* quota/private mode — records are best-effort */
  }
  return next;
}

// ─── Calendar-day streaks (daily puzzle modes) — separate store, date-aware ──────────────
// Unlike StreakStats below (which counts consecutive *wins*), this counts consecutive
// *calendar days* with a solve: skipping a day restarts the run, and solving the same
// day twice is a no-op. `dateKey` is a local "YYYY-MM-DD" (see lib/games/daily.ts).
export type DailyStreak = { played: number; currentStreak: number; maxStreak: number; lastWinDate: string | null };

const DAILY_KEY = "oiyo:game-daily-streaks:v1";

function readAllDailies(): Record<string, DailyStreak> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DAILY_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getDailyStreak(game: string, dateKey?: string, previousDateKey?: string): DailyStreak {
  const stored = readAllDailies()[game] ?? { played: 0, currentStreak: 0, maxStreak: 0, lastWinDate: null };
  if (
    dateKey &&
    previousDateKey &&
    stored.lastWinDate !== dateKey &&
    stored.lastWinDate !== previousDateKey
  ) {
    return { ...stored, currentStreak: 0 };
  }
  return stored;
}

export function recordDailyWin(game: string, dateKey: string, previousDateKey: string): DailyStreak {
  const all = readAllDailies();
  const cur = all[game] ?? { played: 0, currentStreak: 0, maxStreak: 0, lastWinDate: null };
  if (cur.lastWinDate === dateKey) return cur; // already counted today
  const nextStreak = cur.lastWinDate === previousDateKey ? cur.currentStreak + 1 : 1;
  const next: DailyStreak = {
    played: cur.played + 1,
    currentStreak: nextStreak,
    maxStreak: Math.max(cur.maxStreak, nextStreak),
    lastWinDate: dateKey,
  };
  all[game] = next;
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(all));
  } catch {
    /* quota/private mode — records are best-effort */
  }
  return next;
}

// ─── Streak stats (Wordle-style daily puzzles) — separate store, no score/time involved ──
export type StreakStats = { played: number; won: number; currentStreak: number; maxStreak: number };

const STREAK_KEY = "oiyo:game-streaks:v1";

function readAllStreaks(): Record<string, StreakStats> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getStreak(game: string): StreakStats {
  return readAllStreaks()[game] ?? { played: 0, won: 0, currentStreak: 0, maxStreak: 0 };
}

export function recordStreak(game: string, won: boolean): StreakStats {
  const all = readAllStreaks();
  const cur = all[game] ?? { played: 0, won: 0, currentStreak: 0, maxStreak: 0 };
  const nextStreak = won ? cur.currentStreak + 1 : 0;
  const next: StreakStats = {
    played: cur.played + 1,
    won: cur.won + (won ? 1 : 0),
    currentStreak: nextStreak,
    maxStreak: Math.max(cur.maxStreak, nextStreak),
  };
  all[game] = next;
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(all));
  } catch {
    /* quota/private mode — records are best-effort */
  }
  return next;
}
