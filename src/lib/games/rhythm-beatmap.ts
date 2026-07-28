/**
 * Rhythm Tap beatmap contracts.
 *
 * The previous implementation spawned notes at `Math.random()` lanes on a
 * score-derived interval, so there was no beat to feel and nothing to learn.
 * Here the beat grid is the single source of truth: a chart is a list of
 * `{ beat, lane }`, note positions are derived from *time until arrival*, and
 * judgement is measured in milliseconds so the scroll speed can change without
 * silently widening or narrowing the timing windows.
 *
 * Audio is optional on purpose. The chart drives both the visuals and the
 * (synthesized) sound, so the game stays fully playable muted.
 */

export const RHYTHM_LANES = 4;

/** Timing windows, in milliseconds either side of the beat. */
export const PERFECT_MS = 45;
export const GOOD_MS = 95;

export type Judgement = "perfect" | "good" | "miss";

export interface BeatNote {
  /** Position on the beat grid. Beat 0 is the first beat of the chart. */
  beat: number;
  lane: number;
}

export interface RhythmChart {
  bpm: number;
  /** Silent lead-in before beat 0, giving the player time to read the field. */
  leadInBeats: number;
  notes: BeatNote[];
}

export interface RhythmLevel {
  bpm: number;
  /** Subdivisions per beat that may carry a note (1 = quarters, 2 = eighths). */
  density: number;
  /** How many distinct lanes the patterns use. */
  lanes: number;
  /** Seconds a note is visible before it reaches the hit line. */
  approachSeconds: number;
}

/**
 * Difficulty is data, not scattered constants, so it can be tuned and tested
 * without touching the loop. Same shape as `BRICK_BREAKER_CURVE`.
 */
export const RHYTHM_CURVE: readonly RhythmLevel[] = [
  { bpm: 96, density: 1, lanes: 2, approachSeconds: 2.0 },
  { bpm: 108, density: 1, lanes: 3, approachSeconds: 1.85 },
  { bpm: 120, density: 2, lanes: 3, approachSeconds: 1.7 },
  { bpm: 132, density: 2, lanes: 4, approachSeconds: 1.55 },
  { bpm: 144, density: 2, lanes: 4, approachSeconds: 1.4 },
] as const;

export function rhythmDifficulty(level: number): RhythmLevel {
  const index = Math.min(Math.max(Math.floor(level), 1), RHYTHM_CURVE.length) - 1;
  return RHYTHM_CURVE[index];
}

export function beatToSeconds(beat: number, bpm: number): number {
  return (beat * 60) / bpm;
}

export function secondsToBeat(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60;
}

/**
 * Repeating lane figures. Patterns are fixed rather than random so the player
 * can internalise them — that recognition is the mastery the game was missing.
 */
const PATTERNS: readonly (readonly number[])[] = [
  [0, 1, 2, 3],
  [0, 2, 1, 3],
  [0, 0, 3, 3],
  [1, 2, 1, 2],
  [3, 2, 1, 0],
  [0, 3, 1, 2],
] as const;

/**
 * Builds a chart deterministically from a level and a seed. The same seed
 * always yields the same chart, so a run can be replayed and a score compared.
 */
export function generateChart(level: number, seed: number, bars = 16): RhythmChart {
  const { bpm, density, lanes } = rhythmDifficulty(level);
  const notes: BeatNote[] = [];
  const beatsPerBar = 4;
  const step = 1 / density;

  for (let bar = 0; bar < bars; bar += 1) {
    const pattern = PATTERNS[(seed + bar) % PATTERNS.length];
    let slot = 0;
    for (let beat = 0; beat < beatsPerBar; beat += step) {
      // Off-beat slots stay sparse so the pulse remains audible in the visuals.
      const onBeat = Number.isInteger(beat);
      if (!onBeat && (seed + bar + slot) % 3 !== 0) {
        slot += 1;
        continue;
      }
      notes.push({
        beat: bar * beatsPerBar + beat,
        lane: pattern[slot % pattern.length] % lanes,
      });
      slot += 1;
    }
  }

  return { bpm, leadInBeats: 4, notes };
}

/**
 * Judgement is a function of time, not of pixels. A pixel window would mean a
 * different number of milliseconds at every scroll speed.
 */
export function judgeOffset(offsetMs: number): Judgement {
  const magnitude = Math.abs(offsetMs);
  if (magnitude <= PERFECT_MS) return "perfect";
  if (magnitude <= GOOD_MS) return "good";
  return "miss";
}

export function scoreForJudgement(judgement: Judgement, combo: number): number {
  if (judgement === "perfect") return 100 + combo * 5;
  if (judgement === "good") return 50 + combo * 2;
  return 0;
}

export function comboAfterJudgement(combo: number, judgement: Judgement): number {
  return judgement === "miss" ? 0 : combo + 1;
}

/**
 * Fraction of the approach travelled, 0 at spawn and 1 at the hit line.
 * Returns >1 once a note is past the line so the caller can retire it.
 */
export function noteProgress(
  noteSeconds: number,
  songSeconds: number,
  approachSeconds: number,
): number {
  return 1 - (noteSeconds - songSeconds) / approachSeconds;
}

/**
 * The note a lane press should resolve, or null when nothing is close enough.
 * Picking the nearest note (rather than the first) keeps dense charts fair.
 */
export function nearestNoteIndex(
  noteSecondsByIndex: readonly number[],
  songSeconds: number,
): number | null {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < noteSecondsByIndex.length; i += 1) {
    const distance = Math.abs(noteSecondsByIndex[i] - songSeconds);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  if (bestIndex < 0 || bestDistance * 1000 > GOOD_MS) return null;
  return bestIndex;
}

export function rhythmRecordExtra(level: number, maxCombo: number): string {
  return `L${Math.max(1, Math.floor(level))}C${Math.max(0, Math.floor(maxCombo))}`;
}

export function levelFromRhythmRecord(extra: string | undefined): number {
  const match = /^L(\d+)/.exec(extra ?? "");
  if (!match) return 1;
  return Math.min(Math.max(Number(match[1]), 1), RHYTHM_CURVE.length);
}
