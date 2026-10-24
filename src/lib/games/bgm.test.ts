import { describe, expect, it, vi } from "vitest";
import { createBgmController } from "./bgm";

function createMockAudioContext() {
  const gainNode = {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const oscNode = {
    type: "sine",
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };

  const context = {
    state: "running" as AudioContextState,
    currentTime: 10,
    createGain: vi.fn(() => gainNode),
    createOscillator: vi.fn(() => oscNode),
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };

  return { context: context as unknown as AudioContext, gainNode, oscNode };
}

describe("BGM Engine & Sound Ducking Bus", () => {
  it("initializes with default track and volume without errors", () => {
    const { context } = createMockAudioContext();
    const bgm = createBgmController({
      resolveContext: () => context,
      track: "zen",
      volume: 0.04,
    });

    expect(bgm.currentTrack).toBe("zen");
    expect(bgm.volume).toBe(0.04);
    expect(bgm.muted).toBe(false);
    expect(bgm.isPlaying).toBe(false);

    bgm.close();
  });

  it("starts and stops loop playing chords", () => {
    const { context, oscNode } = createMockAudioContext();
    const bgm = createBgmController({
      resolveContext: () => context,
      track: "arcade",
    });

    bgm.start();
    expect(bgm.isPlaying).toBe(true);
    expect(oscNode.start).toHaveBeenCalled();

    bgm.stop();
    expect(bgm.isPlaying).toBe(false);

    bgm.close();
  });

  it("switches tracks cleanly while playing", () => {
    const { context } = createMockAudioContext();
    const bgm = createBgmController({
      resolveContext: () => context,
      track: "zen",
    });

    bgm.start();
    bgm.setTrack("cosmic");
    expect(bgm.currentTrack).toBe("cosmic");
    expect(bgm.isPlaying).toBe(true);

    bgm.close();
  });

  it("mutes and unmutes without stopping the play intent", () => {
    const { context, gainNode } = createMockAudioContext();
    const bgm = createBgmController({
      resolveContext: () => context,
      volume: 0.05,
    });

    bgm.start();
    bgm.setMuted(true);
    expect(bgm.muted).toBe(true);
    expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, 10);

    bgm.setMuted(false);
    expect(bgm.muted).toBe(false);
    expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.05, 10);

    bgm.close();
  });

  it("smoothly ducks BGM volume when SFX triggers", () => {
    const { context, gainNode } = createMockAudioContext();
    const bgm = createBgmController({
      resolveContext: () => context,
      volume: 0.04,
    });

    bgm.start();
    bgm.duck(500, 0.2);

    expect(gainNode.gain.cancelScheduledValues).toHaveBeenCalled();
    // 0.04 * 0.2 = 0.008
    expect(gainNode.gain.setTargetAtTime).toHaveBeenCalledWith(
      expect.closeTo(0.008, 4),
      10,
      0.05,
    );

    bgm.close();
  });

  it("gracefully tolerates missing AudioContext in headless environments", () => {
    const bgm = createBgmController({
      resolveContext: () => null,
    });

    expect(() => {
      bgm.start();
      bgm.duck();
      bgm.setTrack("cosmic");
      bgm.stop();
      bgm.close();
    }).not.toThrow();
  });
});
