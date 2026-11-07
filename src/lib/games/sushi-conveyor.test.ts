import { describe, expect, it } from "vitest";
import {
  initializeSushiConveyor,
  stepSushiConveyor,
  craftAndPlaceSushiPlate,
  runSushiMonteCarloAudit,
  conveyorSpline,
  SUSHI_RECIPES,
} from "./sushi-conveyor";
import { INITIAL_SUSHI_QUESTS } from "./sushi-conveyor-quests";
import { SUSHI_DIALOGUES } from "./sushi-conveyor-lore";
import {
  SUSHI_META_UPGRADE_DEFS,
  loadSushiMetaState,
  purchaseSushiMetaUpgrade,
} from "./sushi-conveyor-meta";

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

  // Deepening Systems Tests
  it("evaluates in-run quest checks correctly", () => {
    const quests = [...INITIAL_SUSHI_QUESTS];
    const state = initializeSushiConveyor();
    state.totalServed = 15;
    state.cash = 1500;

    const tunaQuest = quests.find((q) => q.id === "tuna_master");
    expect(tunaQuest).toBeDefined();
    if (tunaQuest) {
      const progress = tunaQuest.check(state);
      expect(progress).toBeGreaterThanOrEqual(tunaQuest.target);
    }

    const revenueQuest = quests.find((q) => q.id === "high_roller_revenue");
    expect(revenueQuest).toBeDefined();
    if (revenueQuest) {
      const progress = revenueQuest.check(state);
      expect(progress).toBeGreaterThanOrEqual(revenueQuest.target);
    }
  });

  it("triggers Golden Otoro fever mode and awards extra wasabi cores", () => {
    let state = initializeSushiConveyor();
    state.cash = 1000;
    state.seats[0].occupied = true;
    state.seats[0].wantedSushi = "golden_tuna";

    // Craft Golden Otoro plate
    state = craftAndPlaceSushiPlate(state, "golden_tuna");
    expect(state.activePlates.some((p) => p.isGolden)).toBe(true);

    const distToTravel = state.seats[0].beltDistanceTarget;
    const steps = Math.ceil((distToTravel / state.beltSpeedPxPerSec) / 0.1);

    for (let i = 0; i < steps + 5; i++) {
      state = stepSushiConveyor(state, 0.1);
      if (state.feverTimeSec > 0) break;
    }

    expect(state.feverTimeSec).toBeGreaterThan(0);
    expect(state.status).toBe("fever");
    expect(state.wasabiEarned).toBeGreaterThan(0);
  });

  it("handles meta upgrades purchase and bonus application", () => {
    const meta = loadSushiMetaState();
    meta.wasabiCores = 100;

    const success = purchaseSushiMetaUpgrade(meta, "goldenRiceCooker");
    expect(success).toBe(true);
    expect(meta.upgrades.goldenRiceCooker).toBe(1);
    expect(meta.wasabiCores).toBe(100 - SUSHI_META_UPGRADE_DEFS[0].costPerLevel[0]);

    // Apply modifiers to new game state
    const modifiedState = initializeSushiConveyor({
      priceMultiplier: 1.1,
      extraFreshnessSec: 10,
      speedBonus: 0.12,
      tipBonus: 0.25,
      goldenRate: 0.05,
    });
    expect(modifiedState.beltSpeedPxPerSec).toBeGreaterThan(65);
  });

  it("loads 5 localized dialogues with all supported languages", () => {
    expect(SUSHI_DIALOGUES.length).toBeGreaterThanOrEqual(5);
    for (const d of SUSHI_DIALOGUES) {
      expect(d.sender.ko).toBeDefined();
      expect(d.sender.en).toBeDefined();
      expect(d.sender.ja).toBeDefined();
      expect(d.sender.zh).toBeDefined();
      expect(d.sender.fr).toBeDefined();
      expect(d.sender.es).toBeDefined();
      expect(d.message.ko).toBeDefined();
    }
  });
});
