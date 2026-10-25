import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCompletedDates,
  recordDailyPuzzleClear,
  isDailyPuzzleCompleted,
  getDailyStreak,
  getDaysInMonth,
  getTodayDateStr,
} from "./daily-calendar";

describe("daily-calendar module", () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
      },
    });
  });

  it("records and retrieves completed daily puzzle dates", () => {
    expect(getCompletedDates("sudoku")).toEqual([]);
    recordDailyPuzzleClear("sudoku", "2026-10-24");
    recordDailyPuzzleClear("sudoku", "2026-10-25");

    const dates = getCompletedDates("sudoku");
    expect(dates).toContain("2026-10-24");
    expect(dates).toContain("2026-10-25");
    expect(isDailyPuzzleCompleted("sudoku", "2026-10-25")).toBe(true);
    expect(isDailyPuzzleCompleted("sudoku", "2026-10-23")).toBe(false);
  });

  it("calculates consecutive daily streaks correctly", () => {
    recordDailyPuzzleClear("sudoku", "2026-10-23");
    recordDailyPuzzleClear("sudoku", "2026-10-24");
    recordDailyPuzzleClear("sudoku", "2026-10-25");

    const streak = getDailyStreak("sudoku", "2026-10-25");
    expect(streak).toBe(3);
  });

  it("generates calendar days with completed stamps", () => {
    recordDailyPuzzleClear("tents", "2026-10-15");
    const days = getDaysInMonth("tents", 2026, 10, "2026-10-25");

    expect(days.length).toBe(31);
    const day15 = days.find((d) => d.dayNumber === 15);
    expect(day15?.isCompleted).toBe(true);
    expect(day15?.isPast).toBe(true);

    const day25 = days.find((d) => d.dayNumber === 25);
    expect(day25?.isToday).toBe(true);

    const day28 = days.find((d) => d.dayNumber === 28);
    expect(day28?.isFuture).toBe(true);
  });
});
