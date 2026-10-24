import { describe, expect, it } from "vitest";
import {
  CORE_CUES,
  RETRO_8BIT_CUES,
  ZEN_MUSICBOX_CUES,
  CYBER_SYNTH_CUES,
  SOUND_PRESETS,
  POLYPHONIC_FANFARES,
  playFanfare,
  createCuePlayer,
  cueLift,
  readMutedPref,
  writeMutedPref,
  type CoreCue,
  type CueNote,
  type CueTable,
  type FanfareStyle,
} from "./game-audio";
import type { TonePlayer } from "./tone";

const REQUIRED_CUES: CoreCue[] = ["tap", "place", "success", "fail", "combo", "win", "lose"];

describe("game-audio sound presets", () => {
  const presets: Array<[string, CueTable<CoreCue>]> = [
    ["core", CORE_CUES],
    ["retro", RETRO_8BIT_CUES],
    ["zen", ZEN_MUSICBOX_CUES],
    ["cyber", CYBER_SYNTH_CUES],
  ];

  it("exports all 4 standard sound presets in SOUND_PRESETS", () => {
    expect(Object.keys(SOUND_PRESETS).sort()).toEqual(["core", "cyber", "retro", "zen"]);
  });

  for (const [presetName, preset] of presets) {
    describe(`preset: ${presetName}`, () => {
      it("contains all required 7 CoreCue keys", () => {
        for (const cue of REQUIRED_CUES) {
          expect(preset[cue], `Missing cue: ${cue}`).toBeDefined();
          expect(preset[cue].length).toBeGreaterThan(0);
        }
      });

      it("conforms to physical audible acoustic constraints", () => {
        for (const cue of REQUIRED_CUES) {
          const notes: readonly CueNote[] = preset[cue];
          for (const [delay, frequency, duration, volume] of notes) {
            expect(delay).toBeGreaterThanOrEqual(0);
            expect(frequency).toBeGreaterThanOrEqual(50);
            expect(frequency).toBeLessThanOrEqual(4000);
            expect(duration).toBeGreaterThan(0.01);
            expect(duration).toBeLessThanOrEqual(1.0);
            expect(volume).toBeGreaterThan(0);
            expect(volume).toBeLessThanOrEqual(0.1);
          }
        }
      });
    });
  }
});

describe("cueLift combo scale", () => {
  it("scales up to one octave over 6 intervals", () => {
    expect(cueLift(1)).toBe(1);
    expect(cueLift(7)).toBeCloseTo(2, 4);
    // clamps underflow and overflow
    expect(cueLift(0)).toBe(1);
    expect(cueLift(-5)).toBe(1);
    expect(cueLift(10)).toBeCloseTo(2, 4);
  });
});

describe("createCuePlayer lifecycle", () => {
  function makeMockTonePlayer(): TonePlayer & { played: Array<[number, number, number]>; closed: boolean } {
    const played: Array<[number, number, number]> = [];
    return {
      played,
      closed: false,
      play(frequency: number, duration: number, volume: number) {
        played.push([frequency, duration, volume]);
      },
      close() {
        this.closed = true;
      },
    };
  }

  it("plays immediate notes and dispatches scheduled notes", () => {
    const mockTone = makeMockTonePlayer();
    const timeouts = new Map<number, () => void>();
    let idCounter = 1;

    const player = createCuePlayer({
      cues: CORE_CUES,
      player: mockTone,
      random: () => 0.5, // 0 jitter detune
      schedule: (fn) => {
        const id = idCounter++;
        timeouts.set(id, fn);
        return id;
      },
      cancel: (id) => {
        timeouts.delete(id);
      },
    });

    player.play("place");
    // "place" has note 0 immediate, and note 1 at 30ms
    expect(mockTone.played.length).toBe(1);
    expect(mockTone.played[0][0]).toBeCloseTo(1250, 1);

    // Fire the scheduled timeout
    for (const fn of timeouts.values()) fn();
    expect(mockTone.played.length).toBe(2);
    expect(mockTone.played[1][0]).toBeCloseTo(820, 1);

    player.close();
    expect(mockTone.closed).toBe(true);
  });

  it("respects muting and unmuting dynamically", () => {
    const mockTone = makeMockTonePlayer();
    const player = createCuePlayer({
      cues: CORE_CUES,
      player: mockTone,
      muted: true,
      random: () => 0.5,
    });

    expect(player.muted).toBe(true);
    player.play("tap");
    expect(mockTone.played.length).toBe(0);

    player.setMuted(false);
    expect(player.muted).toBe(false);
    player.play("tap");
    expect(mockTone.played.length).toBe(1);
  });

  it("reads and writes localStorage mute preferences safely", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => { memory.set(k, v); },
    };
    const key = "test:muted:key";
    writeMutedPref(key, true, storage);
    expect(readMutedPref(key, storage)).toBe(true);
    writeMutedPref(key, false, storage);
    expect(readMutedPref(key, storage)).toBe(false);
  });

  describe("polyphonic fanfare engine", () => {
    it("defines valid multi-oscillator chords for all 4 styles", () => {
      const styles: FanfareStyle[] = ["triumph", "celestial", "retro-arcade", "defeat"];
      for (const style of styles) {
        const chords = POLYPHONIC_FANFARES[style];
        expect(chords.length).toBeGreaterThanOrEqual(3);
        for (const chord of chords) {
          expect(chord.frequencies.length).toBeGreaterThanOrEqual(2);
          for (const freq of chord.frequencies) {
            expect(freq).toBeGreaterThan(50);
            expect(freq).toBeLessThan(4000);
          }
          expect(chord.durationS).toBeGreaterThan(0.05);
          expect(chord.volume).toBeGreaterThan(0);
        }
      }
    });

    it("safely invokes tone player frequencies without throwing", () => {
      const played: number[] = [];
      const mockPlayer: TonePlayer = {
        play: (freq) => { played.push(freq); },
        close: () => {},
      };
      playFanfare(mockPlayer, "triumph");
      // Muted skips execution
      playFanfare(mockPlayer, "triumph", { muted: true });
    });
  });
});
