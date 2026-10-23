import { describe, expect, it } from "vitest";
import { CORE_CUES, createCuePlayer, cueLift } from "./game-audio";
import { countdownSchedule, nextPhase, type FlowEvent, type FlowPhase } from "./game-flow";
import { HAPTIC_PATTERNS, createHaptics } from "./haptics";
import { JUICE, comboTier, createHitstop, createPool, createShake } from "./juice";
import type { TonePlayer } from "./tone";

function fakeTone() {
  const played: number[] = [];
  let closed = 0;
  const player: TonePlayer = { play: (frequency) => { played.push(frequency); }, close: () => { closed += 1; } };
  return { player, played, closed: () => closed };
}

function fakeClock() {
  const queue = new Map<number, () => void>();
  let next = 1;
  return {
    schedule: (fn: () => void) => { queue.set(next, fn); return next++; },
    cancel: (handle: number) => { queue.delete(handle); },
    flush: () => { for (const [handle, fn] of [...queue]) { queue.delete(handle); fn(); } },
    get size() { return queue.size; },
  };
}

describe("cue player", () => {
  it("ships the six cues the studio standard asks for", () => {
    for (const cue of ["tap", "place", "success", "fail", "combo", "win"] as const) expect(CORE_CUES[cue].length).toBeGreaterThan(0);
  });

  it("plays every note of a cue, the delayed ones later", () => {
    const tone = fakeTone();
    const clock = fakeClock();
    const cues = createCuePlayer({ cues: CORE_CUES, player: tone.player, random: () => 0.5, ...clock });
    cues.play("win");
    expect(tone.played).toHaveLength(1);
    clock.flush();
    expect(tone.played).toEqual(CORE_CUES.win.map(([, frequency]) => frequency));
  });

  it("raises combo cues one semitone-ish step at a time and stops at an octave", () => {
    expect(cueLift(1)).toBe(1);
    expect(cueLift(7)).toBe(2);
    expect(cueLift(40)).toBe(2);
    expect(cueLift(3)).toBeGreaterThan(cueLift(2));
  });

  it("detunes by at most five percent", () => {
    const low = fakeTone();
    const high = fakeTone();
    createCuePlayer({ cues: CORE_CUES, player: low.player, random: () => 0 }).play("tap");
    createCuePlayer({ cues: CORE_CUES, player: high.player, random: () => 0.999999 }).play("tap");
    const base = CORE_CUES.tap[0][1];
    expect(low.played[0]).toBeCloseTo(base * 0.95);
    expect(high.played[0]).toBeCloseTo(base * 1.05, 0);
  });

  it("stays silent when muted, also for notes already queued", () => {
    const tone = fakeTone();
    const clock = fakeClock();
    const cues = createCuePlayer({ cues: CORE_CUES, player: tone.player, random: () => 0.5, ...clock });
    cues.play("success");
    cues.setMuted(true);
    clock.flush();
    cues.play("win");
    expect(tone.played).toHaveLength(1);
  });

  it("cancels queued notes and closes the context on close", () => {
    const tone = fakeTone();
    const clock = fakeClock();
    const cues = createCuePlayer({ cues: CORE_CUES, player: tone.player, random: () => 0.5, ...clock });
    cues.play("win");
    cues.close();
    expect(clock.size).toBe(0);
    expect(tone.closed()).toBe(1);
  });
});

describe("haptics", () => {
  it("uses the standard success and fail patterns", () => {
    expect(HAPTIC_PATTERNS.success).toBe(15);
    expect(HAPTIC_PATTERNS.fail).toEqual([30, 40, 30]);
  });

  it("vibrates only while enabled, and reports unsupported devices", () => {
    const calls: Array<number | number[]> = [];
    const haptics = createHaptics({ vibrate: (pattern) => { calls.push(pattern); return true; } });
    haptics.fire("fail");
    haptics.setEnabled(false);
    haptics.fire("win");
    expect(calls).toEqual([[30, 40, 30]]);
    expect(haptics.supported).toBe(true);
    expect(createHaptics({ vibrate: null }).supported).toBe(false);
  });

  it("never throws when the device refuses", () => {
    const haptics = createHaptics({ vibrate: () => { throw new Error("blocked"); } });
    expect(() => haptics.fire("tap")).not.toThrow();
  });
});

describe("juice", () => {
  it("shakes within the kicked amplitude and settles after its duration", () => {
    const shake = createShake();
    shake.kick(JUICE.shake.light, 180);
    const first = shake.sample(16, () => 1);
    expect(Math.abs(first.x)).toBeLessThanOrEqual(JUICE.shake.light);
    shake.sample(200);
    expect(shake.active).toBe(false);
    expect(shake.sample(16)).toEqual({ x: 0, y: 0 });
  });

  it("keeps a strong shake when a weak one arrives", () => {
    const shake = createShake();
    shake.kick(JUICE.shake.heavy, 180);
    shake.kick(1, 500);
    expect(Math.abs(shake.sample(0, () => 1).x)).toBe(JUICE.shake.heavy);
  });

  it("drops shake and hit-stop under reduced motion", () => {
    const shake = createShake({ reducedMotion: () => true });
    shake.kick(8);
    expect(shake.active).toBe(false);
    const stop = createHitstop({ reducedMotion: () => true });
    stop.trigger(80);
    expect(stop.consume(16)).toBe(16);
  });

  it("freezes visual time for the hit-stop and then lets it run", () => {
    const stop = createHitstop();
    stop.trigger(JUICE.hitstop.hit);
    expect(stop.consume(16)).toBe(0);
    expect(stop.consume(16)).toBe(0);
    expect(stop.consume(16)).toBe(0);
    expect(stop.consume(16)).toBe(9);
    expect(stop.frozen).toBe(false);
  });

  it("steps combo tiers at 3, 5 and 8", () => {
    expect([1, 2, 3, 4, 5, 7, 8, 20].map(comboTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it("pools objects without allocating past its size", () => {
    let made = 0;
    const pool = createPool(2, () => ({ id: made++, life: 0 }), (item) => { item.life = 0; });
    const a = pool.acquire();
    const b = pool.acquire();
    expect(pool.acquire()).toBeNull();
    expect(made).toBe(2);
    a!.life = 9;
    pool.release(a!);
    pool.release(a!);
    expect(pool.live).toBe(1);
    expect(pool.acquire()).toBe(a);
    expect(a!.life).toBe(0);
    expect(b).not.toBeNull();
  });
});

describe("game flow", () => {
  it("walks title to result and back through a retry", () => {
    const path: FlowEvent[] = ["enter", "start", "countdownDone", "pause", "resume", "finish", "retry", "countdownDone"];
    let phase: FlowPhase = "title";
    const seen: FlowPhase[] = [phase];
    for (const event of path) {
      const next = nextPhase(phase, event);
      expect(next, `${event} from ${phase}`).not.toBeNull();
      phase = next!;
      seen.push(phase);
    }
    expect(seen).toEqual(["title", "setup", "countdown", "play", "paused", "play", "result", "countdown", "play"]);
  });

  it("pauses a live round when the tab hides and ignores events that mean nothing", () => {
    expect(nextPhase("play", "hidden")).toBe("paused");
    expect(nextPhase("result", "hidden")).toBeNull();
    expect(nextPhase("title", "finish")).toBeNull();
  });

  it("restarts a failed round within two seconds", () => {
    expect(countdownSchedule({ quick: true }).total).toBeLessThanOrEqual(2000);
    const full = countdownSchedule();
    expect(full.steps.map((step) => step.value)).toEqual([3, 2, 1, 0]);
    expect(countdownSchedule({ reducedMotion: true }).total).toBeLessThan(full.total);
  });
});
