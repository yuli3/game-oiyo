import { describe, it, expect } from "vitest";
import {
  getWeeklyLeagueKey,
  weeklySeedFromKey,
  calculateLeagueTier,
  recordWeeklyLeagueScore,
} from "./weekly-league";

describe("Weekly Seed Championship & League System (Goal #10)", () => {
  it("formats correct ISO week keys for dates", () => {
    // 2026-10-25 is Sunday in week 43
    const key = getWeeklyLeagueKey(new Date("2026-10-25T12:00:00Z"));
    expect(key).toBe("2026-W43");
  });

  it("produces deterministic seeds from week keys", () => {
    const seed1 = weeklySeedFromKey("2026-W43", 1);
    const seed2 = weeklySeedFromKey("2026-W43", 1);
    const seedOtherWeek = weeklySeedFromKey("2026-W44", 1);

    expect(seed1).toBe(seed2);
    expect(seed1).not.toBe(seedOtherWeek);
    expect(seed1).toBeGreaterThanOrEqual(0);
    expect(seed1).toBeLessThan(1_000_000);
  });

  it("calculates competitive league tiers according to score scale", () => {
    const threshold = 1000;
    expect(calculateLeagueTier(100, threshold)).toBe("BRONZE");
    expect(calculateLeagueTier(350, threshold)).toBe("SILVER");
    expect(calculateLeagueTier(650, threshold)).toBe("GOLD");
    expect(calculateLeagueTier(1050, threshold)).toBe("MASTER");
    expect(calculateLeagueTier(1600, threshold)).toBe("CHAMPION");
  });

  it("records and updates weekly league personal best", () => {
    const rec = recordWeeklyLeagueScore("2026-W43", "cosmic-merge", 1200, 1000);
    expect(rec.bestScore).toBe(1200);
    expect(rec.tier).toBe("MASTER");

    const recLower = recordWeeklyLeagueScore("2026-W43", "cosmic-merge", 800, 1000);
    expect(recLower.bestScore).toBe(1200); // Retains higher PB
  });
});
