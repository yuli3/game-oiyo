import { describe, it, expect } from 'vitest';
import {
  createInitialNeonSurvivorState,
  updateNeonSurvivor,
  selectUpgrade,
  expThresholdForLevel,
  type Enemy,
} from './neon-survivor';

describe('NeonSurvivor Engine', () => {
  it('initializes with default player stats and starting blaster', () => {
    const state = createInitialNeonSurvivorState();
    expect(state.player.hp).toBe(100);
    expect(state.player.maxHp).toBe(100);
    expect(state.player.level).toBe(1);
    expect(state.player.exp).toBe(0);
    expect(state.weapons.blaster).toBe(1);
    expect(state.gameOver).toBe(false);
    expect(state.levelUpPending).toBe(false);
  });

  it('calculates scaling EXP thresholds for levels', () => {
    expect(expThresholdForLevel(1)).toBe(40);
    expect(expThresholdForLevel(2)).toBe(52);
    expect(expThresholdForLevel(3)).toBe(67);
  });

  it('moves player smoothly according to input vector', () => {
    const state = createInitialNeonSurvivorState();
    const startX = state.player.x;
    const startY = state.player.y;

    const next = updateNeonSurvivor(state, 0.1, { x: 1, y: 0 });
    expect(next.player.x).toBeGreaterThan(startX);
    expect(next.player.y).toBe(startY);
  });

  it('clamps player movement within arena boundaries', () => {
    let state = createInitialNeonSurvivorState();
    state.player.x = 35;

    // Move left continuously
    for (let i = 0; i < 20; i++) {
      state = updateNeonSurvivor(state, 0.05, { x: -1, y: 0 });
    }
    expect(state.player.x).toBeGreaterThanOrEqual(30);
  });

  it('auto-fires blaster projectile towards nearest enemy', () => {
    let state = createInitialNeonSurvivorState();
    state.blasterTimer = 1.0; // ready to shoot
    state.enemies.push({
      id: 99,
      kind: 'scout',
      x: state.player.x + 200,
      y: state.player.y,
      hp: 30,
      maxHp: 30,
      speed: 100,
      damage: 10,
      radius: 12,
      color: '#f43f5e',
    });

    const next = updateNeonSurvivor(state, 0.02, { x: 0, y: 0 });
    expect(next.projectiles.length).toBeGreaterThan(0);
    const bullet = next.projectiles[0];
    expect(bullet.vx).toBeGreaterThan(0); // moving right towards enemy
  });

  it('damages enemy and generates exp gem upon defeat', () => {
    let state = createInitialNeonSurvivorState();
    const enemy: Enemy = {
      id: 101,
      kind: 'scout',
      x: state.player.x + 50,
      y: state.player.y,
      hp: 15,
      maxHp: 30,
      speed: 0,
      damage: 10,
      radius: 15,
      color: '#f43f5e',
    };
    state.enemies.push(enemy);
    state.projectiles.push({
      id: 201,
      x: state.player.x + 45,
      y: state.player.y,
      vx: 500,
      vy: 0,
      damage: 30,
      pierce: 1,
      radius: 10,
      color: '#38bdf8',
      life: 1.0,
    });

    const next = updateNeonSurvivor(state, 0.02, { x: 0, y: 0 });
    expect(next.enemies.find((e) => e.id === 101)).toBeUndefined();
    expect(next.kills).toBe(1);
    expect(next.gems.length).toBeGreaterThan(0);
  });

  it('attracts and collects exp gems within magnet radius to level up', () => {
    let state = createInitialNeonSurvivorState();
    state.gems.push({
      id: 301,
      x: state.player.x + 10,
      y: state.player.y + 10,
      value: 50, // exceeds level 1 threshold (40)
      color: '#10b981',
    });

    const next = updateNeonSurvivor(state, 0.02, { x: 0, y: 0 });
    expect(next.player.level).toBe(2);
    expect(next.levelUpPending).toBe(true);
    expect(next.upgradeChoices.length).toBeGreaterThan(0);
  });

  it('applies selected upgrade and resumes gameplay', () => {
    let state = createInitialNeonSurvivorState();
    state.levelUpPending = true;
    state.upgradeChoices = [
      {
        id: 'speed',
        title: { ko: '워프 드라이브 가속' },
        desc: { ko: '이동 속도 증가' },
        icon: '🚀',
      },
    ];

    const upgraded = selectUpgrade(state, 'speed');
    expect(upgraded.weapons.speed).toBe(1);
    expect(upgraded.player.speed).toBeGreaterThan(240);
    expect(upgraded.levelUpPending).toBe(false);
  });

  it('triggers game over when player HP drops to 0', () => {
    let state = createInitialNeonSurvivorState();
    state.player.hp = 5;
    state.player.invulnTimer = 0;
    state.enemies.push({
      id: 401,
      kind: 'scout',
      x: state.player.x + 5,
      y: state.player.y + 5,
      hp: 100,
      maxHp: 100,
      speed: 0,
      damage: 20,
      radius: 15,
      color: '#f43f5e',
    });

    const next = updateNeonSurvivor(state, 0.02, { x: 0, y: 0 });
    expect(next.player.hp).toBe(0);
    expect(next.gameOver).toBe(true);
  });

  describe('Weapon Evolution System', () => {
    it('detects available evolution when base weapon reaches Lv 5 with catalyst', () => {
      let state = createInitialNeonSurvivorState();
      state.weapons.blaster = 5;
      state.weapons.speed = 1;

      // Should offer hyperBlaster evolution
      const choices = selectUpgrade(
        { ...state, levelUpPending: true, weapons: { ...state.weapons, blaster: 5, speed: 1 } },
        'speed'
      );
      expect(choices.evolutions.hyperBlaster).toBe(false);
    });

    it('successfully unlocks Hyper Blaster evolution and fires 8-way golden salvo', () => {
      let state = createInitialNeonSurvivorState();
      state.weapons.blaster = 5;
      state.weapons.speed = 1;
      state.levelUpPending = true;

      const evolved = selectUpgrade(state, 'hyperBlaster');
      expect(evolved.evolutions.hyperBlaster).toBe(true);
      expect(evolved.levelUpPending).toBe(false);

      // Add dummy enemy to trigger firing
      evolved.enemies.push({
        id: 999,
        kind: 'scout',
        x: evolved.player.x + 100,
        y: evolved.player.y,
        hp: 500,
        maxHp: 500,
        speed: 0,
        damage: 0,
        radius: 10,
        color: '#ff0000',
      });
      evolved.blasterTimer = 1.0; // Ready to shoot

      const fired = updateNeonSurvivor(evolved, 0.05, { x: 0, y: 0 });
      expect(fired.projectiles.length).toBe(8);
      expect(fired.projectiles[0].color).toBe('#fbbf24');
      expect(fired.projectiles[0].pierce).toBe(4);
    });

    it('unlocks Aegis Shield and Supernova Vortex correctly', () => {
      let state = createInitialNeonSurvivorState();
      state.levelUpPending = true;

      const aegis = selectUpgrade(state, 'aegisShield');
      expect(aegis.evolutions.aegisShield).toBe(true);

      const nova = selectUpgrade(state, 'supernovaVortex');
      expect(nova.evolutions.supernovaVortex).toBe(true);
    });
  });
});
