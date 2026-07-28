import { describe, expect, it } from "vitest";
import {
  MAX_SPATIAL_LEVEL,
  SPATIAL_MEMORY_CURVE,
  generateSequence,
  judgeStep,
  keyboardOrder,
  levelFromSpatialRecord,
  markerPositions,
  nextLevel,
  playbackMilliseconds,
  scoreForRound,
  spatialDifficulty,
  spatialRecordExtra,
} from "./spatial-memory";

describe("Spatial Memory contracts", () => {
  it("keeps the difficulty curve centralized, bounded, and escalating", () => {
    const first = spatialDifficulty(1);
    const last = spatialDifficulty(MAX_SPATIAL_LEVEL);
    expect(last.markers).toBeGreaterThan(first.markers);
    expect(last.sequence).toBeGreaterThan(first.sequence);
    expect(last.showMs).toBeLessThan(first.showMs);
    expect(last.spread).toBeGreaterThan(first.spread);
    expect(spatialDifficulty(0)).toEqual(first);
    expect(spatialDifficulty(99)).toEqual(last);
  });

  it("spaces markers evenly and never stacks two on top of each other", () => {
    for (let level = 1; level <= MAX_SPATIAL_LEVEL; level += 1) {
      const positions = markerPositions(level);
      expect(positions).toHaveLength(spatialDifficulty(level).markers);
      for (let i = 0; i < positions.length; i += 1) {
        for (let j = i + 1; j < positions.length; j += 1) {
          const a = positions[i];
          const b = positions[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          // Two markers closer than this would be an ambiguous click target.
          expect(distance, `level ${level}: markers ${i} and ${j} overlap`).toBeGreaterThan(0.9);
        }
      }
    }
  });

  it("uses the depth axis — otherwise the game did not need to be 3D", () => {
    // At full spread the markers must genuinely wrap behind the player, or the
    // whole premise (rotate to recall) collapses into a flat memory game.
    const positions = markerPositions(MAX_SPATIAL_LEVEL);
    expect(positions.some((p) => p.z > 1)).toBe(true);
    expect(positions.some((p) => p.z < -1)).toBe(true);
  });

  it("generates the same sequence for the same seed, and a different one otherwise", () => {
    const a = generateSequence(3, 42);
    expect(generateSequence(3, 42)).toEqual(a);
    expect(generateSequence(3, 43)).not.toEqual(a);
    expect(a).toHaveLength(spatialDifficulty(3).sequence);
  });

  it("never repeats a marker back to back — a double flash is unreadable", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const sequence = generateSequence(MAX_SPATIAL_LEVEL, seed);
      for (let i = 1; i < sequence.length; i += 1) {
        expect(sequence[i]).not.toBe(sequence[i - 1]);
      }
      for (const index of sequence) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(spatialDifficulty(MAX_SPATIAL_LEVEL).markers);
      }
    }
  });

  it("judges a selection against the expected step", () => {
    const sequence = [2, 5, 1];
    expect(judgeStep(sequence, 0, 2)).toBe("correct");
    expect(judgeStep(sequence, 0, 3)).toBe("wrong");
    expect(judgeStep(sequence, 1, 5)).toBe("correct");
    expect(judgeStep(sequence, 2, 1)).toBe("complete");
    expect(judgeStep(sequence, 2, 4)).toBe("wrong");
  });

  it("rewards longer sequences disproportionately", () => {
    const early = scoreForRound(1, 0);
    const late = scoreForRound(MAX_SPATIAL_LEVEL, 0);
    expect(late).toBeGreaterThan(early * 3);
    expect(scoreForRound(2, 5)).toBeGreaterThan(scoreForRound(2, 0));
    expect(playbackMilliseconds(1)).toBeGreaterThan(0);
  });

  it("advances only on a cleared round and clamps at the top", () => {
    expect(nextLevel(2, true)).toBe(3);
    expect(nextLevel(2, false)).toBe(2);
    expect(nextLevel(MAX_SPATIAL_LEVEL, true)).toBe(MAX_SPATIAL_LEVEL);
    expect(nextLevel(0, false)).toBe(1);
  });

  it("round-trips the level through the saved record", () => {
    expect(levelFromSpatialRecord(spatialRecordExtra(4, 9))).toBe(4);
    expect(levelFromSpatialRecord(undefined)).toBe(1);
    expect(levelFromSpatialRecord("nonsense")).toBe(1);
    expect(levelFromSpatialRecord(spatialRecordExtra(99, 0))).toBe(MAX_SPATIAL_LEVEL);
  });

  it("exposes every marker in a stable keyboard order", () => {
    for (let level = 1; level <= MAX_SPATIAL_LEVEL; level += 1) {
      const order = keyboardOrder(level);
      const { markers } = spatialDifficulty(level);
      // Every marker reachable exactly once, or the game cannot be finished
      // without a mouse.
      expect([...order].sort((a, b) => a - b)).toEqual(
        Array.from({ length: markers }, (_, i) => i),
      );
      expect(keyboardOrder(level)).toEqual(order);
    }
  });

  it("keeps the curve length and the exported maximum in sync", () => {
    expect(MAX_SPATIAL_LEVEL).toBe(SPATIAL_MEMORY_CURVE.length);
  });
});
