import { describe, it, expect } from "vitest";
import {
  createInitialState,
  setTilt,
  updatePhysics,
  LEVELS,
} from "./gravity-roller";

describe("Gravity Roller Game Logic", () => {
  it("initializes level state with proper defaults", () => {
    const state = createInitialState(0);
    expect(state.status).toBe("ready");
    expect(state.currentLevelIndex).toBe(0);
    expect(state.ball.x).toBe(LEVELS[0].ballStart.x);
    expect(state.ball.z).toBe(LEVELS[0].ballStart.z);
    expect(state.gems).toHaveLength(LEVELS[0].gems.length);
    expect(state.score).toBe(0);
    expect(state.timeRemaining).toBe(LEVELS[0].timeLimit);
  });

  it("clamps tilt within maximum allowed thresholds", () => {
    const state = createInitialState();
    setTilt(state, 1.5, -2.0); // beyond MAX_TILT 0.32
    expect(state.tilt.pitch).toBe(0.32);
    expect(state.tilt.roll).toBe(-0.32);
  });

  it("accelerates the ball when tilted and playing", () => {
    const state = createInitialState();
    state.status = "playing";
    setTilt(state, 0, 0.2); // positive roll accelerates +X

    const initialX = state.ball.x;
    updatePhysics(state, 0.1);
    expect(state.ball.vx).toBeGreaterThan(0);
    expect(state.ball.x).toBeGreaterThan(initialX);
  });

  it("bounces off walls preserving ball inside bounds", () => {
    const state = createInitialState();
    state.status = "playing";
    state.ball.x = 5.6; // right near the wall at x=6.0 (wall width 0.4 => minX=5.8)
    state.ball.z = 0;
    state.ball.vx = 4.0; // moving towards wall

    updatePhysics(state, 0.05);
    // After collision, velocity should reflect
    expect(state.ball.vx).toBeLessThan(0);
    expect(state.ball.x).toBeLessThan(5.8);
  });

  it("fails game when ball drops into a hole trap", () => {
    const state = createInitialState();
    state.status = "playing";
    const hole = LEVELS[0].holes[0];
    state.ball.x = hole.x;
    state.ball.z = hole.z;

    updatePhysics(state, 0.01);
    expect(state.status).toBe("failed");
    expect(state.ball.y).toBeLessThan(0);
  });

  it("collects gems and awards score upon proximity", () => {
    const state = createInitialState();
    state.status = "playing";
    const gem = state.gems[0];
    state.ball.x = gem.x;
    state.ball.z = gem.z;

    updatePhysics(state, 0.01);
    expect(gem.collected).toBe(true);
    expect(state.score).toBe(150);
  });

  it("clears stage with time bonus when reaching goal destination", () => {
    const state = createInitialState();
    state.status = "playing";
    const goal = LEVELS[0].goal;
    state.ball.x = goal.x;
    state.ball.z = goal.z;

    updatePhysics(state, 0.01);
    expect(state.status).toBe("cleared");
    expect(state.score).toBeGreaterThan(500);
  });

  it("fails game when time expires", () => {
    const state = createInitialState();
    state.status = "playing";
    state.timeRemaining = 0.05;

    updatePhysics(state, 0.1);
    expect(state.status).toBe("failed");
  });
});
