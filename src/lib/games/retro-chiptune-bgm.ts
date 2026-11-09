/**
 * @file retro-chiptune-bgm.ts
 * @description 4-Channel Procedural 8-bit Chiptune Background Music (BGM) Generator
 * - Pure Web Audio API synthesis (0B network downloads, zero external assets).
 * - Emulates classic 8-bit sound chip channels:
 *   1. Square Channel 1 (Lead Melody)
 *   2. Square Channel 2 (Arpeggio / Harmony)
 *   3. Triangle Channel (Deep Bassline)
 *   4. Noise / Percussion Channel (Retro Kick, Snare, Hi-Hat)
 * - Supports 4 signature themes:
 *   - 'retro-jump': Upbeat, playful platformer jump groove (136 BPM)
 *   - 'retro-runner': Energetic, driving synthwave chiptune (150 BPM)
 *   - 'cozy-pet': Warm, relaxed 8-bit lofi lullaby (96 BPM)
 *   - 'retro-dungeon': Tense, atmospheric minor-key dungeon crawl (112 BPM)
 */

export type RetroBgmTheme = 'retro-jump' | 'retro-runner' | 'cozy-pet' | 'retro-dungeon' | 'retro-mining';

// Note frequencies in Hz
const N = {
  REST: 0,
  // Octave 2
  C2: 65.41, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, Bb2: 116.54, B2: 123.47,
  // Octave 3
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, B3: 246.94,
  // Octave 4
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, Bb4: 466.16, B4: 493.88,
  // Octave 5
  C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, Bb5: 932.33, B5: 987.77,
};

// 16-step patterns for 4 bars (4 beats per bar, 16 steps total loop)
interface Pattern16 {
  lead: number[];
  arp: number[];
  bass: number[];
  drum: ('none' | 'kick' | 'snare' | 'hat')[];
}

const THEME_PATTERNS: Record<RetroBgmTheme, { bpm: number; pattern: Pattern16 }> = {
  'retro-jump': {
    bpm: 136,
    pattern: {
      lead: [
        N.C5, N.REST, N.E5, N.G5, N.C5, N.REST, N.D5, N.REST,
        N.E5, N.G5, N.A5, N.G5, N.E5, N.D5, N.C5, N.REST,
      ],
      arp: [
        N.C4, N.E4, N.G4, N.E4, N.G3, N.B3, N.D4, N.B3,
        N.A3, N.C4, N.E4, N.C4, N.F3, N.A3, N.C4, N.G3,
      ],
      bass: [
        N.C3, N.REST, N.C3, N.REST, N.G2, N.REST, N.G2, N.REST,
        N.A2, N.REST, N.A2, N.REST, N.F2, N.REST, N.G2, N.REST,
      ],
      drum: [
        'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
        'kick', 'hat', 'snare', 'hat', 'kick', 'kick', 'snare', 'hat',
      ],
    },
  },
  'retro-runner': {
    bpm: 152,
    pattern: {
      lead: [
        N.E5, N.REST, N.E5, N.D5, N.REST, N.B4, N.C5, N.D5,
        N.E5, N.G5, N.F5, N.E5, N.D5, N.C5, N.B4, N.REST,
      ],
      arp: [
        N.E4, N.B4, N.E5, N.B4, N.C4, N.G4, N.C5, N.G4,
        N.D4, N.A4, N.D5, N.A4, N.B3, N.F4, N.B4, N.F4,
      ],
      bass: [
        N.E2, N.E2, N.E3, N.E2, N.C2, N.C2, N.C3, N.C2,
        N.D2, N.D2, N.D3, N.D2, N.B2, N.B2, N.B3, N.B2,
      ],
      drum: [
        'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
        'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'snare',
      ],
    },
  },
  'cozy-pet': {
    bpm: 96,
    pattern: {
      lead: [
        N.C5, N.REST, N.D5, N.E5, N.REST, N.G4, N.A4, N.REST,
        N.F4, N.REST, N.G4, N.A4, N.G4, N.REST, N.E4, N.REST,
      ],
      arp: [
        N.C4, N.E4, N.REST, N.G4, N.A3, N.C4, N.REST, N.E4,
        N.F3, N.A3, N.REST, N.C4, N.G3, N.B3, N.REST, N.D4,
      ],
      bass: [
        N.C3, N.REST, N.REST, N.REST, N.A2, N.REST, N.REST, N.REST,
        N.F2, N.REST, N.REST, N.REST, N.G2, N.REST, N.REST, N.REST,
      ],
      drum: [
        'hat', 'none', 'hat', 'none', 'hat', 'none', 'hat', 'none',
        'hat', 'none', 'hat', 'none', 'hat', 'none', 'snare', 'none',
      ],
    },
  },
  'retro-dungeon': {
    bpm: 112,
    pattern: {
      lead: [
        N.A4, N.REST, N.C5, N.B4, N.REST, N.G4, N.A4, N.REST,
        N.F4, N.REST, N.E4, N.REST, N.D4, N.E4, N.A3, N.REST,
      ],
      arp: [
        N.A3, N.C4, N.E4, N.A4, N.F3, N.A3, N.C4, N.F4,
        N.D3, N.F3, N.A3, N.D4, N.E3, N.G3, N.B3, N.E4,
      ],
      bass: [
        N.A2, N.REST, N.A2, N.REST, N.F2, N.REST, N.F2, N.REST,
        N.D2, N.REST, N.D2, N.REST, N.E2, N.REST, N.E2, N.REST,
      ],
      drum: [
        'kick', 'none', 'hat', 'none', 'snare', 'none', 'hat', 'none',
        'kick', 'none', 'hat', 'none', 'snare', 'hat', 'kick', 'none',
      ],
    },
  },
  'retro-mining': {
    bpm: 120,
    pattern: {
      lead: [
        N.C4, N.REST, N.Eb4, N.REST, N.F4, N.REST, N.G4, N.Bb4,
        N.C5, N.Bb4, N.G4, N.F4, N.Eb4, N.F4, N.C4, N.REST,
      ],
      arp: [
        N.C3, N.G3, N.C4, N.Eb4, N.F3, N.C4, N.F4, N.G3,
        N.G3, N.D4, N.G4, N.Bb4, N.C3, N.G3, N.Eb4, N.G4,
      ],
      bass: [
        N.C2, N.REST, N.C2, N.Eb2, N.F2, N.REST, N.F2, N.REST,
        N.G2, N.REST, N.G2, N.Bb2, N.C2, N.REST, N.C2, N.REST,
      ],
      drum: [
        'kick', 'hat', 'snare', 'hat', 'kick', 'kick', 'snare', 'hat',
        'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'snare',
      ],
    },
  },
};

export class RetroChiptuneBgmPlayer {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.25;
  private currentTheme: RetroBgmTheme = 'retro-jump';
  private timerId: ReturnType<typeof setInterval> | null = null;
  private step: number = 0;
  private masterGain: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('oiyo-retro-bgm-muted');
        if (stored === 'true') this.isMuted = true;
      } catch {
        // ignore storage errors
      }
    }
  }

  private initAudio(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playTheme(theme: RetroBgmTheme = 'retro-jump'): void {
    const ctx = this.initAudio();
    if (!ctx || !this.masterGain) return;

    this.currentTheme = theme;
    this.isPlaying = true;

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    const { bpm, pattern } = THEME_PATTERNS[theme];
    const stepDurationMs = (60 / bpm / 4) * 1000; // 16th note step in ms

    this.step = 0;
    this.timerId = setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      this.playStep(pattern, this.step);
      this.step = (this.step + 1) % 16;
    }, stepDurationMs);
  }

  private playStep(pattern: Pattern16, step: number): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const stepSec = 0.12;

    // 1. Channel 1: Square Lead
    const leadFreq = pattern.lead[step];
    if (leadFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(leadFreq, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + stepSec * 1.5);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + stepSec * 1.5);
    }

    // 2. Channel 2: Square Arpeggio
    const arpFreq = pattern.arp[step];
    if (arpFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(arpFreq, now);

      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + stepSec * 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + stepSec * 0.8);
    }

    // 3. Channel 3: Triangle Bass
    const bassFreq = pattern.bass[step];
    if (bassFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bassFreq, now);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + stepSec * 1.8);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + stepSec * 1.8);
    }

    // 4. Channel 4: Noise / Drum
    const drum = pattern.drum[step];
    if (drum === 'kick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (drum === 'snare') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (drum === 'hat') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(980, now);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.03);
    }
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.playTheme(this.currentTheme);
      return true;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('oiyo-retro-bgm-muted', String(muted));
      } catch {}
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    const next = !this.isMuted;
    this.setMuted(next);
    return next;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getStatus(): { isPlaying: boolean; isMuted: boolean; theme: RetroBgmTheme } {
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      theme: this.currentTheme,
    };
  }
}

// Global singleton instance for easy cross-component reuse
let globalBgmPlayer: RetroChiptuneBgmPlayer | null = null;

export function getRetroChiptuneBgm(): RetroChiptuneBgmPlayer {
  if (!globalBgmPlayer) {
    globalBgmPlayer = new RetroChiptuneBgmPlayer();
  }
  return globalBgmPlayer;
}
