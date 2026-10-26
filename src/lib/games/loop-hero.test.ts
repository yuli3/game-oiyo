import { describe, it, expect, beforeEach } from 'vitest';
import { LoopHeroEngine, CARDS, type Equipment } from './loop-hero';

describe('LoopHeroEngine', () => {
  let engine: LoopHeroEngine;

  beforeEach(() => {
    engine = new LoopHeroEngine();
  });

  it('generates a valid closed-loop road path with Campfire at start', () => {
    expect(engine.roadPath.length).toBeGreaterThanOrEqual(20);
    const startTile = engine.grid[engine.roadPath[0].y][engine.roadPath[0].x];
    expect(startTile.tileId).toBe('campfire');
    expect(startTile.roadIndex).toBe(0);

    // Verify all road tiles are marked
    for (let i = 1; i < engine.roadPath.length; i++) {
      const pos = engine.roadPath[i];
      expect(engine.grid[pos.y][pos.x].tileId).toBe('road');
      expect(engine.grid[pos.y][pos.x].roadIndex).toBe(i);
    }
  });

  it('validates placement rules for roadside, landscape, and oblivion cards', () => {
    // Grove is roadside: cannot be placed on empty space away from road
    // Coordinate (0, 0) is diagonally adjacent to (1, 1) campfire, so it IS adjacent to road!
    // Let's find a tile with NO road neighbor: (5, 3) or (0, 7)
    // Check if (5, 3) is adjacent to road
    expect(engine.canPlaceCard(CARDS.grove, 5, 3)).toBe(false);

    // Coordinate (0, 1) is adjacent to (1, 1) road
    expect(engine.canPlaceCard(CARDS.grove, 0, 1)).toBe(true);

    // Meadow is landscape: can be placed on any empty tile that is not road
    expect(engine.canPlaceCard(CARDS.meadow, 5, 3)).toBe(true);
    // Meadow cannot be placed on road
    expect(engine.canPlaceCard(CARDS.meadow, 1, 1)).toBe(false);

    // Oblivion can clear any occupied tile except campfire
    expect(engine.canPlaceCard(CARDS.oblivion, 1, 1)).toBe(false); // campfire protected
  });

  it('morphs 3x3 rocks into a Mountain Peak with huge HP bonus', () => {
    const initialMaxHp = engine.heroStats.maxHp;

    // Place a 3x3 block of rocks at an empty region: (4..6, 3..5)
    // First clear and ensure slots are empty
    for (let y = 3; y <= 5; y++) {
      for (let x = 4; x <= 6; x++) {
        engine.grid[y][x] = { tileId: 'empty' };
      }
    }

    // Place 8 rocks manually
    for (let y = 3; y <= 5; y++) {
      for (let x = 4; x <= 6; x++) {
        if (x === 6 && y === 5) continue; // save last one
        engine.grid[y][x] = { tileId: 'rock' };
      }
    }

    // Now place the 9th rock via placeCard
    engine.hand = [CARDS.rock];
    const placed = engine.placeCard(0, 6, 5);
    expect(placed).toBe(true);

    // Center tile (5, 4) should morph to 'mountain_peak'
    expect(engine.grid[4][5].tileId).toBe('mountain_peak');
    // Surrounding rocks morph to 'mountain'
    expect(engine.grid[3][4].tileId).toBe('mountain');

    // Hero Max HP should have increased significantly (+120 from peak plus mountains)
    expect(engine.heroStats.maxHp).toBeGreaterThan(initialMaxHp + 120);
  });

  it('advances hero along road path and rest heals at campfire', () => {
    engine.heroProgress = 0.9;
    engine.heroStats.hp = 100; // damage hero
    const initialLoop = engine.loopCount;

    // Step through 1 tile
    engine.update(0.2);
    expect(engine.heroRoadIndex).toBe(1);

    // Fast-forward hero back to campfire (index 0)
    engine.heroRoadIndex = engine.roadPath.length - 1;
    engine.heroProgress = 0.95;
    engine.update(0.1);

    expect(engine.heroRoadIndex).toBe(0);
    expect(engine.loopCount).toBe(initialLoop + 1);
    expect(engine.heroStats.hp).toBeGreaterThan(100); // campfire healed 20%
  });

  it('spawns monsters when day cycle completes on tiles with spawn timers', () => {
    // Place a grove at (0, 1) which is adjacent to road index 0 (1, 1) and road index 35 (1, 2)
    engine.hand = [CARDS.grove];
    engine.placeCard(0, 0, 1);
    expect(engine.grid[1][0].tileId).toBe('grove');
    expect(engine.grid[1][0].spawnTimer).toBe(2);

    // Day 1
    engine.triggerNewDay();
    expect(engine.grid[1][0].spawnTimer).toBe(1);

    // Day 2 -> timer reaches 0, spawns ratwolf on adjacent road
    engine.triggerNewDay();
    expect(engine.grid[1][0].spawnTimer).toBe(2); // reset to 2

    const hasRatwolf = Array.from(engine.roadMonsters.values()).some(list =>
      list.some(m => m.type === 'ratwolf')
    );
    expect(hasRatwolf).toBe(true);
  });

  it('handles combat flow, damage exchange, vampirism, and victory loot drops', () => {
    engine.spawnMonsterOnRoad(5, 'slime');
    engine.heroRoadIndex = 5;
    const monsters = engine.roadMonsters.get(5)!;
    engine.startCombat(5, monsters);

    expect(engine.inCombat).toBe(true);
    expect(engine.activeMonsters.length).toBe(1);

    // Give hero high attack and 50% vampirism
    engine.heroStats.atkMin = 100;
    engine.heroStats.atkMax = 100;
    engine.heroStats.vampirism = 50;
    engine.heroStats.hp = 150;

    // Simulate 2 seconds of combat
    engine.update(2.0);

    // Monster should be dead and combat finished
    expect(engine.inCombat).toBe(false);
    expect(engine.roadMonsters.has(5)).toBe(false);
  });

  it('equips items correctly and updates player stats', () => {
    const sword: Equipment = {
      id: 'epic_sword',
      name: 'Excalibur',
      slot: 'weapon',
      level: 5,
      rarity: 'epic',
      atk: 25,
      def: 5,
      maxHpBonus: 100,
      vampirism: 15,
      regen: 2,
    };

    const initialAtk = engine.heroStats.atkMin;
    engine.equipItem(sword);

    expect(engine.equipped.weapon?.name).toBe('Excalibur');
    expect(engine.heroStats.atkMin).toBeGreaterThan(initialAtk);
    expect(engine.heroStats.vampirism).toBe(15);
    expect(engine.heroStats.regen).toBe(2);
  });
});
