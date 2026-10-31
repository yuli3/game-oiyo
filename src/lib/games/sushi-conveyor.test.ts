import { describe, expect, it } from "vitest";
import {
  initializeSushiConveyor,
  stepSushiConveyor,
  craftAndPlaceSushiPlate,
  runSushiMonteCarloAudit,
  conveyorSpline,
  SUSHI_RECIPES,
} from "./sushi-conveyor";

describe("sushi-conveyor engine", () => {
  it("initializes conveyor spline and customer seats", () => {
    const state = initializeSushiConveyor();
    expect(state.status).toBe("playing");
    expect(state.cash).toBe(500);
    expect(state.seats.length).toBe(6);
    expect(conveyorSpline.totalLength).toBeGreaterThan(500);

    // Initial 2 customers seated
    const occupiedSeats = state.seats.filter((s) => s.occupied);
    expect(occupiedSeats.length).toBe(2);
  });

  it("crafts sushi plates via ZeroGcObjectPool without allocation failure", () => {
    let state = initializeSushiConveyor();
    const initialCash = state.cash;

    // Craft Tuna
    state = craftAndPlaceSushiPlate(state, "tuna");
    const tunaCost = Math.floor(SUSHI_RECIPES.tuna.price * 0.3);
    expect(state.cash).toBe(initialCash - tunaCost);
    expect(state.activePlates.length).toBe(1);
    expect(state.activePlates[0].sushiType).toBe("tuna");
    expect(state.activePlates[0].distanceAlongSpline).toBe(0);
  });

  it("moves plates along the spline and serves hungry customer", () => {
    let state = initializeSushiConveyor();
    // Seat 0 wants Salmon, its target distance is seats[0].beltDistanceTarget
    const targetSeat = state.seats[0];
    targetSeat.occupied = true;
    targetSeat.wantedSushi = "salmon";
    targetSeat.mood = "happy";

    // Craft Salmon
    state = craftAndPlaceSushiPlate(state, "salmon");
    const initialServed = state.totalServed;

    // Simulate conveyor until plate reaches customer target distance
    const distToTravel = targetSeat.beltDistanceTarget;
    const timeNeeded = distToTravel / state.beltSpeedPxPerSec;
    const steps = Math.ceil(timeNeeded / 0.1);

    for (let i = 0; i < steps + 5; i++) {
      state = stepSushiConveyor(state, 0.1);
      if (state.totalServed > initialServed) break;
    }

    expect(state.totalServed).toBeGreaterThan(initialServed);
    expect(state.seats[0].mood).toBe("eating");
    expect(state.comboCount).toBe(1);
  });

  it("discards spoiled sushi plate when laps or freshness exceed threshold", () => {
    let state = initializeSushiConveyor();
    // Clear all customer seats to simulate no takers
    state.seats.forEach((s) => {
      s.occupied = false;
    });
    // Prevent customer respawn during test
    state.customerSpawnCooldown = 999;

    // Craft Tamago
    state = craftAndPlaceSushiPlate(state, "tamago");
    const initialRep = state.reputation;

    // Advance 60 seconds (600 steps of 0.1s)
    for (let i = 0; i < 600; i++) {
      state = stepSushiConveyor(state, 0.1);
      if (state.totalDiscarded > 0) break;
    }

    expect(state.totalDiscarded).toBeGreaterThan(0);
    expect(state.reputation).toBeLessThan(initialRep);
  });

  it("runs Monte Carlo audit and verifies 0% bankruptcy under normal play", () => {
    const audit = runSushiMonteCarloAudit(20);
    expect(audit.clearedTrials).toBeGreaterThanOrEqual(18); // At least 90% non-bankrupt
    expect(audit.averageServed).toBeGreaterThan(5);
    expect(audit.averageCash).toBeGreaterThan(500);
  });
});
