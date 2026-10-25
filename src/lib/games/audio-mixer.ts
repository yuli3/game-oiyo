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
