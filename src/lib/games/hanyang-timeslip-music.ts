/* Hanyang Timeslip — background music written as data (2026-11-16, 2nd update).
 *
 * Four short loops on Korean pentatonic scales: 평조 (sol-la-do-re-mi) for the
 * town and the gate, 계면조-like minor pentatonic for the field and the boss.
 * Notes are MIDI numbers (null = rest), one step = one eighth note. The drum
 * line borrows the feel of 장구 strokes: 덩 (both sides, low), 쿵 (low), 덕 (rim).
 * The player below schedules notes a little ahead on the Web Audio clock so
 * the beat stays steady even when the main thread is busy.
 * ────────────────────────────────────────────────────────────────────────── */

export type MusicTheme = "town" | "field" | "gate" | "boss";
export type Drum = "deong" | "kung" | "deok" | null;

export interface Song {
  bpm: number;
  /** Pitch classes (0 = C) the lead is allowed to use. */
  scale: readonly number[];
  lead: readonly (number | null)[];
  bass: readonly (number | null)[];
  drum: readonly Drum[];
  leadWave: OscillatorType;
}

const _ = null;
const D: Drum = "deong";
const K: Drum = "kung";
const T: Drum = "deok";

/** G 평조: G A C D E. */
const PYEONGJO = [7, 9, 0, 2, 4] as const;
/** E 계면조 (minor pentatonic): E G A B D. */
const GYEMYEON_E = [4, 7, 9, 11, 2] as const;
/** A minor pentatonic for the boss: A C D E G. */
const GYEMYEON_A = [9, 0, 2, 4, 7] as const;

export const SONGS: Record<MusicTheme, Song> = {
  town: {
    bpm: 92,
    scale: PYEONGJO,
    leadWave: "triangle",
    lead: [
      74, _, 76, 74, 72, _, 69, _, 67, _, 69, 72, 74, _, _, _,
      76, _, 79, 76, 74, _, 72, 69, 72, _, 69, _, 67, _, _, _,
    ],
    bass: [
      43, _, _, 50, _, _, 43, _, 48, _, _, 55, _, _, 48, _,
      45, _, _, 52, _, _, 45, _, 50, _, _, 43, _, _, 50, _,
    ],
    drum: [
      D, _, _, T, _, T, K, _, D, _, _, T, _, T, K, _,
      D, _, _, T, _, T, K, _, D, _, T, T, _, T, K, _,
    ],
  },
  field: {
    bpm: 132,
    scale: GYEMYEON_E,
    leadWave: "square",
    lead: [
      76, _, 79, 81, 83, _, 81, 79, 76, _, 74, _, 71, 74, 76, _,
      79, _, 81, 83, 86, _, 83, 81, 79, 81, 79, 76, 74, _, 76, _,
    ],
    bass: [
      40, _, 47, _, 40, _, 47, _, 45, _, 52, _, 45, _, 52, _,
      43, _, 50, _, 43, _, 50, _, 47, _, 50, _, 47, _, 40, _,
    ],
    drum: [
      D, T, K, T, D, T, K, T, D, T, K, T, D, T, K, K,
      D, T, K, T, D, T, K, T, D, T, K, T, D, K, T, T,
    ],
  },
  gate: {
    bpm: 100,
    scale: PYEONGJO,
    leadWave: "triangle",
    lead: [
      72, _, _, 74, _, _, 76, _, 74, _, _, 72, _, 69, _, _,
      67, _, _, 69, _, _, 72, _, 74, _, 72, _, 69, _, _, _,
    ],
    bass: [
      48, _, _, _, 43, _, _, _, 45, _, _, _, 43, _, _, _,
      48, _, _, _, 45, _, _, _, 50, _, _, _, 43, _, _, _,
    ],
    drum: [
      T, _, T, _, K, _, T, _, T, _, T, _, K, _, _, _,
      T, _, T, _, K, _, T, _, T, _, T, _, K, _, D, _,
    ],
  },
  boss: {
    bpm: 150,
    scale: GYEMYEON_A,
    leadWave: "square",
    lead: [
      81, _, 81, 84, 86, 84, 81, 79, 76, _, 79, 81, 79, 76, 74, _,
      81, _, 81, 84, 88, 86, 84, 81, 79, 81, 79, 76, 74, 76, 69, _,
    ],
    bass: [
      45, 45, 57, 45, 45, 45, 57, 45, 41, 41, 53, 41, 43, 43, 55, 43,
      45, 45, 57, 45, 45, 45, 57, 45, 40, 40, 52, 40, 43, 43, 55, 43,
    ],
    drum: [
      D, T, T, K, D, T, K, T, D, T, T, K, D, K, D, T,
      D, T, T, K, D, T, K, T, D, T, T, K, D, D, D, T,
    ],
  },
};

export function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

export function stepSeconds(song: Song): number {
  return 60 / song.bpm / 2;
}

export interface MusicPlayer {
  play(theme: MusicTheme | null): void;
  setMuted(muted: boolean): void;
  /** Pauses the clock while the tab is hidden. */
  setHidden(hidden: boolean): void;
  close(): void;
}

const LOOKAHEAD = 0.15;
const TICK_MS = 40;
const VOLUME = 0.22;

/** A tiny scheduler: safe to create on the server (it does nothing until play). */
export function createMusicPlayer(opts: { muted: boolean }): MusicPlayer {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let theme: MusicTheme | null = null;
  let muted = opts.muted;
  let step = 0;
  let nextTime = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const ensure = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOLUME;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
      const data = noise.getChannelData(0);
      let seed = 7;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        data[i] = (seed / 4294967296) * 2 - 1;
      }
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    return ctx;
  };

  const tone = (c: AudioContext, out: GainNode, wave: OscillatorType, hz: number, at: number, len: number, gain: number) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + len + 0.02);
  };

  const hit = (c: AudioContext, out: GainNode, drum: Drum, at: number) => {
    if (!drum) return;
    if (drum === "deok") {
      if (!noise) return;
      const src = c.createBufferSource();
      src.buffer = noise;
      const filter = c.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 2400;
      const g = c.createGain();
      g.gain.setValueAtTime(0.09, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
      src.connect(filter).connect(g).connect(out);
      src.start(at);
      src.stop(at + 0.06);
      return;
    }
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    const top = drum === "deong" ? 150 : 110;
    osc.frequency.setValueAtTime(top, at);
    osc.frequency.exponentialRampToValueAtTime(48, at + 0.12);
    g.gain.setValueAtTime(drum === "deong" ? 0.32 : 0.22, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + 0.18);
  };

  const tick = () => {
    if (!ctx || !master || !theme) return;
    const song = SONGS[theme];
    const len = stepSeconds(song);
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      const i = step % song.lead.length;
      const lead = song.lead[i];
      const bass = song.bass[i];
      if (lead !== null) tone(ctx, master, song.leadWave, midiToHz(lead), nextTime, len * 1.6, song.leadWave === "square" ? 0.05 : 0.11);
      if (bass !== null) tone(ctx, master, "triangle", midiToHz(bass), nextTime, len * 1.8, 0.14);
      hit(ctx, master, song.drum[i], nextTime);
      step += 1;
      nextTime += len;
    }
  };

  const stopTimer = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  return {
    play(next) {
      if (next === theme && timer) return;
      theme = next;
      stopTimer();
      if (!next) return;
      const c = ensure();
      if (!c) return;
      step = 0;
      nextTime = c.currentTime + 0.05;
      timer = setInterval(tick, TICK_MS);
      tick();
    },
    setMuted(next) {
      muted = next;
      if (ctx && master) master.gain.setTargetAtTime(next ? 0 : VOLUME, ctx.currentTime, 0.05);
    },
    setHidden(hidden) {
      if (!ctx) return;
      if (hidden) void ctx.suspend().catch(() => undefined);
      else if (theme) {
        void ctx.resume().catch(() => undefined);
        nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
      }
    },
    close() {
      stopTimer();
      theme = null;
      void ctx?.close().catch(() => undefined);
      ctx = null;
      master = null;
    },
  };
}
