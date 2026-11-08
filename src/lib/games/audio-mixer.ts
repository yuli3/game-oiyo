/**
 * Audio Mixer: Unity-grade dynamic audio bus & DSP processing for Web Audio.
 * Features:
 * 1. Micro-pitch variance (±4%) to eliminate repetitive sound fatigue
 * 2. Audio Ducking calculation for BGM attenuation under heavy SFX
 * 3. Low-Pass DSP filter cutoff management for muffled/underwater/pause atmosphere
 */

export interface MixerConfig {
  masterVolume: number;
  bgmVolume: number;
  sfxVolume: number;
  lowPassCutoff: number; // Hz (e.g. 500 for muffled, 20000 for open)
  isLowPassActive: boolean;
  isDuckingActive: boolean;
}

export function createDefaultMixerConfig(): MixerConfig {
  return {
    masterVolume: 1.0,
    bgmVolume: 0.7,
    sfxVolume: 0.8,
    lowPassCutoff: 20000,
    isLowPassActive: false,
    isDuckingActive: false,
  };
}

/**
 * Calculates a slightly randomized frequency with micro-pitch variance (default ±4%).
 * Prevents ear fatigue on rapid repetitive actions (footsteps, card snaps, coin pings).
 */
export function calculatePitchedFrequency(
  baseFreq: number,
  variancePct: number = 0.04,
  randomVal: number = Math.random()
): number {
  const delta = (randomVal * 2 - 1) * variancePct;
  return Math.round(baseFreq * (1 + delta) * 10) / 10;
}

/**
 * Calculates effective BGM gain considering master volume and active SFX ducking.
 */
export function calculateEffectiveBgmGain(
  config: MixerConfig,
  duckRatio: number = 0.4
): number {
  const duckMultiplier = config.isDuckingActive ? duckRatio : 1.0;
  return Math.max(0, Math.min(1.0, config.masterVolume * config.bgmVolume * duckMultiplier));
}

/**
 * Calculates effective SFX gain considering master volume.
 */
export function calculateEffectiveSfxGain(config: MixerConfig): number {
  return Math.max(0, Math.min(1.0, config.masterVolume * config.sfxVolume));
}

/**
 * Computes the target cutoff frequency for a Biquad lowpass filter.
 */
export function calculateFilterCutoff(
  isLowPassActive: boolean,
  activeCutoff: number = 500,
  openCutoff: number = 20000
): number {
  return isLowPassActive ? activeCutoff : openCutoff;
}

/**
 * Browser Web Audio tone synthesizer helper
 */
export function playSyntheticTone(
  audioCtx: AudioContext | null,
  options: {
    freq: number;
    duration?: number;
    type?: OscillatorType;
    gain?: number;
    pitchVariance?: number;
  }
): void {
  if (!audioCtx || audioCtx.state === "suspended") {
    audioCtx?.resume().catch(() => {});
  }
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    const freq = calculatePitchedFrequency(options.freq, options.pitchVariance ?? 0.04);
    osc.type = options.type ?? "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    const baseGain = options.gain ?? 0.15;
    const duration = options.duration ?? 0.15;

    gainNode.gain.setValueAtTime(baseGain, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Ignore audio playback failure
  }
}

export type SfxCue =
  | "tap"
  | "place"
  | "card"
  | "move"
  | "attack"
  | "hit"
  | "coin"
  | "gem"
  | "spin"
  | "jump"
  | "roll"
  | "success"
  | "fail"
  | "win"
  | "laser"
  | "powerup";

export interface SfxOptions {
  volume?: number;
  pitchVariance?: number;
  customFreq?: number;
}

/**
 * Universal multi-layer procedural SFX synthesizer.
 * Creates rich dual-layer audio with harmonics, lowpass filtering, and automatic pitch jitter (±4%).
 */
export function playProceduralSfx(
  audioCtx: AudioContext | null,
  cue: SfxCue,
  options?: SfxOptions
): void {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  try {
    const now = audioCtx.currentTime;
    const vol = options?.volume ?? 0.12;
    const pVar = options?.pitchVariance ?? 0.04;

    const createLayer = (
      freq: number,
      duration: number,
      type: OscillatorType,
      gainRatio: number,
      filterFreq?: number
    ) => {
      const pitched = calculatePitchedFrequency(options?.customFreq ?? freq, pVar);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(pitched, now);

      gain.gain.setValueAtTime(vol * gainRatio, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      if (filterFreq) {
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(filterFreq, now);
        osc.connect(filter);
        filter.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + duration);
    };

    switch (cue) {
      case "tap":
        createLayer(1400, 0.03, "triangle", 0.6);
        createLayer(700, 0.04, "sine", 0.8);
        break;
      case "place":
      case "card":
        // Crisp card snap or piece place with sub body and overtone
        createLayer(380, 0.06, "triangle", 0.9, 1200);
        createLayer(1100, 0.04, "sine", 0.5);
        break;
      case "move":
        // Smooth slide / whoosh
        createLayer(320, 0.07, "triangle", 0.7, 800);
        createLayer(240, 0.08, "sine", 0.6);
        break;
      case "attack":
        // Punchy slash with saw/triangle drop
        createLayer(420, 0.08, "sawtooth", 0.8, 1500);
        createLayer(180, 0.12, "triangle", 1.0);
        break;
      case "hit":
        // Heavy impact thud
        createLayer(160, 0.15, "triangle", 1.0, 400);
        createLayer(80, 0.2, "sine", 1.2);
        break;
      case "coin":
        // Metallic ping (B5 + E6 dual overtone)
        createLayer(988, 0.1, "sine", 0.9);
        createLayer(1318, 0.12, "triangle", 0.7);
        break;
      case "gem":
        // Celestial chime
        createLayer(1046, 0.15, "sine", 0.8);
        createLayer(1568, 0.18, "triangle", 0.7);
        createLayer(2093, 0.22, "sine", 0.5);
        break;
      case "spin":
        // Rapid mechanical reel tick
        createLayer(880, 0.03, "triangle", 0.7);
        createLayer(1200, 0.02, "sine", 0.5);
        break;
      case "jump":
        // Uplifting spring
        createLayer(220, 0.12, "triangle", 0.8);
        createLayer(440, 0.1, "sine", 0.6);
        break;
      case "roll":
        // Soft rolling resonance
        createLayer(150, 0.06, "triangle", 0.5, 300);
        createLayer(220, 0.05, "sine", 0.4);
        break;
      case "success":
        // Ascending major chord (C5 -> E5 -> G5)
        createLayer(523, 0.12, "sine", 0.8);
        createLayer(659, 0.16, "triangle", 0.8);
        createLayer(784, 0.22, "sine", 0.9);
        break;
      case "fail":
        // Descending detuned chime
        createLayer(280, 0.18, "sawtooth", 0.7, 600);
        createLayer(180, 0.24, "triangle", 0.9);
        break;
      case "win":
        // Triumphant fanfare
        createLayer(523, 0.2, "sine", 0.8);
        createLayer(659, 0.25, "triangle", 0.8);
        createLayer(784, 0.3, "sine", 0.9);
        createLayer(1046, 0.45, "triangle", 1.0);
        break;
      case "laser":
        // Sci-fi zap (sweeping down fast)
        createLayer(880, 0.06, "sawtooth", 0.7, 1800);
        createLayer(440, 0.08, "triangle", 0.5);
        break;
      case "powerup":
        // Uplifting energetic powerup
        createLayer(350, 0.1, "sine", 0.7);
        createLayer(523, 0.16, "triangle", 0.8);
        createLayer(880, 0.24, "sine", 0.9);
        break;
    }
  } catch {
    // Sound is decoration
  }
}

let sharedAudioCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Universal 1-line procedural SFX dispatcher using the shared AudioContext.
 */
export function playGlobalSfx(cue: SfxCue, options?: SfxOptions): void {
  const ctx = getSharedAudioContext();
  if (ctx) {
    playProceduralSfx(ctx, cue, options);
  }
}

/**
 * Pentatonic scale semitone offsets for arcade combo chains (C, D, E, G, A, C...).
 */
const PENTATONIC_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

/**
 * Plays a procedural SFX with an escalating combo pitch shift.
 */
export function playComboSfx(
  audioCtx: AudioContext | null,
  cue: SfxCue,
  comboIndex: number = 0,
  options?: SfxOptions
): void {
  const semitones = PENTATONIC_SCALE[Math.min(Math.max(0, comboIndex), PENTATONIC_SCALE.length - 1)];
  const pitchMultiplier = Math.pow(2, semitones / 12);
  const baseFreq = options?.customFreq;
  const shiftedFreq = baseFreq ? baseFreq * pitchMultiplier : undefined;

  playProceduralSfx(audioCtx, cue, {
    ...options,
    customFreq: shiftedFreq,
    pitchVariance: (options?.pitchVariance ?? 0.04) + 0.01,
  });
}
