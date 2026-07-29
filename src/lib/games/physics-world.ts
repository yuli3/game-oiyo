/**
 * Matter.js world lifecycle, extracted from the copy in Plinko and WheelSpinner.
 *
 * Why this exists: pinball, billiards and mini-golf all need the same six steps
 * (create engine → add static bodies → run runner → drive a canvas draw loop →
 * subscribe to collisions → tear all of it down), and getting the teardown
 * wrong leaks a runner plus a rAF per mount. Plinko had it right; the next game
 * would have had to rediscover it.
 *
 * Framework-agnostic on purpose so the ordering can be unit-tested without a
 * DOM. `Matter` is injected rather than imported so tests can pass a double and
 * so the 100KB engine stays out of any bundle that does not open a physics game.
 */

export interface PhysicsBodyLike {
  label?: string;
  position: { x: number; y: number };
}

export interface PhysicsPair {
  bodyA: PhysicsBodyLike;
  bodyB: PhysicsBodyLike;
}

/** The slice of matter-js this module touches. Keeps the test double small. */
export interface MatterLike {
  Engine: { create(opts?: unknown): unknown };
  Runner: { create(): unknown; run(runner: unknown, engine: unknown): void; stop(runner: unknown): void };
  Composite: { add(world: unknown, bodies: unknown): void; clear(world: unknown, keepStatic: boolean): void };
  Events: {
    on(engine: unknown, name: string, fn: (e: unknown) => void): void;
    off(engine: unknown, name: string, fn: (e: unknown) => void): void;
  };
}

export interface PhysicsWorldOptions {
  gravity?: { x: number; y: number };
  /** Static scenery built once. Return the bodies to add to the world. */
  setup: (world: unknown, engine: unknown) => unknown[];
  /** Called on every collisionStart with the raw pairs. */
  onCollisionStart?: (pairs: PhysicsPair[]) => void;
}

export interface PhysicsWorldHandle {
  engine: unknown;
  world: unknown;
  /** Idempotent — calling it twice must not throw or double-stop. */
  destroy: () => void;
}

/**
 * Boots an engine and returns a handle whose `destroy` reverses every step in
 * the opposite order it was applied. Idempotent so a React StrictMode double
 * invoke or an unmount racing a state update cannot stop a runner twice.
 */
export function createPhysicsWorld(
  Matter: MatterLike,
  { gravity = { x: 0, y: 1 }, setup, onCollisionStart }: PhysicsWorldOptions,
): PhysicsWorldHandle {
  const engine = Matter.Engine.create({ gravity }) as { world: unknown };
  const world = engine.world;

  Matter.Composite.add(world, setup(world, engine));

  const handler = (event: unknown) => {
    const pairs = (event as { pairs?: PhysicsPair[] })?.pairs;
    if (pairs && onCollisionStart) onCollisionStart(pairs);
  };
  if (onCollisionStart) Matter.Events.on(engine, "collisionStart", handler);

  const runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);

  let destroyed = false;
  return {
    engine,
    world,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      Matter.Runner.stop(runner);
      if (onCollisionStart) Matter.Events.off(engine, "collisionStart", handler);
      Matter.Composite.clear(world, false);
    },
  };
}

/**
 * Finds which of a collision's pairs involves `body` hitting a body labelled
 * `label`. Plinko needed this to detect "ball reached the floor" and every
 * physics game needs the same shape, always written slightly differently.
 */
export function collisionWith(pairs: PhysicsPair[], body: PhysicsBodyLike, label: string): boolean {
  return pairs.some(
    (pair) =>
      (pair.bodyA === body && pair.bodyB.label === label) ||
      (pair.bodyB === body && pair.bodyA.label === label),
  );
}
