import { afterEach, describe, expect, it } from "vitest";
import { createDeltaLoop, elapsedSeconds, frameDeltaSeconds, frameScale, recordedElapsedSeconds } from "./time-contracts";

describe("shared game time contracts", () => {
  it("normalizes 60Hz and 120Hz frame samples to the same elapsed motion", () => {
    const travel = (hz: number) => Array.from({ length: hz }, () => frameDeltaSeconds(0, 1000 / hz) || 1 / hz).reduce((sum, d) => sum + d, 0);
    expect(travel(60)).toBeCloseTo(travel(120), 8);
  });
  it("starts only from a valid first input timestamp", () => {
    expect(elapsedSeconds(null, 10_000)).toBe(0);
    expect(elapsedSeconds(1_000, 3_250)).toBe(2);
    expect(recordedElapsedSeconds(1_000, 3_001)).toBe(3);
  });
  it("caps a stalled frame without changing normal frame deltas", () => {
    expect(frameDeltaSeconds(100, 10_000)).toBe(0.1);
    expect(frameDeltaSeconds(100, 116.6667)).toBeCloseTo(0.016667, 5);
  });
  it("pauses frame time while the document is hidden", () => {
    const previousDocument = globalThis.document;
    Object.defineProperty(globalThis, "document", { configurable: true, value: { hidden: true } });
    expect(frameDeltaSeconds(100, 200)).toBe(0);
    expect(frameScale(100, 200)).toBe(0);
    Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
  });
  it("keeps frame-authored movement equal at 60 and 120 Hz", () => {
    const travel = (hz: number) => {
      let previous = 0;
      return Array.from({ length: hz }, (_, i) => {
        const now = (i + 1) * 1000 / hz;
        const value = frameScale(previous, now);
        previous = now;
        return value;
      }).reduce((sum, value) => sum + value, 0);
    };
    expect(travel(60)).toBeCloseTo(travel(120), 8);
  });
});

describe("createDeltaLoop", () => {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  const originalDocument = globalThis.document;
  const listeners = new Map<string, Set<() => void>>();

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancel;
    Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
    listeners.clear();
  });

  function installLoopHost(hidden: boolean) {
    let nextId = 1;
    const pending = new Map<number, FrameRequestCallback>();
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    };
    globalThis.cancelAnimationFrame = (id: number) => {
      pending.delete(id);
    };
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        hidden,
        addEventListener: (_type: string, listener: () => void) => {
          const set = listeners.get(_type) ?? new Set();
          set.add(listener);
          listeners.set(_type, set);
        },
        removeEventListener: (_type: string, listener: () => void) => {
          listeners.get(_type)?.delete(listener);
        },
      },
    });
    return {
      pending,
      setHidden(next: boolean) {
        Object.defineProperty(globalThis.document, "hidden", { configurable: true, value: next });
        listeners.get("visibilitychange")?.forEach((fn) => fn());
      },
    };
  }

  it("cancels the scheduled frame while the document is hidden", () => {
    const host = installLoopHost(false);
    const steps: number[] = [];
    const loop = createDeltaLoop((_delta, now) => steps.push(now));
    loop.start();
    expect(host.pending.size).toBe(1);
    const first = host.pending.entries().next().value as [number, FrameRequestCallback];
    host.pending.delete(first[0]);
    first[1](16);
    expect(steps).toEqual([16]);
    expect(host.pending.size).toBe(1);
    host.setHidden(true);
    expect(host.pending.size).toBe(0);
    loop.stop();
  });

  it("does not schedule a frame when started in a hidden tab", () => {
    const host = installLoopHost(true);
    const loop = createDeltaLoop(() => undefined);
    loop.start();
    expect(host.pending.size).toBe(0);
    host.setHidden(false);
    expect(host.pending.size).toBe(1);
    loop.stop();
  });
});
