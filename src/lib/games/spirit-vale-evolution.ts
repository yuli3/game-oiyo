import { SPIRITS, type Spirit } from "./spirit-vale";

/* ────────────────────────────────────────────────────────────────────────────
 * Growth and evolution.
 *
 * A spirit has three stages. Rather than inventing 12 × 3 × 6 = 216 separate
 * proper nouns — which would be filler, and filler that six locales have to
 * carry — an evolved spirit keeps its name and gains a stage title. The
 * creature still visibly changes, because the body plan is procedural: the
 * stage feeds straight into `spirit-vale-forms` and the model grows horns,
 * bulk, and accents on its own.
 *
 * Experience is earned by winning, not by catching, so the collection and the
 * roster you actually fight with are two different investments.
 * ────────────────────────────────────────────────────────────────────────── */

export type Stage = 1 | 2 | 3;
export const MAX_STAGE: Stage = 3;

/** Cumulative experience needed to reach each stage. */
export const STAGE_THRESHOLDS: Record<Stage, number> = { 1: 0, 2: 60, 3: 180 };

/** Experience for winning a battle, scaled by the defeated spirit's strength. */
export function xpForWin(defeated: Spirit): number {
  return Math.round(defeated.attack + defeated.hp / 4);
}

export function stageOf(xp: number): Stage {
  if (xp >= STAGE_THRESHOLDS[3]) return 3;
  if (xp >= STAGE_THRESHOLDS[2]) return 2;
  return 1;
}

/** Experience still needed for the next stage, or null once fully grown. */
export function xpToNextStage(xp: number): number | null {
  const stage = stageOf(xp);
  if (stage === MAX_STAGE) return null;
  const next = (stage + 1) as Stage;
  return STAGE_THRESHOLDS[next] - xp;
}

/** Progress toward the next stage as 0..1, for a growth bar. */
export function stageProgress(xp: number): number {
  const stage = stageOf(xp);
  if (stage === MAX_STAGE) return 1;
  const from = STAGE_THRESHOLDS[stage];
  const to = STAGE_THRESHOLDS[(stage + 1) as Stage];
  return Math.min(1, Math.max(0, (xp - from) / (to - from)));
}

/**
 * Stats grow with stage. Multipliers are deliberately modest: a stage-3 spirit
 * should be clearly better than a fresh catch without making a well-matched
 * stage-1 pointless, because the 오행 matchup is supposed to stay the thing
 * that decides a fight.
 */
export const STAGE_STAT_MULTIPLIER: Record<Stage, number> = { 1: 1, 2: 1.25, 3: 1.55 };

export function grownStats(spirit: Spirit, stage: Stage): Pick<Spirit, "hp" | "attack" | "speed"> {
  const m = STAGE_STAT_MULTIPLIER[stage];
  return {
    hp: Math.round(spirit.hp * m),
    // Speed grows more slowly, so evolving never turns every matchup into a
    // race the evolved spirit automatically wins.
    attack: Math.round(spirit.attack * m),
    speed: Math.round(spirit.speed * (1 + (m - 1) * 0.5)),
  };
}

/** A spirit as it currently stands, with stage applied to its stats. */
export function grownSpirit(spirit: Spirit, stage: Stage): Spirit {
  return { ...spirit, ...grownStats(spirit, stage) };
}

export function spiritAtXp(id: string, xp: number): Spirit | null {
  const base = SPIRITS.find((s) => s.id === id);
  return base ? grownSpirit(base, stageOf(xp)) : null;
}
