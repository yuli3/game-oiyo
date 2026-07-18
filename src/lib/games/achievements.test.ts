import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementSnapshot } from "./achievements";

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
