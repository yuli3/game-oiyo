import { describe, it, expect } from "vitest";
import {
  createInitialOrbitalState,
  updateOrbitalFlight,
} from "./orbital-flight";

describe("OrbitalFlight Engine", () => {
  it("initializes with stable starting orbit parameters", () => {
    const state = createInitialOrbitalState();
    expect(state.altitude).toBe(50);
    expect(state.hull).toBe(100);
    expect(state.shield).toBe(100);
    expect(state.gameOver).toBe(false);
    expect(state.gates.length).toBeGreaterThan(0);
    expect(state.debris.length).toBeGreaterThan(0);
  });

  it("updates ship position based on thrust and gravity", () => {
    const state = createInitialOrbitalState();
    const next = updateOrbitalFlight(
      state,
      { thrust: 1.0, pitch: 0, yaw: 0, roll: 0 },
      0.016
    );

    expect(next.ship.speed).toBeGreaterThan(0);
    expect(next.timeAlive).toBeGreaterThan(0);
  });

  it("triggers atmospheric burn game over if altitude drops below threshold", () => {
    const state = createInitialOrbitalState();
    state.ship.x = 20;
    state.ship.y = 0;
    state.ship.z = 0;

    const next = updateOrbitalFlight(
      state,
      { thrust: 0, pitch: 0, yaw: 0, roll: 0 },
      0.016
    );

    expect(next.gameOver).toBe(true);
    expect(next.gameOverReason).toBe("atmospheric_burn");
  });

  it("detects gate pass and increases score and combo multiplier", () => {
    const state = createInitialOrbitalState();
    const gate = state.gates[0];
    state.ship.x = gate.x;
    state.ship.y = gate.y;
    state.ship.z = gate.z;

    const next = updateOrbitalFlight(
      state,
      { thrust: 0, pitch: 0, yaw: 0, roll: 0 },
      0.016
    );

    expect(next.gatesPassed).toBe(1);
    expect(next.score).toBeGreaterThan(0);
    expect(next.multiplier).toBeGreaterThan(1);
  });

  it("depletes shield and hull upon collision with debris", () => {
    const state = createInitialOrbitalState();
    const debris = state.debris[0];
    state.ship.x = debris.x;
    state.ship.y = debris.y;
    state.ship.z = debris.z;

    const next = updateOrbitalFlight(
      state,
      { thrust: 0, pitch: 0, yaw: 0, roll: 0 },
      0.016
    );

    expect(next.shield).toBeLessThan(100);
  });
});
