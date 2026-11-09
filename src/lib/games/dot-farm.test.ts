import { describe, it, expect } from "vitest";
import {
  FarmRng,
  createFarmGame,
  stepFarmAction,
  FARM_WIDTH,
  FARM_HEIGHT,
  FarmTileType,
  getFarmIndex,
} from "./dot-farm";

describe("DotFarm Engine", () => {
  describe("FarmRng (Deterministic PRNG)", () => {
    it("produces identical random sequences for identical seeds", () => {
      const rng1 = new FarmRng(777);
      const rng2 = new FarmRng(777);

      const seq1 = [rng1.next(), rng1.range(1, 10), rng1.range(20, 50)];
      const seq2 = [rng2.next(), rng2.range(1, 10), rng2.range(20, 50)];

      expect(seq1).toEqual(seq2);
    });
  });

  describe("Farm Initialization", () => {
    it("creates farm with valid dimensions, starter seeds, and tools", () => {
      const farm = createFarmGame(1234);

      expect(farm.tiles.length).toBe(FARM_WIDTH * FARM_HEIGHT);
      expect(farm.crops.length).toBe(farm.tiles.length);
      expect(farm.money).toBe(100);
      expect(farm.energy).toBe(100);
      expect(farm.inventory.turnip.seeds).toBe(5);
      expect(farm.inventory.carrot.seeds).toBe(2);
      expect(farm.selectedTool).toBe("hoe");
    });
  });

  describe("Farming Loop: Till -> Water -> Plant -> Grow -> Harvest", () => {
    it("tills grass into dry soil, waters it, and plants a turnip", () => {
      const farm = createFarmGame(555);
      farm.farmerX = 5;
      farm.farmerY = 5;
      const idx = getFarmIndex(5, 5);
      farm.tiles[idx] = FarmTileType.Grass;

      // 1. Till with hoe
      const { state: tilledState, events: tillEvents } = stepFarmAction(farm, { type: "interact" });
      expect(tillEvents.tilled).toBe(true);
      expect(tilledState.tiles[idx]).toBe(FarmTileType.TilledDry);
      expect(tilledState.energy).toBe(96); // 100 - 4

      // 2. Water with can
      tilledState.selectedTool = "can";
      const { state: wateredState, events: waterEvents } = stepFarmAction(tilledState, { type: "interact" });
      expect(waterEvents.watered).toBe(true);
      expect(wateredState.tiles[idx]).toBe(FarmTileType.TilledWatered);

      // 3. Plant turnip seed
      wateredState.selectedTool = "seed";
      wateredState.selectedSeed = "turnip";
      const { state: plantedState, events: plantEvents } = stepFarmAction(wateredState, { type: "interact" });
      expect(plantEvents.planted).toBe(true);
      expect(plantedState.crops[idx]).toBeDefined();
      expect(plantedState.crops[idx]?.cropId).toBe("turnip");
      expect(plantedState.inventory.turnip.seeds).toBe(4); // 5 - 1
    });

    it("advances growth over night and allows harvesting mature turnip", () => {
      const farm = createFarmGame(888);
      farm.farmerX = 5;
      farm.farmerY = 5;
      const idx = getFarmIndex(5, 5);
      farm.tiles[idx] = FarmTileType.TilledWatered;
      farm.crops[idx] = {
        cropId: "turnip",
        growthDays: 1, // 1 of 2
        isMature: false,
        unwateredDays: 0,
      };

      // Sleep day 1 -> day 2
      const { state: nextDayState, events: sleepEvents } = stepFarmAction(farm, { type: "sleep" });
      expect(sleepEvents.sleptDay).toBe(true);
      expect(nextDayState.day).toBe(2);
      expect(nextDayState.crops[idx]?.growthDays).toBe(2);
      expect(nextDayState.crops[idx]?.isMature).toBe(true);

      // Harvest turnip
      const { state: harvestedState, events: harvestEvents } = stepFarmAction(nextDayState, { type: "interact" });
      expect(harvestEvents.harvested).toBe(true);
      expect(harvestedState.inventory.turnip.harvested).toBe(1);
      expect(harvestedState.crops[idx]).toBeNull();
    });

    it("supports regrowable crops like tomatoes", () => {
      const farm = createFarmGame(333);
      farm.farmerX = 5;
      farm.farmerY = 5;
      const idx = getFarmIndex(5, 5);
      farm.tiles[idx] = FarmTileType.TilledWatered;
      farm.crops[idx] = {
        cropId: "tomato",
        growthDays: 4, // mature (4 days)
        isMature: true,
        unwateredDays: 0,
      };

      // Harvest tomato
      const { state, events } = stepFarmAction(farm, { type: "interact" });
      expect(events.harvested).toBe(true);
      expect(state.inventory.tomato.harvested).toBe(1);
      // Vine is preserved!
      expect(state.crops[idx]).not.toBeNull();
      expect(state.crops[idx]?.isMature).toBe(false);
      expect(state.crops[idx]?.growthDays).toBe(2); // 4 - regrowDays(2) = 2
    });
  });

  describe("Farm Economy & Automation", () => {
    it("buys seeds from the market", () => {
      const farm = createFarmGame(111);
      farm.money = 200;

      // Buy 3 carrots (25 each = 75)
      const { state, events } = stepFarmAction(farm, { type: "buy_seed", cropId: "carrot", count: 3 });
      expect(events.boughtItem).toBe(true);
      expect(state.money).toBe(125);
      expect(state.inventory.carrot.seeds).toBe(5); // 2 + 3
    });

    it("sells harvested produce and earns cash", () => {
      const farm = createFarmGame(222);
      farm.money = 50;
      farm.inventory.turnip.harvested = 2; // 35 each = 70
      farm.inventory.strawberry.harvested = 1; // 160 each = 160

      const { state, events } = stepFarmAction(farm, { type: "sell_all" });
      expect(events.soldProduce).toBe(true);
      expect(state.money).toBe(50 + 70 + 160); // 280
      expect(state.inventory.turnip.harvested).toBe(0);
      expect(state.inventory.strawberry.harvested).toBe(0);
    });

    it("automatically waters adjacent crops with sprinkler", () => {
      const farm = createFarmGame(444);
      farm.farmerX = 6;
      farm.farmerY = 5;
      const centerIdx = getFarmIndex(6, 5);
      const rightIdx = getFarmIndex(7, 5);

      farm.sprinklers[centerIdx] = true;
      farm.tiles[rightIdx] = FarmTileType.TilledDry;

      // Sleep to next day
      const { state } = stepFarmAction(farm, { type: "sleep" });
      expect(state.tiles[rightIdx]).toBe(FarmTileType.TilledWatered);
    });

    it("triggers victory condition when reaching $5,000 net worth", () => {
      const farm = createFarmGame(999);
      farm.money = 4500;
      farm.inventory.ancient_fruit.harvested = 1; // 1500 each

      const { state, events } = stepFarmAction(farm, { type: "sell_all" });
      expect(events.victory).toBe(true);
      expect(state.status).toBe("victory");
      expect(state.money).toBe(6000);
    });
  });

  describe("Monte Carlo Determinism Audit", () => {
    it("maintains 100% deterministic progression over complex action sequence", () => {
      const seed = 67890;
      let farmA = createFarmGame(seed);
      let farmB = createFarmGame(seed);

      const actions = [
        { type: "move" as const, dir: "down" as const },
        { type: "interact" as const },
        { type: "select_tool" as const, tool: "can" as const },
        { type: "interact" as const },
        { type: "select_seed" as const, seed: "turnip" as const },
        { type: "interact" as const },
        { type: "sleep" as const },
        { type: "sleep" as const },
        { type: "interact" as const },
      ];

      for (const act of actions) {
        farmA = stepFarmAction(farmA, act).state;
        farmB = stepFarmAction(farmB, act).state;
      }

      expect(farmA.day).toBe(farmB.day);
      expect(farmA.money).toBe(farmB.money);
      expect(farmA.energy).toBe(farmB.energy);
      expect(farmA.farmerX).toBe(farmB.farmerX);
      expect(farmA.farmerY).toBe(farmB.farmerY);
      expect(farmA.totalHarvested).toBe(farmB.totalHarvested);
    });
  });
});
