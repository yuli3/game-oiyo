import { describe, it, expect } from "vitest";
import {
  generateDailyMissions,
  reportMissionProgress,
  calculateArcadeTier,
  checkInDailyStreak,
  getUnlockedTitles,
  equipArcadeTitle,
  getEquippedTitleData,
  ARCADE_TITLES,
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

  it("advances 7-day daily streak check-in with bonus XP", () => {
    const base: ArcadePassProgress = {
      xp: 0,
      completedMissionIds: [],
      missions: [],
      lastActiveDate: "2026-10-24",
    };

    // Day 1
    const res1 = checkInDailyStreak(base, "2026-10-24", "2026-10-23");
    expect(res1.currentStreak).toBe(1);
    expect(res1.bonusXp).toBe(20);
    expect(res1.updatedProgress.xp).toBe(20);
    expect(res1.alreadyCheckedIn).toBe(false);

    // Same day check-in attempt
    const resSame = checkInDailyStreak(res1.updatedProgress, "2026-10-24", "2026-10-23");
    expect(resSame.alreadyCheckedIn).toBe(true);
    expect(resSame.bonusXp).toBe(0);

    // Day 2 consecutive
    const res2 = checkInDailyStreak(res1.updatedProgress, "2026-10-25", "2026-10-24");
    expect(res2.currentStreak).toBe(2);
    expect(res2.bonusXp).toBe(30);
    expect(res2.updatedProgress.xp).toBe(50);

    // Day 3 milestone
    const res3 = checkInDailyStreak(res2.updatedProgress, "2026-10-26", "2026-10-25");
    expect(res3.currentStreak).toBe(3);
    expect(res3.bonusXp).toBe(50);
    expect(res3.updatedProgress.xp).toBe(100);
  });

  it("unlocks and equips player titles based on XP milestones", () => {
    // 0 XP: only novice
    const titles0 = getUnlockedTitles(0);
    expect(titles0.map((t) => t.id)).toEqual(["novice"]);

    // 350 XP: novice, puzzler, combomaster
    const titles350 = getUnlockedTitles(350);
    expect(titles350.map((t) => t.id)).toEqual(["novice", "puzzler", "combomaster"]);

    // Equip title when unlocked
    const progress: ArcadePassProgress = {
      xp: 350,
      completedMissionIds: [],
      missions: [],
      lastActiveDate: "2026-10-25",
    };

    const equipped = equipArcadeTitle(progress, "combomaster");
    expect(equipped.equippedTitleId).toBe("combomaster");

    const titleData = getEquippedTitleData(equipped, "ko");
    expect(titleData.id).toBe("combomaster");
    expect(titleData.badge).toBe("🔥");
    expect(titleData.name).toBe("콤보 장인");

    // Cannot equip title requiring higher XP
    const rejected = equipArcadeTitle(progress, "legend");
    expect(rejected.equippedTitleId).toBeUndefined();
  });
});
