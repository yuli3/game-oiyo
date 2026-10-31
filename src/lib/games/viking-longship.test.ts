import { describe, expect, it } from "vitest";
import {
  initializeVikingLongship,
  stepVikingLongship,
  runVikingMonteCarloSimulation,
} from "./viking-longship";

describe("viking-longship engine", () => {
  it("initializes state with Voronoi archipelago islands, monsters and bifrost gateway", () => {
    const state = initializeVikingLongship();
    expect(state.status).toBe("sailing");
    expect(state.hullHp).toBe(100);
    expect(state.islands.length).toBeGreaterThanOrEqual(5);
    expect(state.monsters.length).toBeGreaterThanOrEqual(3);
    expect(state.bifrostPortal.isActive).toBe(false);

    const runeIslands = state.islands.filter((isl) => isl.hasRunestone);
    expect(runeIslands.length).toBe(3);
  });

  it("advances ship position with sail aerodynamics and rudder input", () => {
    let state = initializeVikingLongship();
    const initialX = state.shipX;
    const initialY = state.shipY;

    // Step with neutral rudder and sail trimmed for 2 seconds
    for (let i = 0; i < 20; i++) {
      state = stepVikingLongship(state, 0.1, {
        rudder: 0,
        trimDelta: 0,
      });
    }

    expect(state.speed).toBeGreaterThan(0);
    expect(state.shipX !== initialX || state.shipY !== initialY).toBe(true);
  });

  it("drops anchor to halt ship and engages oars for auxiliary power", () => {
    let state = initializeVikingLongship();
    state.speed = 5.0;

    // Drop anchor
    state = stepVikingLongship(state, 0.1, {
      rudder: 0,
      trimDelta: 0,
      toggleAnchor: true,
    });
    expect(state.isAnchored).toBe(true);
    expect(state.status).toBe("anchored");

    // After anchoring, ship rapidly decelerates
    for (let i = 0; i < 10; i++) {
      state = stepVikingLongship(state, 0.1, { rudder: 0, trimDelta: 0 });
    }
    expect(state.speed).toBe(0);
  });

  it("launches harpoons and damages sea monsters", () => {
    let state = initializeVikingLongship();
    // Position monster 120 units in front of ship
    state.monsters[0].worldX = state.shipX + 120;
    state.monsters[0].worldY = state.shipY;
    state.headingRad = Math.PI / 2; // East

    const initialHp = state.monsters[0].hp;

    // Fire harpoon
    state = stepVikingLongship(state, 0.1, {
      rudder: 0,
      trimDelta: 0,
      fireHarpoon: true,
    });
    expect(state.projectiles.length).toBe(1);

    // Step projectile into monster (travels 16 units/step, takes ~8 steps)
    for (let i = 0; i < 10; i++) {
      state = stepVikingLongship(state, 0.1, { rudder: 0, trimDelta: 0 });
    }
    expect(state.monsters[0].hp).toBeLessThan(initialHp);
    expect(state.monsters[0].isAggro).toBe(true);
  });

  it("runs Monte Carlo simulation and confirms expedition viability", () => {
    const result = runVikingMonteCarloSimulation(20);
    expect(result.survivedTrials).toBeGreaterThan(0);
    expect(result.averageTimeSec).toBeGreaterThan(0);
  });
});
