// Procedural sound: a plucked-string (gayageum-like) melody on a Korean
// pentatonic scale, janggu-style drums that speed up with danger, wind, and sfx.
// Everything is synthesized at runtime, so there are no audio files to load.

const PENTA = [0, 2, 5, 7, 9]; // a gungjo-flavoured pentatonic
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.danger = 0;
    this.nextNote = 0;
    this.nextBeat = 0;
    this.beatIndex = 0;
    this.melodyStep = 0;
    this.plucks = new Map();
    this.enabled = false;
  }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.8; this.master.connect(c.destination);
    this.music = c.createGain(); this.music.gain.value = 0.55; this.music.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    // simple feedback-delay "hall" for the strings
    this.delay = c.createDelay(1.0); this.delay.delayTime.value = 0.33;
    this.fb = c.createGain(); this.fb.gain.value = 0.32;
    const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
    this.delay.connect(dl); dl.connect(this.fb); this.fb.connect(this.delay); dl.connect(this.music);
    this.noiseBuf = this.makeNoise(1.5);
    this.wind();
    this.enabled = true;
    this.nextNote = c.currentTime + 0.3;
    this.nextBeat = c.currentTime + 0.5;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  makeNoise(sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  // Karplus-Strong pluck rendered once per pitch and cached
  pluckBuffer(freq) {
    const key = Math.round(freq * 10);
    if (this.plucks.has(key)) return this.plucks.get(key);
    const c = this.ctx, sr = c.sampleRate, len = Math.floor(sr * 2.2);
    const buf = c.createBuffer(1, len, sr), out = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / freq));
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    let p = 0;
    for (let i = 0; i < len; i++) {
      const nxt = (p + 1) % period;
      const v = 0.4985 * (ring[p] + ring[nxt]);
      out[i] = ring[p];
      ring[p] = v;
      p = nxt;
    }
    this.plucks.set(key, buf);
    return buf;
  }

  pluck(freq, when, gain = 0.25, bend = 0) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.pluckBuffer(freq);
    if (bend) { src.playbackRate.setValueAtTime(1, when + 0.12); src.playbackRate.linearRampToValueAtTime(Math.pow(2, bend / 12), when + 0.45); }
    const g = c.createGain(); g.gain.setValueAtTime(gain, when); g.gain.exponentialRampToValueAtTime(0.001, when + 2.0);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200;
    src.connect(f); f.connect(g); g.connect(this.music); g.connect(this.delay);
    src.start(when); src.stop(when + 2.2);
  }

  drum(when, kind, gain) {
    const c = this.ctx;
    if (kind === 'kung') { // low janggu side
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(140, when); o.frequency.exponentialRampToValueAtTime(55, when + 0.25);
      const g = c.createGain(); g.gain.setValueAtTime(gain, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.4);
      o.connect(g); g.connect(this.music); o.start(when); o.stop(when + 0.45);
    } else { // 'deok' sharp stick side
      const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 2.5;
      const g = c.createGain(); g.gain.setValueAtTime(gain, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.09);
      s.connect(f); f.connect(g); g.connect(this.music); s.start(when, Math.random()); s.stop(when + 0.1);
    }
  }

  wind() {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.makeNoise(4); s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.7;
    const g = c.createGain(); g.gain.value = 0.05;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lg = c.createGain(); lg.gain.value = 220;
    lfo.connect(lg); lg.connect(f.frequency);
    s.connect(f); f.connect(g); g.connect(this.music);
    s.start(); lfo.start();
    this.windGain = g;
  }

  // called every frame: schedules music slightly ahead of time
  update(danger, root = 50) {
    if (!this.enabled || !this.ctx) return;
    const c = this.ctx, now = c.currentTime;
    this.danger += (danger - this.danger) * 0.05;
    const tempo = 0.62 - this.danger * 0.3; // seconds per beat
    while (this.nextBeat < now + 0.2) {
      const b = this.beatIndex % 8;
      // gutgeori-ish 12/8 feel compressed into a 8-step loop
      if (b === 0) this.drum(this.nextBeat, 'kung', 0.35 + this.danger * 0.25);
      if (b === 3 || b === 6) this.drum(this.nextBeat, 'deok', 0.08 + this.danger * 0.18);
      if (this.danger > 0.45 && (b === 4 || b === 7)) this.drum(this.nextBeat, 'kung', 0.2 * this.danger);
      this.beatIndex++;
      this.nextBeat += tempo / 2;
    }
    while (this.nextNote < now + 0.2) {
      const phrase = [0, 2, 4, 3, 2, 1, 0, -1, 1, 2, 4, 5, 4, 2, 1, 0];
      const step = phrase[this.melodyStep % phrase.length] + (Math.random() < 0.25 ? (Math.random() < 0.5 ? 1 : -1) : 0);
      const oct = Math.floor(step / 5), deg = ((step % 5) + 5) % 5;
      const m = root + 12 + oct * 12 + PENTA[deg];
      const rest = Math.random() < 0.28;
      if (!rest) this.pluck(midi(m), this.nextNote, 0.16, Math.random() < 0.15 ? 2 : 0);
      if (this.melodyStep % 4 === 0) this.pluck(midi(root + PENTA[deg % 3]), this.nextNote, 0.12);
      this.melodyStep++;
      this.nextNote += tempo * (Math.random() < 0.3 ? 1.5 : 1);
    }
  }

  // ---- sfx ----
  noiseHit(dur, freq, q, gain, type = 'bandpass', sweepTo) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  tone(freq, dur, gain, type = 'sine', to) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  throw() { this.noiseHit(0.18, 900, 1.2, 0.18, 'bandpass', 2600); }
  burst() { this.noiseHit(0.45, 1800, 0.6, 0.3, 'lowpass', 200); this.tone(90, 0.3, 0.35, 'sine', 40); }
  hit() { this.tone(220, 0.12, 0.12, 'square', 110); }
  kill() { if (!this.ctx) return; this.pluck(midi(74 + PENTA[(Math.random() * 5) | 0]), this.ctx.currentTime, 0.22); }
  hurt() { this.noiseHit(0.3, 300, 1, 0.4, 'lowpass', 80); this.tone(120, 0.25, 0.3, 'sawtooth', 60); }
  dash() { this.noiseHit(0.22, 500, 0.8, 0.25, 'bandpass', 3000); }
  bell() {
    if (!this.ctx) return;
    for (const [f, g] of [[523.25, 0.25], [1046.5, 0.08], [1567.98, 0.05]]) this.tone(f, 2.4, g, 'sine');
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) this.pluck(midi(62 + PENTA[i * 2 % 5] + 12), t + i * 0.09, 0.2);
  }
  gate() { this.tone(70, 1.2, 0.4, 'sine', 50); this.noiseHit(1.2, 200, 0.5, 0.2, 'lowpass', 60); }
  pickup() { this.tone(880, 0.12, 0.08, 'triangle', 1320); }
  roar() { this.tone(70, 1.0, 0.45, 'sawtooth', 35); this.noiseHit(0.9, 400, 0.5, 0.3, 'lowpass', 90); }
  slam() { this.tone(55, 0.6, 0.6, 'sine', 30); this.noiseHit(0.6, 500, 0.4, 0.4, 'lowpass', 60); }
  choose() { if (!this.ctx) return; const t = this.ctx.currentTime; [0, 2, 4].forEach((d, i) => this.pluck(midi(67 + PENTA[d]), t + i * 0.07, 0.2)); }
}
