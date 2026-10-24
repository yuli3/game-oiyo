// Procedural ambient BGM engine & Audio Mixer Bus (studio standard F4, 06-unity-studio-mapping).
// Synthesizes lightweight ambient chord progressions using pure Web Audio API nodes without
// downloading bulky mp3/ogg files (0KB bandwidth). Supports dynamic sound ducking when SFX fire.

export type BgmTrack = "zen" | "arcade" | "cosmic";

export interface BgmOptions {
  muted?: boolean;
  volume?: number;
  track?: BgmTrack;
  resolveContext?: () => AudioContext | null;
}

export interface BgmController {
  start(track?: BgmTrack): void;
  stop(): void;
  setTrack(track: BgmTrack): void;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  /** Temporarily lowers BGM volume (ducking) during loud SFX/explosions, then restores it. */
  duck(durationMs?: number, factor?: number): void;
  readonly isPlaying: boolean;
  readonly muted: boolean;
  readonly volume: number;
  readonly currentTrack: BgmTrack;
  close(): void;
}

// Chord progression frequencies (Hz) for procedural generation
const TRACK_PATTERNS: Record<BgmTrack, { chordDuration: number; chords: number[][] }> = {
  zen: {
    chordDuration: 2.4,
    chords: [
      [261.63, 329.63, 392.0, 523.25], // C maj
      [220.0, 261.63, 329.63, 440.0],  // A min
      [174.61, 220.0, 261.63, 349.23], // F maj
      [196.0, 246.94, 293.66, 392.0],  // G maj
    ],
  },
  arcade: {
    chordDuration: 1.2,
    chords: [
      [130.81, 196.0, 261.63, 329.63], // C3 bass groove
      [146.83, 220.0, 293.66, 349.23], // D3
      [110.0, 164.81, 220.0, 261.63],  // A2
      [164.81, 246.94, 329.63, 392.0], // E3
    ],
  },
  cosmic: {
    chordDuration: 3.2,
    chords: [
      [130.81, 196.0, 311.13, 392.0, 587.33], // C min9
      [116.54, 174.61, 261.63, 349.23, 523.25], // Bb add9
      [103.83, 155.56, 233.08, 311.13, 466.16], // Ab maj7
      [98.0, 146.83, 220.0, 293.66, 440.0],     // G sus4
    ],
  },
};

function defaultAudioContextResolver(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    return new AudioCtx();
  } catch {
    return null;
  }
}

export function createBgmController(options: BgmOptions = {}): BgmController {
  let muted = options.muted ?? false;
  let volume = Math.max(0, Math.min(1, options.volume ?? 0.035));
  let currentTrack: BgmTrack = options.track ?? "zen";
  let isPlaying = false;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let duckTimerId: ReturnType<typeof setTimeout> | null = null;

  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let activeNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];

  const initAudio = () => {
    if (ctx && ctx.state !== "closed") return true;
    const resolver = options.resolveContext ?? defaultAudioContextResolver;
    ctx = resolver();
    if (!ctx) return false;
    try {
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  };

  const playChord = (chord: number[], duration: number) => {
    if (!ctx || !masterGain || muted) return;
    try {
      if (ctx.state === "suspended") void ctx.resume();
      const now = ctx.currentTime;

      // Play soft arpeggiated layered notes
      chord.forEach((freq, idx) => {
        if (!ctx || !masterGain) return;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        // Waveform styling per track
        if (currentTrack === "zen") {
          osc.type = "sine";
        } else if (currentTrack === "arcade") {
          osc.type = idx === 0 ? "sawtooth" : "triangle";
        } else {
          osc.type = "sine";
        }

        osc.frequency.setValueAtTime(freq, now);

        // Gentle envelope: soft attack, long release
        const attack = 0.15 + idx * 0.05;
        const noteVol = (1 / chord.length) * 0.9;

        noteGain.gain.setValueAtTime(0.0001, now);
        noteGain.gain.exponentialRampToValueAtTime(noteVol, now + attack);
        noteGain.gain.setValueAtTime(noteVol, now + duration - 0.4);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + duration);

        activeNodes.push({ osc, gain: noteGain });
      });

      // Cleanup finished nodes
      setTimeout(() => {
        activeNodes = activeNodes.filter((item) => {
          try {
            return item.gain.gain.value > 0.0001;
          } catch {
            return false;
          }
        });
      }, duration * 1000);
    } catch {
      /* non-blocking audio */
    }
  };

  const startLoop = () => {
    if (!initAudio()) return;
    stopLoop();
    isPlaying = true;

    const pattern = TRACK_PATTERNS[currentTrack];
    let chordIndex = 0;

    const step = () => {
      if (!isPlaying || muted) return;
      const chord = pattern.chords[chordIndex % pattern.chords.length];
      playChord(chord, pattern.chordDuration);
      chordIndex += 1;
    };

    step();
    timerId = setInterval(step, pattern.chordDuration * 1000 * 0.96);
  };

  const stopLoop = () => {
    isPlaying = false;
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    if (duckTimerId !== null) {
      clearTimeout(duckTimerId);
      duckTimerId = null;
    }
    activeNodes.forEach(({ osc }) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* already stopped */
      }
    });
    activeNodes = [];
  };

  return {
    start(track?: BgmTrack) {
      if (track) currentTrack = track;
      startLoop();
    },
    stop() {
      stopLoop();
    },
    setTrack(track: BgmTrack) {
      if (currentTrack === track) return;
      currentTrack = track;
      if (isPlaying) startLoop();
    },
    setMuted(nextMuted: boolean) {
      muted = nextMuted;
      if (masterGain && ctx) {
        try {
          masterGain.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime);
        } catch { /* ignore */ }
      }
      if (!muted && isPlaying && timerId === null) {
        startLoop();
      }
    },
    setVolume(nextVol: number) {
      volume = Math.max(0, Math.min(1, nextVol));
      if (masterGain && ctx && !muted) {
        try {
          masterGain.gain.setValueAtTime(volume, ctx.currentTime);
        } catch { /* ignore */ }
      }
    },
    duck(durationMs = 800, factor = 0.25) {
      if (!masterGain || !ctx || muted) return;
      try {
        const now = ctx.currentTime;
        const duckedVol = volume * factor;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setTargetAtTime(duckedVol, now, 0.05);

        if (duckTimerId) clearTimeout(duckTimerId);
        duckTimerId = setTimeout(() => {
          if (!masterGain || !ctx || muted) return;
          try {
            masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.15);
          } catch { /* ignore */ }
        }, durationMs);
      } catch { /* ignore */ }
    },
    get isPlaying() {
      return isPlaying;
    },
    get muted() {
      return muted;
    },
    get volume() {
      return volume;
    },
    get currentTrack() {
      return currentTrack;
    },
    close() {
      stopLoop();
      if (ctx && ctx.state !== "closed") {
        void ctx.close().catch(() => undefined);
      }
      ctx = null;
      masterGain = null;
    },
  };
}
