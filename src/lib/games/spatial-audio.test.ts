import { describe, it, expect } from "vitest";
import { calculatePanFromX, playSpatialTone } from "./spatial-audio";

describe("2D Stereo Spatial Audio Engine (Goal #9)", () => {
  it("calculates accurate stereo pan values from horizontal position", () => {
    const width = 400;

    // Center -> 0
    expect(calculatePanFromX(200, width)).toBe(0);

    // Hard left -> -1
    expect(calculatePanFromX(0, width)).toBe(-1);

    // Hard right -> +1
    expect(calculatePanFromX(400, width)).toBe(1);

    // Mid-left -> -0.5
    expect(calculatePanFromX(100, width)).toBe(-0.5);

    // Mid-right -> +0.5
    expect(calculatePanFromX(300, width)).toBe(0.5);
  });

  it("clamps out-of-bounds positions safely between -1 and +1", () => {
    const width = 360;
    expect(calculatePanFromX(-50, width)).toBe(-1);
    expect(calculatePanFromX(500, width)).toBe(1);
  });

  it("safely handles 0 width without divide-by-zero", () => {
    expect(calculatePanFromX(50, 0)).toBe(0);
  });

  it("gracefully returns false when AudioContext is null or suspended", () => {
    expect(playSpatialTone(null, 440)).toBe(false);
  });
});
