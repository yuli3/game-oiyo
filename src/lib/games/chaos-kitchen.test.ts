import { describe, expect, it } from "vitest";
import {
  initializeChaosKitchen,
  stepChaosKitchen,
  computeTargetFlowField,
  runChaosKitchenMonteCarloAudit,
  KITCHEN_WIDTH,
  KITCHEN_HEIGHT,
} from "./chaos-kitchen";

describe("chaos-kitchen engine", () => {
  it("initializes kitchen layout, chefs, and orders", () => {
    const state = initializeChaosKitchen();
    expect(state.status).toBe("playing");
    expect(state.chefs.length).toBe(2);
    expect(state.orders.length).toBeGreaterThanOrEqual(2);
    expect(state.chefs[0].id).toBe("chef_1");
    expect(state.chefs[1].id).toBe("chef_2");
  });

  it("computes Dijkstra flow field towards designated station tile", () => {
    const targetTile = { x: 5, y: 0 }; // Delivery counter
    const field = computeTargetFlowField(targetTile);
    expect(field.length).toBe(KITCHEN_HEIGHT);
    expect(field[0].length).toBe(KITCHEN_WIDTH);

    // Floor tile adjacent to delivery counter (5, 1) should point upwards (dirY = -1)
    const adjacentCell = field[1][5];
    expect(adjacentCell.distance).toBeGreaterThanOrEqual(0);
    expect(adjacentCell.dirY).toBe(-1);
  });

  it("handles chef ingredient pickup and cutting board chopping", () => {
    let state = initializeChaosKitchen();
    // Position chef_1 right below tomato crate (1,0) -> at (1,1)
    state.chefs[0].x = 1.0;
    state.chefs[0].y = 1.0;
    state.chefs[0].dirX = 0;
    state.chefs[0].dirY = -1;

    // Pick tomato (Bit 16)
    state = stepChaosKitchen(state, 0.1, { chef1Mask: 16 });
    expect(state.chefs[0].heldItem?.type).toBe("tomato_raw");

    // Move to cutting board at (0,1)
    state.chefs[0].x = 1.0;
    state.chefs[0].y = 1.0;
    state.chefs[0].dirX = -1;
    state.chefs[0].dirY = 0;

    // Put on board (Bit 16)
    state = stepChaosKitchen(state, 0.1, { chef1Mask: 16 });
    expect(state.chefs[0].heldItem).toBeNull();
    expect(state.counterSlots.get("0,1")?.type).toBe("tomato_raw");

    // Chop for 1.5 seconds (Bit 32)
    for (let i = 0; i < 15; i++) {
      state = stepChaosKitchen(state, 0.1, { chef1Mask: 32 });
    }
    expect(state.counterSlots.get("0,1")?.type).toBe("tomato_chopped");
  });

  it("cooks patty on stove and delivers order to service window", () => {
    let state = initializeChaosKitchen();
    // Place meat on stove at (9,1)
    state.counterSlots.set("9,1", {
      id: "meat-test",
      type: "meat_raw",
      cookProgress: 0,
      isCooking: true,
      isOnFire: false,
    });

    // Advance 5 seconds to cook patty
    for (let i = 0; i < 50; i++) {
      state = stepChaosKitchen(state, 0.1, { chef1Mask: 0 });
    }
    expect(state.counterSlots.get("9,1")?.type).toBe("meat_cooked");

    // Give chef_1 a completed salad dish and place before delivery (5,1)
    state.chefs[0].x = 5.0;
    state.chefs[0].y = 1.0;
    state.chefs[0].dirX = 0;
    state.chefs[0].dirY = -1;
    state.chefs[0].heldItem = {
      id: "salad-test",
      type: "salad_dish",
      cookProgress: 0,
      isCooking: false,
      isOnFire: false,
    };

    const initialServed = state.servedOrders;
    state = stepChaosKitchen(state, 0.1, { chef1Mask: 0 });

    expect(state.servedOrders).toBe(initialServed + 1);
    expect(state.chefs[0].heldItem).toBeNull();
    expect(state.score).toBeGreaterThan(0);
  });

  it("runs Monte Carlo audit and verifies kitchen operational viability", () => {
    const audit = runChaosKitchenMonteCarloAudit(15);
    expect(audit.successTrials).toBeGreaterThan(0);
    expect(audit.averageScore).toBeGreaterThanOrEqual(0);
  });
});
