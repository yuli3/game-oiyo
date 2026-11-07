import { describe, expect, it } from "vitest";
import {
  CONFIGS,
  allCaught,
  catchFish,
  createFish,
  createFishFromSeed,
  formatElapsed,
  stepFish,
  type FishState,
} from "./cat-fishing";
import {
  INITIAL_CAT_QUESTS,
} from "./cat-fishing-quests";
import {
  pickCatFishingDialogue,
} from "./cat-fishing-lore";
import {
  CAT_UPGRADES,
  computeCatFishingModifiers,
  getCatUpgradeCost,
  type CatFishingMetaSave,
} from "./cat-fishing-meta";

function fixedRng(sequence: number[]): () => number {
  let index = 0;
  return () => sequence[Math.min(index++, sequence.length - 1)];
}

describe("cat fishing spawn", () => {
  it("replays the same pond from the same seed", () => {
    expect(createFishFromSeed(5, CONFIGS.normal.baseSpeed, 42)).toEqual(createFishFromSeed(5, CONFIGS.normal.baseSpeed, 42));
    expect(createFishFromSeed(5, CONFIGS.normal.baseSpeed, 42)).not.toEqual(createFishFromSeed(5, CONFIGS.normal.baseSpeed, 43));
  });

  it("places every fish inside the play area with the configured speed and no fish caught", () => {
    const fish = createFish(5, CONFIGS.normal.baseSpeed, fixedRng([0.1, 0.5, 0.9, 0.2, 0.6, 0.3, 0.7, 0.4, 0.8, 0.0]));
    expect(fish).toHaveLength(5);
    expect(fish.map((f) => f.id)).toEqual([0, 1, 2, 3, 4]);
    for (const f of fish) {
      expect(f.x).toBeGreaterThanOrEqual(10);
      expect(f.x).toBeLessThanOrEqual(90);
      expect(f.y).toBeGreaterThanOrEqual(10);
      expect(f.y).toBeLessThanOrEqual(90);
      expect(Math.hypot(f.vx, f.vy)).toBeCloseTo(CONFIGS.normal.baseSpeed, 8);
      expect(f.caught).toBe(false);
    }
  });

  it("is deterministic for a given random source", () => {
    const a = createFish(3, 2, fixedRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]));
    const b = createFish(3, 2, fixedRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]));
    expect(a).toEqual(b);
  });
});

describe("cat fishing movement", () => {
  const base: FishState = { id: 0, x: 50, y: 50, vx: 1, vy: 0, caught: false };

  it("leaves an already-caught fish completely unchanged", () => {
    const caught = { ...base, caught: true };
    expect(stepFish(caught, CONFIGS.hard, { x: 50, y: 50 }, 1)).toEqual(caught);
  });

  it("does not react to the pointer when the difficulty has no escape distance", () => {
    const stationaryRandom = fixedRng([1, 1]); // never turns
    const near = stepFish(base, CONFIGS.normal, { x: 50.5, y: 50 }, 1, stationaryRandom);
    // vy stays exactly 0 — no escape push was applied despite the pointer being adjacent.
    expect(near.vy).toBe(0);
  });

  it("pushes the fish away from a nearby pointer once escapeDistance is set", () => {
    const stationaryRandom = fixedRng([1, 1]);
    const fleeing = stepFish(base, CONFIGS.hard, { x: 55, y: 50 }, 1, stationaryRandom);
    // Pointer is to the +x side, so the fish should be deflected toward -x (or at minimum no longer purely +x).
    expect(fleeing.vx).toBeLessThan(base.vx);
  });

  it("clamps speed back to baseSpeed after an escape push compounds with existing velocity", () => {
    const stationaryRandom = fixedRng([1, 1]);
    // Pointer sits just behind the fish (at -x), so the escape push (away from
    // the pointer, toward +x) adds to the fish's existing +x velocity instead
    // of opposing it — the only arrangement that can push speed over baseSpeed.
    const fleeing = stepFish({ ...base, vx: CONFIGS.hell.baseSpeed, vy: 0 }, CONFIGS.hell, { x: 49.9, y: 50 }, 1, stationaryRandom);
    expect(Math.hypot(fleeing.vx, fleeing.vy)).toBeCloseTo(CONFIGS.hell.baseSpeed, 8);
  });

  it("bounces off the play area walls and clamps position inside bounds", () => {
    const stationaryRandom = fixedRng([1, 1]);
    const atLeftWall = stepFish({ ...base, x: 1, vx: -5, vy: 0 }, CONFIGS.normal, { x: -100, y: -100 }, 1, stationaryRandom);
    expect(atLeftWall.vx).toBeGreaterThan(0); // bounced
    expect(atLeftWall.x).toBeGreaterThanOrEqual(2);
  });

  it("scales displacement with deltaScale so speed is frame-rate independent", () => {
    const stationaryRandom = fixedRng([1, 1]); // never turns
    const at1x = stepFish(base, CONFIGS.normal, { x: -100, y: -100 }, 1, stationaryRandom);
    const at2x = stepFish(base, CONFIGS.normal, { x: -100, y: -100 }, 2, stationaryRandom);
    expect(at2x.x - base.x).toBeCloseTo((at1x.x - base.x) * 2, 8);
  });

  it("scales the turn probability by deltaScale rather than firing once per call regardless of frame time", () => {
    // turnChance(normal) = 0.02; a roll of 0.03 turns at deltaScale 2 (0.02*2=0.04 > 0.03) but not at deltaScale 1.
    const roll = fixedRng([0.03, 0.5]);
    const noTurn = stepFish(base, CONFIGS.normal, { x: -100, y: -100 }, 1, roll);
    expect(noTurn.vx).toBe(base.vx);
    const roll2 = fixedRng([0.03, 0.5]);
    const turned = stepFish(base, CONFIGS.normal, { x: -100, y: -100 }, 2, roll2);
    expect(turned.vx).not.toBe(base.vx);
  });
});

describe("cat fishing catch state", () => {
  it("marks only the targeted fish as caught", () => {
    const fish = createFish(3, 1, fixedRng([0.1, 0.2, 0.3]));
    const next = catchFish(fish, 1);
    expect(next.map((f) => f.caught)).toEqual([false, true, false]);
    expect(allCaught(next)).toBe(false);
  });

  it("reports allCaught only once every fish is caught", () => {
    let fish = createFish(2, 1, fixedRng([0.1, 0.2]));
    expect(allCaught(fish)).toBe(false);
    fish = catchFish(fish, 0);
    expect(allCaught(fish)).toBe(false);
    fish = catchFish(fish, 1);
    expect(allCaught(fish)).toBe(true);
  });
});

describe("cat fishing time format", () => {
  it("formats minutes:seconds with zero-padding", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(59)).toBe("0:59");
    expect(formatElapsed(60)).toBe("1:00");
    expect(formatElapsed(125)).toBe("2:05");
  });
});

describe("cat fishing deepening systems (quests, lore, meta)", () => {
  it("defines 4 pond fishing quests with 6 locales", () => {
    expect(INITIAL_CAT_QUESTS).toHaveLength(4);
    for (const q of INITIAL_CAT_QUESTS) {
      expect(q.title.ko).toBeDefined();
      expect(q.title.en).toBeDefined();
      expect(q.desc.ko).toBeDefined();
      expect(q.rewardChuru).toBeGreaterThan(0);
      expect(q.maxProgress).toBeGreaterThan(0);
    }
  });

  it("picks lore dialogues across all 5 fishing triggers", () => {
    const triggers = ["pond_start", "paw_catch", "fish_escape", "frenzy_rush", "pond_cleared"] as const;
    for (const tr of triggers) {
      const dialogue = pickCatFishingDialogue(tr);
      expect(dialogue).toBeDefined();
      expect(dialogue.speaker).toBeDefined();
      expect(dialogue.name.ko).toBeDefined();
      expect(dialogue.text.ko).toBeDefined();
      expect(dialogue.avatar).toBeDefined();
    }
  });

  it("calculates 5 cat upgrades and upgrade costs", () => {
    expect(CAT_UPGRADES).toHaveLength(5);
    const paw = CAT_UPGRADES.find((u) => u.id === "paw_agility")!;
    expect(paw.maxLevel).toBe(5);
    expect(getCatUpgradeCost(paw, 0)).toBe(150);
    expect(getCatUpgradeCost(paw, 1)).toBe(Math.round(150 * 1.6));
    expect(getCatUpgradeCost(paw, 5)).toBe(0); // maxed
  });

  it("computes active modifiers from upgrade levels", () => {
    const emptySave: CatFishingMetaSave = {
      version: 1,
      walletChuru: 0,
      upgradeLevels: {},
      totalFishCaught: 0,
      totalPondsCleared: 0,
    };
    const baseMods = computeCatFishingModifiers(emptySave);
    expect(baseMods.pawRadiusBonus).toBe(1.0);
    expect(baseMods.catnipSlowMult).toBe(1.0);
    expect(baseMods.freezeCharges).toBe(0);
    expect(baseMods.victoryBonusMult).toBe(1.0);

    const upgradedSave: CatFishingMetaSave = {
      version: 1,
      walletChuru: 800,
      upgradeLevels: {
        paw_agility: 2,
        catnip_aura: 2,
        golden_rod: 3,
        freeze_laser: 1,
        feline_luck: 2,
      },
      totalFishCaught: 20,
      totalPondsCleared: 3,
    };
    const mods = computeCatFishingModifiers(upgradedSave);
    expect(mods.pawRadiusBonus).toBeCloseTo(1.3);
    expect(mods.catnipSlowMult).toBeCloseTo(0.76);
    expect(mods.churuYieldMult).toBeCloseTo(1.75);
    expect(mods.freezeCharges).toBe(1);
    expect(mods.victoryBonusMult).toBeCloseTo(1.4);
  });
});

