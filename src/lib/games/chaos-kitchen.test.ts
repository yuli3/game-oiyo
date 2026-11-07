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

  it("applies kitchen meta modifiers and saves upgrades", async () => {
    const {
      INITIAL_KITCHEN_META_SAVE,
      calculateKitchenModifiers,
      buyKitchenUpgrade,
    } = await import("./chaos-kitchen-meta");

    const baseMods = calculateKitchenModifiers(INITIAL_KITCHEN_META_SAVE);
    expect(baseMods.chopSpeedMult).toBe(1.0);
    expect(baseMods.cookSpeedMult).toBe(1.0);

    const richSave = {
      ...INITIAL_KITCHEN_META_SAVE,
      goldStars: 1000,
    };

    const res = buyKitchenUpgrade("knifeSharpness", richSave);
    expect(res.success).toBe(true);
    expect(res.newSave.knifeSharpnessLvl).toBe(1);
    expect(res.newSave.goldStars).toBe(850);

    const upgradedMods = calculateKitchenModifiers(res.newSave);
    expect(upgradedMods.chopSpeedMult).toBeCloseTo(1.2);
  });

  it("loads 4 kitchen quests and handles reward claims", async () => {
    const {
      INITIAL_KITCHEN_QUESTS,
      claimKitchenQuestReward,
    } = await import("./chaos-kitchen-quests");

    expect(INITIAL_KITCHEN_QUESTS.length).toBe(4);
    const saladQuest = INITIAL_KITCHEN_QUESTS[0];
    expect(saladQuest.title.ko).toBe("신선한 샐러드 장인");

    // Test claim flow
    const finishedQuest = { ...saladQuest, progress: saladQuest.maxProgress };
    let starsAwarded = 0;
    const updated = claimKitchenQuestReward(saladQuest.id, [finishedQuest], (s) => {
      starsAwarded = s;
    });

    expect(starsAwarded).toBe(saladQuest.rewardStars);
    expect(updated[0].isClaimed).toBe(true);
  });

  it("provides 3 kitchen personas and transmission lore HUD", async () => {
    const { KITCHEN_SPEAKERS, KITCHEN_TRANSMISSIONS } = await import("./chaos-kitchen-lore");

    expect(KITCHEN_SPEAKERS.gordon.name.ko).toBe("마스터 고든");
    expect(KITCHEN_SPEAKERS.olivia.name.ko).toBe("수셰프 올리비아");
    expect(KITCHEN_SPEAKERS.charlie.name.ko).toBe("인턴 찰리");

    expect(KITCHEN_TRANSMISSIONS.kitchen_open.length).toBeGreaterThanOrEqual(1);
    expect(KITCHEN_TRANSMISSIONS.fire_hazard.length).toBeGreaterThanOrEqual(1);
    expect(KITCHEN_TRANSMISSIONS.order_delivered.length).toBeGreaterThanOrEqual(1);
  });

  it("runs Monte Carlo audit and verifies kitchen operational viability", () => {
    const audit = runChaosKitchenMonteCarloAudit(15);
    expect(audit.successTrials).toBeGreaterThan(0);
    expect(audit.averageScore).toBeGreaterThanOrEqual(0);
  });
});
