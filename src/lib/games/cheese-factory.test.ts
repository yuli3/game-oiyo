import { describe, it, expect } from 'vitest';
import {
  createCheeseFactoryGame,
  spawnCheeseBatch,
  stepCheeseFactory,
  buyFactoryUpgrade,
  upgradeStation,
  setCellarTargetTemp,
  runCheeseFactoryBalanceAudit,
  packCheeseTag,
  unpackCheeseTag,
  CHEESE_VARIETIES,
} from './cheese-factory';

describe('Cheese Factory Tycoon Engine (#154)', () => {
  it('1. initializes factory with 7 processing stations, 2 AGV bots and initial cash', () => {
    const game = createCheeseFactoryGame(350);
    expect(game.cash).toBe(350);
    expect(game.milkInventory).toBe(200);
    expect(game.stations.length).toBe(7);
    expect(game.stations[0].id).toBe('milk_silo');
    expect(game.stations[5].id).toBe('aging_cellar');
    expect(game.stations[6].id).toBe('shipping');
    expect(game.bots.length).toBe(2);
    expect(game.ecsWorld.getActiveCount()).toBe(0);
  });

  it('2. spawns cheese batches and tracks SoA components with bit-packed tags', () => {
    const game = createCheeseFactoryGame(300);
    const initialMilk = game.milkInventory;
    const mozzCost = CHEESE_VARIETIES.mozzarella.baseMilkCost;

    const spawned = spawnCheeseBatch(game, 'mozzarella');
    expect(spawned).toBe(true);
    expect(game.milkInventory).toBe(initialMilk - mozzCost);
    expect(game.ecsWorld.getActiveCount()).toBe(1);

    // Verify tag packing
    const packed = packCheeseTag(3, 2, 95);
    const unpacked = unpackCheeseTag(packed);
    expect(unpacked.stageIndex).toBe(3);
    expect(unpacked.varietyIndex).toBe(2);
    expect(unpacked.quality).toBe(95);
  });

  it('3. processes cheese through stations and matures in cellar based on temperature', () => {
    const game = createCheeseFactoryGame(300);
    spawnCheeseBatch(game, 'mozzarella');

    // Simulate forward until cheese traverses early stations into cellar and ships
    let shipped = 0;
    for (let i = 0; i < 300; i++) {
      const result = stepCheeseFactory(game, 0.1);
      shipped += result.shippedCount;
      if (shipped > 0) break;
    }

    expect(shipped).toBe(1);
    expect(game.totalCheesesShipped).toBe(1);
    expect(game.cash).toBeGreaterThan(300);
    expect(game.totalRevenueEarned).toBeGreaterThan(0);
  });

  it('4. purchases upgrades, expands AGV bot fleet and upgrades station processing speeds', () => {
    const game = createCheeseFactoryGame(500);

    const boughtBot = buyFactoryUpgrade(game, 'automated_agv_1');
    expect(boughtBot).toBe(true);
    expect(game.bots.length).toBe(3);
    expect(game.cash).toBe(250);

    const upgradedSilo = upgradeStation(game, 'milk_silo');
    expect(upgradedSilo).toBe(true);
    expect(game.stations[0].level).toBe(2);
    expect(game.stations[0].processSpeedMultiplier).toBeGreaterThan(1.0);

    setCellarTargetTemp(game, 12);
    expect(game.targetCellarTemp).toBe(12);
  });

  it('5. passes Monte Carlo economic & automated production balance audit', () => {
    const audit = runCheeseFactoryBalanceAudit(180);
    expect(audit.passed).toBe(true);
    expect(audit.totalShipped).toBeGreaterThanOrEqual(10);
    expect(audit.finalCash).toBeGreaterThan(audit.initialCash);
    expect(audit.roi).toBeGreaterThan(1.2);
  });
});
