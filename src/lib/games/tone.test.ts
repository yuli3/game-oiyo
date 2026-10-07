import { describe, expect, it } from "vitest";
import { createTonePlayer } from "./tone";

function fakeAudio() {
  const log = { contexts: 0, started: 0, closed: 0, resumed: 0 };
  class FakeContext {
    state = "running";
    currentTime = 0;
    destination = {};
    constructor() { log.contexts += 1; }
    createOscillator() {
      return { frequency: { value: 0 }, connect: (node: unknown) => node, start: () => { log.started += 1; }, stop: () => undefined };
    }
    createGain() {
      return { gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined }, connect: (node: unknown) => node };
    }
    resume() { log.resumed += 1; this.state = "running"; return Promise.resolve(); }
    close() { log.closed += 1; this.state = "closed"; return Promise.resolve(); }
  }
  return { log, Ctor: FakeContext as unknown as new () => AudioContext };
}

describe("createTonePlayer", () => {
  it("reuses one context for every tone", () => {
    const { log, Ctor } = fakeAudio();
    const player = createTonePlayer(() => Ctor);
    for (let index = 0; index < 60; index += 1) player.play(360);
    expect(log.contexts).toBe(1);
    expect(log.started).toBe(60);
  });

  it("opens a new context after close", () => {
    const { log, Ctor } = fakeAudio();
    const player = createTonePlayer(() => Ctor);
    player.play(360);
    player.close();
    player.play(360);
    expect(log.closed).toBe(1);
    expect(log.contexts).toBe(2);
  });

  it("stays silent when the browser has no audio or the device fails", () => {
    const missing = createTonePlayer(() => undefined);
    expect(() => missing.play(360)).not.toThrow();
    const broken = createTonePlayer(() => (class { constructor() { throw new Error("no device"); } }) as unknown as new () => AudioContext);
    expect(() => broken.play(360)).not.toThrow();
    expect(() => broken.close()).not.toThrow();
  });
});
