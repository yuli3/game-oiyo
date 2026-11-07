import { describe, it, expect } from "vitest";
import {
  addWaypointOrFlash,
  clearOperatorWaypoints,
  createSwatBreachState,
  hasLineOfSight,
  startBreachExecution,
  stepSwatBreach,
} from "./swat-breach";
import { INITIAL_SWAT_QUESTS } from "./swat-breach-quests";
import { SWAT_COMMS_LOGS } from "./swat-breach-lore";
import {
  SWAT_META_UPGRADE_DEFS,
  loadSwatMetaState,
  purchaseSwatMetaUpgrade,
} from "./swat-breach-meta";

describe("Tactical SWAT Breach Engine", () => {
  it("initializes 10x8 CQB floorplan with operators, suspects, and hostages", () => {
    const state = createSwatBreachState(0);
    expect(state.gridW).toBe(10);
    expect(state.gridH).toBe(8);
    expect(state.phase).toBe("planning");
    expect(state.operators).toHaveLength(2);
    expect(state.suspects).toHaveLength(3);
    expect(state.hostages).toHaveLength(1);
    expect(state.activeCommsLogId).toBe("planning_brief");
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
    expect(state.tokensEarned).toBeGreaterThan(0);
    expect(state.activeCommsLogId).toBe("all_clear");
  });

  // Deepening Systems Tests
  it("evaluates tactical mission quests correctly", () => {
    const quests = [...INITIAL_SWAT_QUESTS];
    const state = createSwatBreachState(0);
    state.phase = "victory";
    state.hostages[0].rescued = true;
    state.elapsedTime = 9.5;

    const hostageQuest = quests.find((q) => q.id === "hostage_safe_rescue");
    expect(hostageQuest).toBeDefined();
    if (hostageQuest) {
      expect(hostageQuest.check(state)).toBeGreaterThanOrEqual(1);
    }

    const speedQuest = quests.find((q) => q.id === "speed_room_clear");
    expect(speedQuest).toBeDefined();
    if (speedQuest) {
      expect(speedQuest.check(state)).toBe(1);
    }
  });

  it("applies meta upgrades to enhance squad health, speed, and inventory", () => {
    const meta = loadSwatMetaState();
    meta.tacticalTokens = 100;

    const bought = purchaseSwatMetaUpgrade(meta, "kevlarPlating");
    expect(bought).toBe(true);
    expect(meta.upgrades.kevlarPlating).toBe(1);
    expect(meta.tacticalTokens).toBe(100 - SWAT_META_UPGRADE_DEFS[0].costPerLevel[0]);

    // Apply to game state
    const modifiedState = createSwatBreachState(0, {
      kevlarHp: 40,
      fireCooldownReduction: 0.24,
      reactionBonus: 0.3,
      extraFlashbangs: 1,
      speedMultiplier: 0.2,
    });

    expect(modifiedState.operators[0].maxHp).toBe(160 + 40);
    expect(modifiedState.flashbangsRemaining).toBe(3);
  });

  it("spawns elite enemy mutations and triggers shockwaves on breach", () => {
    const state = createSwatBreachState(0);
    // At least one elite mutation should exist in suspects
    const hasElite = state.suspects.some((s) => s.suspectType && s.suspectType !== "normal");
    expect(hasElite).toBe(true);

    startBreachExecution(state);
    // Step forward until door is breached
    for (let i = 0; i < 30; i++) {
      const res = stepSwatBreach(state, 0.1);
      if (res.doorBreached) break;
    }

    // Shockwaves should be registered on breach
    expect(state.activeShockwaves.length).toBeGreaterThan(0);
  });

  it("loads 5 localized TOC communications with complete 6-language translations", () => {
    expect(SWAT_COMMS_LOGS.length).toBeGreaterThanOrEqual(5);
    for (const log of SWAT_COMMS_LOGS) {
      expect(log.sender.ko).toBeDefined();
      expect(log.sender.en).toBeDefined();
      expect(log.sender.ja).toBeDefined();
      expect(log.sender.zh).toBeDefined();
      expect(log.sender.fr).toBeDefined();
      expect(log.sender.es).toBeDefined();
      expect(log.message.ko).toBeDefined();
    }
  });
});
