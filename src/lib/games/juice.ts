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

// Celebration bursts drawn inside the game's own stage, replacing page-wide paper confetti
// (decided 2026-10-23: generic confetti reads as a web page, not a game). Each preset uses
// shapes from the game's world: shards for bricks, stars for space, tiles for tile games.

export type BurstShape = "shard" | "star" | "tile" | "coin" | "leaf" | "note" | "spark" | "ring" | "card";

export interface BurstPreset {
  shapes: readonly BurstShape[];
  count: number;
  /** Launch speed range in px/s. */
  speed: readonly [number, number];
  /** Downward acceleration in px/s². Negative floats upward. */
  gravity: number;
  /** Fraction of velocity kept per second. */
  drag: number;
  lifeMs: readonly [number, number];
  size: readonly [number, number];
  /** Max spin in rad/s. */
  spin: number;
  /** Launch direction in radians (0 = right, -π/2 = up) and spread around it. */
  angle: number;
  spread: number;
  /** Expanding shockwave rings emitted at the origin. */
  rings: number;
}

const UP = -Math.PI / 2;

export const BURST_PRESETS = {
  shards: { shapes: ["shard"], count: 46, speed: [260, 620], gravity: 900, drag: 0.35, lifeMs: [700, 1200], size: [5, 11], spin: 12, angle: UP, spread: Math.PI * 1.1, rings: 1 },
  stardust: { shapes: ["star", "spark"], count: 54, speed: [160, 520], gravity: 120, drag: 0.25, lifeMs: [800, 1400], size: [4, 10], spin: 6, angle: UP, spread: Math.PI * 2, rings: 1 },
  tiles: { shapes: ["tile"], count: 30, speed: [240, 560], gravity: 1100, drag: 0.4, lifeMs: [900, 1400], size: [9, 15], spin: 9, angle: UP, spread: Math.PI * 0.9, rings: 0 },
  cards: { shapes: ["card"], count: 22, speed: [260, 560], gravity: 1000, drag: 0.4, lifeMs: [1000, 1500], size: [12, 18], spin: 7, angle: UP, spread: Math.PI * 0.8, rings: 0 },
  coins: { shapes: ["coin"], count: 34, speed: [280, 600], gravity: 1200, drag: 0.3, lifeMs: [900, 1300], size: [6, 10], spin: 14, angle: UP, spread: Math.PI * 0.7, rings: 1 },
  leaves: { shapes: ["leaf"], count: 36, speed: [120, 360], gravity: 160, drag: 0.6, lifeMs: [1200, 1900], size: [6, 11], spin: 4, angle: UP, spread: Math.PI * 1.4, rings: 0 },
  notes: { shapes: ["note", "spark"], count: 28, speed: [120, 320], gravity: -140, drag: 0.5, lifeMs: [1000, 1600], size: [8, 13], spin: 2, angle: UP, spread: Math.PI * 0.9, rings: 2 },
  sparks: { shapes: ["spark"], count: 40, speed: [320, 700], gravity: 400, drag: 0.5, lifeMs: [400, 800], size: [6, 12], spin: 0, angle: UP, spread: Math.PI * 2, rings: 1 },
} as const satisfies Record<string, BurstPreset>;

export type BurstPresetName = keyof typeof BURST_PRESETS;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  ageMs: number;
  lifeMs: number;
  shape: BurstShape;
  color: string;
  gravity: number;
  drag: number;
}

export interface BurstField {
  /** Emits a preset at (x, y). Returns how many particles fit in the pool. */
  emit(preset: BurstPresetName | BurstPreset, x: number, y: number, colors: readonly string[], options?: { count?: number; scale?: number }): number;
  /** Advances every live particle by dtMs and retires the ones past their life. */
  step(dtMs: number): void;
  forEach(fn: (particle: Particle, progress: number) => void): void;
  readonly live: number;
}

const between = (random: Random, [min, max]: readonly [number, number]) => min + random() * (max - min);

export function createBurstField(capacity = 180, random: Random = Math.random): BurstField {
  const blank = (): Particle => ({ x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, size: 0, ageMs: 0, lifeMs: 1, shape: "spark", color: "#fff", gravity: 0, drag: 0 });
  const pool = createPool<Particle>(capacity, blank, (p) => Object.assign(p, blank()));
  const live: Particle[] = [];
  return {
    emit(name, x, y, colors, options = {}) {
      const preset: BurstPreset = typeof name === "string" ? BURST_PRESETS[name] : name;
      const palette = colors.length > 0 ? colors : ["#ffffff"];
      const scale = options.scale ?? 1;
      const count = Math.max(0, Math.round(options.count ?? preset.count));
      let emitted = 0;
      const spawn = (fill: (p: Particle) => void) => {
        const p = pool.acquire();
        if (!p) return;
        fill(p);
        live.push(p);
        emitted += 1;
      };
      for (let i = 0; i < preset.rings; i += 1) {
        spawn((p) => Object.assign(p, { x, y, size: 6 * scale, lifeMs: 420 + i * 160, shape: "ring", color: palette[i % palette.length] }));
      }
      for (let i = 0; i < count; i += 1) {
        const angle = preset.angle + (random() - 0.5) * preset.spread;
        const speed = between(random, preset.speed) * scale;
        spawn((p) => Object.assign(p, {
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rot: random() * Math.PI * 2,
          vr: (random() * 2 - 1) * preset.spin,
          size: between(random, preset.size) * scale,
          lifeMs: between(random, preset.lifeMs),
          shape: preset.shapes[Math.floor(random() * preset.shapes.length)] ?? "spark",
          color: palette[Math.floor(random() * palette.length)] ?? palette[0],
          gravity: preset.gravity * scale,
          drag: preset.drag,
        }));
      }
      return emitted;
    },
    step(dtMs) {
      const dt = Math.max(0, dtMs) / 1000;
      for (let i = live.length - 1; i >= 0; i -= 1) {
        const p = live[i];
        p.ageMs += dtMs;
        if (p.ageMs >= p.lifeMs) {
          live.splice(i, 1);
          pool.release(p);
          continue;
        }
        const keep = Math.pow(p.drag, dt);
        p.vx *= keep;
        p.vy = p.vy * keep + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
    },
    forEach(fn) {
      for (const p of live) fn(p, Math.min(1, p.ageMs / p.lifeMs));
    },
    get live() {
      return live.length;
    },
  };
}
