// Named sound cues for a game, played through one shared tone player (tone.ts).
// The studio standard (company-brain projects/game/studio-standard/01-quality-bar.md F4)
// asks for at least six cues per game: tap, place, success, fail, combo and win.
// A game may replace any cue or add its own; the player only owns timing, pitch
// lift for combos, small pitch variation, and mute. 2026-10-23
import { createTonePlayer, type TonePlayer } from "./tone";

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

export function readMutedPref(key: string): boolean {
  try { return window.localStorage.getItem(key) === "1"; } catch { return false; }
}

export function writeMutedPref(key: string, muted: boolean): void {
  try { window.localStorage.setItem(key, muted ? "1" : "0"); } catch { /* private mode */ }
}
