import { describe, expect, it } from "vitest";
import {
  computeAimRank,
  computeConsistency,
  frameScale,
  isPointerOnTrackingTarget,
  placeTarget,
  stepTrackingTarget,
  targetCenterRange,
  type PlacedTarget,
  type TrackingTargetState,
} from "./aim-trainer";

describe("aim trainer fairness helpers", () => {
  it("normalizes animation work to elapsed time instead of display refresh rate", () => {
    expect(frameScale(1000 / 60)).toBeCloseTo(1, 5);
    expect(frameScale(1000 / 120)).toBeCloseTo(0.5, 5);
    expect(frameScale(1000 / 144)).toBeCloseTo(60 / 144, 5);
    expect(frameScale(500)).toBe(3);
  });

  it("uses difficulty-aware rank bands", () => {
    expect(computeAimRank("gridshot", "easy", 20)).toBe("Bronze");
    expect(computeAimRank("gridshot", "normal", 20)).toBe("Silver");
    expect(computeAimRank("gridshot", "expert", 20)).toBe("Silver");
  });

  it("keeps the full target inside the play field", () => {
    expect(targetCenterRange(80, 400)).toEqual([11, 89]);
    expect(targetCenterRange(40, 400)).toEqual([6, 94]);
  });
});

describe("aim trainer target placement", () => {
  it("keeps a lone target inside the field bounds", () => {
    const target = placeTarget(60, [], 500, 400, () => 0.5);
    const [minX, maxX] = targetCenterRange(60, 500);
    const [minY, maxY] = targetCenterRange(60, 400);
    expect(target.x).toBeGreaterThanOrEqual(minX);
    expect(target.x).toBeLessThanOrEqual(maxX);
    expect(target.y).toBeGreaterThanOrEqual(minY);
    expect(target.y).toBeLessThanOrEqual(maxY);
  });

  it("avoids stacking a new target on top of an occupied one when room allows it", () => {
    const occupied: PlacedTarget[] = [{ x: 50, y: 50, size: 60 }];
    // A sequence of randoms that would land the first attempt dead-center on the
    // occupied target, then walk away on later attempts.
    const sequence = [0.5, 0.5, 0.1, 0.1, 0.9, 0.9];
    let index = 0;
    const random = () => sequence[Math.min(index++, sequence.length - 1)];
    const target = placeTarget(60, occupied, 500, 400, random);
    const dx = ((target.x - 50) / 100) * 500;
    const dy = ((target.y - 50) / 100) * 400;
    expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(60); // (60+60)/2 = 60 minimum center distance
  });

  it("still returns a placement after exhausting overlap-avoidance attempts", () => {
    const occupied: PlacedTarget[] = [{ x: 50, y: 50, size: 400 }]; // deliberately huge, unavoidable
    const target = placeTarget(60, occupied, 500, 400, () => 0.5);
    expect(target).toMatchObject({ size: 60 });
  });
});

describe("aim trainer tracking physics", () => {
  it("advances the target by speed and keeps velocity normalized", () => {
    const state: TrackingTargetState = { x: 50, y: 50, vx: 1, vy: 0, size: 74 };
    const next = stepTrackingTarget(state, 2, 500, 400, () => 0.5);
    expect(next.x).toBeCloseTo(52, 5);
    expect(Math.hypot(next.vx, next.vy)).toBeCloseTo(1, 5);
  });

  it("bounces off the field edge instead of leaving it", () => {
    const [, maxX] = targetCenterRange(74, 500);
    const state: TrackingTargetState = { x: maxX - 0.5, y: 50, vx: 1, vy: 0, size: 74 };
    const next = stepTrackingTarget(state, 5, 500, 400, () => 0.5);
    expect(next.x).toBeLessThanOrEqual(maxX);
    expect(next.vx).toBeLessThan(0); // reflected
  });

  it("reports on-target only when the pointer is inside the field and within radius", () => {
    const target = { x: 50, y: 50, size: 40 };
    expect(isPointerOnTrackingTarget(250, 200, true, target, 500, 400)).toBe(true); // dead center
    expect(isPointerOnTrackingTarget(250, 200, false, target, 500, 400)).toBe(false); // pointer left the field
    expect(isPointerOnTrackingTarget(0, 0, true, target, 500, 400)).toBe(false); // far corner
  });
});

describe("aim trainer consistency scoring", () => {
  it("scores a single sample as fully consistent rather than fabricating a spread", () => {
    expect(computeConsistency([200])).toBe(100);
  });

  it("scores identical reaction times as perfectly consistent", () => {
    expect(computeConsistency([180, 180, 180])).toBe(100);
  });

  it("penalizes a wide spread of reaction times more than a tight one", () => {
    const tight = computeConsistency([180, 190, 185, 195]);
    const wide = computeConsistency([50, 400, 100, 350]);
    expect(tight).toBeGreaterThan(wide);
  });

  it("returns 0 for no data", () => {
    expect(computeConsistency([])).toBe(0);
  });
});
