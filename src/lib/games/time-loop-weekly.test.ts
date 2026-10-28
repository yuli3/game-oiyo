import { describe, expect, it } from "vitest";
import { verifyReplayEnvelope } from "./replay";
import { advanceTimeLoop, createTimeLoopMission, type TimeLoopInput } from "./time-loop-rescue";
import {
  TIME_LOOP_WEEKLY_BADGE_KEY,
  acceptTimeLoopShare,
  createTimeLoopWeeklyEnvelope,
  encodeTimeLoopShare,
  replayTimeLoop,
  timeLoopRivalTrack,
  timeLoopWeekSeed,
  writeTimeLoopWeeklyBadge,
} from "./time-loop-weekly";

const RIGHT: TimeLoopInput = { x: 1, y: 0 };

describe("time loop weekly share", () => {
  it("uses the Monday of the KST week as the seed", () => {
    expect(timeLoopWeekSeed(new Date("2026-10-28T15:00:00.000Z"))).toBe(timeLoopWeekSeed(new Date("2026-10-25T15:00:00.000Z")));
    expect(timeLoopWeekSeed(new Date("2026-10-25T14:59:00.000Z"))).not.toBe(timeLoopWeekSeed(new Date("2026-10-25T15:00:00.000Z")));
  });

  it("rejects a forged hash and keeps the badge off the record keys", () => {
    let mission = createTimeLoopMission();
    const log = [0, 1, 2].map((tick) => {
      mission = advanceTimeLoop(mission, { type: "tick", input: RIGHT });
      return { tick, input: RIGHT };
    });
    const envelope = createTimeLoopWeeklyEnvelope(log, mission, 20_000, "2026-10-28T00:00:00.000Z");
    expect(verifyReplayEnvelope(envelope, replayTimeLoop)).toBe(true);
    const forged = { ...envelope, finalHash: "00000000" };
    expect(verifyReplayEnvelope(forged, replayTimeLoop)).toBe(false);
    expect(acceptTimeLoopShare(encodeTimeLoopShare(envelope))?.finalHash).toBe(envelope.finalHash);
    expect(acceptTimeLoopShare(encodeTimeLoopShare(forged))).toBeNull();
    expect(timeLoopRivalTrack(envelope)).toHaveLength(3);
    expect(TIME_LOOP_WEEKLY_BADGE_KEY).not.toContain("game-records");
    expect(TIME_LOOP_WEEKLY_BADGE_KEY).not.toContain("game-replay");
    const stored = new Map<string, string>();
    const storage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => { stored.set(key, value); },
    } as unknown as Storage;
    expect(writeTimeLoopWeeklyBadge(storage, { seed: envelope.seed, loops: 1, tick: 3, at: envelope.achievedAt })).toBe(true);
    expect([...stored.keys()]).toEqual([TIME_LOOP_WEEKLY_BADGE_KEY]);
  });
});
