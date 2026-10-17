import { describe, it, expect } from "vitest";
import {
  createInitialPinballState,
  launchBall,
  setFlipperState,
  updatePinballPhysics,
  TABLE_LENGTH,
} from "./space-pinball";

describe("space-pinball logic", () => {
  it("initializes with 3 balls, zero score, and idle status", () => {
    const state = createInitialPinballState(1000);
    expect(state.ballsLeft).toBe(3);
    expect(state.score).toBe(0);
    expect(state.highScore).toBe(1000);
    expect(state.status).toBe("idle");
    expect(state.ball.active).toBe(false);
  });

  it("launches the ball into play with upward velocity", () => {
    const state = createInitialPinballState();
    const launched = launchBall(state, 1);
    expect(launched.status).toBe("playing");
    expect(launched.ball.active).toBe(true);
    expect(launched.ball.vz).toBeLessThan(0);
  });

  it("updates flipper press state", () => {
    let state = createInitialPinballState();
    state = setFlipperState(state, "left", true);
    expect(state.leftFlipper.isPressed).toBe(true);
    expect(state.rightFlipper.isPressed).toBe(false);

    state = setFlipperState(state, "right", true);
    expect(state.rightFlipper.isPressed).toBe(true);
  });

  it("applies gravity and updates ball position over time", () => {
    let state = createInitialPinballState();
    state = launchBall(state, 0.5);
    const initialZ = state.ball.z;
    const initialVz = state.ball.vz;

    state = updatePinballPhysics(state, 0.016);
    expect(state.ball.vz).toBeGreaterThan(initialVz); // gravity accelerates downward (+Z)
    expect(state.ball.z).not.toBe(initialZ);
  });

  it("bounces and increments score when colliding with a bumper", () => {
    let state = createInitialPinballState();
    state = launchBall(state, 0.5);
    // Position ball right at top-mid bumper (x: 0, z: -3.8, radius: 0.65)
    state.ball.x = 0;
    state.ball.z = -3.2; // touching edge
    state.ball.vz = -2;

    const beforeScore = state.score;
    state = updatePinballPhysics(state, 0.016);
    expect(state.score).toBeGreaterThan(beforeScore);
    expect(state.recentHits.length).toBeGreaterThan(0);
  });

  it("handles gutter drain and ball loss correctly", () => {
    let state = createInitialPinballState();
    state = launchBall(state, 1);
    // Move ball beyond bottom of table
    state.ball.z = TABLE_LENGTH / 2 + 1;

    state = updatePinballPhysics(state, 0.016);
    expect(state.ballsLeft).toBe(2);
    expect(state.status).toBe("idle");
    expect(state.ball.active).toBe(false);
  });

  it("triggers game over when final ball is drained", () => {
    let state = createInitialPinballState();
    state.ballsLeft = 1;
    state = launchBall(state, 1);
    state.ball.z = TABLE_LENGTH / 2 + 1;

    state = updatePinballPhysics(state, 0.016);
    expect(state.ballsLeft).toBe(0);
    expect(state.status).toBe("gameover");
  });
});
