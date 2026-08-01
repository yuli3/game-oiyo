import { describe, expect, it } from "vitest";
import {
  CAVE_GAP, CAVE_HEIGHT, CAVE_SHIP_RADIUS, CAVE_SHIP_X, CAVE_WALL_WIDTH,
  createCaveDash, flapCaveDash, stepCaveDash, type CaveDashState,
} from "./cave-dash";

describe("Cave Dash deterministic physics", () => {
  it("replays the same seed and flap sequence byte-for-byte", () => {
    const run = () => {
      let state = createCaveDash(42);
      for (let frame = 0; frame < 180 && state.status === "playing"; frame += 1) {
        if (frame % 18 === 0) state = flapCaveDash(state);
        state = stepCaveDash(state);
      }
      return state;
    };
    expect(run()).toEqual(run());
  });

  it("clamps long frames and subdivides them", () => {
    const state = createCaveDash(7);
    expect(stepCaveDash(state, 100)).toEqual(stepCaveDash(state, 4));
  });

  it("ends at the ceiling and floor boundaries", () => {
    expect(stepCaveDash({ ...createCaveDash(1), y: CAVE_SHIP_RADIUS, vy: -1 })).toMatchObject({ status: "over" });
    expect(stepCaveDash({ ...createCaveDash(1), y: CAVE_HEIGHT - CAVE_SHIP_RADIUS, vy: 1 })).toMatchObject({ status: "over" });
  });

  it("scores a wall once after its trailing edge passes the ship", () => {
    const state: CaveDashState = {
      ...createCaveDash(1), y: 200, vy: 0, spawnDistance: 999,
      walls: [{ x: CAVE_SHIP_X - CAVE_WALL_WIDTH - 2.3, gapY: 130, passed: false }],
    };
    const once = stepCaveDash(state);
    expect(once.score).toBe(1);
    expect(stepCaveDash(once)).toMatchObject({ score: 1 });
  });

  it("accepts a ship inside the gap and rejects one crossing its edge", () => {
    const base: CaveDashState = {
      ...createCaveDash(1), y: 200, vy: 0, spawnDistance: 999,
      walls: [{ x: CAVE_SHIP_X, gapY: 120, passed: false }],
    };
    expect(stepCaveDash(base)).toMatchObject({ status: "playing" });
    expect(stepCaveDash({ ...base, y: 120 + CAVE_GAP - CAVE_SHIP_RADIUS + 1 })).toMatchObject({ status: "over" });
  });

  it("ramps speed from the score without mutating the input", () => {
    const state = { ...createCaveDash(2), score: 10 };
    const next = stepCaveDash(state);
    expect(next.speed).toBeCloseTo(3.6);
    expect(state.speed).toBe(2.4);
  });
});
