import { describe, expect, it } from "vitest";
import {
  createGhostEnvelope,
  isGhostEnvelope,
  isBetterGhostScore,
  recordGhostPB,
  loadGhostPB,
  clearGhostPB,
  sampleGhostPose,
  type GhostFrame,
  type GhostStorageLike,
} from "./ghost-replay";

class MemoryStorage implements GhostStorageLike {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

interface Pos2D {
  x: number;
  y: number;
}

describe("ghost-replay trajectory & PB engine", () => {
  it("creates and validates well-formed ghost envelopes", () => {
    const frames: GhostFrame<Pos2D>[] = [
      { tick: 0, pose: { x: 0, y: 100 } },
      { tick: 10, pose: { x: 50, y: 120 } },
      { tick: 20, pose: { x: 100, y: 140 } },
    ];

    const env = createGhostEnvelope({
      game: "neon-survivor",
      score: 12500,
      durationMs: 35000,
      frames,
    });

    expect(env.version).toBe(1);
    expect(env.sampleIntervalTicks).toBe(5);
    expect(isGhostEnvelope(env)).toBe(true);
    expect(isGhostEnvelope(env, "neon-survivor")).toBe(true);
    expect(isGhostEnvelope(env, "other-game")).toBe(false);

    // Reject non-monotonic ticks
    const invalidFrames: GhostFrame<Pos2D>[] = [
      { tick: 10, pose: { x: 0, y: 0 } },
      { tick: 5, pose: { x: 1, y: 1 } },
    ];
    const invalidEnv = { ...env, frames: invalidFrames };
    expect(isGhostEnvelope(invalidEnv)).toBe(false);
  });

  it("evaluates better score for both higher-better and lower-better regimes", () => {
    expect(isBetterGhostScore(150, 100, "higher-better")).toBe(true);
    expect(isBetterGhostScore(90, 100, "higher-better")).toBe(false);
    expect(isBetterGhostScore(100, 100, "higher-better")).toBe(false);
    expect(isBetterGhostScore(100, null, "higher-better")).toBe(true);

    // Lower-better (e.g. speedrun / time-attack seconds)
    expect(isBetterGhostScore(45, 60, "lower-better")).toBe(true);
    expect(isBetterGhostScore(70, 60, "lower-better")).toBe(false);
  });

  it("records and updates personal bests in storage", () => {
    const storage = new MemoryStorage();
    const frame = { tick: 0, pose: { x: 0, y: 0 } };

    const firstRun = createGhostEnvelope({
      game: "brick-breaker",
      score: 5000,
      durationMs: 60000,
      frames: [frame],
    });

    const res1 = recordGhostPB(firstRun, "higher-better", storage);
    expect(res1.isNewPB).toBe(true);
    expect(res1.pb.score).toBe(5000);

    // Worse run: not PB
    const worseRun = createGhostEnvelope({
      game: "brick-breaker",
      score: 4200,
      durationMs: 50000,
      frames: [frame],
    });
    const res2 = recordGhostPB(worseRun, "higher-better", storage);
    expect(res2.isNewPB).toBe(false);
    expect(res2.pb.score).toBe(5000);

    // Better run: new PB
    const betterRun = createGhostEnvelope({
      game: "brick-breaker",
      score: 9500,
      durationMs: 90000,
      frames: [frame],
    });
    const res3 = recordGhostPB(betterRun, "higher-better", storage);
    expect(res3.isNewPB).toBe(true);
    expect(res3.pb.score).toBe(9500);

    // Verify persistence
    const loaded = loadGhostPB<Pos2D>("brick-breaker", storage);
    expect(loaded?.score).toBe(9500);

    // Clear PB
    clearGhostPB("brick-breaker", storage);
    expect(loadGhostPB("brick-breaker", storage)).toBeNull();
  });

  describe("sampleGhostPose", () => {
    const frames: GhostFrame<Pos2D>[] = [
      { tick: 10, pose: { x: 100, y: 200 } },
      { tick: 20, pose: { x: 200, y: 400 } },
      { tick: 30, pose: { x: 300, y: 600 } },
    ];

    it("returns null for empty trajectory", () => {
      expect(sampleGhostPose([], 15)).toBeNull();
    });

    it("clamps boundaries before first frame and after last frame", () => {
      expect(sampleGhostPose(frames, 0)).toEqual({ x: 100, y: 200 });
      expect(sampleGhostPose(frames, 50)).toEqual({ x: 300, y: 600 });
    });

    it("matches exact keyframes", () => {
      expect(sampleGhostPose(frames, 20)).toEqual({ x: 200, y: 400 });
    });

    it("smoothly interpolates between frames when lerp provided", () => {
      const lerp = (a: Pos2D, b: Pos2D, t: number): Pos2D => ({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      });

      // Halfway between tick 10 and tick 20 (tick 15)
      const sampled = sampleGhostPose(frames, 15, lerp);
      expect(sampled).toEqual({ x: 150, y: 300 });

      // 80% between tick 20 and 30 (tick 28)
      const sampled80 = sampleGhostPose(frames, 28, lerp);
      expect(sampled80).toEqual({ x: 280, y: 560 });
    });
  });
});
