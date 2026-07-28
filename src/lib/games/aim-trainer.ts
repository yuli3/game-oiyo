export type AimMode = "gridshot" | "flick" | "tracking" | "precision";
export type AimDifficulty = "easy" | "normal" | "hard" | "expert";

export const AIM_RANKS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master"] as const;
export type AimRank = (typeof AIM_RANKS)[number];

const NORMAL_RANK_BANDS: Record<AimMode, number[]> = {
  gridshot: [20, 32, 44, 56, 70],
  flick: [16, 26, 36, 46, 58],
  precision: [12, 20, 28, 36, 46],
  tracking: [40, 55, 68, 80, 90],
};

const DIFFICULTY_RANK_FACTOR: Record<AimDifficulty, number> = {
  easy: 1.15,
  normal: 1,
  hard: 0.85,
  expert: 0.7,
};

export function computeAimRank(mode: AimMode, difficulty: AimDifficulty, score: number): AimRank {
  const factor = DIFFICULTY_RANK_FACTOR[difficulty];
  const bands = NORMAL_RANK_BANDS[mode].map((value) => Math.round(value * factor));
  let index = 0;
  while (index < bands.length && score >= bands[index]) index++;
  return AIM_RANKS[index];
}

export function frameScale(deltaMs: number): number {
  return Math.max(0, Math.min(deltaMs, 50)) / (1000 / 60);
}

export function targetCenterRange(sizePx: number, fieldPx: number): [number, number] {
  if (fieldPx <= 0) return [8, 92];
  const radiusPercent = (sizePx / 2 / fieldPx) * 100;
  const edge = Math.min(50, Math.max(2, radiusPercent + 1));
  return [edge, 100 - edge];
}
