import { describe, expect, it, vi } from "vitest";
import { collisionWith, createPhysicsWorld, type MatterLike, type PhysicsBodyLike } from "./physics-world";

function makeMatter() {
  const calls: string[] = [];
  const world = { id: "world" };
  const engine = { world };
  const runner = { id: "runner" };
  const handlers: Record<string, ((e: unknown) => void)[]> = {};

  const Matter: MatterLike = {
    Engine: { create: () => { calls.push("engine.create"); return engine; } },
    Runner: {
      create: () => { calls.push("runner.create"); return runner; },
      run: () => { calls.push("runner.run"); },
      stop: () => { calls.push("runner.stop"); },
    },
    Composite: {
      add: () => { calls.push("composite.add"); },
      clear: () => { calls.push("composite.clear"); },
    },
    Events: {
      on: (_e, name, fn) => { calls.push("events.on"); (handlers[name] ||= []).push(fn); },
      off: (_e, name, fn) => {
        calls.push("events.off");
        handlers[name] = (handlers[name] ?? []).filter((h) => h !== fn);
      },
    },
  };
  return { Matter, calls, engine, world, handlers };
}

describe("createPhysicsWorld", () => {
  it("adds scenery before starting the runner", () => {
    // Order matters: a runner stepping an empty world for a frame lets bodies
    // spawn mid-air on the first tick, which reads as a visual glitch.
    const { Matter, calls } = makeMatter();
    createPhysicsWorld(Matter, { setup: () => [{ label: "peg", position: { x: 0, y: 0 } }] });
    expect(calls.indexOf("composite.add")).toBeLessThan(calls.indexOf("runner.run"));
  });

  it("passes the real world and engine to setup", () => {
    const { Matter, engine, world } = makeMatter();
    const setup = vi.fn(() => []);
    createPhysicsWorld(Matter, { setup });
    expect(setup).toHaveBeenCalledWith(world, engine);
  });

  it("tears down in reverse order", () => {
    const { Matter, calls } = makeMatter();
    const handle = createPhysicsWorld(Matter, { setup: () => [], onCollisionStart: () => {} });
    calls.length = 0;
    handle.destroy();
    expect(calls).toEqual(["runner.stop", "events.off", "composite.clear"]);
  });

  it("stop is idempotent and run restarts the runner", () => {
    const { Matter, calls } = makeMatter();
    const handle = createPhysicsWorld(Matter, { setup: () => [] });
    calls.length = 0;
    handle.stop();
    handle.stop();
    expect(calls).toEqual(["runner.stop"]);
    calls.length = 0;
    handle.run();
    handle.run();
    expect(calls).toEqual(["runner.run"]);
  });

  it("destroy is idempotent", () => {
    // StrictMode double-invoke and an unmount racing a state update both call
    // this twice; stopping a stopped runner must not throw or double-clear.
    const { Matter, calls } = makeMatter();
    const handle = createPhysicsWorld(Matter, { setup: () => [] });
    handle.destroy();
    calls.length = 0;
    handle.destroy();
    expect(calls).toEqual([]);
  });

  it("does not subscribe when no collision handler is given", () => {
    const { Matter, calls } = makeMatter();
    createPhysicsWorld(Matter, { setup: () => [] });
    expect(calls).not.toContain("events.on");
  });

  it("forwards collision pairs to the handler", () => {
    const { Matter, handlers } = makeMatter();
    const seen: unknown[] = [];
    createPhysicsWorld(Matter, { setup: () => [], onCollisionStart: (pairs) => seen.push(pairs) });
    const pairs = [{ bodyA: { position: { x: 0, y: 0 } }, bodyB: { label: "floor", position: { x: 0, y: 0 } } }];
    handlers.collisionStart[0]({ pairs });
    expect(seen).toEqual([pairs]);
  });

  it("ignores a collision event with no pairs", () => {
    const { Matter, handlers } = makeMatter();
    const onCollisionStart = vi.fn();
    createPhysicsWorld(Matter, { setup: () => [], onCollisionStart });
    handlers.collisionStart[0]({});
    expect(onCollisionStart).not.toHaveBeenCalled();
  });
});

describe("collisionWith", () => {
  const ball: PhysicsBodyLike = { label: "ball", position: { x: 1, y: 1 } };
  const floor: PhysicsBodyLike = { label: "floor", position: { x: 0, y: 9 } };
  const peg: PhysicsBodyLike = { label: "peg", position: { x: 2, y: 2 } };

  it("matches regardless of which side the body is on", () => {
    expect(collisionWith([{ bodyA: ball, bodyB: floor }], ball, "floor")).toBe(true);
    expect(collisionWith([{ bodyA: floor, bodyB: ball }], ball, "floor")).toBe(true);
  });

  it("does not match a different label", () => {
    expect(collisionWith([{ bodyA: ball, bodyB: peg }], ball, "floor")).toBe(false);
  });

  it("does not match a collision the body is not part of", () => {
    expect(collisionWith([{ bodyA: peg, bodyB: floor }], ball, "floor")).toBe(false);
  });
});
