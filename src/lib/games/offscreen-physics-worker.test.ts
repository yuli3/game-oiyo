import { describe, it, expect } from "vitest";
import {
  PhysicsBufferSerializer,
  OffscreenPhysicsBridge,
  type PhysicsBodyState,
} from "./offscreen-physics-worker";

describe("Offscreen Physics Worker Pipeline", () => {
  it("packs and unpacks physics states into contiguous Float32Array", () => {
    const bodies: PhysicsBodyState[] = [
      { id: 101, x: 12.5, y: 34.2, angle: 1.57, vx: 5.0, vy: -2.0 },
      { id: 102, x: 50.0, y: 90.0, angle: 0.0, vx: 0.0, vy: 10.0 },
    ];

    const packed = PhysicsBufferSerializer.pack(bodies);
    expect(packed.length).toBe(bodies.length * 5);
    expect(packed[0]).toBe(101); // id
    expect(packed[1]).toBeCloseTo(12.5, 1); // x

    const unpacked = PhysicsBufferSerializer.unpack(packed);
    expect(unpacked.length).toBe(2);
    expect(unpacked[0].id).toBe(101);
    expect(unpacked[1].id).toBe(102);
    expect(unpacked[1].x).toBeCloseTo(50.0, 1);
  });

  it("updates bodies in background runner and syncs transforms to main bridge", () => {
    const bridge = new OffscreenPhysicsBridge();
    bridge.registerBody({
      id: 1,
      x: 0,
      y: 0,
      angle: 0,
      vx: 100, // 초당 100px 이동
      vy: 0,
    });

    // 0.1초 시뮬레이션
    bridge.tick(0.1);

    const transform = bridge.getTransform(1);
    expect(transform).toBeDefined();
    if (transform) {
      expect(transform.x).toBeGreaterThan(9.0); // 10px 부근 (감쇠 포함)
      expect(transform.y).toBe(0);
    }
  });
});
