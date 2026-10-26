import { describe, it, expect, beforeEach } from 'vitest';
import { VampireSurvivorEngine } from './vampire-survivor';

describe('VampireSurvivorEngine', () => {
  let engine: VampireSurvivorEngine;

  beforeEach(() => {
    engine = new VampireSurvivorEngine(1000);
  });

  it('initializes with default level 1 state', () => {
    const s = engine.getState();
    expect(s.playerLevel).toBe(1);
    expect(s.playerHp).toBe(100);
    expect(s.gameState).toBe('playing');
    expect(s.upgrades.magic_missile).toBe(1);
    expect(s.upgrades.garlic_aura).toBe(0);
  });

  it('moves player within arena boundaries', () => {
    const initial = engine.getState();
    const startX = initial.playerX;
    const startY = initial.playerY;

    engine.movePlayer(1, 0, 0.5); // move right
    const moved = engine.getState();
    expect(moved.playerX).toBeGreaterThan(startX);
    expect(moved.playerY).toBe(startY);
    expect(moved.playerFacingAngle).toBeCloseTo(0);
  });

  it('damages enemy, drops gems, and increases kill count on death', () => {
    const enemy = {
      id: 'test_bat',
      type: 'bat' as const,
      x: 500,
      y: 500,
      hp: 10,
      maxHp: 10,
      speed: 50,
      damage: 5,
      xpValue: 20,
      radius: 10,
    };
    engine.enemies.push(enemy);

    engine.damageEnemy(enemy, 5);
    expect(enemy.hp).toBe(5);
    expect(engine.getState().killCount).toBe(0);

    engine.damageEnemy(enemy, 5); // lethal damage
    expect(engine.enemies.length).toBe(0);
    expect(engine.getState().killCount).toBe(1);
    expect(engine.gems.length).toBe(1);
    expect(engine.gems[0].value).toBe(20);
  });

  it('levels up when XP threshold is met and offers 3 upgrades', () => {
    expect(engine.getState().playerLevel).toBe(1);
    expect(engine.getState().nextLevelXp).toBe(40);

    engine.addXp(45);

    const s = engine.getState();
    expect(s.playerLevel).toBe(2);
    expect(s.playerXp).toBe(5);
    expect(s.gameState).toBe('level_up');
    expect(s.offeredUpgrades.length).toBe(3);

    // Choose upgrade
    const chosen = s.offeredUpgrades[0];
    engine.chooseUpgrade(chosen);

    const nextState = engine.getState();
    expect(nextState.gameState).toBe('playing');
    expect(nextState.upgrades[chosen]).toBe((initialUpgrades[chosen] ?? 0) + 1);
    expect(nextState.offeredUpgrades).toHaveLength(0);
  });

  it('hollow heart increases player max HP and heals', () => {
    engine.chooseUpgrade('hollow_heart'); // simulate choosing
    // Wait, chooseUpgrade checks gameState === 'level_up'
    engine.addXp(100);
    engine.chooseUpgrade('hollow_heart');

    const s = engine.getState();
    expect(s.playerMaxHp).toBe(120);
    expect(s.playerHp).toBe(120);
  });

  it('applies garlic aura damage to enemies in radius', () => {
    engine.addXp(100);
    engine.chooseUpgrade('garlic_aura');
    expect(engine.getState().upgrades.garlic_aura).toBe(1);

    const target = {
      id: 'close_bat',
      type: 'bat' as const,
      x: engine.getState().playerX + 20,
      y: engine.getState().playerY,
      hp: 30,
      maxHp: 30,
      speed: 0,
      damage: 0,
      xpValue: 10,
      radius: 10,
    };
    engine.enemies.push(target);

    // trigger update with small dt
    engine.update(0.6); // garlic aura fires every 0.5s
    expect(target.hp).toBeLessThan(30);
  });

  it('holy bible computes orbit positions', () => {
    engine.addXp(100);
    engine.chooseUpgrade('holy_bible');

    const books = engine.getBibleBookPositions();
    expect(books.length).toBe(2); // 1 + level(1) = 2 books
    expect(books[0]).toHaveProperty('x');
    expect(books[0]).toHaveProperty('y');
  });

  it('triggers game over when player HP drops to zero', () => {
    const deadlyMob = {
      id: 'boss_golem',
      type: 'golem' as const,
      x: engine.getState().playerX,
      y: engine.getState().playerY,
      hp: 1000,
      maxHp: 1000,
      speed: 0,
      damage: 200,
      xpValue: 100,
      radius: 20,
    };
    engine.enemies.push(deadlyMob);

    engine.update(0.1);
    expect(engine.getState().playerHp).toBe(0);
    expect(engine.getState().gameState).toBe('game_over');
  });
});

const initialUpgrades: Record<string, number> = {
  magic_missile: 1,
  garlic_aura: 0,
  holy_bible: 0,
  throwing_knife: 0,
  lightning_strike: 0,
  spinach: 0,
  wings: 0,
  armor: 0,
  magnet: 0,
  hollow_heart: 0,
};
