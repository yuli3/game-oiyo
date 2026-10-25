/**
 * @file daily-calendar.ts
 * @description Pillar 2: Daily Retention & Puzzle Archive Engine.
 * Tracks completed dates for daily logic puzzles (Sudoku, Tents & Trees, Wordle)
 * and computes monthly clear stamps and streaks.
 */

export interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isCompleted: boolean;
}

export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStorageKey(gameSlug: string): string {
  return `oiyo_daily_clears_${gameSlug}`;
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return null;
}

export function getCompletedDates(gameSlug: string): string[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(getStorageKey(gameSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordDailyPuzzleClear(gameSlug: string, dateStr = getTodayDateStr()): string[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const existing = new Set(getCompletedDates(gameSlug));
    existing.add(dateStr);
    const updated = Array.from(existing).sort();
    storage.setItem(getStorageKey(gameSlug), JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function isDailyPuzzleCompleted(gameSlug: string, dateStr: string): boolean {
  const dates = getCompletedDates(gameSlug);
  return dates.includes(dateStr);
}

/**
 * Computes consecutive daily clear streak counting back from today.
 */
export function getDailyStreak(gameSlug: string, referenceDateStr = getTodayDateStr()): number {
  const completed = new Set(getCompletedDates(gameSlug));
  if (completed.size === 0) return 0;

  const refDate = new Date(`${referenceDateStr}T00:00:00`);
  let streak = 0;

  // Check if today is completed, if not check if yesterday was completed
  let checkDate = new Date(refDate);
  const todayStr = checkDate.toISOString().split("T")[0];
  if (!completed.has(todayStr)) {
    // If today is not completed yet, start checking from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, "0");
    const d = String(checkDate.getDate()).padStart(2, "0");
    const formatted = `${y}-${m}-${d}`;

    if (completed.has(formatted)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Generates an array of CalendarDay items for a given year and month (1-12).
 */
export function getDaysInMonth(
  gameSlug: string,
  year: number,
  month: number,
  todayStr = getTodayDateStr()
): CalendarDay[] {
  const completed = new Set(getCompletedDates(gameSlug));
  const numDays = new Date(year, month, 0).getDate();
  const days: CalendarDay[] = [];

  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({
      dateStr,
      dayNumber: d,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      isFuture: dateStr > todayStr,
      isCompleted: completed.has(dateStr),
    });
  }

  return days;
}
