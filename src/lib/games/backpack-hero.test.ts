import { describe, it, expect, beforeEach } from 'vitest';
import { BackpackHeroEngine, ITEM_CATALOG } from './backpack-hero';

describe('BackpackHeroEngine', () => {
  let engine: BackpackHeroEngine;

  beforeEach(() => {
    engine = new BackpackHeroEngine(5, 6);
  });

  it('initializes with starter backpack items and floor 1 enemy', () => {
    const s = engine.getState();
    expect(s.floor).toBe(1);
    expect(s.playerHp).toBe(45);
    expect(s.energy).toBe(3);
    expect(s.items.length).toBe(3); // wooden_sword, rough_buckler, health_potion
    expect(s.currentEnemy).not.toBeNull();
    expect(s.gameState).toBe('battle');
  });

  it('rotates shape correctly across 90, 180, 270 degrees', () => {
    const shape = [{ r: 0, c: 0 }, { r: 1, c: 0 }]; // 2x1 vertical
    const rot90 = BackpackHeroEngine.rotateShape(shape, 90);
    expect(rot90).toEqual([{ r: 0, c: 0 }, { r: 0, c: -1 }]);

    const rot180 = BackpackHeroEngine.rotateShape(shape, 180);
    expect(rot180).toEqual([{ r: 0, c: 0 }, { r: -1, c: 0 }]);
  });

  it('checks placement boundary and unlocked slots', () => {
    // Slot (0,0) is initially locked
    expect(engine.canPlaceItem('iron_dagger', 0, 0, 0)).toBe(false);

    // Slot (1,1) and (2,1) are occupied by starter wooden_sword (size 2x1)
    expect(engine.canPlaceItem('iron_dagger', 1, 1, 0)).toBe(false);
    expect(engine.canPlaceItem('iron_dagger', 2, 1, 0)).toBe(false);

    // Slot (1,2) is unlocked and empty
    expect(engine.canPlaceItem('iron_dagger', 1, 2, 0)).toBe(true);
  });

  it('calculates spatial adjacency synergy bonuses', () => {
    // Add Fire Ruby in the same row/col as wooden sword
    const rubyPlaced = engine.addItem('fire_ruby', 1, 3, 0); // same row (1)
    expect(rubyPlaced).toBe(true);

    const sword = engine.getState().items.find((i) => i.defId === 'wooden_sword');
    expect(sword).toBeDefined();

    const { value, bonus } = engine.calculateEffectiveItemValue(sword!.instanceId);
    // Base 7 + 3 (Fire Ruby in same row)
    expect(bonus).toBeGreaterThanOrEqual(3);
    expect(value).toBe(ITEM_CATALOG.wooden_sword.baseValue + bonus);
  });

  it('activates weapon, consumes energy, and damages enemy', () => {
    const sword = engine.getState().items.find((i) => i.defId === 'wooden_sword');
    expect(sword).toBeDefined();

    const initialEnemyHp = engine.getState().currentEnemy!.hp;
    const res = engine.activateItem(sword!.instanceId);

    expect(res.success).toBe(true);
    expect(engine.getState().energy).toBe(2);
    expect(engine.getState().currentEnemy!.hp).toBeLessThan(initialEnemyHp);
  });

  it('consumes potion, heals player, and removes potion from backpack', () => {
    engine.setPlayerHp(20); // simulate wounded
    const potion = engine.getState().items.find((i) => i.defId === 'health_potion');
    expect(potion).toBeDefined();

    const res = engine.activateItem(potion!.instanceId);
    expect(res.success).toBe(true);
    expect(engine.getState().playerHp).toBe(34); // 20 + 14 = 34
    expect(engine.getState().items.some((i) => i.defId === 'health_potion')).toBe(false);
  });

  it('advances turn, handles enemy attack, and resets energy', () => {
    engine.activateItem(engine.getState().items[0].instanceId); // spend energy
    expect(engine.getState().energy).toBeLessThan(3);

    const prevHp = engine.getState().playerHp;
    engine.endTurn();

    expect(engine.getState().energy).toBe(3);
    // If enemy attacked, player takes damage or blocks
    expect(engine.getState().playerHp).toBeLessThanOrEqual(prevHp);
  });

  it('defeats enemy, grants loot pool and unlocks slots', () => {
    const enemy = engine.getState().currentEnemy!;
    enemy.hp = 1; // 1 HP left

    const sword = engine.getState().items.find((i) => i.defId === 'wooden_sword')!;
    engine.activateItem(sword.instanceId);

    expect(engine.getState().gameState).toBe('loot');
    expect(engine.getState().lootPool.length).toBe(3);
    expect(engine.getState().expandChoicesLeft).toBe(2);

    // Unlock an adjacent slot (0, 1) which is adjacent to (1, 1)
    const unlocked = engine.unlockSlot(0, 1);
    expect(unlocked).toBe(true);
    expect(engine.getState().unlockedSlots[0][1]).toBe(true);
    expect(engine.getState().expandChoicesLeft).toBe(1);
  });
});
