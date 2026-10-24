/**
 * @file arcade-pass.ts
 * @description Pillar 4: Meta-Progression & Retention (M4).
 * Generates deterministic daily missions across flagship arcade titles,
 * tracks player XP and unlocks studio rank tier titles (RECRUIT -> LEGEND).
 */

export type ArcadeRankTier =
  | "RECRUIT"
  | "CHALLENGER"
  | "VETERAN"
  | "ELITE"
  | "LEGEND";

export interface DailyMission {
  id: string;
  gameSlug: string;
  title: Record<string, string>;
  goal: number;
  current: number;
  xpReward: number;
  completed: boolean;
}

export interface ArcadePassProgress {
  xp: number;
  completedMissionIds: string[];
  missions: DailyMission[];
  lastActiveDate: string;
  streakCount?: number;
  lastCheckInDate?: string;
  claimedStreakDays?: number[];
}

export interface DailyStreakReward {
  day: number;
  xp: number;
  isMilestone?: boolean;
}

export const STREAK_REWARDS: DailyStreakReward[] = [
  { day: 1, xp: 20 },
  { day: 2, xp: 30 },
  { day: 3, xp: 50, isMilestone: true },
  { day: 4, xp: 20 },
  { day: 5, xp: 30 },
  { day: 6, xp: 40 },
  { day: 7, xp: 100, isMilestone: true },
];

export function checkInDailyStreak(
  progress: ArcadePassProgress,
  today: string,
  previousDay: string
): {
  updatedProgress: ArcadePassProgress;
  bonusXp: number;
  currentStreak: number;
  alreadyCheckedIn: boolean;
} {
  const lastCheckIn = progress.lastCheckInDate;
  if (lastCheckIn === today) {
    return {
      updatedProgress: progress,
      bonusXp: 0,
      currentStreak: progress.streakCount ?? 1,
      alreadyCheckedIn: true,
    };
  }

  const isConsecutive = lastCheckIn === previousDay;
  const currentStreak = isConsecutive
    ? Math.min(7, ((progress.streakCount ?? 0) % 7) + 1)
    : 1;

  const claimedDays = isConsecutive && currentStreak > 1
    ? [...(progress.claimedStreakDays ?? []), currentStreak]
    : [currentStreak];

  const reward = STREAK_REWARDS.find((r) => r.day === currentStreak);
  const bonusXp = reward ? reward.xp : 20;

  const updatedProgress: ArcadePassProgress = {
    ...progress,
    xp: progress.xp + bonusXp,
    streakCount: currentStreak,
    lastCheckInDate: today,
    claimedStreakDays: claimedDays,
  };

  saveArcadePassProgress(updatedProgress);

  return {
    updatedProgress,
    bonusXp,
    currentStreak,
    alreadyCheckedIn: false,
  };
}

export const MISSION_CATALOG: Array<{
  id: string;
  gameSlug: string;
  title: Record<string, string>;
  goal: number;
  xpReward: number;
}> = [
  {
    id: "2048-reach-512",
    gameSlug: "game-2048",
    title: {
      ko: "2048에서 512 이상 타일 달성",
      en: "Reach 512+ tile in 2048",
      ja: "2048で512タイル以上を達成",
      zh: "在2048中达成512以上方块",
      fr: "Atteindre la tuile 512+ dans 2048",
      es: "Alcanza la ficha 512+ en 2048",
    },
    goal: 512,
    xpReward: 50,
  },
  {
    id: "snake-score-100",
    gameSlug: "snake-game",
    title: {
      ko: "스네이크에서 100점 이상 달성",
      en: "Score 100+ points in Snake Arcade",
      ja: "スネークで100点以上を獲得",
      zh: "在贪吃蛇中取得100分以上",
      fr: "Marquer 100+ points dans Snake",
      es: "Consigue 100+ puntos en Snake",
    },
    goal: 100,
    xpReward: 50,
  },
  {
    id: "cosmic-score-3000",
    gameSlug: "cosmic-merge",
    title: {
      ko: "코스믹 머지에서 3,000점 이상 달성",
      en: "Score 3,000+ points in Cosmic Merge",
      ja: "コズミックマージで3,000点以上を獲得",
      zh: "在宇宙合成中取得3,000分以上",
      fr: "Marquer 3 000+ points dans Cosmic Merge",
      es: "Consigue 3.000+ puntos en Cosmic Merge",
    },
    goal: 3000,
    xpReward: 50,
  },
  {
    id: "wordle-solve",
    gameSlug: "wordle",
    title: {
      ko: "워들 데일리 퍼즐 1회 클리어",
      en: "Solve 1 Wordle puzzle",
      ja: "ワードルパズルを1問クリア",
      zh: "解开1局Wordle谜题",
      fr: "Résoudre 1 puzzle Wordle",
      es: "Resuelve 1 puzzle de Wordle",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "sudoku-solve",
    gameSlug: "sudoku",
    title: {
      ko: "스도쿠 퍼즐 1회 클리어",
      en: "Solve 1 Sudoku board",
      ja: "数独盤面を1問クリア",
      zh: "完成1局数独对局",
      fr: "Résoudre 1 grille de Sudoku",
      es: "Resuelve 1 tablero de Sudoku",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "survivor-kills-50",
    gameSlug: "neon-survivor",
    title: {
      ko: "네온 서바이버에서 적 50기 격추",
      en: "Defeat 50 swarm enemies in Neon Survivor",
      ja: "ネオン・サバイバーで敵を50体撃破",
      zh: "在霓虹幸存者中击破50名敌人",
      fr: "Éliminer 50 ennemis dans Neon Survivor",
      es: "Derrota 50 enemigos en Neon Survivor",
    },
    goal: 50,
    xpReward: 50,
  },
  {
    id: "blockburst-score-500",
    gameSlug: "block-burst",
    title: {
      ko: "블록 버스트에서 500점 이상 달성",
      en: "Score 500+ points in Block Burst",
      ja: "ブロックバーストで500点以上を獲得",
      zh: "在方块消除中取得500分以上",
      fr: "Marquer 500+ points dans Block Burst",
      es: "Consigue 500+ puntos en Block Burst",
    },
    goal: 500,
    xpReward: 50,
  },
  {
    id: "brickbreaker-score-300",
    gameSlug: "brick-breaker",
    title: {
      ko: "벽돌깨기에서 300점 이상 달성",
      en: "Score 300+ points in Brick Breaker",
      ja: "ブロック崩しで300点以上を獲得",
      zh: "在打砖块中取得300分以上",
      fr: "Marquer 300+ points dans Brick Breaker",
      es: "Consigue 300+ puntos en Brick Breaker",
    },
    goal: 300,
    xpReward: 50,
  },
  {
    id: "watersort-solve",
    gameSlug: "water-sort",
    title: {
      ko: "워터 소트 퍼즐 1회 정제 완료",
      en: "Complete 1 Water Sort puzzle",
      ja: "ウォーターソートパズルを1問クリア",
      zh: "完成1局倒水排序",
      fr: "Compléter 1 puzzle Water Sort",
      es: "Completa 1 puzle de Water Sort",
    },
    goal: 1,
    xpReward: 50,
  },
];

export function calculateArcadeTier(xp: number): ArcadeRankTier {
  if (xp >= 1000) return "LEGEND";
  if (xp >= 600) return "ELITE";
  if (xp >= 300) return "VETERAN";
  if (xp >= 100) return "CHALLENGER";
  return "RECRUIT";
}

/**
 * Deterministic PRNG seed from date string (YYYY-MM-DD)
 */
function dateSeed(dateStr: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function generateDailyMissions(dateKey: string): DailyMission[] {
  const seed = dateSeed(dateKey);
  const shuffled = [...MISSION_CATALOG].sort((a, b) => {
    const hashA = (dateSeed(a.id) ^ seed) >>> 0;
    const hashB = (dateSeed(b.id) ^ seed) >>> 0;
    return hashA - hashB;
  });

  return shuffled.slice(0, 3).map((item) => ({
    id: item.id,
    gameSlug: item.gameSlug,
    title: item.title,
    goal: item.goal,
    current: 0,
    xpReward: item.xpReward,
    completed: false,
  }));
}

export function reportMissionProgress(
  progress: ArcadePassProgress,
  gameSlug: string,
  progressValue: number
): ArcadePassProgress {
  let gainedXp = 0;
  const nextCompleted = [...progress.completedMissionIds];

  const nextMissions = progress.missions.map((m) => {
    if (m.gameSlug !== gameSlug || m.completed) return m;

    const nextCurrent = Math.max(m.current, progressValue);
    const isNowCompleted = nextCurrent >= m.goal;

    if (isNowCompleted && !m.completed) {
      gainedXp += m.xpReward;
      nextCompleted.push(m.id);
    }

    return {
      ...m,
      current: nextCurrent,
      completed: isNowCompleted,
    };
  });

  return {
    ...progress,
    xp: progress.xp + gainedXp,
    completedMissionIds: nextCompleted,
    missions: nextMissions,
  };
}

const STORAGE_KEY = "oiyo_arcade_pass_v1";

export function loadArcadePassProgress(dateKey: string): ArcadePassProgress {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      xp: 0,
      completedMissionIds: [],
      missions: generateDailyMissions(dateKey),
      lastActiveDate: dateKey,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: ArcadePassProgress = {
        xp: 0,
        completedMissionIds: [],
        missions: generateDailyMissions(dateKey),
        lastActiveDate: dateKey,
      };
      saveArcadePassProgress(initial);
      return initial;
    }

    const parsed = JSON.parse(raw) as ArcadePassProgress;
    if (parsed.lastActiveDate !== dateKey) {
      // New day roll
      const next: ArcadePassProgress = {
        xp: parsed.xp ?? 0,
        completedMissionIds: parsed.completedMissionIds ?? [],
        missions: generateDailyMissions(dateKey),
        lastActiveDate: dateKey,
        streakCount: parsed.streakCount ?? 0,
        lastCheckInDate: parsed.lastCheckInDate,
        claimedStreakDays: parsed.claimedStreakDays ?? [],
      };
      saveArcadePassProgress(next);
      return next;
    }
    return parsed;
  } catch {
    return {
      xp: 0,
      completedMissionIds: [],
      missions: generateDailyMissions(dateKey),
      lastActiveDate: dateKey,
    };
  }
}

export function saveArcadePassProgress(progress: ArcadePassProgress): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota
  }
}
