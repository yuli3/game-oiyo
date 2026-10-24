import { describe, it, expect } from "vitest";
import {
  generateDailyMissions,
  reportMissionProgress,
  calculateArcadeTier,
  type ArcadePassProgress,
} from "./arcade-pass";

describe("ArcadePass Engine (M4 Meta-Progression)", () => {
  it("generates deterministic 3 daily missions for the same date", () => {
    const missionsA = generateDailyMissions("2026-10-24");
    const missionsB = generateDailyMissions("2026-10-24");

    expect(missionsA).toHaveLength(3);
    expect(missionsA).toEqual(missionsB);
  });

  it("advances mission progress and completes when goal is reached", () => {
    const initialProgress: ArcadePassProgress = {
      xp: 0,
      completedMissionIds: [],
      missions: [
        {
          id: "score-2048-512",
          gameSlug: "game-2048",
          title: { ko: "2048에서 512 타일 달성" },
          goal: 512,
          current: 0,
          xpReward: 50,
          completed: false,
        },
      ],
      lastActiveDate: "2026-10-24",
    };

    const next = reportMissionProgress(initialProgress, "game-2048", 512);
    expect(next.missions[0]?.current).toBe(512);
    expect(next.missions[0]?.completed).toBe(true);
    expect(next.xp).toBe(50);
    expect(next.completedMissionIds).toContain("score-2048-512");
  });

  it("calculates player rank tier according to accumulated XP", () => {
    expect(calculateArcadeTier(0)).toBe("RECRUIT");
    expect(calculateArcadeTier(100)).toBe("CHALLENGER");
    expect(calculateArcadeTier(300)).toBe("VETERAN");
    expect(calculateArcadeTier(600)).toBe("ELITE");
    expect(calculateArcadeTier(1000)).toBe("LEGEND");
  });
});
