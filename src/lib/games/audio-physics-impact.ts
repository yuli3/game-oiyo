/**
 * OIYO Procedural Audio-Physics Impact Synthesizer (`audio-physics-impact.ts`)
 *
 * Implements Research Goal 8:
 * - Real-time Web Audio API synthesis reacting to Matter.js / Newtonian physics impulse magnitude
 * - Dynamic kinetic energy (1/2 m v^2) -> frequency, distortion & 808 sub-bass gain mapping
 * - Zero network bandwidth (0B download assets)
 */

export interface ImpactAudioProfile {
  oscType: OscillatorType;
  baseFrequency: number;
  pitchDecayTime: number;
  distortionGain: number;
  subBassWeight: number; // 0..1
}

export class AudioPhysicsImpactSynthesizer {
  private audioCtx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Lazy initialize upon first user gesture
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Synthesizes dynamic sound calibrated to collision kinetic energy.
   * kineticEnergy = 0.5 * mass * speed^2
   */
  public playPhysicsImpact(kineticEnergy: number, maxEnergy: number = 5000): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const normEnergy = Math.min(1.0, Math.max(0.02, kineticEnergy / maxEnergy));
    const now = ctx.currentTime;

    // 1. Sub-bass thump (40Hz..90Hz) scaled by energy
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const startFreq = 50 + normEnergy * 110;
    const endFreq = 35 + normEnergy * 25;
    const duration = 0.08 + normEnergy * 0.25;

    osc.type = normEnergy > 0.5 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    const peakVolume = Math.min(0.8, 0.15 + normEnergy * 0.65);
    gain.gain.setValueAtTime(peakVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.05);

    // 2. High frequency snap/click for sharp impacts
    if (normEnergy > 0.3) {
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();

      snapOsc.type = 'sawtooth';
      snapOsc.frequency.setValueAtTime(800 + normEnergy * 600, now);
      snapOsc.frequency.exponentialRampToValueAtTime(100, now + 0.03);

      snapGain.gain.setValueAtTime(0.2 * normEnergy, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);

      snapOsc.start(now);
      snapOsc.stop(now + 0.04);
    }
  }

  /**
   * Helper to compute kinetic energy from mass and 2D velocity.
   */
  public static computeKineticEnergy(mass: number, vx: number, vy: number): number {
    const speedSq = vx * vx + vy * vy;
    return 0.5 * mass * speedSq;
  }
}
