/**
 * Suika Fruit Drop Physics (#137) — Multi-Circle Rigid Body & Evolution Merge Engine
 *
 * Implements:
 * - 10 Fruit Evolution Tiers (Lv.1 Cherry -> Lv.10 Giant Watermelon)
 * - Sub-stepped 2D circle-circle elastic & friction collision solver with angular rotation
 * - Same-tier contact fusion with midpoint spawn, Pop Shockwave impulse, and combo chains
 * - Overfill deadline warning timer & gentle container nudge ("Shake") mechanic
 */

import { type SuikaModifiers } from "./suika-drop-meta";

export type FruitSpecialType = "normal" | "joker_rainbow" | "bomb_pineapple";

export interface FruitTierDef {
  tier: number;
  nameKey: string;
  emoji: string;
  radius: number;
  score: number;
  color: string;
  rimColor: string;
}

export const FRUIT_TIERS: FruitTierDef[] = [
  { tier: 0, nameKey: 'cherry', emoji: '🍒', radius: 16, score: 2, color: '#f43f5e', rimColor: '#be123c' },
  { tier: 1, nameKey: 'strawberry', emoji: '🍓', radius: 22, score: 4, color: '#fb7185', rimColor: '#e11d48' },
  { tier: 2, nameKey: 'grape', emoji: '🍇', radius: 28, score: 8, color: '#a855f7', rimColor: '#7e22ce' },
  { tier: 3, nameKey: 'dekopon', emoji: '🍊', radius: 34, score: 16, color: '#fb923c', rimColor: '#ea580c' },
  { tier: 4, nameKey: 'persimmon', emoji: '🍅', radius: 41, score: 32, color: '#f97316', rimColor: '#c2410c' },
  { tier: 5, nameKey: 'apple', emoji: '🍎', radius: 49, score: 64, color: '#ef4444', rimColor: '#b91c1c' },
  { tier: 6, nameKey: 'pear', emoji: '🍐', radius: 57, score: 128, color: '#a3e635', rimColor: '#65a30d' },
  { tier: 7, nameKey: 'peach', emoji: '🍑', radius: 66, score: 256, color: '#f472b6', rimColor: '#db2777' },
  { tier: 8, nameKey: 'pineapple', emoji: '🍍', radius: 76, score: 512, color: '#facc15', rimColor: '#ca8a04' },
  { tier: 9, nameKey: 'watermelon', emoji: '🍉', radius: 90, score: 1024, color: '#22c55e', rimColor: '#15803d' },
];

export const CONTAINER_WIDTH = 360;
export const CONTAINER_HEIGHT = 460;
export const DEADLINE_Y = 82;

export interface FruitBody {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  omega: number;
  age: number;
  popScale: number;
  specialType?: FruitSpecialType;
}

export interface MergeBurst {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  text: string;
}

export interface SuikaState {
  status: 'playing' | 'gameover';
  fruits: FruitBody[];
  bursts: MergeBurst[];
  dropperX: number;
  currentTier: number;
  nextTier: number;
  dropCooldown: number;
  score: number;
  bestScore: number;
  mergesCount: number;
  maxTierReached: number;
  comboCount: number;
  comboTimer: number;
  shakesLeft: number;
  overfillTimer: number;
  nextId: number;
  juiceEarned: number;
  doubleWatermelonCount: number;
  modifiers?: SuikaModifiers;
}

function deterministicSpawnTier(seed: number): number {
  // Spawn tiers 0..4 (Cherry to Persimmon)
  const weights = [0, 0, 1, 1, 2, 2, 3, 4];
  return weights[Math.abs(seed) % weights.length];
}

export function createInitialSuikaState(bestScore = 0, modifiers?: SuikaModifiers): SuikaState {
  const extraShakes = modifiers?.extraShakes || 0;
  return {
    status: 'playing',
    fruits: [],
    bursts: [],
    dropperX: CONTAINER_WIDTH / 2,
    currentTier: 0,
    nextTier: 1,
    dropCooldown: 0,
    score: 0,
    bestScore,
    mergesCount: 0,
    maxTierReached: 0,
    comboCount: 0,
    comboTimer: 0,
    shakesLeft: 2 + extraShakes,
    overfillTimer: 0,
    nextId: 1,
    juiceEarned: 0,
    doubleWatermelonCount: 0,
    modifiers,
  };
}

export function moveSuikaDropper(state: SuikaState, targetX: number): SuikaState {
  if (state.status !== 'playing') return state;
  const r = FRUIT_TIERS[state.currentTier].radius;
  const clampedX = Math.max(r + 8, Math.min(CONTAINER_WIDTH - r - 8, targetX));
  return {
    ...state,
    dropperX: clampedX,
  };
}

export function dropSuikaFruit(state: SuikaState): SuikaState {
  if (state.status !== 'playing' || state.dropCooldown > 0) return state;

  const def = FRUIT_TIERS[state.currentTier];
  const clampedX = Math.max(
    def.radius + 8,
    Math.min(CONTAINER_WIDTH - def.radius - 8, state.dropperX)
  );

  const seed = (state.nextId * 17 + state.score) % 25;
  let specialType: FruitSpecialType = 'normal';
  if (seed === 0 && state.mergesCount >= 2) {
    specialType = 'joker_rainbow';
  } else if (seed === 1 && state.mergesCount >= 4) {
    specialType = 'bomb_pineapple';
  }

  const newFruit: FruitBody = {
    id: state.nextId,
    tier: state.currentTier,
    x: clampedX,
    y: DEADLINE_Y - 18,
    vx: ((state.nextId % 3) - 1) * 4,
    vy: 35,
    radius: def.radius,
    angle: 0,
    omega: 0,
    age: 0,
    popScale: 1,
    specialType,
  };

  const upcomingTier = deterministicSpawnTier(state.nextId * 7 + state.score);

  return {
    ...state,
    fruits: [...state.fruits, newFruit],
    currentTier: state.nextTier,
    nextTier: upcomingTier,
    dropCooldown: 0.38,
    maxTierReached: Math.max(state.maxTierReached, state.currentTier),
    nextId: state.nextId + 1,
  };
}

export function shakeSuikaContainer(state: SuikaState): SuikaState {
  if (state.status !== 'playing' || state.shakesLeft <= 0 || state.fruits.length === 0) {
    return state;
  }
  const fruits = state.fruits.map((f, idx) => ({
    ...f,
    vy: f.vy - 185,
    vx: f.vx + (idx % 2 === 0 ? 95 : -95),
    omega: f.omega + (idx % 2 === 0 ? 2.5 : -2.5),
  }));
  return {
    ...state,
    fruits,
    shakesLeft: state.shakesLeft - 1,
  };
}

export function stepSuikaPhysics(state: SuikaState, dt: number): SuikaState {
  if (state.status !== 'playing') return state;

  const clampedDt = Math.min(dt, 0.05);
  const substeps = 4;
  const subDt = clampedDt / substeps;
  const gravity = 680;

  let fruits = state.fruits.map((f) => ({
    ...f,
    age: f.age + clampedDt,
    popScale: Math.min(1, f.popScale + clampedDt * 4),
  }));

  let bursts = state.bursts
    .map((b) => ({
      ...b,
      radius: b.radius + clampedDt * 55,
      alpha: b.alpha - clampedDt * 1.8,
    }))
    .filter((b) => b.alpha > 0);

  let score = state.score;
  let mergesCount = state.mergesCount;
  let maxTierReached = state.maxTierReached;
  let comboCount = state.comboTimer > 0 ? state.comboCount : 0;
  let comboTimer = Math.max(0, state.comboTimer - clampedDt);
  let nextId = state.nextId;
  let extraJuice = 0;
  let isNewWatermelon = 0;

  for (let step = 0; step < substeps; step++) {
    // 1. Integrate gravity & velocities
    for (let i = 0; i < fruits.length; i++) {
      const f = fruits[i];
      f.vy += gravity * subDt;
      f.vx *= 0.996;
      f.vy *= 0.996;
      f.x += f.vx * subDt;
      f.y += f.vy * subDt;
      f.angle += f.omega * subDt;
      f.omega *= 0.96;

      // Wall & floor bounds
      if (f.x - f.radius < 6) {
        f.x = f.radius + 6;
        f.vx = Math.abs(f.vx) * 0.35;
        f.omega += f.vy * 0.002;
      } else if (f.x + f.radius > CONTAINER_WIDTH - 6) {
        f.x = CONTAINER_WIDTH - f.radius - 6;
        f.vx = -Math.abs(f.vx) * 0.35;
        f.omega -= f.vy * 0.002;
      }

      if (f.y + f.radius > CONTAINER_HEIGHT - 6) {
        f.y = CONTAINER_HEIGHT - f.radius - 6;
        f.vy = -Math.abs(f.vy) * 0.22;
        f.vx *= 0.92;
        f.omega = f.vx * 0.015;
      }
    }

    // 2. Pairwise collision & same-tier merge check
    let mergedPair: [number, number] | null = null;
    let bombTriggerIdx: number | null = null;

    for (let i = 0; i < fruits.length; i++) {
      for (let j = i + 1; j < fruits.length; j++) {
        const a = fruits[i];
        const b = fruits[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = a.radius + b.radius;

        if (distSq < minDist * minDist) {
          // Check for Bomb Pineapple trigger
          if (a.specialType === 'bomb_pineapple' || b.specialType === 'bomb_pineapple') {
            bombTriggerIdx = a.specialType === 'bomb_pineapple' ? i : j;
            break;
          }

          // Check if same tier or Joker Rainbow merge
          const isJoker = a.specialType === 'joker_rainbow' || b.specialType === 'joker_rainbow';
          if ((a.tier === b.tier || isJoker) && (a.tier < FRUIT_TIERS.length - 1 || b.tier < FRUIT_TIERS.length - 1) && !mergedPair) {
            mergedPair = [i, j];
            break;
          }

          const dist = Math.max(0.001, Math.sqrt(distSq));
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          // Mass proportional to radius^2
          const massA = a.radius * a.radius;
          const massB = b.radius * b.radius;
          const totalMass = massA + massB;
          const ratioA = massB / totalMass;
          const ratioB = massA / totalMass;

          a.x -= nx * overlap * ratioA;
          a.y -= ny * overlap * ratioA;
          b.x += nx * overlap * ratioB;
          b.y += ny * overlap * ratioB;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const velAlongNormal = rvx * nx + rvy * ny;

          if (velAlongNormal < 0) {
            const restitution = 0.25;
            const impulse = (-(1 + restitution) * velAlongNormal) / (1 / massA + 1 / massB);
            const ix = impulse * nx;
            const iy = impulse * ny;

            a.vx -= ix / massA;
            a.vy -= iy / massA;
            b.vx += ix / massB;
            b.vy += iy / massB;

            // Tangential rolling torque
            const tx = -ny;
            const ty = nx;
            const tangentSpeed = rvx * tx + rvy * ty;
            a.omega -= (tangentSpeed * 0.012) / a.radius;
            b.omega += (tangentSpeed * 0.012) / b.radius;
          }
        }
      }
      if (bombTriggerIdx !== null || mergedPair) break;
    }

    if (bombTriggerIdx !== null) {
      const bombFruit = fruits[bombTriggerIdx];
      const bx = bombFruit.x;
      const by = bombFruit.y;
      const blastRadius = 115;

      fruits = fruits.filter((f, idx) => {
        if (idx === bombTriggerIdx) return false;
        const d = Math.hypot(f.x - bx, f.y - by);
        return d > blastRadius;
      });

      const bombReward = 250;
      score += bombReward;
      mergesCount += 1;

      bursts.push({
        id: nextId++,
        x: bx,
        y: by,
        radius: blastRadius * 0.8,
        color: '#facc15',
        alpha: 1.0,
        text: `BOOM! +${bombReward}`,
      });
    } else if (mergedPair) {
      const [idxA, idxB] = mergedPair;
      const a = fruits[idxA];
      const b = fruits[idxB];
      const baseTier = Math.max(a.tier, b.tier);
      const nextTier = Math.min(FRUIT_TIERS.length - 1, baseTier + 1);
      const nextDef = FRUIT_TIERS[nextTier];
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;

      fruits = fruits.filter((_, idx) => idx !== idxA && idx !== idxB);

      // Apply pop shockwave to nearby fruits
      for (const other of fruits) {
        const sdx = other.x - mx;
        const sdy = other.y - my;
        const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
        if (sDist > 0 && sDist < nextDef.radius * 2.4) {
          const push = (1 - sDist / (nextDef.radius * 2.4)) * 95;
          other.vx += (sdx / sDist) * push;
          other.vy += (sdy / sDist) * push - 25;
        }
      }

      const evolved: FruitBody = {
        id: nextId++,
        tier: nextTier,
        x: Math.max(nextDef.radius + 6, Math.min(CONTAINER_WIDTH - nextDef.radius - 6, mx)),
        y: Math.min(CONTAINER_HEIGHT - nextDef.radius - 6, my),
        vx: (a.vx + b.vx) * 0.35,
        vy: Math.min(0, (a.vy + b.vy) * 0.35) - 45,
        radius: nextDef.radius,
        angle: 0,
        omega: (a.omega + b.omega) * 0.4,
        age: 0.2,
        popScale: 0.55,
      };
      fruits.push(evolved);

      comboCount += 1;
      comboTimer = 2.2;
      const scoreMult = state.modifiers?.scoreMult || 1.0;
      const comboBonus = comboCount > 1 ? (state.modifiers?.comboBonusMult || 1.0) : 1.0;
      const gained = Math.round(nextDef.score * Math.min(4, comboCount) * scoreMult * comboBonus);
      score += gained;
      mergesCount += 1;
      maxTierReached = Math.max(maxTierReached, nextTier);

      bursts.push({
        id: nextId++,
        x: evolved.x,
        y: evolved.y,
        radius: nextDef.radius * 0.7,
        color: nextDef.color,
        alpha: 1,
        text: comboCount > 1 ? `+${gained} (${comboCount}x!)` : `+${gained}`,
      });

      const juiceYieldMult = state.modifiers?.juiceYieldMult || 1.0;
      const juiceGained = Math.max(1, Math.round(gained * 0.25 * juiceYieldMult));
      extraJuice += juiceGained;
      if (nextTier === 9) {
        isNewWatermelon = 1;
      }
    }
  }

  const juiceYield = extraJuice;
  const newWatermelon = isNewWatermelon;

  // Check overfill deadline violation for settled fruits (age > 1.2s)
  const isOverfilled = fruits.some((f) => f.age > 1.2 && f.y - f.radius < DEADLINE_Y);
  const overfillTimer = isOverfilled ? state.overfillTimer + clampedDt : Math.max(0, state.overfillTimer - clampedDt * 2);
  const graceBonus = state.modifiers?.graceTimerBonus || 0;
  const status = overfillTimer >= (2.2 + graceBonus) ? 'gameover' : 'playing';

  return {
    ...state,
    status,
    fruits,
    bursts: bursts.slice(-8),
    dropCooldown: Math.max(0, state.dropCooldown - clampedDt),
    score,
    bestScore: Math.max(state.bestScore, score),
    mergesCount,
    maxTierReached,
    comboCount,
    comboTimer,
    overfillTimer,
    nextId,
    juiceEarned: state.juiceEarned + juiceYield,
    doubleWatermelonCount: state.doubleWatermelonCount + newWatermelon,
  };
}
