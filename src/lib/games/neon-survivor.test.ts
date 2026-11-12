import { describe, it, expect } from 'vitest';
import {
  createInitialNeonSurvivorState,
  updateNeonSurvivor,
  selectUpgrade,
  expThresholdForLevel,
  type Enemy,
} from './neon-survivor';
import {
  createInitialQuests,
  updateQuestsOnKill,
  updateQuestsOnTime,
  updateQuestsOnEvolution,
  updateQuestsOnBossDefeat,
} from './neon-survivor-quests';
import { getTriggeredLore } from './neon-survivor-lore';

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

    it('spawns Dreadnought at 60s and Void Titan elite boss at 180s with warning', () => {
      let state = createInitialNeonSurvivorState();
      state.survivalTime = 60.0;

      const at60 = updateNeonSurvivor(state, 0.05, { x: 0, y: 0 });
      expect(at60.bossSpawned).toBe(true);
      expect(at60.bossWarningTimer).toBeGreaterThan(0);
      expect(at60.activeBossName).toBe('DREADNOUGHT');
      const dreadnought = at60.enemies.find((e) => e.kind === 'boss' && e.bossTitle === 'DREADNOUGHT');
      expect(dreadnought).toBeDefined();

      at60.survivalTime = 180.0;
      const at180 = updateNeonSurvivor(at60, 0.05, { x: 0, y: 0 });
      expect(at180.activeBossName).toBe('VOID TITAN');
      const voidTitan = at180.enemies.find((e) => e.isElite && e.bossTitle === 'VOID TITAN');
      expect(voidTitan).toBeDefined();
      expect(voidTitan?.hp).toBe(3500);

      // Defeating Elite boss drops 5 mega gems
      voidTitan!.hp = 0;
      const afterKill = updateNeonSurvivor(at180, 0.05, { x: 0, y: 0 });
      const megaGems = afterKill.gems.filter((g) => g.value === 60);
      expect(megaGems.length).toBe(5);
    });
  });

  describe('Meta Progression & Upgrades', () => {
    it('applies meta progression bonuses on state initialization', () => {
      const state = createInitialNeonSurvivorState({
        hullPlating: 3,
        reactorPower: 2,
        magnetCoil: 4,
        warpThrust: 2,
        critAlgorithm: 3,
      });

      // Extra HP: 100 + 3 * 25 = 175
      expect(state.player.hp).toBe(175);
      expect(state.player.maxHp).toBe(175);
      // Speed mult: 240 * (1 + 2 * 0.05) = 264
      expect(state.player.speed).toBeCloseTo(264);
      // Magnet mult: 130 * (1 + 4 * 0.20) = 234
      expect(state.player.magnetRadius).toBeCloseTo(234);
      // Multipliers recorded
      expect(state.metaMultipliers?.damageMult).toBeCloseTo(1.12);
      expect(state.metaMultipliers?.critChance).toBeCloseTo(0.12);
    });
  });

  describe('Supply Drop Capsule & Mutations', () => {
    it('picks up supply drop capsule and restores HP and gives crystals', () => {
      let state = createInitialNeonSurvivorState();
      state.player.hp = 30; // Damaged
      state.supplyDrops = [
        {
          id: 999,
          x: state.player.x,
          y: state.player.y,
          radius: 20,
          life: 30,
          beaconPulse: 0,
        },
      ];

      const next = updateNeonSurvivor(state, 0.05, { x: 0, y: 0 });
      expect(next.player.hp).toBeGreaterThan(30);
      expect(next.crystals).toBe(5);
      expect(next.recentSupplyJackpot).toBe('SUPPLY_JACKPOT');
      expect(next.supplyDrops.length).toBe(0);
    });

    it('shielded enemy absorbs damage and explosive enemy damages nearby on death', () => {
      let state = createInitialNeonSurvivorState();
      const shieldedEnemy: Enemy = {
        id: 100,
        kind: 'brute',
        x: state.player.x + 300, // Place far enough so bullet travels without immediate instant hit
        y: state.player.y,
        hp: 100,
        maxHp: 100,
        speed: 0, // Stationed
        damage: 10,
        radius: 15,
        color: '#06b6d4',
        mutation: 'shielded',
        shieldHp: 3,
      };
      state.enemies = [shieldedEnemy];
      state.weapons.blaster = 1;
      state.blasterTimer = 0.5;

      // Projectile fires
      const afterShot = updateNeonSurvivor(state, 0.05, { x: 0, y: 0 });
      const bullet = afterShot.projectiles[0];
      expect(bullet).toBeDefined();

      // Simulate bullet hitting the shielded enemy
      bullet.x = shieldedEnemy.x;
      bullet.y = shieldedEnemy.y;
      bullet.vx = 0;
      bullet.vy = 0;
      const afterHit = updateNeonSurvivor(afterShot, 0.05, { x: 0, y: 0 });
      const target = afterHit.enemies.find((e) => e.id === 100);
      expect(target?.shieldHp).toBe(2);

      // Explosive enemy detonation test
      const explosiveEnemy: Enemy = {
        id: 200,
        kind: 'scout',
        x: 300,
        y: 300,
        hp: 0, // Dying
        maxHp: 20,
        speed: 100,
        damage: 5,
        radius: 10,
        color: '#ef4444',
        mutation: 'explosive',
      };
      const neighbor: Enemy = {
        id: 201,
        kind: 'scout',
        x: 340, // 40px away, within 140px boom radius
        y: 300,
        hp: 80,
        maxHp: 80,
        speed: 100,
        damage: 5,
        radius: 10,
        color: '#f43f5e',
      };
      afterHit.enemies = [explosiveEnemy, neighbor];
      const afterExplosion = updateNeonSurvivor(afterHit, 0.05, { x: 0, y: 0 });
      const neighborAfter = afterExplosion.enemies.find((e) => e.id === 201);
      expect(neighborAfter?.hp).toBe(20); // 80 - 60 = 20
    });
  });

  describe('Directives & Quests System', () => {
    it('updates quest progress on kills, time, and evolution', () => {
      let quests = createInitialQuests();
      expect(quests.length).toBe(4);

      // Kill progress
      quests = updateQuestsOnKill(quests, 40);
      const droneQuest = quests.find((q) => q.id === 'scout_hunter');
      expect(droneQuest?.completed).toBe(true);

      // Survival time progress
      quests = updateQuestsOnTime(quests, 125);
      const surviveQuest = quests.find((q) => q.id === 'survive_time');
      expect(surviveQuest?.completed).toBe(true);

      // Evolution progress
      quests = updateQuestsOnEvolution(quests);
      const evoQuest = quests.find((q) => q.id === 'weapon_evolution');
      expect(evoQuest?.completed).toBe(true);

      // Boss progress
      quests = updateQuestsOnBossDefeat(quests);
      const bossQuest = quests.find((q) => q.id === 'boss_slayer');
      expect(bossQuest?.completed).toBe(true);
    });
  });

  describe('Lore & Transmission System', () => {
    it('triggers storyline lore entries at specific timestamps', () => {
      const triggered = new Set<string>();
      const entry1 = getTriggeredLore(1.5, triggered);
      expect(entry1).toBeDefined();
      expect(entry1?.id).toBe('intro_transmission');
      triggered.add(entry1!.id);

      const entry2 = getTriggeredLore(65, triggered);
      expect(entry2).toBeDefined();
      expect(entry2?.id).toBe('swarm_density_up');
      triggered.add(entry2!.id);

      const entry3 = getTriggeredLore(65, triggered);
      expect(entry3).toBeDefined();
      expect(entry3?.id).toBe('boss_dreadnought');
    });
  });
});


describe('Neon dash gameplay contract', () => {
  it('bursts in facing direction without mutating base speed and rejects spam', () => {
    const initial = createInitialNeonSurvivorState();
    const next = updateNeonSurvivor(initial, 0.05, { x: 0, y: 0, dash: true });
    expect(next.player.x - initial.player.x).toBeCloseTo(initial.player.speed * 0.05 * 2.6);
    expect(next.player.speed).toBe(initial.player.speed);
    expect(next.player.invulnTimer).toBeGreaterThan(0);
    const spam = updateNeonSurvivor(next, 0.05, { x: 1, y: 0, dash: true });
    expect(spam.dashCooldown).toBeLessThan(next.dashCooldown!);
    expect(spam.dashRemaining).toBeLessThan(next.dashRemaining!);
  });

  it('freezes recharge at upgrade selection and resets cleanly on a new run', () => {
    const next = updateNeonSurvivor(createInitialNeonSurvivorState(), 0.05, { x: 1, y: 0, dash: true });
    const frozen = { ...next, levelUpPending: true };
    expect(updateNeonSurvivor(frozen, 0.05, { x: 1, y: 0 })).toBe(frozen);
    expect(createInitialNeonSurvivorState().dashCooldown ?? 0).toBe(0);
  });

  it('returns to normal travel and preserves a speed upgrade during the burst', () => {
    let state = updateNeonSurvivor(createInitialNeonSurvivorState(), 0.05, { x: 1, y: 0, dash: true });
    state = { ...state, player: { ...state.player, speed: 300 } };
    for (let i = 0; i < 4; i++) state = updateNeonSurvivor(state, 0.05, { x: 1, y: 0 });
    const before = state.player.x;
    state = updateNeonSurvivor(state, 0.05, { x: 1, y: 0 });
    expect(state.player.x - before).toBeCloseTo(15);
    expect(state.player.speed).toBe(300);
    expect(state.dashRemaining).toBe(0);
  });
});
