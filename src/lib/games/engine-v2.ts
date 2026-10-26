/**
 * OIYO Web-Unity Engine v2.0 Core SDK (`engine-v2.ts`)
 *
 * Bridges the gap between browser games and native Unity 6 mobile/indie studio architecture:
 * 1. FixedTimestepAccumulator: Unity `FixedUpdate` deterministic step + `Time.timeScale` slow-mo/fast-forward + render alpha interpolation.
 * 2. ZeroGcObjectPool<T> & FloatingTextPool: Unity `UnityEngine.Pool.ObjectPool<T>` zero-GC ring buffer for particles, projectiles, and combat text.
 * 3. computeDijkstraFlowField2D: Unity `NavMesh` / Crowd Flow-Field solver (O(W*H) single pass for 100+ agents).
 * 4. isPointInViewCone2D: Unity 2D URP Shadow/Stealth Raycast Visibility Cone & Line-of-Sight detector.
 * 5. stepVerletPendulum2D & computeSailThrustEfficiency: Unity `DistanceJoint2D` / Grappling Hook pendulum & aerodynamic dot-product solver.
 * 6. computeAdaptiveFmodMix: Unity `FMOD / AudioMixer Snapshot` 4-layer adaptive synth parameter crossfader.
 * 7. AnimationCurve & DOTween Easing Suite: Keyframe curve evaluator & tactile UI/VFX easing primitives.
 * 8. Utility AI Scorer & Deterministic State Machine: NPC tactical decision scoring & guarded state transitions.
 * 9. Seeded PRNG, ShuffleBag & Pity Timer: Fair randomness (Studio Standard R4) preventing streak frustration.
 * 10. Adaptive Quality Profiler: Rolling frame-time (p95) monitor & automatic DPR/particle tier scaler.
 */

// ============================================================================
// 1. FixedTimestepAccumulator (Unity FixedUpdate + Time.timeScale + Alpha Lerp)
// ============================================================================

export interface FixedTimestepState {
  fixedDeltaMs: number;
  accumulatorMs: number;
  timeScale: number;
  totalSimulatedMs: number;
  totalSteps: number;
}

export interface StepResult {
  state: FixedTimestepState;
  stepsToRun: number;
  alpha: number; // [0..1) interpolation factor between prev and current physics frame
}

export function createFixedTimestep(fixedDeltaMs: number = 1000 / 60, timeScale: number = 1.0): FixedTimestepState {
  return {
    fixedDeltaMs: Math.max(1, fixedDeltaMs),
    accumulatorMs: 0,
    timeScale: Math.max(0, Math.min(4.0, timeScale)),
    totalSimulatedMs: 0,
    totalSteps: 0,
  };
}

export function setTimeScale(state: FixedTimestepState, timeScale: number): FixedTimestepState {
  return {
    ...state,
    timeScale: Math.max(0, Math.min(4.0, timeScale)),
  };
}

export function advanceFixedTimestep(
  state: FixedTimestepState,
  rawDeltaMs: number,
  maxSubSteps: number = 5
): StepResult {
  // Clamp spiral-of-death delta when tab returns from background
  const clampedDeltaMs = Math.max(0, Math.min(250, rawDeltaMs));
  const scaledDeltaMs = clampedDeltaMs * state.timeScale;
  let accumulatorMs = state.accumulatorMs + scaledDeltaMs;

  let stepsToRun = 0;
  while (accumulatorMs >= state.fixedDeltaMs && stepsToRun < maxSubSteps) {
    accumulatorMs -= state.fixedDeltaMs;
    stepsToRun += 1;
  }

  // Discard excess if capped by maxSubSteps
  if (accumulatorMs >= state.fixedDeltaMs) {
    accumulatorMs = accumulatorMs % state.fixedDeltaMs;
  }

  const alpha = Math.max(0, Math.min(0.9999, accumulatorMs / state.fixedDeltaMs));

  return {
    state: {
      ...state,
      accumulatorMs,
      totalSimulatedMs: state.totalSimulatedMs + stepsToRun * state.fixedDeltaMs,
      totalSteps: state.totalSteps + stepsToRun,
    },
    stepsToRun,
    alpha,
  };
}

export function lerpScalar(prev: number, curr: number, alpha: number): number {
  return prev + (curr - prev) * alpha;
}

// ============================================================================
// 2. Zero-GC ObjectPool<T> & Floating Combat Text System
// ============================================================================

export interface PoolableItem {
  active: boolean;
}

export class ZeroGcObjectPool<T extends PoolableItem> {
  private readonly items: T[];
  private cursor: number = 0;

  constructor(capacity: number, factory: (index: number) => T) {
    const safeCap = Math.max(1, capacity);
    this.items = Array.from({ length: safeCap }, (_, idx) => factory(idx));
  }

  /**
   * Acquires an inactive slot or recycles the oldest slot in O(1) amortized time without heap allocation.
   */
  public acquire(initializer: (item: T) => void): T {
    const len = this.items.length;
    for (let i = 0; i < len; i++) {
      const idx = (this.cursor + i) % len;
      const candidate = this.items[idx];
      if (!candidate.active) {
        candidate.active = true;
        initializer(candidate);
        this.cursor = (idx + 1) % len;
        return candidate;
      }
    }
    // Pool full: recycle at cursor
    const recycled = this.items[this.cursor];
    recycled.active = true;
    initializer(recycled);
    this.cursor = (this.cursor + 1) % len;
    return recycled;
  }

  public forEachActive(callback: (item: T, index: number) => void): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.active) {
        callback(item, i);
      }
    }
  }

  public getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].active) count += 1;
    }
    return count;
  }

  public clearAll(): void {
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].active = false;
    }
    this.cursor = 0;
  }
}

export interface FloatingCombatText extends PoolableItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  isCrit: boolean;
  elapsedMs: number;
  durationMs: number;
  opacity: number;
  scale: number;
}

// ============================================================================
// 3. Dijkstra Crowd Flow-Field 2D (Unity NavMesh Crowd Routing)
// ============================================================================

export interface FlowCell {
  distance: number; // -1 if unreachable/blocked
  dirX: number;     // Normalized [-1, 0, 1] step toward goal
  dirY: number;
}

export function computeDijkstraFlowField2D(
  width: number,
  height: number,
  isBlocked: (x: number, y: number) => boolean,
  goals: ReadonlyArray<{ x: number; y: number }>
): FlowCell[][] {
  const grid: FlowCell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      distance: -1,
      dirX: 0,
      dirY: 0,
    }))
  );

  const queue: Array<{ x: number; y: number }> = [];

  for (const g of goals) {
    if (g.x >= 0 && g.x < width && g.y >= 0 && g.y < height && !isBlocked(g.x, g.y)) {
      grid[g.y][g.x].distance = 0;
      queue.push({ x: g.x, y: g.y });
    }
  }

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const currDist = grid[curr.y][curr.x].distance;

    for (const d of dirs) {
      const nx = curr.x + d.dx;
      const ny = curr.y + d.dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (isBlocked(nx, ny)) continue;
      if (grid[ny][nx].distance !== -1) continue;

      grid[ny][nx].distance = currDist + 1;
      queue.push({ x: nx, y: ny });
    }
  }

  // Compute flow vectors pointing to neighbor with minimum distance
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      if (cell.distance <= 0) continue;

      let bestDist = cell.distance;
      let bestDx = 0;
      let bestDy = 0;

      for (const d of dirs) {
        const nx = x + d.dx;
        const ny = y + d.dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const nDist = grid[ny][nx].distance;
        if (nDist >= 0 && nDist < bestDist) {
          bestDist = nDist;
          bestDx = d.dx;
          bestDy = d.dy;
        }
      }

      cell.dirX = bestDx;
      cell.dirY = bestDy;
    }
  }

  return grid;
}

// ============================================================================
// 4. 2D Raycast Stealth View-Cone & Line-of-Sight Detector
// ============================================================================

export interface ViewConeConfig {
  originX: number;
  originY: number;
  facingRad: number;
  fovRad: number;
  maxRange: number;
}

export function isPointInViewCone2D(
  cone: ViewConeConfig,
  targetX: number,
  targetY: number,
  isOccluded?: (x0: number, y0: number, x1: number, y1: number) => boolean
): { detected: boolean; distanceRatio: number; zone: 'none' | 'suspicion' | 'alert' } {
  const dx = targetX - cone.originX;
  const dy = targetY - cone.originY;
  const dist = Math.hypot(dx, dy);

  if (dist > cone.maxRange || cone.maxRange <= 0) {
    return { detected: false, distanceRatio: 1, zone: 'none' };
  }

  const angleToTarget = Math.atan2(dy, dx);
  let angleDiff = angleToTarget - cone.facingRad;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  if (Math.abs(angleDiff) > cone.fovRad * 0.5) {
    return { detected: false, distanceRatio: dist / cone.maxRange, zone: 'none' };
  }

  if (isOccluded && isOccluded(cone.originX, cone.originY, targetX, targetY)) {
    return { detected: false, distanceRatio: dist / cone.maxRange, zone: 'none' };
  }

  const distanceRatio = dist / cone.maxRange;
  // Inner 65% of cone range is immediate alert, outer 35% is suspicion zone (Shadow Tactics rule)
  const zone = distanceRatio <= 0.65 ? 'alert' : 'suspicion';

  return {
    detected: true,
    distanceRatio,
    zone,
  };
}

// ============================================================================
// 5. 2D Verlet Grappling Hook Pendulum & Sail Aerodynamics
// ============================================================================

export interface PendulumBody2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  anchorX: number;
  anchorY: number;
  ropeLength: number;
  isHooked: boolean;
}

export function stepVerletPendulum2D(
  body: PendulumBody2D,
  dtSeconds: number,
  gravity: number = 380
): PendulumBody2D {
  let vx = body.vx;
  let vy = body.vy + gravity * dtSeconds;
  let x = body.x + vx * dtSeconds;
  let y = body.y + vy * dtSeconds;

  if (body.isHooked && body.ropeLength > 0) {
    const dx = x - body.anchorX;
    const dy = y - body.anchorY;
    const dist = Math.hypot(dx, dy);

    if (dist > body.ropeLength && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      // Project position onto rope radius
      x = body.anchorX + nx * body.ropeLength;
      y = body.anchorY + ny * body.ropeLength;

      // Remove outward radial velocity component (keep tangential swing momentum)
      const radialVel = vx * nx + vy * ny;
      if (radialVel > 0) {
        vx -= radialVel * nx;
        vy -= radialVel * ny;
      }
    }
  }

  return {
    ...body,
    x,
    y,
    vx,
    vy,
  };
}

export function computeSailThrustEfficiency(
  windAngleRad: number,
  shipHeadingRad: number,
  sailTrimRad: number
): { thrustMultiplier: number; mode: 'headwind-stall' | 'tacking' | 'beam-reach' | 'tailwind-full' } {
  let diff = Math.abs(windAngleRad - shipHeadingRad);
  while (diff > Math.PI * 2) diff -= Math.PI * 2;
  if (diff > Math.PI) diff = Math.PI * 2 - diff;

  // Dead zone into the wind (< 35 degrees off bow)
  if (diff > Math.PI * 0.8) {
    return { thrustMultiplier: 0.1, mode: 'headwind-stall' };
  }

  const trimAlignment = Math.max(0.25, Math.cos(sailTrimRad));
  if (diff < Math.PI * 0.25) {
    return {
      thrustMultiplier: Number((1.0 * trimAlignment).toFixed(2)),
      mode: 'tailwind-full',
    };
  }
  if (diff <= Math.PI * 0.6) {
    // Beam reach is fastest point of sail
    return {
      thrustMultiplier: Number((1.15 * trimAlignment).toFixed(2)),
      mode: 'beam-reach',
    };
  }
  return {
    thrustMultiplier: Number((0.65 * trimAlignment).toFixed(2)),
    mode: 'tacking',
  };
}

// ============================================================================
// 6. FMOD-Style Adaptive Multi-Layer BGM Synth Parameters
// ============================================================================

export interface AdaptiveAudioMix {
  ambientPadGain: number;
  tensionPulseGain: number;
  combatArpGain: number;
  heartbeatSubGain: number;
  tempoBpm: number;
}

export function computeAdaptiveFmodMix(
  dangerIntensity: number, // [0.0 .. 1.0]
  hpRatio: number          // [0.0 .. 1.0]
): AdaptiveAudioMix {
  const d = Math.max(0, Math.min(1, dangerIntensity));
  const hp = Math.max(0, Math.min(1, hpRatio));

  return {
    ambientPadGain: Number((0.7 * (1 - d * 0.5)).toFixed(2)),
    tensionPulseGain: Number((Math.max(0, (d - 0.25) / 0.75) * 0.65).toFixed(2)),
    combatArpGain: Number((Math.max(0, (d - 0.55) / 0.45) * 0.8).toFixed(2)),
    heartbeatSubGain: hp <= 0.3 ? Number(((0.3 - hp) / 0.3 * 0.85).toFixed(2)) : 0,
    tempoBpm: Math.round(90 + d * 54),
  };
}

// ============================================================================
// 7. AnimationCurve & DOTween Easing Suite (Unity AnimationCurve Equivalent)
// ============================================================================

export type EasingMode = 'linear' | 'easeOutCubic' | 'easeInOutCubic' | 'easeOutBack' | 'easeOutElastic';

export function evaluateEasing(tRaw: number, mode: EasingMode = 'easeOutCubic'): number {
  const t = Math.max(0, Math.min(1, tRaw));
  switch (mode) {
    case 'linear':
      return t;
    case 'easeOutCubic':
      return 1 - Math.pow(1 - t, 3);
    case 'easeInOutCubic':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case 'easeOutBack': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    case 'easeOutElastic': {
      if (t === 0 || t === 1) return t;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
  }
}

export interface CurveKeyframe {
  time: number; // [0..1]
  value: number;
  easing?: EasingMode;
}

export function evaluateAnimationCurve(keyframes: ReadonlyArray<CurveKeyframe>, normalizedTime: number): number {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  const t = Math.max(keyframes[0].time, Math.min(keyframes[keyframes.length - 1].time, normalizedTime));
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k0 = keyframes[i];
    const k1 = keyframes[i + 1];
    if (t >= k0.time && t <= k1.time) {
      const span = k1.time - k0.time;
      if (span <= 0.00001) return k1.value;
      const localT = (t - k0.time) / span;
      const easedT = evaluateEasing(localT, k1.easing ?? 'linear');
      return k0.value + (k1.value - k0.value) * easedT;
    }
  }
  return keyframes[keyframes.length - 1].value;
}

// ============================================================================
// 8. Utility AI Scorer (Unity Behavior / Tactical Decision Evaluator)
// ============================================================================

export interface UtilityActionCandidate<TActionId extends string, TContext> {
  id: TActionId;
  evaluateScore: (context: TContext) => number;
}

export function selectHighestUtilityAction<TActionId extends string, TContext>(
  candidates: ReadonlyArray<UtilityActionCandidate<TActionId, TContext>>,
  context: TContext
): { selectedId: TActionId; score: number } | null {
  if (candidates.length === 0) return null;
  let bestId = candidates[0].id;
  let bestScore = candidates[0].evaluateScore(context);

  for (let i = 1; i < candidates.length; i++) {
    const score = candidates[i].evaluateScore(context);
    if (score > bestScore) {
      bestScore = score;
      bestId = candidates[i].id;
    }
  }
  return { selectedId: bestId, score: bestScore };
}

// ============================================================================
// 9. Deterministic Seeded PRNG, ShuffleBag & Pity Drop Tracker (Standard R4)
// ============================================================================

/**
 * Mulberry32 deterministic PRNG returning values in [0, 1).
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ShuffleBag guarantees fair distribution without extreme unlucky streaks (Studio Standard R4).
 */
export class ShuffleBag<T> {
  private readonly template: ReadonlyArray<T>;
  private bag: T[] = [];
  private readonly rng: () => number;

  constructor(items: ReadonlyArray<T>, rng: () => number = Math.random) {
    if (items.length === 0) {
      throw new Error('ShuffleBag requires at least 1 item');
    }
    this.template = [...items];
    this.rng = rng;
    this.refillAndShuffle();
  }

  private refillAndShuffle(): void {
    this.bag = [...this.template];
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = this.bag[i];
      this.bag[i] = this.bag[j];
      this.bag[j] = tmp;
    }
  }

  public next(): T {
    if (this.bag.length === 0) {
      this.refillAndShuffle();
    }
    return this.bag.pop()!;
  }
}

export interface PityCounterState {
  baseChance: number;     // e.g. 0.05 (5%)
  softPityStart: number;  // e.g. 10 rolls without hit
  hardPityLimit: number;  // e.g. 20 rolls guaranteed
  currentDryStreak: number;
}

export function rollWithPity(
  state: PityCounterState,
  randomVal: number
): { hit: boolean; effectiveChance: number; nextState: PityCounterState } {
  const nextAttempt = state.currentDryStreak + 1;
  if (nextAttempt >= state.hardPityLimit) {
    return {
      hit: true,
      effectiveChance: 1.0,
      nextState: { ...state, currentDryStreak: 0 },
    };
  }

  let effectiveChance = state.baseChance;
  if (nextAttempt > state.softPityStart) {
    const span = Math.max(1, state.hardPityLimit - state.softPityStart);
    const ramp = (nextAttempt - state.softPityStart) / span;
    effectiveChance = state.baseChance + (1.0 - state.baseChance) * ramp;
  }

  const hit = randomVal < effectiveChance;
  return {
    hit,
    effectiveChance: Number(effectiveChance.toFixed(4)),
    nextState: {
      ...state,
      currentDryStreak: hit ? 0 : nextAttempt,
    },
  };
}

// ============================================================================
// 10. Adaptive Quality Profiler (Unity Adaptive Performance / Frame Budget)
// ============================================================================

export type QualityTier = 'ultra' | 'balanced' | 'battery-saver';

export interface QualityProfileRecommendation {
  tier: QualityTier;
  p95FrameMs: number;
  recommendedDprCap: number;
  particleBudgetScale: number;
}

export function evaluateAdaptiveQualityTier(frameSamplesMs: ReadonlyArray<number>): QualityProfileRecommendation {
  if (frameSamplesMs.length === 0) {
    return {
      tier: 'ultra',
      p95FrameMs: 16.6,
      recommendedDprCap: 2.0,
      particleBudgetScale: 1.0,
    };
  }

  const sorted = [...frameSamplesMs].sort((a, b) => a - b);
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p95FrameMs = Number(sorted[p95Index].toFixed(2));

  if (p95FrameMs <= 20.0) {
    return {
      tier: 'ultra',
      p95FrameMs,
      recommendedDprCap: 2.0,
      particleBudgetScale: 1.0,
    };
  }
  if (p95FrameMs <= 30.0) {
    return {
      tier: 'balanced',
      p95FrameMs,
      recommendedDprCap: 1.5,
      particleBudgetScale: 0.6,
    };
  }
  return {
    tier: 'battery-saver',
    p95FrameMs,
    recommendedDprCap: 1.0,
    particleBudgetScale: 0.25,
  };
}
