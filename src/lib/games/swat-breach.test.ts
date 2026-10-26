import { describe, it, expect } from "vitest";
import {
  addWaypointOrFlash,
  clearOperatorWaypoints,
  createSwatBreachState,
  hasLineOfSight,
  startBreachExecution,
  stepSwatBreach,
} from "./swat-breach";

describe("Tactical SWAT Breach Engine", () => {
  it("initializes 10x8 CQB floorplan with operators, suspects, and hostages", () => {
    const state = createSwatBreachState(0);
    expect(state.gridW).toBe(10);
    expect(state.gridH).toBe(8);
    expect(state.phase).toBe("planning");
    expect(state.operators).toHaveLength(2);
    expect(state.suspects).toHaveLength(3);
    expect(state.hostages).toHaveLength(1);
  });

  it("blocks line of sight through closed doors and walls, and opens LOS when door is breached", () => {
    const state = createSwatBreachState(0);
    // Door at (3, 2) is closed initially -> blocks LOS from (1, 2) to (5, 2)
    expect(hasLineOfSight(state, 1, 2, 5, 2)).toBe(false);

    // Open the door at (3, 2)
    state.tiles[2][3] = "door_open";
    expect(hasLineOfSight(state, 1, 2, 5, 2)).toBe(true);
  });

  it("allows custom waypoint planning and clearing during planning phase", () => {
    const state = createSwatBreachState(0);
    clearOperatorWaypoints(state, "alpha");
    expect(state.operators[0].waypoints).toHaveLength(0);

    expect(addWaypointOrFlash(state, 2, 2)).toBe(true);
    expect(addWaypointOrFlash(state, 3, 2)).toBe(true);
    expect(state.operators[0].waypoints).toHaveLength(2);
  });

  it("executes synchronized breach, stuns suspects with flashbangs, and clears Mission 1", () => {
    const state = createSwatBreachState(0);
    startBreachExecution(state);
    expect(state.phase).toBe("executing");

    for (let i = 0; i < 120; i++) {
      stepSwatBreach(state, 0.1);
      if (state.phase === "victory") break;
    }

    expect(state.phase).toBe("victory");
    expect(state.suspects.every((s) => s.neutralized)).toBe(true);
    expect(state.hostages.every((h) => h.rescued)).toBe(true);
    expect(state.score).toBeGreaterThan(0);
  });
});
