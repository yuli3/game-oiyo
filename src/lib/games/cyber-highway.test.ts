import { describe, it, expect } from "vitest";
import {
  createInitialCyberHighwayState,
  steerPlayer,
  activateNitro,
  deactivateNitro,
  updateCyberHighway,
  laneToX,
  LANE_WIDTH,
} from "./cyber-highway";

describe("Cyber Highway 3D Game Engine", () => {
  it("initializes with correct default state", () => {
    const state = createInitialCyberHighwayState();
    expect(state.playerX).toBe(0);
    expect(state.targetLane).toBe(0);
    expect(state.hp).toBe(100);
    expect(state.score).toBe(0);
    expect(state.nitro).toBe(50);
    expect(state.isBoosting).toBe(false);
    expect(state.gameOver).toBe(false);
  });

  it("calculates lane lateral coordinates accurately", () => {
    expect(laneToX(0)).toBe(0);
    expect(laneToX(-2)).toBe(-2 * LANE_WIDTH);
    expect(laneToX(2)).toBe(2 * LANE_WIDTH);
  });

  it("steers left and right within 5-lane boundaries", () => {
    let state = createInitialCyberHighwayState(); // lane 0
    state = steerPlayer(state, -1);
    expect(state.targetLane).toBe(-1);

    state = steerPlayer(state, -1);
    expect(state.targetLane).toBe(-2);

    // Clamps at -2
    state = steerPlayer(state, -1);
    expect(state.targetLane).toBe(-2);

    // Moves right to +2
    state = steerPlayer(state, 1);
    state = steerPlayer(state, 1);
    state = steerPlayer(state, 1);
    state = steerPlayer(state, 1);
    expect(state.targetLane).toBe(2);
  });

  it("activates nitro when sufficient nitro gauge exists", () => {
    let state = createInitialCyberHighwayState();
    state = activateNitro(state);
    expect(state.isBoosting).toBe(true);

    state = deactivateNitro(state);
    expect(state.isBoosting).toBe(false);

    // Does not activate if nitro is empty
    state.nitro = 5;
    state = activateNitro(state);
    expect(state.isBoosting).toBe(false);
  });

  it("advances distance and score over time", () => {
    let state = createInitialCyberHighwayState();
    const dt = 0.1;
    state = updateCyberHighway(state, dt);

    expect(state.distance).toBeGreaterThan(0);
    expect(state.score).toBeGreaterThan(0);
  });

  it("consumes nitro and accelerates when boosting", () => {
    let state = createInitialCyberHighwayState();
    state = activateNitro(state);
    const initialNitro = state.nitro;
    const initialSpeed = state.speed;

    state = updateCyberHighway(state, 0.5);
    expect(state.nitro).toBeLessThan(initialNitro);
    expect(state.speed).toBeGreaterThan(initialSpeed);
  });

  it("handles vehicle collision, applies damage, and slows down", () => {
    let state = createInitialCyberHighwayState();
    // Inject a traffic vehicle right at z = 1
    state.traffic = [
      {
        id: "test-traffic",
        lane: 0,
        x: 0,
        z: 1,
        speed: 15,
        type: "sedan",
        width: 1.5,
        length: 3.4,
        color: 0xef4444,
      },
    ];

    state = updateCyberHighway(state, 0.1);
    // Should have collided and taken damage
    expect(state.hp).toBeLessThan(100);
    expect(state.speed).toBeLessThan(25);
  });

  it("triggers game over when HP drops to 0", () => {
    let state = createInitialCyberHighwayState();
    state.hp = 10;
    state.traffic = [
      {
        id: "fatal-truck",
        lane: 0,
        x: 0,
        z: 0.5,
        speed: 10,
        type: "truck",
        width: 2.0,
        length: 5.2,
        color: 0xef4444,
      },
    ];

    state = updateCyberHighway(state, 0.1);
    expect(state.hp).toBe(0);
    expect(state.gameOver).toBe(true);
  });
});
