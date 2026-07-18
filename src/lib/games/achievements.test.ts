import { beforeEach, describe, expect, it } from "vitest";
import { ACHIEVEMENTS, buildAchievementSnapshot, evaluateAchievements, type AchievementSnapshot } from "./achievements";
import { recordBest, recordDailyWin, recordResult, recordStreak } from "./records";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  } as Storage;
}

beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = createMemoryStorage();
});

const EMPTY: AchievementSnapshot = {
  totalWins: 0,
  totalPlays: 0,
  distinctGamesPlayed: 0,
  bestRecordCount: 0,
  bestDailyStreak: 0,
  bestWinStreak: 0,
};

describe("achievements: evaluateAchievements", () => {
  it("unlocks nothing from an empty snapshot", () => {
    const result = evaluateAchievements(EMPTY);
    expect(result).toHaveLength(ACHIEVEMENTS.length);
    expect(result.every((a) => !a.unlocked)).toBe(true);
    expect(result.every((a) => a.progress === 0)).toBe(true);
  });

  it("unlocks exactly the milestones a snapshot has reached, not the ones beyond it", () => {
    const result = evaluateAchievements({ ...EMPTY, totalPlays: 50, totalWins: 10 });
    const byId = Object.fromEntries(result.map((a) => [a.id, a]));
    expect(byId["first-steps"].unlocked).toBe(true);
    expect(byId["veteran"].unlocked).toBe(true);
    expect(byId["centurion"].unlocked).toBe(false); // needs 100
    expect(byId["first-win"].unlocked).toBe(true);
    expect(byId["grandmaster"].unlocked).toBe(false); // needs 25
  });

  it("caps progress at the target rather than overshooting", () => {
    const result = evaluateAchievements({ ...EMPTY, totalPlays: 9999 });
    const centurion = result.find((a) => a.id === "centurion")!;
    expect(centurion.progress).toBe(100);
    expect(centurion.unlocked).toBe(true);
  });

  it("evaluates streak and collection achievements independently of milestone counters", () => {
    const result = evaluateAchievements({ ...EMPTY, bestDailyStreak: 7, distinctGamesPlayed: 5, bestRecordCount: 2 });
    const byId = Object.fromEntries(result.map((a) => [a.id, a]));
    expect(byId["streak-3"].unlocked).toBe(true);
    expect(byId["streak-7"].unlocked).toBe(true);
    expect(byId["streak-30"].unlocked).toBe(false);
    expect(byId["explorer"].unlocked).toBe(true);
    expect(byId["completionist"].unlocked).toBe(false);
    expect(byId["record-holder"].unlocked).toBe(true);
    expect(byId["win-streak-5"].unlocked).toBe(false); // bestWinStreak is 0 in this snapshot
  });

  it("has no duplicate achievement ids", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("achievements: cross-store snapshot", () => {
  it("counts record, PB-only, daily-only and streak-only games as completed", () => {
    recordResult("chess", "w");
    recordBest("sudoku", 42, "seconds");
    recordDailyWin("kurodoko", "2026-07-18", "2026-07-17");
    recordStreak("wordle", false);

    expect(buildAchievementSnapshot()).toMatchObject({
      totalWins: 2,
      totalPlays: 4,
      distinctGamesPlayed: 4,
      bestRecordCount: 1,
    });
  });

  it("uses the largest compatible counter when one game writes multiple stores", () => {
    recordBest("daily-minesweeper", 30, "seconds");
    recordDailyWin("daily-minesweeper", "2026-07-18", "2026-07-17");
    expect(buildAchievementSnapshot()).toMatchObject({ totalWins: 1, totalPlays: 1, distinctGamesPlayed: 1 });
  });

  it("survives valid JSON with an invalid root shape", () => {
    localStorage.setItem("oiyo:game-records:v1", "null");
    localStorage.setItem("oiyo:game-bests:v1", "[]");
    expect(buildAchievementSnapshot()).toEqual(EMPTY);
  });
});
