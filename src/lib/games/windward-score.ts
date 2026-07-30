/**
 * Small on-device orchestral score for Windward Horizons.
 *
 * It uses Web Audio oscillators, filters, envelopes and a generated reverb
 * impulse. No microphone, audio file, network request or licensed recording is
 * involved. Audio starts only from the player's voyage button.
 */

const CHORDS = [
  [146.83, 174.61, 220.0, 293.66], // Dm
  [116.54, 146.83, 174.61, 233.08], // Bb
  [130.81, 164.81, 196.0, 261.63], // F
  [130.81, 164.81, 196.0, 246.94], // C/E
] as const;

const MELODY = [293.66, 349.23, 440, 392, 349.23, 293.66, 261.63, 293.66] as const;

export class WindwardScore {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private bar = 0;

  get playing(): boolean {
    return this.context !== null;
  }

  async start(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (this.context) return true;
    const AudioContextClass = window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return false;

    const context = new AudioContextClass();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const convolver = context.createConvolver();
    const dry = context.createGain();
    const wet = context.createGain();
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(0.32, context.currentTime + 1.2);
    dry.gain.value = 0.84;
    wet.gain.value = 0.24;
    convolver.buffer = this.makeReverb(context);
    master.connect(dry).connect(compressor);
    master.connect(convolver).connect(wet).connect(compressor);
    compressor.connect(context.destination);

    this.context = context;
    this.master = master;
    this.bar = 0;
    await context.resume();
    this.scheduleBar();
    this.timer = window.setInterval(() => this.scheduleBar(), 3_600);
    return true;
  }

  async stop(): Promise<void> {
    const context = this.context;
    const master = this.master;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.context = null;
    this.master = null;
    if (!context || !master) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    window.setTimeout(() => void context.close(), 420);
  }

  private scheduleBar(): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const start = context.currentTime + 0.08;
    const chord = CHORDS[this.bar % CHORDS.length];
    const next = CHORDS[(this.bar + 1) % CHORDS.length];

    chord.forEach((frequency, index) => {
      this.tone(frequency / (index === 0 ? 2 : 1), start, 4.1, "sawtooth", index === 0 ? 0.105 : 0.042, 760);
      this.tone(frequency * 2, start + 0.04, 3.8, "triangle", 0.018, 1_900, index % 2 ? 4 : -4);
    });

    const melodyRoot = MELODY[(this.bar * 2) % MELODY.length];
    this.tone(melodyRoot, start + 0.25, 1.4, "triangle", 0.07, 1_250, 2);
    this.tone(MELODY[(this.bar * 2 + 1) % MELODY.length], start + 1.9, 1.35, "triangle", 0.064, 1_180, -2);
    this.tone(next[0] / 2, start + 3.25, 0.7, "sine", 0.13, 260);

    this.timpani(chord[0] / 2, start);
    this.timpani(chord[0] / 2, start + 2.7, 0.65);
    this.cymbal(start + 3.35);
    this.bar += 1;
  }

  private tone(
    frequency: number,
    start: number,
    duration: number,
    type: OscillatorType,
    level: number,
    cutoff: number,
    detune = 0,
  ): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.setValueAtTime(detune, start);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, start);
    filter.Q.value = 0.7;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(level, start + Math.min(0.42, duration * 0.24));
    envelope.gain.setValueAtTime(level * 0.78, start + duration * 0.7);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter).connect(envelope).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  private timpani(frequency: number, start: number, level = 0.9): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency * 1.65, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency, start + 0.16);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18 * level, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.72);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + 0.78);
  }

  private cymbal(start: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const length = Math.floor(context.sampleRate * 0.72);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 4_200;
    gain.gain.setValueAtTime(0.045, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
    source.connect(filter).connect(gain).connect(master);
    source.start(start);
  }

  private makeReverb(context: AudioContext): AudioBuffer {
    const length = Math.floor(context.sampleRate * 2.1);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, 2.35);
      }
    }
    return buffer;
  }
}
