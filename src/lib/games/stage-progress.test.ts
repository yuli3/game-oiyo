import { describe, expect, it } from "vitest";
import { ENDLESS_STAGE_CAP, finaleLabel, isFinalStage, nextCappedStage, nextOpenStage } from "./stage-progress";
import { ANIMAL_STAGE_TARGETS } from "./animal-pop";
import { SHOTGUN_FLOORS } from "./shotgun-chess";

describe("stage range 10-50", () => {
  it("caps procedural level games at 50 and restarts after the finale", () => {
    expect(ENDLESS_STAGE_CAP).toBe(50);
    expect(nextCappedStage(1)).toBe(2);
    expect(nextCappedStage(49)).toBe(50);
    expect(isFinalStage(49)).toBe(false);
    expect(isFinalStage(50)).toBe(true);
    expect(nextCappedStage(50)).toBe(1);
    expect(finaleLabel("xx")).toBe(finaleLabel("en"));
  });

  it("picks the first open stage", () => {
    expect(nextOpenStage([], 10)).toBe(0);
    expect(nextOpenStage([0, 1, 3], 10)).toBe(2);
    expect(nextOpenStage([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 10)).toBe(9);
  });

  it("gives score-attack and floor games 10 to 50 stages", () => {
    expect(ANIMAL_STAGE_TARGETS.length).toBeGreaterThanOrEqual(10);
    expect([...ANIMAL_STAGE_TARGETS].sort((a, b) => a - b)).toEqual([...ANIMAL_STAGE_TARGETS]);
    expect(SHOTGUN_FLOORS).toBeGreaterThanOrEqual(10);
  });
});
