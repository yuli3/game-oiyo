import { describe, it, expect } from "vitest";
import {
  createInitialPinballState,
  launchBall,
  setFlipperState,
  updatePinballPhysics,
  nudgeTable,
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
    expect(state.slingshots.length).toBe(2);
    expect(state.rolloverLanes.length).toBe(3);
    expect(state.multiplier).toBe(1);
    expect(state.combo).toBe(1);
  });

  it("launches the ball into play with upward velocity", () => {
    const state = createInitialPinballState();
    const launched = launchBall(state, 1);
    expect(launched.status).toBe("playing");
    expect(launched.ball.active).toBe(true);
    expect(launched.ball.vz).toBeLessThan(0);
    expect(launched.lastEvent).toBe("launch");
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
    // Position ball right at top-mid bumper (x: 0, z: -3.8, radius: 0.7)
    state.ball.x = 0;
    state.ball.z = -3.1; // touching edge
    state.ball.vz = -2;

    const beforeScore = state.score;
    state = updatePinballPhysics(state, 0.016);
    expect(state.score).toBeGreaterThan(beforeScore);
    expect(state.combo).toBeGreaterThan(1);
    expect(state.recentHits.length).toBeGreaterThan(0);
    expect(state.lastEvent).toBe("bumper");
  });

  it("kicks the ball with high score on slingshot hit", () => {
    let state = createInitialPinballState();
    state = launchBall(state, 0.5);
    // Position ball at left slingshot rubber band: between (-2.8, 2.8) and (-1.8, 4.2)
    // midpoint around (-2.3, 3.5)
    state.ball.x = -2.2;
    state.ball.z = 3.5;
    state.ball.vx = -1;

    const beforeScore = state.score;
    state = updatePinballPhysics(state, 0.016);
    expect(state.score).toBeGreaterThan(beforeScore);
    expect(state.ball.vx).toBeGreaterThan(0); // kicked toward center
    expect(state.lastEvent).toBe("slingshot");
  });

  it("activates rollover lanes and triggers jackpot when all lanes are lit", () => {
    let state = createInitialPinballState();
    state = launchBall(state, 0.5);

    // Pre-light lane-1 and lane-2
    state.rolloverLanes[0].lit = true;
    state.rolloverLanes[1].lit = true;

    // Position ball over lane-3 (x: 1.5, z: -5.6)
    state.ball.x = 1.5;
    state.ball.z = -5.6;

    const beforeScore = state.score;
    state = updatePinballPhysics(state, 0.016);

    expect(state.lastEvent).toBe("jackpot");
    expect(state.multiplier).toBe(2); // increased multiplier
    expect(state.score).toBeGreaterThan(beforeScore + 5000);
    // Lanes should be reset for next jackpot cycle
    expect(state.rolloverLanes.every((l) => !l.lit)).toBe(true);
  });

  it("handles table nudging and triggers tilt on excess warnings", () => {
    let state = createInitialPinballState();
    state = launchBall(state, 1);

    // 1st nudge
    state = nudgeTable(state, "left");
    expect(state.tiltWarnings).toBe(1);
    expect(state.isTilted).toBe(false);

    // 2nd nudge
    state = nudgeTable(state, "right");
    expect(state.tiltWarnings).toBe(2);
    expect(state.isTilted).toBe(false);

    // 3rd nudge -> TILT
    state = nudgeTable(state, "left");
    expect(state.isTilted).toBe(true);
    expect(state.tiltTimer).toBeGreaterThan(0);

    // Flippers locked during tilt
    state = setFlipperState(state, "left", true);
    expect(state.leftFlipper.isPressed).toBe(false);
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
    expect(state.lastEvent).toBe("drain");
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
