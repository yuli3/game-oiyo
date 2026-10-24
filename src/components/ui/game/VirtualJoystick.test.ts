import { describe, it, expect } from "vitest";
import {
  calculateJoystickVector,
  snapVectorTo8Ways,
} from "./VirtualJoystick";

describe("VirtualJoystick Math & Logic Engine", () => {
  it("calculates zero vector when current position equals start position", () => {
    const vec = calculateJoystickVector({
      startX: 100,
      startY: 100,
      currentX: 100,
      currentY: 100,
      maxRadius: 60,
    });

    expect(vec.x).toBe(0);
    expect(vec.y).toBe(0);
    expect(vec.magnitude).toBe(0);
  });

  it("calculates normalized vector when within maxRadius", () => {
    const vec = calculateJoystickVector({
      startX: 100,
      startY: 100,
      currentX: 130,
      currentY: 100,
      maxRadius: 60,
      deadzone: 0,
    });

    expect(vec.x).toBeCloseTo(0.5);
    expect(vec.y).toBe(0);
    expect(vec.magnitude).toBeCloseTo(0.5);
  });

  it("clamps vector magnitude to 1.0 when dragged beyond maxRadius", () => {
    const vec = calculateJoystickVector({
      startX: 100,
      startY: 100,
      currentX: 200,
      currentY: 100,
      maxRadius: 60,
    });

    expect(vec.x).toBeCloseTo(1.0);
    expect(vec.y).toBe(0);
    expect(vec.magnitude).toBe(1.0);
    expect(vec.knobDistance).toBe(60);
  });

  it("snaps vector cleanly to 8 cardinal and diagonal directions", () => {
    // Right
    expect(snapVectorTo8Ways({ x: 0.9, y: 0.1, magnitude: 0.9, angle: 0, knobDistance: 50 })).toMatchObject({
      x: 1,
      y: 0,
    });

    // Down-Right Diagonal
    const diag = snapVectorTo8Ways({ x: 0.7, y: 0.7, magnitude: 1.0, angle: Math.PI / 4, knobDistance: 60 });
    expect(diag.x).toBeCloseTo(Math.SQRT1_2);
    expect(diag.y).toBeCloseTo(Math.SQRT1_2);

    // Deadzone yields zero
    expect(snapVectorTo8Ways({ x: 0.05, y: 0.05, magnitude: 0.08, angle: 0, knobDistance: 5 })).toMatchObject({
      x: 0,
      y: 0,
    });
  });
});
