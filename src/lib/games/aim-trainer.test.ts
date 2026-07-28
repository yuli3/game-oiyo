import { describe, expect, it } from "vitest";
import { computeAimRank, frameScale, targetCenterRange } from "./aim-trainer";

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
