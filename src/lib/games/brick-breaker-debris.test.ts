import { describe, expect, it } from "vitest";
import Matter from "matter-js";
import {
  createDebrisWorld,
  DEBRIS_LIFETIME_MS,
  type DebrisMatterLike,
} from "./brick-breaker-debris";

/**
 * A tiny matter-js double. It only has to track which bodies are in the world
 * and let us advance "position" so expiry / eviction / teardown can be asserted
 * without pulling in the real 84KB engine.
 */
function makeMatterDouble() {
  const inWorld = new Set<object>();
  const world = { id: "world" };
  const Matter: DebrisMatterLike = {
    Engine: {
      create: () => ({ world }),
      update: () => {},
    },
    Composite: {
      add: (_world, body) => { inWorld.add(body as object); },
      remove: (_world, body) => { inWorld.delete(body as object); },
    },
    Bodies: {
      rectangle: (x, y) => ({ position: { x, y }, angle: 0 }),
    },
    Body: {
      setVelocity: () => {},
      setAngularVelocity: () => {},
    },
  };
  return { Matter, inWorld };
}

describe("brick breaker debris world", () => {
  it("adds three static scenery bodies on creation", () => {
    const { Matter, inWorld } = makeMatterDouble();
    createDebrisWorld(Matter, { width: 360, height: 480, cap: 40 });
    expect(inWorld.size).toBe(3); // floor + two walls
  });

  it("spawns the requested number of shards on top of the scenery", () => {
    const { Matter, inWorld } = makeMatterDouble();
    const world = createDebrisWorld(Matter, { width: 360, height: 480, cap: 40 });
    world.spawn(100, 100, 210, 6);
    expect(world.count()).toBe(6);
    expect(inWorld.size).toBe(3 + 6);
  });

  it("evicts the oldest shards when the cap is exceeded", () => {
    const { Matter, inWorld } = makeMatterDouble();
    const world = createDebrisWorld(Matter, { width: 360, height: 480, cap: 8 });
    world.spawn(0, 0, 200, 6);
    world.spawn(0, 0, 200, 6); // 12 requested, cap 8
    expect(world.count()).toBe(8);
    expect(inWorld.size).toBe(3 + 8);
  });

  it("retires shards once they pass their lifetime", () => {
    const { Matter } = makeMatterDouble();
    const world = createDebrisWorld(Matter, { width: 360, height: 480, cap: 40 });
    world.update(16, 1_000);
    world.spawn(10, 10, 200, 4);
    expect(world.count()).toBe(4);

    world.update(16, 1_000 + DEBRIS_LIFETIME_MS - 1);
    expect(world.count()).toBe(4);

    world.update(16, 1_000 + DEBRIS_LIFETIME_MS + 1);
    expect(world.count()).toBe(0);
  });

  it("reports a fading alpha only in the final stretch of life", () => {
    const { Matter } = makeMatterDouble();
    const world = createDebrisWorld(Matter, { width: 360, height: 480, cap: 40 });
    world.update(16, 0);
    world.spawn(10, 10, 200, 1);

    world.update(16, 100);
    expect(world.shards()[0].alpha).toBe(1);

    world.update(16, DEBRIS_LIFETIME_MS - 100);
    expect(world.shards()[0].alpha).toBeGreaterThan(0);
    expect(world.shards()[0].alpha).toBeLessThan(1);
  });

  it("clear() empties shards but keeps the world usable", () => {
    const { Matter, inWorld } = makeMatterDouble();
    const world = createDebrisWorld(Matter, { width: 360, height: 480, cap: 40 });
    world.spawn(0, 0, 200, 5);
    world.clear();
    expect(world.count()).toBe(0);
    expect(inWorld.size).toBe(3); // scenery survives
    world.spawn(0, 0, 200, 2);
    expect(world.count()).toBe(2);
  });

  it("destroy() is idempotent and removes scenery too", () => {
    const { Matter, inWorld } = makeMatterDouble();
    const world = createDebrisWorld(Matter, { width: 360, height: 480, cap: 40 });
    world.spawn(0, 0, 200, 3);
    world.destroy();
    world.destroy();
    expect(inWorld.size).toBe(0);
    world.spawn(0, 0, 200, 3); // no-op after destroy
    expect(world.count()).toBe(0);
  });
});

describe("brick breaker debris — real matter.js integration", () => {
  it("shards fall under gravity and stay on the board", () => {
    const world = createDebrisWorld(Matter as unknown as DebrisMatterLike, {
      width: 360,
      height: 480,
      cap: 90,
    });
    world.update(16, 0);
    world.spawn(180, 120, 210, 7);
    const startY = world.shards().map((shard) => shard.y);

    // ~40 frames at 60fps
    for (let frame = 1; frame <= 40; frame += 1) world.update(16, frame * 16);

    const views = world.shards();
    expect(views.length).toBe(7);
    for (let index = 0; index < views.length; index += 1) {
      expect(views[index].y).toBeGreaterThan(startY[index]); // gravity pulled it down
      expect(views[index].y).toBeLessThanOrEqual(500); // floor stopped it, no explosion
      expect(views[index].x).toBeGreaterThan(-40);
      expect(views[index].x).toBeLessThan(400);
      expect(Number.isFinite(views[index].angle)).toBe(true);
    }
    world.destroy();
  });
});
