/**
 * Kurodoko stages (stage range 2026-11-22): 30 fixed boards, ten each of 5×5, 6×6 and 7×7.
 * Each entry is a generator seed, picked once so the boards inside a size run from many clues
 * to few clues. The board is rebuilt from (difficulty, seed) the same way a save is restored.
 */
import type { KurodokoDifficulty } from "./kurodoko";

export const KURODOKO_STAGE_SLUG = "kurodoko";

const STAGE_SEEDS: readonly number[] = [
  0x8802e97f, 0xa71748f4, 0x3720f3bb, 0x571b810d, 0x17496229, 0xe53ddbe, 0x455fb285, 0x7c60121a, 0xcae0d15c, 0xf3b10759,
  0x3db1d8ab, 0xbe60e46c, 0x23f50a23, 0xe1170246, 0x875f8417, 0xca02a2f1, 0x911a5a9f, 0xe7daf53, 0x54da3820, 0xcd9fa776,
  0x841e3f0a, 0xadc6e299, 0x6c94acb, 0x4309652a, 0x8778518c, 0x3dd3aa40, 0xc15e5e69, 0xc4eb42ee, 0x8def6d07, 0x96da0db2,
];

export const KURODOKO_STAGE_COUNT = STAGE_SEEDS.length;

export function isKurodokoStageIndex(index: unknown): index is number {
  return Number.isInteger(index) && (index as number) >= 0 && (index as number) < KURODOKO_STAGE_COUNT;
}

export function kurodokoStage(index: number): { difficulty: KurodokoDifficulty; seed: number } {
  const i = Math.min(KURODOKO_STAGE_COUNT - 1, Math.max(0, Math.trunc(index)));
  const difficulty: KurodokoDifficulty = i < 10 ? "easy" : i < 20 ? "medium" : "hard";
  return { difficulty, seed: STAGE_SEEDS[i] };
}

/** The stage a restored free board came from, so a reload keeps the stage bar. Null for random boards. */
export function kurodokoStageForSeed(difficulty: KurodokoDifficulty, seed: number): number | null {
  const index = STAGE_SEEDS.indexOf(seed >>> 0);
  if (index < 0) return null;
  return kurodokoStage(index).difficulty === difficulty ? index : null;
}
