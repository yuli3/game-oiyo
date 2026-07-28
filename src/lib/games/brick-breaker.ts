export type BrickBreakerDifficulty = {
  rows: number;
  ballSpeed: number;
  paddleWidth: number;
  durableEvery: number;
};

/**
 * Brick Breaker's single tuning surface. Challenge rises on two readable axes:
 * ball speed and brick durability/density. Keep caps here so late levels stay fair.
 */
export const BRICK_BREAKER_CURVE = {
  rows: { base: 4, perLevel: 1, max: 7 },
  ballSpeed: { base: 3.95, perLevel: 0.28, max: 6.75 },
  paddleWidth: { base: 64, perLevel: -2, min: 48 },
  durability: { startsAtLevel: 3, everyNthBrick: 5, maxHits: 2 },
  comboWindowMs: 1_400,
} as const;

export function brickBreakerDifficulty(level: number): BrickBreakerDifficulty {
  const safeLevel = Math.max(1, Math.floor(level));
  return {
    rows: Math.min(
      BRICK_BREAKER_CURVE.rows.max,
      BRICK_BREAKER_CURVE.rows.base + (safeLevel - 1) * BRICK_BREAKER_CURVE.rows.perLevel,
    ),
    ballSpeed: Math.min(
      BRICK_BREAKER_CURVE.ballSpeed.max,
      BRICK_BREAKER_CURVE.ballSpeed.base + (safeLevel - 1) * BRICK_BREAKER_CURVE.ballSpeed.perLevel,
    ),
    paddleWidth: Math.max(
      BRICK_BREAKER_CURVE.paddleWidth.min,
      BRICK_BREAKER_CURVE.paddleWidth.base + (safeLevel - 1) * BRICK_BREAKER_CURVE.paddleWidth.perLevel,
    ),
    durableEvery: safeLevel >= BRICK_BREAKER_CURVE.durability.startsAtLevel
      ? BRICK_BREAKER_CURVE.durability.everyNthBrick
      : 0,
  };
}

export function comboAfterHit(previousCombo: number, previousHitAt: number, now: number): number {
  return now - previousHitAt <= BRICK_BREAKER_CURVE.comboWindowMs ? previousCombo + 1 : 1;
}

export function brickBreakerRecordExtra(level: number): string {
  return `level:${Math.max(1, Math.floor(level))}`;
}

export function levelFromBrickBreakerRecord(extra?: string): number {
  const match = /^level:(\d+)$/.exec(extra ?? "");
  return match ? Math.max(1, Number(match[1])) : 1;
}
