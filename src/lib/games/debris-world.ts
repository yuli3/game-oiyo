/**
 * Debris world — a shared matter.js "juice" layer that runs *beside* a game's
 * own deterministic loop, never inside it.
 *
 * A game keeps its hand-rolled, unit-tested, serialisable simulation exactly as
 * it is (replacing it with a physics world would trade away that determinism —
 * and any save contract — to fight fast-small-body tunnelling that matter.js has
 * no CCD for). This module only spawns cosmetic shards on a discrete "something
 * broke" event — a destroyed brick, a sheared block, a wrecked ship — lets them
 * tumble under gravity, clatter on a floor body and fade. Nothing here feeds
 * back into score, lives or the save.
 *
 * First used by Brick Breaker (2026-09-07 physics vertical slice), then rolled
 * out to Stack Tower and Cave Dash.
 *
 * `Matter` is injected, never imported, so the 84KB engine stays out of a game's
 * route chunk until the player taps Start, and so the eviction / expiry /
 * teardown ordering can be unit-tested with a small double.
 */

export interface DebrisBodyLike {
  position: { x: number; y: number };
  angle: number;
}

/** The slice of matter-js this module touches. Keeps the test double small. */
export interface DebrisMatterLike {
  Engine: {
    create(opts?: unknown): { world: unknown };
    update(engine: unknown, deltaMs: number): void;
  };
  Composite: {
    add(world: unknown, body: unknown): void;
    remove(world: unknown, body: unknown): void;
  };
  Bodies: {
    rectangle(x: number, y: number, w: number, h: number, opts?: unknown): DebrisBodyLike;
  };
  Body: {
    setVelocity(body: unknown, velocity: { x: number; y: number }): void;
    setAngularVelocity(body: unknown, speed: number): void;
  };
}

export interface DebrisShardView {
  x: number;
  y: number;
  angle: number;
  hue: number;
  /** 1 → 0 across the last FADE_MS of the shard's life. */
  alpha: number;
  size: number;
}

export interface DebrisWorld {
  /** Spawn `count` shards bursting out of (x, y). No-op once at the cap+burst. */
  spawn(x: number, y: number, hue: number, count: number): void;
  /** Advance the world by up to `deltaMs` (clamped) and retire expired shards. */
  update(deltaMs: number, nowMs: number): void;
  /** Current shards for the renderer. Cheap; call once per frame. */
  shards(): DebrisShardView[];
  count(): number;
  /** Remove every shard but keep the world usable. */
  clear(): void;
  /** Idempotent. Detaches all bodies; the world must not be used afterwards. */
  destroy(): void;
}

export const DEBRIS_LIFETIME_MS = 1_100;
export const DEBRIS_FADE_MS = 380;
const MAX_STEP_MS = 32;

interface Shard {
  body: DebrisBodyLike;
  hue: number;
  bornMs: number;
  size: number;
}

export interface DebrisWorldOptions {
  width: number;
  height: number;
  /** Hard ceiling on live shards; the oldest are evicted first. */
  cap: number;
}

export function createDebrisWorld(
  Matter: DebrisMatterLike,
  { width, height, cap }: DebrisWorldOptions,
): DebrisWorld {
  const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.4 } });
  const world = engine.world;

  // Static scenery: a floor just below the board and two side walls, so shards
  // bounce and briefly pile instead of sailing off into nothing.
  const floor = Matter.Bodies.rectangle(width / 2, height + 20, width + 80, 40, { isStatic: true });
  const leftWall = Matter.Bodies.rectangle(-20, height / 2, 40, height * 2, { isStatic: true });
  const rightWall = Matter.Bodies.rectangle(width + 20, height / 2, 40, height * 2, { isStatic: true });
  Matter.Composite.add(world, floor);
  Matter.Composite.add(world, leftWall);
  Matter.Composite.add(world, rightWall);

  let shards: Shard[] = [];
  let lastNowMs = 0;
  let destroyed = false;

  const retire = (shard: Shard) => Matter.Composite.remove(world, shard.body);

  return {
    spawn(x, y, hue, count) {
      if (destroyed || count <= 0) return;
      for (let index = 0; index < count; index += 1) {
        const size = 3 + Math.random() * 3.5;
        const body = Matter.Bodies.rectangle(
          x + (Math.random() - 0.5) * 8,
          y + (Math.random() - 0.5) * 6,
          size,
          size,
          { restitution: 0.45, friction: 0.25, frictionAir: 0.02, angle: Math.random() * Math.PI },
        );
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3.5;
        Matter.Body.setVelocity(body, {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - 2,
        });
        Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
        Matter.Composite.add(world, body);
        shards.push({ body, hue, bornMs: lastNowMs, size });
      }
      if (shards.length > cap) {
        const overflow = shards.splice(0, shards.length - cap);
        for (const shard of overflow) retire(shard);
      }
    },

    update(deltaMs, nowMs) {
      if (destroyed) return;
      lastNowMs = nowMs;
      const step = Math.min(Math.max(deltaMs, 0), MAX_STEP_MS);
      if (step > 0) Matter.Engine.update(engine, step);
      shards = shards.filter((shard) => {
        if (nowMs - shard.bornMs >= DEBRIS_LIFETIME_MS) {
          retire(shard);
          return false;
        }
        return true;
      });
    },

    shards() {
      return shards.map((shard) => {
        const remaining = DEBRIS_LIFETIME_MS - (lastNowMs - shard.bornMs);
        const alpha = remaining >= DEBRIS_FADE_MS ? 1 : Math.max(0, remaining / DEBRIS_FADE_MS);
        return {
          x: shard.body.position.x,
          y: shard.body.position.y,
          angle: shard.body.angle,
          hue: shard.hue,
          alpha,
          size: shard.size,
        };
      });
    },

    count() {
      return shards.length;
    },

    clear() {
      for (const shard of shards) retire(shard);
      shards = [];
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const shard of shards) retire(shard);
      shards = [];
      Matter.Composite.remove(world, floor);
      Matter.Composite.remove(world, leftWall);
      Matter.Composite.remove(world, rightWall);
    },
  };
}
