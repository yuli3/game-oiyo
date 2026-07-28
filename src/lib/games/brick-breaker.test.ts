import { describe, expect, it } from "vitest";
import {
  BRICK_BREAKER_CURVE,
  brickBreakerDifficulty,
  brickBreakerRecordExtra,
  comboAfterHit,
  levelFromBrickBreakerRecord,
} from "./brick-breaker";
import { frameScale } from "./time-contracts";

describe("Brick Breaker tuning contracts", () => {
  it("keeps the difficulty curve centralized, bounded, and escalating", () => {
    const first = brickBreakerDifficulty(1);
    const third = brickBreakerDifficulty(3);
    const late = brickBreakerDifficulty(99);

    expect(first.rows).toBe(BRICK_BREAKER_CURVE.rows.base);
    expect(third.ballSpeed).toBeGreaterThan(first.ballSpeed);
    expect(third.durableEvery).toBe(BRICK_BREAKER_CURVE.durability.everyNthBrick);
    expect(late.rows).toBe(BRICK_BREAKER_CURVE.rows.max);
    expect(late.ballSpeed).toBe(BRICK_BREAKER_CURVE.ballSpeed.max);
    expect(late.paddleWidth).toBe(BRICK_BREAKER_CURVE.paddleWidth.min);
  });

  it("gives 60 Hz and 120 Hz the same one-second travel", () => {
    const travel = (hz: number) => {
      let previous = 0;
      let distance = 0;
      for (let frame = 1; frame <= hz; frame += 1) {
        const now = (frame * 1_000) / hz;
        distance += 4 * frameScale(previous, now);
        previous = now;
      }
      return distance;
    };

    expect(travel(60)).toBeCloseTo(travel(120), 8);
  });

  it("resets stale combos and preserves compact level metadata in the existing best record", () => {
    expect(comboAfterHit(2, 1_000, 2_000)).toBe(3);
    expect(comboAfterHit(3, 1_000, 2_401)).toBe(1);
    expect(levelFromBrickBreakerRecord(brickBreakerRecordExtra(7))).toBe(7);
    expect(levelFromBrickBreakerRecord("legacy value")).toBe(1);
  });
});
