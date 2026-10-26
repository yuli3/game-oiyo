/**
 * Suika Fruit Drop Physics (#137) — Multi-Circle Rigid Body & Evolution Merge Engine
 *
 * Implements:
 * - 10 Fruit Evolution Tiers (Lv.1 Cherry -> Lv.10 Giant Watermelon)
 * - Sub-stepped 2D circle-circle elastic & friction collision solver with angular rotation
 * - Same-tier contact fusion with midpoint spawn, Pop Shockwave impulse, and combo chains
 * - Overfill deadline warning timer & gentle container nudge ("Shake") mechanic
 */

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
}

function deterministicSpawnTier(seed: number): number {
  // Spawn tiers 0..4 (Cherry to Persimmon)
  const weights = [0, 0, 1, 1, 2, 2, 3, 4];
  return weights[Math.abs(seed) % weights.length];
}

export function createInitialSuikaState(bestScore = 0): SuikaState {
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
    shakesLeft: 2,
    overfillTimer: 0,
    nextId: 1,
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

    for (let i = 0; i < fruits.length; i++) {
      for (let j = i + 1; j < fruits.length; j++) {
        const a = fruits[i];
        const b = fruits[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = a.radius + b.radius;

        if (distSq < minDist * minDist) {
          // Check if same tier and below max tier (9 = Watermelon)
          if (a.tier === b.tier && a.tier < FRUIT_TIERS.length - 1 && !mergedPair) {
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
      if (mergedPair) break;
    }

    if (mergedPair) {
      const [idxA, idxB] = mergedPair;
      const a = fruits[idxA];
      const b = fruits[idxB];
      const nextTier = a.tier + 1;
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
      const gained = nextDef.score * Math.min(4, comboCount);
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
    }
  }

  // Check overfill deadline violation for settled fruits (age > 1.2s)
  const isOverfilled = fruits.some((f) => f.age > 1.2 && f.y - f.radius < DEADLINE_Y);
  const overfillTimer = isOverfilled ? state.overfillTimer + clampedDt : Math.max(0, state.overfillTimer - clampedDt * 2);
  const status = overfillTimer >= 2.2 ? 'gameover' : 'playing';

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
  };
}
