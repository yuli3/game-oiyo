import { describe, expect, it } from "vitest";
import {
  initializeVikingLongship,
  stepVikingLongship,
  runVikingMonteCarloSimulation,
} from "./viking-longship";
import {
  INITIAL_VIKING_QUESTS,
} from "./viking-longship-quests";
import {
  pickVikingLongshipDialogue,
} from "./viking-longship-lore";
import {
  VIKING_UPGRADES,
  computeVikingLongshipModifiers,
  getVikingUpgradeCost,
  type VikingLongshipMetaSave,
} from "./viking-longship-meta";

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

describe("viking longship deepening systems (quests, lore, meta)", () => {
  it("defines 4 voyage survival quests with 6 locales", () => {
    expect(INITIAL_VIKING_QUESTS).toHaveLength(4);
    for (const q of INITIAL_VIKING_QUESTS) {
      expect(q.title.ko).toBeDefined();
      expect(q.title.en).toBeDefined();
      expect(q.desc.ko).toBeDefined();
      expect(q.rewardSilver).toBeGreaterThan(0);
      expect(q.maxProgress).toBeGreaterThan(0);
    }
  });

  it("picks lore dialogues across all 5 nautical triggers", () => {
    const triggers = ["voyage_start", "island_explore", "monster_attack", "storm_danger", "bifrost_victory"] as const;
    for (const tr of triggers) {
      const dialogue = pickVikingLongshipDialogue(tr);
      expect(dialogue).toBeDefined();
      expect(dialogue.speaker).toBeDefined();
      expect(dialogue.name.ko).toBeDefined();
      expect(dialogue.text.ko).toBeDefined();
      expect(dialogue.avatar).toBeDefined();
    }
  });

  it("calculates 5 shipyard upgrades and upgrade costs", () => {
    expect(VIKING_UPGRADES).toHaveLength(5);
    const hull = VIKING_UPGRADES.find((u) => u.id === "ironclad_hull")!;
    expect(hull.maxLevel).toBe(5);
    expect(getVikingUpgradeCost(hull, 0)).toBe(150);
    expect(getVikingUpgradeCost(hull, 1)).toBe(Math.round(150 * 1.6));
    expect(getVikingUpgradeCost(hull, 5)).toBe(0); // maxed
  });

  it("computes active modifiers from upgrade levels", () => {
    const emptySave: VikingLongshipMetaSave = {
      version: 1,
      walletSilver: 0,
      upgradeLevels: {},
      totalIslandsExplored: 0,
      totalMonstersDefeated: 0,
      totalVoyagesCompleted: 0,
    };
    const baseMods = computeVikingLongshipModifiers(emptySave);
    expect(baseMods.maxHpBonus).toBe(0);
    expect(baseMods.sailEfficiencyBonus).toBe(1.0);
    expect(baseMods.emergencyRepairs).toBe(0);
    expect(baseMods.silverDredgeMult).toBe(1.0);

    const upgradedSave: VikingLongshipMetaSave = {
      version: 1,
      walletSilver: 1000,
      upgradeLevels: {
        ironclad_hull: 2,
        silk_sail: 3,
        valkyrie_harpoon: 2,
        emergency_planks: 1,
        silver_dredge: 4,
      },
      totalIslandsExplored: 5,
      totalMonstersDefeated: 3,
      totalVoyagesCompleted: 1,
    };
    const mods = computeVikingLongshipModifiers(upgradedSave);
    expect(mods.maxHpBonus).toBe(40);
    expect(mods.sailEfficiencyBonus).toBeCloseTo(1.45);
    expect(mods.harpoonDamageMult).toBeCloseTo(1.4);
    expect(mods.emergencyRepairs).toBe(1);
    expect(mods.silverDredgeMult).toBeCloseTo(2.0);
  });
});

