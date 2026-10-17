/**
 * Unit tests for Snake Canvas Rendering & VFX Engine
 * Date: 2026-10-17
 */

import { describe, expect, it } from "vitest";
import {
  calculateSwipeDirection,
  createDeathExplosion,
  createEatSparks,
  createSnakeRipple,
  interpolateSegment,
  interpolateSnake,
  updateSnakeParticles,
  updateSnakeRipples,
} from "./snake-canvas";

describe("snake-canvas engine", () => {
  it("interpolates single segments accurately", () => {
    const prev = { x: 5, y: 10 };
    const curr = { x: 6, y: 10 };

    expect(interpolateSegment(prev, curr, 0)).toEqual({ x: 5, y: 10 });
    expect(interpolateSegment(prev, curr, 0.5)).toEqual({ x: 5.5, y: 10 });
    expect(interpolateSegment(prev, curr, 1)).toEqual({ x: 6, y: 10 });
    // Out of bounds clamps
    expect(interpolateSegment(prev, curr, -0.2)).toEqual({ x: 5, y: 10 });
    expect(interpolateSegment(prev, curr, 1.5)).toEqual({ x: 6, y: 10 });
  });

  it("interpolates multi-segment snake smoothly", () => {
    const prevSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
    ];
    const currSnake = [
      { x: 10, y: 11 },
      { x: 10, y: 10 },
    ];

    const mid = interpolateSnake(prevSnake, currSnake, 0.5);
    expect(mid).toHaveLength(2);
    expect(mid[0]).toEqual({ x: 10, y: 10.5 });
    expect(mid[1]).toEqual({ x: 9.5, y: 10 });
  });

  it("handles snake growth gracefully during interpolation", () => {
    const prevSnake = [{ x: 10, y: 10 }];
    const currSnake = [
      { x: 11, y: 10 },
      { x: 10, y: 10 },
    ];

    const interpolated = interpolateSnake(prevSnake, currSnake, 0.5);
    expect(interpolated).toHaveLength(2);
    expect(interpolated[0]).toEqual({ x: 10.5, y: 10 });
    // Tail segment expands smoothly from prior tail position
    expect(interpolated[1]).toEqual({ x: 10, y: 10 });
  });

  it("creates and decays eat sparks with drag and alpha fading", () => {
    const sparks = createEatSparks(100, 200, "#38bdf8", 10);
    expect(sparks).toHaveLength(10);
    expect(sparks[0].x).toBe(100);
    expect(sparks[0].y).toBe(200);
    expect(sparks[0].alpha).toBe(1);

    const after50ms = updateSnakeParticles(sparks, 50);
    expect(after50ms).toHaveLength(10);
    expect(after50ms[0].life).toBeLessThan(sparks[0].maxLife);
    expect(after50ms[0].alpha).toBeLessThan(1);

    // After large time, particles expire
    const expired = updateSnakeParticles(after50ms, 2000);
    expect(expired).toHaveLength(0);
  });

  it("creates death explosion fragments", () => {
    const fragments = createDeathExplosion(50, 50, 20);
    expect(fragments).toHaveLength(20);
    expect(fragments[0].size).toBeGreaterThan(0);
  });

  it("grows and fades shockwave ripples", () => {
    const ripple = createSnakeRipple(100, 100, "#38bdf8", 50);
    expect(ripple.radius).toBe(4);
    expect(ripple.alpha).toBeCloseTo(0.85);

    const updated = updateSnakeRipples([ripple], 100);
    expect(updated).toHaveLength(1);
    expect(updated[0].radius).toBeGreaterThan(4);
    expect(updated[0].alpha).toBeLessThan(0.85);

    // After expanding past maxRadius, it drops out
    const done = updateSnakeRipples(updated, 2000);
    expect(done).toHaveLength(0);
  });

  it("detects swipe directions accurately and ignores micro-drifts", () => {
    // Micro drift < 24px
    expect(calculateSwipeDirection(10, 10, 20, 20, 24)).toBeNull();

    // Swipe right
    expect(calculateSwipeDirection(10, 10, 60, 15)).toEqual({ x: 1, y: 0 });
    // Swipe left
    expect(calculateSwipeDirection(60, 10, 10, 15)).toEqual({ x: -1, y: 0 });
    // Swipe down
    expect(calculateSwipeDirection(10, 10, 15, 60)).toEqual({ x: 0, y: 1 });
    // Swipe up
    expect(calculateSwipeDirection(10, 60, 15, 10)).toEqual({ x: 0, y: -1 });
  });
});
