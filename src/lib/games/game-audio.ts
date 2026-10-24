// Named sound cues for a game, played through one shared tone player (tone.ts).
// The studio standard (company-brain projects/game/studio-standard/01-quality-bar.md F4)
// asks for at least six cues per game: tap, place, success, fail, combo and win.
// A game may replace any cue or add its own; the player only owns timing, pitch
// lift for combos, small pitch variation, and mute. 2026-10-23
import { createTonePlayer, type TonePlayer } from "./tone";
export type { TonePlayer };

/** [delay ms, frequency Hz, duration s, volume 0..1] */
export type CueNote = readonly [number, number, number, number];
export type CueTable<Name extends string = string> = Record<Name, readonly CueNote[]>;

export type CoreCue = "tap" | "place" | "success" | "fail" | "combo" | "win" | "lose";

export const CORE_CUES: CueTable<CoreCue> = {
  tap: [[0, 720, 0.04, 0.02]],
  place: [[0, 1250, 0.03, 0.03], [30, 820, 0.05, 0.03]],
  success: [[0, 523, 0.09, 0.03], [60, 659, 0.09, 0.03], [120, 784, 0.14, 0.03]],
  fail: [[0, 170, 0.12, 0.04], [90, 120, 0.16, 0.04]],
  combo: [[0, 784, 0.07, 0.03], [50, 988, 0.07, 0.03], [100, 1175, 0.12, 0.03]],
  win: [[0, 523, 0.16, 0.035], [110, 659, 0.16, 0.035], [220, 784, 0.16, 0.035], [330, 1047, 0.3, 0.035]],
  lose: [[0, 392, 0.18, 0.03], [160, 330, 0.18, 0.03], [320, 262, 0.3, 0.03]],
};

export const RETRO_8BIT_CUES: CueTable<CoreCue> = {
  tap: [[0, 987, 0.03, 0.03]],
  place: [[0, 659, 0.04, 0.03], [25, 987, 0.04, 0.03]],
  success: [[0, 659, 0.06, 0.03], [50, 784, 0.06, 0.03], [100, 1047, 0.12, 0.035]],
  fail: [[0, 220, 0.08, 0.04], [60, 165, 0.12, 0.04]],
  combo: [[0, 880, 0.05, 0.03], [40, 1109, 0.05, 0.03], [80, 1318, 0.09, 0.035]],
  win: [[0, 523, 0.08, 0.035], [70, 659, 0.08, 0.035], [140, 784, 0.08, 0.035], [210, 1047, 0.08, 0.035], [280, 1318, 0.22, 0.04]],
  lose: [[0, 440, 0.1, 0.035], [80, 370, 0.1, 0.035], [160, 311, 0.12, 0.035], [240, 220, 0.25, 0.04]],
};

export const ZEN_MUSICBOX_CUES: CueTable<CoreCue> = {
  tap: [[0, 1046, 0.08, 0.02]],
  place: [[0, 880, 0.1, 0.025], [40, 1318, 0.12, 0.02]],
  success: [[0, 784, 0.14, 0.025], [80, 1046, 0.16, 0.025], [160, 1318, 0.22, 0.025]],
  fail: [[0, 330, 0.18, 0.025], [100, 294, 0.22, 0.025]],
  combo: [[0, 988, 0.1, 0.025], [60, 1318, 0.12, 0.025], [120, 1568, 0.2, 0.025]],
  win: [[0, 659, 0.2, 0.025], [120, 784, 0.2, 0.025], [240, 1046, 0.24, 0.025], [360, 1318, 0.35, 0.03]],
  lose: [[0, 494, 0.2, 0.025], [150, 440, 0.2, 0.025], [300, 392, 0.3, 0.025]],
};

export const CYBER_SYNTH_CUES: CueTable<CoreCue> = {
  tap: [[0, 1500, 0.03, 0.025]],
  place: [[0, 440, 0.04, 0.03], [20, 1760, 0.05, 0.03]],
  success: [[0, 440, 0.07, 0.03], [50, 880, 0.07, 0.03], [100, 1760, 0.14, 0.035]],
  fail: [[0, 180, 0.1, 0.04], [60, 90, 0.18, 0.05]],
  combo: [[0, 587, 0.06, 0.03], [40, 880, 0.06, 0.03], [80, 1760, 0.12, 0.035]],
  win: [[0, 440, 0.1, 0.035], [90, 880, 0.1, 0.035], [180, 1320, 0.12, 0.035], [270, 2093, 0.28, 0.04]],
  lose: [[0, 554, 0.12, 0.035], [100, 370, 0.14, 0.035], [200, 277, 0.16, 0.035], [300, 138, 0.3, 0.04]],
};

export type SoundPresetName = "core" | "retro" | "zen" | "cyber";

export const SOUND_PRESETS: Record<SoundPresetName, CueTable<CoreCue>> = {
  core: CORE_CUES,
  retro: RETRO_8BIT_CUES,
  zen: ZEN_MUSICBOX_CUES,
  cyber: CYBER_SYNTH_CUES,
};

/** Highest combo step that still raises the pitch: six steps make one octave. */
export const CUE_MAX_LIFT_STEP = 7;
/** Same cue played again sounds less mechanical with a little detune. */
export const CUE_PITCH_JITTER = 0.05;

/** Pitch multiplier for a combo step (1 = no lift), capped at one octave. */
export function cueLift(step: number): number {
  const clamped = Math.max(1, Math.min(Math.floor(step), CUE_MAX_LIFT_STEP));
  return 2 ** ((clamped - 1) / 6);
}

export interface CuePlayOptions {
  /** Combo or streak step; 1 plays the cue as written. */
  step?: number;
}

export interface CuePlayer<Name extends string> {
  play(name: Name, options?: CuePlayOptions): void;
  setMuted(muted: boolean): void;
  readonly muted: boolean;
  /** Cancels pending notes and closes the audio context. Call on unmount. */
  close(): void;
}

export interface CuePlayerOptions<Name extends string> {
  cues: CueTable<Name>;
  muted?: boolean;
  player?: TonePlayer;
  /** Pitch jitter source in [0, 1). Sound is decoration, so Math.random is fine. */
  random?: () => number;
  schedule?: (fn: () => void, ms: number) => number;
  cancel?: (handle: number) => void;
}

export function createCuePlayer<Name extends string>(options: CuePlayerOptions<Name>): CuePlayer<Name> {
  const { cues } = options;
  const random = options.random ?? Math.random;
  const schedule = options.schedule ?? ((fn, ms) => window.setTimeout(fn, ms));
  const cancel = options.cancel ?? ((handle) => window.clearTimeout(handle));
  let player = options.player ?? null;
  let muted = options.muted ?? false;
  const pending = new Set<number>();

  return {
    play(name, { step = 1 } = {}) {
      if (muted) return;
      const notes = cues[name];
      if (!notes) return;
      player ??= createTonePlayer();
      const tone = player;
      const pitch = cueLift(step) * (1 + (random() * 2 - 1) * CUE_PITCH_JITTER);
      for (const [delay, frequency, duration, volume] of notes) {
        if (delay <= 0) {
          tone.play(frequency * pitch, duration, volume);
          continue;
        }
        const handle = schedule(() => {
          pending.delete(handle);
          if (!muted) tone.play(frequency * pitch, duration, volume);
        }, delay);
        pending.add(handle);
      }
    },
    setMuted(next) {
      muted = next;
    },
    get muted() {
      return muted;
    },
    close() {
      for (const handle of pending) cancel(handle);
      pending.clear();
      player?.close();
      player = null;
    },
  };
}

export type AudioStorageLike = Pick<Storage, "getItem" | "setItem">;

export function readMutedPref(key: string, storage?: AudioStorageLike): boolean {
  try {
    const store = storage ?? (typeof window !== "undefined" ? window.localStorage : typeof localStorage !== "undefined" ? localStorage : undefined);
    return store?.getItem(key) === "1";
  } catch { return false; }
}

export function writeMutedPref(key: string, muted: boolean, storage?: AudioStorageLike): void {
  try {
    const store = storage ?? (typeof window !== "undefined" ? window.localStorage : typeof localStorage !== "undefined" ? localStorage : undefined);
    store?.setItem(key, muted ? "1" : "0");
  } catch { /* private mode */ }
}

export type FanfareStyle = "triumph" | "celestial" | "retro-arcade" | "defeat";

export interface FanfareChord {
  delayMs: number;
  frequencies: readonly number[];
  durationS: number;
  volume: number;
}

export const POLYPHONIC_FANFARES: Record<FanfareStyle, readonly FanfareChord[]> = {
  triumph: [
    { delayMs: 0, frequencies: [523.25, 659.25], durationS: 0.12, volume: 0.04 },
    { delayMs: 110, frequencies: [659.25, 783.99], durationS: 0.14, volume: 0.04 },
    { delayMs: 220, frequencies: [783.99, 1046.5], durationS: 0.18, volume: 0.045 },
    { delayMs: 360, frequencies: [523.25, 659.25, 783.99, 1046.5], durationS: 0.45, volume: 0.05 },
  ],
  celestial: [
    { delayMs: 0, frequencies: [587.33, 880.0], durationS: 0.15, volume: 0.035 },
    { delayMs: 120, frequencies: [659.25, 1046.5], durationS: 0.18, volume: 0.04 },
    { delayMs: 260, frequencies: [783.99, 1174.66], durationS: 0.22, volume: 0.045 },
    { delayMs: 420, frequencies: [587.33, 783.99, 1174.66, 1567.98], durationS: 0.55, volume: 0.05 },
  ],
  "retro-arcade": [
    { delayMs: 0, frequencies: [440, 554.37], durationS: 0.08, volume: 0.04 },
    { delayMs: 70, frequencies: [554.37, 659.25], durationS: 0.08, volume: 0.04 },
    { delayMs: 140, frequencies: [659.25, 880.0], durationS: 0.1, volume: 0.045 },
    { delayMs: 220, frequencies: [880.0, 1108.73], durationS: 0.12, volume: 0.05 },
    { delayMs: 310, frequencies: [440, 659.25, 880.0, 1318.51], durationS: 0.35, volume: 0.055 },
  ],
  defeat: [
    { delayMs: 0, frequencies: [440, 523.25], durationS: 0.18, volume: 0.04 },
    { delayMs: 160, frequencies: [415.3, 493.88], durationS: 0.18, volume: 0.04 },
    { delayMs: 320, frequencies: [392, 466.16], durationS: 0.22, volume: 0.045 },
    { delayMs: 500, frequencies: [329.63, 392], durationS: 0.45, volume: 0.05 },
  ],
};

export function playFanfare(
  player: TonePlayer | null | undefined,
  style: FanfareStyle = "triumph",
  options?: { muted?: boolean; volumeScale?: number }
): void {
  if (!player || options?.muted) return;
  const chords = POLYPHONIC_FANFARES[style] ?? POLYPHONIC_FANFARES.triumph;
  const scale = options?.volumeScale ?? 1;
  for (const chord of chords) {
    for (const freq of chord.frequencies) {
      setTimeout(() => {
        try {
          player.play(freq, chord.durationS, chord.volume * scale);
        } catch {
          // audio blocked
        }
      }, chord.delayMs);
    }
  }
}
