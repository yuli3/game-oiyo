import { describe, expect, it } from "vitest";
import {
  advanceTimeLoop,
  createTimeLoopMission,
  isTimeLoopPlateHeld,
  timeLoopFingerprint,
  timeLoopGhosts,
  TIME_LOOP_ROOM,
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
    mission = tick(mission, input(0, 1), 20);
    mission = tick(mission, input(1, 1), 24);
    expect(mission.phase).toBe("rescued");
    expect(mission.loop).toBe(2);
  });
  it.each([-1, 1] as const)("cannot bypass the divider above or below (%s)", (y) => {
    let mission = tick(createTimeLoopMission(), input(0, y), 60);
    mission = tick(mission, input(1, 0), 150);
    expect(mission.player.x).toBeLessThan(TIME_LOOP_ROOM.door.x);
    expect(mission.carrying).toBe(false);
  });

  it("replays the actual collision-resolved route and holds its last position", () => {
    const original = tick(createTimeLoopMission(), input(1, 0), 100);
    const committed = advanceTimeLoop(original, {type:"commit-loop"});
    expect(timeLoopGhosts(committed)[0]).toEqual(TIME_LOOP_ROOM.start);
    const replayed = tick(committed, input(0, 0), 130);
    expect(timeLoopGhosts(replayed)[0]).toEqual(original.player);
  });

  it("requires entering the visible exit rectangle", () => {
    const mission: TimeLoopMission = {...createTimeLoopMission(), carrying:true, player:{x:940_000,y:520_000}};
    expect(tick(mission,input(0,0)).phase).toBe("playing");
  });

  it("ends after the third loop and ignores further ticks", () => {
    const mission = tick(createTimeLoopMission(), input(0,0), 1800);
    expect(mission.phase).toBe("failed");
    expect(mission.loop).toBe(3);
    expect(tick(mission,input(1,0))).toBe(mission);
  });

  it("keeps the divider solid outside the opening even when the switch is held", () => {
    const mission: TimeLoopMission = {...createTimeLoopMission(), tick:1,
      player:{x:450_000,y:120_000}, recordings:[[TIME_LOOP_ROOM.plate]]};
    expect(isTimeLoopPlateHeld(mission)).toBe(true);
    expect(tick(mission,input(1,0),20).player.x).toBeLessThan(TIME_LOOP_ROOM.door.x);
  });

  it("slides along the doorway edge without entering the upper wall", () => {
    const mission: TimeLoopMission = {...createTimeLoopMission(), tick:1,
      player:{x:480_000,y:223_000}, recordings:[[TIME_LOOP_ROOM.plate]]};
    const next=tick(mission,input(0,-1),10);
    expect(next.player.y).toBe(222_000);
    expect(next.player.x).toBe(480_000);
  });

  it("ejects a player from the doorway when the switch is released", () => {
    const mission: TimeLoopMission = {...createTimeLoopMission(),player:{x:480_000,y:270_000}};
    const next=tick(mission,input(0,0));
    expect(next.player.x).toBe(509_000);
  });

});
