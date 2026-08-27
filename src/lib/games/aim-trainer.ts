export type AimMode = "gridshot" | "flick" | "tracking" | "precision" | "recovery";
export type AimDifficulty = "easy" | "normal" | "hard" | "expert";

export const AIM_RANKS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master"] as const;
export type AimRank = (typeof AIM_RANKS)[number];

const NORMAL_RANK_BANDS: Record<AimMode, number[]> = {
  gridshot: [20, 32, 44, 56, 70],
  flick: [16, 26, 36, 46, 58],
  precision: [12, 20, 28, 36, 46],
  tracking: [40, 55, 68, 80, 90],
  recovery: [12, 20, 28, 36, 46],
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

export interface PlacedTarget {
  x: number; // % of field width (center)
  y: number; // % of field height (center)
  size: number; // px diameter
}

/**
 * Picks a spawn point for a new target, retrying a few times to avoid
 * overlapping already-placed targets. Field-size and randomness are
 * parameters rather than DOM/Math.random reads, so the placement rule
 * itself is testable without a rendered field.
 */
export function placeTarget(
  size: number,
  occupied: readonly PlacedTarget[],
  fieldWidth: number,
  fieldHeight: number,
  random: () => number = Math.random,
): PlacedTarget {
  const [minX, maxX] = targetCenterRange(size, fieldWidth);
  const [minY, maxY] = targetCenterRange(size, fieldHeight);
  let candidate: PlacedTarget = { x: minX, y: minY, size };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    candidate = {
      x: minX + random() * (maxX - minX),
      y: minY + random() * (maxY - minY),
      size,
    };
    const overlaps = occupied.some((other) => {
      const dx = ((candidate.x - other.x) / 100) * fieldWidth;
      const dy = ((candidate.y - other.y) / 100) * fieldHeight;
      return Math.hypot(dx, dy) < (candidate.size + other.size) / 2 + 6;
    });
    if (!overlaps) return candidate;
  }
  return candidate; // no overlap-free spot found in 12 tries — best effort
}

export interface TrackingTargetState {
  x: number;
  y: number;
  vx: number; // unit-ish direction vector, renormalized every step
  vy: number;
  size: number;
}

/**
 * One physics step for the Tracking mode's moving target: advance by
 * `speed`, bounce off the field edges (with a small random deflection so
 * the path doesn't loop predictably), and renormalize velocity so it can't
 * run away after repeated bounces.
 */
export function stepTrackingTarget(
  state: TrackingTargetState,
  speed: number,
  fieldWidth: number,
  fieldHeight: number,
  random: () => number = Math.random,
): TrackingTargetState {
  const [minX, maxX] = targetCenterRange(state.size, fieldWidth);
  const [minY, maxY] = targetCenterRange(state.size, fieldHeight);
  let { x, y, vx, vy } = state;
  x += vx * speed;
  y += vy * speed;
  if (x < minX || x > maxX) {
    vx *= -1;
    x = Math.max(minX, Math.min(maxX, x));
    vy += (random() - 0.5) * 0.4;
  }
  if (y < minY || y > maxY) {
    vy *= -1;
    y = Math.max(minY, Math.min(maxY, y));
    vx += (random() - 0.5) * 0.4;
  }
  const magnitude = Math.hypot(vx, vy) || 1;
  vx /= magnitude;
  vy /= magnitude;
  return { x, y, vx, vy, size: state.size };
}

/** Whether the pointer (in field-relative pixels) currently sits on the tracking target. */
export function isPointerOnTrackingTarget(
  pointerXPx: number,
  pointerYPx: number,
  pointerInside: boolean,
  target: Pick<TrackingTargetState, "x" | "y" | "size">,
  fieldWidth: number,
  fieldHeight: number,
): boolean {
  if (!pointerInside) return false;
  const targetXPx = (target.x / 100) * fieldWidth;
  const targetYPx = (target.y / 100) * fieldHeight;
  const distance = Math.hypot(pointerXPx - targetXPx, pointerYPx - targetYPx);
  return distance <= target.size / 2;
}

/**
 * Reaction-time spread as a 0-100 "steadiness" score: a tighter distribution
 * of reaction times around the average scores higher, even at the same
 * average speed. A single sample has nothing to compare against, so it
 * scores full consistency rather than a fabricated penalty.
 */
export function computeConsistency(reactions: readonly number[]): number {
  if (reactions.length === 0) return 0;
  const avg = reactions.reduce((sum, value) => sum + value, 0) / reactions.length;
  if (avg <= 0) return 0;
  const stdev = reactions.length > 1
    ? Math.sqrt(reactions.reduce((sum, value) => sum + (value - avg) ** 2, 0) / reactions.length)
    : 0;
  return Math.max(0, Math.round(100 - (stdev / avg) * 100));
}
