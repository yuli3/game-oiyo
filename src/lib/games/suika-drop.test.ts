import { describe, expect, it } from 'vitest';
import {
  CONTAINER_HEIGHT,
  createInitialSuikaState,
  DEADLINE_Y,
  dropSuikaFruit,
  FRUIT_TIERS,
  moveSuikaDropper,
  shakeSuikaContainer,
  stepSuikaPhysics,
} from './suika-drop';
import { INITIAL_SUIKA_QUESTS } from './suika-drop-quests';
import { pickSuikaDialogue } from './suika-drop-lore';
import {
  SUIKA_UPGRADES,
  computeSuikaModifiers,
  getSuikaUpgradeCost,
  type SuikaMetaSave,
} from './suika-drop-meta';

describe('Suika Fruit Drop Physics & 6-System Deepening Suite (#137)', () => {
  it('initializes empty container with 10 evolution tiers and dropper in center', () => {
    const state = createInitialSuikaState();
    expect(state.status).toBe('playing');
    expect(state.fruits).toHaveLength(0);
    expect(FRUIT_TIERS).toHaveLength(10);
    expect(FRUIT_TIERS[9].nameKey).toBe('watermelon');
  });

  it('clamps dropper X within container bounds and drops a fruit with cooldown', () => {
    let state = createInitialSuikaState();
    state = moveSuikaDropper(state, -50);
    expect(state.dropperX).toBeGreaterThanOrEqual(FRUIT_TIERS[0].radius + 8);

    state = dropSuikaFruit(state);
    expect(state.fruits).toHaveLength(1);
    expect(state.dropCooldown).toBeGreaterThan(0);
  });

  it('merges two colliding fruits of the same tier into the next tier and awards score', () => {
    let state = createInitialSuikaState();
    // Place two overlapping Cherries (tier 0) at the bottom of the container
    state = {
      ...state,
      fruits: [
        {
          id: 1,
          tier: 0,
          x: 180,
          y: CONTAINER_HEIGHT - 30,
          vx: 10,
          vy: 0,
          radius: FRUIT_TIERS[0].radius,
          angle: 0,
          omega: 0,
          age: 0.5,
          popScale: 1,
        },
        {
          id: 2,
          tier: 0,
          x: 190,
          y: CONTAINER_HEIGHT - 30,
          vx: -10,
          vy: 0,
          radius: FRUIT_TIERS[0].radius,
          angle: 0,
          omega: 0,
          age: 0.5,
          popScale: 1,
        },
      ],
      nextId: 3,
    };

    state = stepSuikaPhysics(state, 0.03);
    expect(state.fruits).toHaveLength(1);
    expect(state.fruits[0].tier).toBe(1); // Evolved to Strawberry
    expect(state.mergesCount).toBe(1);
    expect(state.score).toBe(FRUIT_TIERS[1].score);
  });

  it('supports container shake impulse and triggers gameover when settled fruit exceeds deadline', () => {
    let state = createInitialSuikaState();
    state = dropSuikaFruit(state);
    state = shakeSuikaContainer(state);
    expect(state.shakesLeft).toBe(1);

    // Simulate settled fruit above DEADLINE_Y
    state = {
      ...state,
      fruits: [
        {
          id: 99,
          tier: 5,
          x: 180,
          y: DEADLINE_Y - 10,
          vx: 0,
          vy: -600,
          radius: FRUIT_TIERS[5].radius,
          angle: 0,
          omega: 0,
          age: 2.0,
          popScale: 1,
        },
      ],
      overfillTimer: 2.18,
    };

    state = stepSuikaPhysics(state, 0.05);
    expect(state.status).toBe('gameover');
  });

  it('과수원 지령 퀘스트 4종이 올바르게 정의되어 있어야 함', () => {
    expect(INITIAL_SUIKA_QUESTS.length).toBe(4);
    const firstMerge = INITIAL_SUIKA_QUESTS.find((q) => q.id === 'quest_first_merge');
    expect(firstMerge).toBeDefined();
    expect(firstMerge?.rewardJuice).toBe(100);
    expect(firstMerge?.title.ko).toBe('첫 달콤한 진화');
  });

  it('스토리 로어 3인 통신 대사가 각 트리거별로 올바르게 추출되어야 함', () => {
    const triggers = ['game_start', 'merge_success', 'overfill_danger', 'watermelon_made', 'game_over'] as const;
    for (const trig of triggers) {
      const dialogue = pickSuikaDialogue(trig);
      expect(dialogue).toBeDefined();
      expect(dialogue.text.ko.length).toBeGreaterThan(5);
      expect(dialogue.avatar.length).toBeGreaterThan(0);
    }
  });

  it('과수원 5대 영구 강화 모디파이어 및 업그레이드 비용 산출이 정확해야 함', () => {
    const resin = SUIKA_UPGRADES.find((u) => u.id === 'bounciness_resin')!;
    expect(getSuikaUpgradeCost(resin, 0)).toBe(120);
    expect(getSuikaUpgradeCost(resin, 1)).toBe(Math.round(120 * 1.55));
    expect(getSuikaUpgradeCost(resin, 5)).toBe(0);

    const save: SuikaMetaSave = {
      version: 1,
      walletJuice: 1000,
      upgradeLevels: {
        bounciness_resin: 2, // 1.0 + 0.2 = 1.2
        box_expander: 2, // 0.8s
        shake_recharge: 1, // +1
      },
      totalMerges: 50,
      totalWatermelons: 1,
    };

    const mods = computeSuikaModifiers(save);
    expect(mods.scoreMult).toBeCloseTo(1.2, 2);
    expect(mods.graceTimerBonus).toBeCloseTo(0.8, 2);
    expect(mods.extraShakes).toBe(1);

    const initState = createInitialSuikaState(0, mods);
    expect(initState.shakesLeft).toBe(3); // 2 + 1
  });

  it('무지개 젤리 조커(joker_rainbow)가 다른 과일과 충돌 시 다음 티어로 즉시 합체해야 함', () => {
    let state = createInitialSuikaState();
    state = {
      ...state,
      fruits: [
        {
          id: 1,
          tier: 3, // Dekopon
          x: 180,
          y: CONTAINER_HEIGHT - 40,
          vx: 0,
          vy: 0,
          radius: FRUIT_TIERS[3].radius,
          angle: 0,
          omega: 0,
          age: 0.5,
          popScale: 1,
          specialType: 'normal',
        },
        {
          id: 2,
          tier: 0, // Joker (any tier)
          x: 185,
          y: CONTAINER_HEIGHT - 40,
          vx: 0,
          vy: 0,
          radius: FRUIT_TIERS[0].radius,
          angle: 0,
          omega: 0,
          age: 0.5,
          popScale: 1,
          specialType: 'joker_rainbow',
        },
      ],
      nextId: 3,
    };

    state = stepSuikaPhysics(state, 0.03);
    expect(state.fruits).toHaveLength(1);
    expect(state.fruits[0].tier).toBe(4); // 3 (Dekopon) -> 4 (Persimmon)
    expect(state.mergesCount).toBe(1);
  });

  it('폭탄 파인애플(bomb_pineapple)이 충돌 시 주변 과일을 광역 폭파해야 함', () => {
    let state = createInitialSuikaState();
    state = {
      ...state,
      fruits: [
        {
          id: 1,
          tier: 0,
          x: 180,
          y: CONTAINER_HEIGHT - 40,
          vx: 0,
          vy: 0,
          radius: FRUIT_TIERS[0].radius,
          angle: 0,
          omega: 0,
          age: 0.5,
          popScale: 1,
          specialType: 'bomb_pineapple',
        },
        {
          id: 2,
          tier: 1,
          x: 190,
          y: CONTAINER_HEIGHT - 40,
          vx: 0,
          vy: 0,
          radius: FRUIT_TIERS[1].radius,
          angle: 0,
          omega: 0,
          age: 0.5,
          popScale: 1,
          specialType: 'normal',
        },
        {
          id: 3,
          tier: 2,
          x: 220,
          y: CONTAINER_HEIGHT - 40,
          vx: 0,
          vy: 0,
          radius: FRUIT_TIERS[2].radius,
          angle: 0,
          omega: 0,
          age: 0.5,
          popScale: 1,
          specialType: 'normal',
        },
      ],
      nextId: 4,
    };

    state = stepSuikaPhysics(state, 0.03);
    expect(state.fruits.length).toBeLessThan(3);
    expect(state.score).toBeGreaterThanOrEqual(250);
  });
});
