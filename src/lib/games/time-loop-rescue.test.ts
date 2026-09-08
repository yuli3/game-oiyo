import { describe, expect, it } from "vitest";
import {
  advanceTimeLoop,
  createTimeLoopMission,
  isTimeLoopPlateHeld,
  timeLoopFingerprint,
  type TimeLoopInput,
  type TimeLoopMission,
} from "./time-loop-rescue";

const input = (x: -1 | 0 | 1, y: -1 | 0 | 1): TimeLoopInput => ({ x, y });
const tick = (mission: TimeLoopMission, value: TimeLoopInput, count = 1) => {
  let current = mission;
  for (let index = 0; index < count; index += 1) {
    current = advanceTimeLoop(current, { type: "tick", input: value });
  }
  return current;
};

describe("time-loop rescue", () => {
  it("does not create an empty echo", () => {
    const mission = createTimeLoopMission();
    expect(advanceTimeLoop(mission, { type: "commit-loop" })).toBe(mission);
  });

  it("replays the same inputs to the same fingerprint", () => {
    const run = () => {
      let mission = createTimeLoopMission();
      mission = tick(mission, input(1, 0), 12);
      mission = tick(mission, input(0, -1), 25);
      mission = tick(mission, input(0, 0), 12);
      mission = advanceTimeLoop(mission, { type: "commit-loop" });
      mission = tick(mission, input(1, 0), 40);
      return timeLoopFingerprint(mission);
    };
    expect(run()).toBe(run());
  });

  it("lets a recorded ghost hold the plate in the next loop", () => {
    let mission = createTimeLoopMission();
    mission = tick(mission, input(1, 0), 12);
    mission = tick(mission, input(0, -1), 25);
    mission = advanceTimeLoop(mission, { type: "commit-loop" });
    mission = tick(mission, input(0, 0), 37);
    expect(isTimeLoopPlateHeld(mission)).toBe(true);
  });

  it("blocks the player at the closed isolation door", () => {
    let mission = createTimeLoopMission();
    mission = tick(mission, input(1, 0), 100);
    expect(mission.player.x).toBeLessThan(468_000);
  });

  it("can rescue and extract on the second loop", () => {
    let mission = createTimeLoopMission();
    mission = tick(mission, input(1, 0), 12);
    mission = tick(mission, input(0, -1), 25);
    mission = tick(mission, input(0, 0), 100);
    mission = advanceTimeLoop(mission, { type: "commit-loop" });
    mission = tick(mission, input(1, 0), 112);
    mission = tick(mission, input(0, 1), 34);
    mission = tick(mission, input(1, 1), 24);
    expect(mission.phase).toBe("rescued");
    expect(mission.loop).toBe(2);
  });
});
