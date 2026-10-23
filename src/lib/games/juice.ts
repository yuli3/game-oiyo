// Renderer-agnostic game feel: screen shake, hit-stop, combo tiers and an object pool.
// Numbers follow the studio standard (01-quality-bar.md F1-F3, F6) and the VFX juice spec
// (company-brain projects/game/vfx-juice-spec.md). Reduced motion turns shake and hit-stop
// off without changing game time. Pixi, three or a 2D context read the offsets each frame.
// 2026-10-23

export const JUICE = {
  /** Scale while a piece is pressed, and how long the release bounce takes. */
  pressScale: 0.95,
  releaseMs: 160,
  shake: { light: 4, fail: 5, heavy: 8, durationMs: 180, failMs: 150 },
  hitstop: { hit: 55, boss: 80 },
  /** Combo counts where the effect steps up one tier. */
  comboTiers: [3, 5, 8] as const,
} as const;

export type Random = () => number;

export interface Shake {
  /** Starts or strengthens a shake; a weaker kick never cuts a stronger one short. */
  kick(amplitude?: number, durationMs?: number): void;
  /** Advances by dtMs and returns this frame's offset in pixels. */
  sample(dtMs: number, random?: Random): { x: number; y: number };
  readonly active: boolean;
}

export function createShake(options: { reducedMotion?: () => boolean } = {}): Shake {
  const reduced = options.reducedMotion ?? (() => false);
  let amplitude = 0;
  let total = 0;
  let left = 0;
  return {
    kick(next = JUICE.shake.light, durationMs = JUICE.shake.durationMs) {
      if (reduced() || next <= 0 || durationMs <= 0) return;
      const current = total > 0 ? amplitude * (left / total) : 0;
      if (next < current) return;
      amplitude = next;
      total = durationMs;
      left = durationMs;
    },
    sample(dtMs, random = Math.random) {
      if (left <= 0 || reduced()) {
        left = 0;
        return { x: 0, y: 0 };
      }
      left = Math.max(0, left - dtMs);
      const strength = amplitude * (left / total);
      return { x: (random() * 2 - 1) * strength, y: (random() * 2 - 1) * strength * 0.5 };
    },
    get active() {
      return left > 0;
    },
  };
}

export interface Hitstop {
  trigger(ms?: number): void;
  /** Returns how much of dtMs the simulation may advance; 0 while frozen. */
  consume(dtMs: number): number;
  readonly frozen: boolean;
}

/** Freeze frames on a heavy hit. Only for visual time: never feed it to a fixed-step rule clock. */
export function createHitstop(options: { reducedMotion?: () => boolean } = {}): Hitstop {
  const reduced = options.reducedMotion ?? (() => false);
  let left = 0;
  return {
    trigger(ms = JUICE.hitstop.hit) {
      if (reduced()) return;
      left = Math.max(left, ms);
    },
    consume(dtMs) {
      if (left <= 0) return dtMs;
      const frozen = Math.min(left, dtMs);
      left -= frozen;
      return dtMs - frozen;
    },
    get frozen() {
      return left > 0;
    },
  };
}

/** 0 below the first tier, then 1, 2, 3 as the combo grows. */
export function comboTier(combo: number): number {
  let tier = 0;
  for (const threshold of JUICE.comboTiers) if (combo >= threshold) tier += 1;
  return tier;
}

export interface Pool<T> {
  acquire(): T | null;
  release(item: T): void;
  readonly live: number;
}

/**
 * Fixed-size pool for particles, popups and other short-lived objects, so a busy frame
 * allocates nothing. acquire() returns null when every slot is live: drop the effect.
 */
export function createPool<T>(size: number, create: () => T, reset: (item: T) => void): Pool<T> {
  const free: T[] = Array.from({ length: size }, create);
  const inUse = new Set<T>();
  return {
    acquire() {
      const item = free.pop();
      if (item === undefined) return null;
      inUse.add(item);
      return item;
    },
    release(item) {
      if (!inUse.delete(item)) return;
      reset(item);
      free.push(item);
    },
    get live() {
      return inUse.size;
    },
  };
}
