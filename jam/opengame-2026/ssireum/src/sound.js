// Procedural sound for Sandpit Kings: crowd bed, buk drum, kkwaenggwari gong,
// grunts, thuds. Everything is synthesized, so there are no audio files to load.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('sandpit.mute') === '1'; } catch { /* storage blocked */ }
  }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = c.createDynamicsCompressor();
    this.master.connect(comp).connect(c.destination);

    // white noise buffer shared by every noisy sound
    const len = c.sampleRate * 2;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // crowd murmur: band-passed noise whose level follows the excitement
    const src = c.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.7;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    this.crowdGain = c.createGain(); this.crowdGain.gain.value = 0.05;
    src.connect(bp).connect(lp).connect(this.crowdGain).connect(this.master);
    src.start();
    this.crowdFilter = bp;
  }

  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem('sandpit.mute', this.muted ? '1' : '0'); } catch { /* ignore */ }
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  update(cheer) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.crowdGain.gain.setTargetAtTime(0.04 + Math.min(1, cheer) * 0.22, t, 0.25);
    this.crowdFilter.frequency.setTargetAtTime(600 + cheer * 600, t, 0.3);
  }

  _env(gain, t, a, peak, dec) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  _noise(t, dur, type, freq, q, peak, a = 0.005) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    this._env(g, t, a, peak, dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random()); s.stop(t + a + dur + 0.05);
    return f;
  }

  _tone(t, type, f0, f1, dur, peak, a = 0.004) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    this._env(g, t, a, peak, dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + a + dur + 0.05);
  }

  // buk: deep barrel drum, two hits
  drum() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [dt, p] of [[0, 0.9], [0.18, 0.7], [0.36, 1]]) {
      this._tone(t + dt, 'sine', 120, 48, 0.35, p);
      this._noise(t + dt, 0.06, 'lowpass', 900, 0.5, p * 0.4);
    }
  }

  // kkwaenggwari: small bright gong, inharmonic partials
  gong() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let k = 0; k < 4; k++) {
      const tt = t + k * 0.13;
      for (const [f, p] of [[1180, 0.18], [1720, 0.12], [2610, 0.08], [3410, 0.05]]) {
        this._tone(tt, 'triangle', f, f * 0.995, k === 3 ? 0.9 : 0.22, p);
      }
    }
  }

  grunt(side) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = side === 0 ? 150 : 115;
    this._tone(t, 'sawtooth', base * 1.3, base * 0.8, 0.22, 0.12, 0.02);
    const f = this._noise(t, 0.2, 'bandpass', base * 5, 3, 0.18, 0.02);
    f.frequency.exponentialRampToValueAtTime(base * 3, t + 0.2);
  }

  // belt grab / body contact
  slap() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.08, 'highpass', 1400, 0.7, 0.5, 0.002);
    this._tone(t, 'sine', 220, 90, 0.08, 0.3);
  }

  // big effort as a throw goes up
  heave() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(t, 'sawtooth', 95, 160, 0.45, 0.14, 0.06);
    this._noise(t, 0.5, 'bandpass', 500, 1.5, 0.2, 0.08);
  }

  // body into sand
  thud() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(t, 'sine', 90, 32, 0.5, 1);
    this._noise(t, 0.45, 'lowpass', 600, 0.5, 0.7, 0.003);
    this._noise(t + 0.03, 0.6, 'bandpass', 2500, 0.6, 0.12, 0.05); // sand spray
  }

  // the crowd erupts
  cheer() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const f = this._noise(t + i * 0.05, 1.6, 'bandpass', 800 + i * 500, 1.2, 0.25, 0.12);
      f.frequency.linearRampToValueAtTime(1100 + i * 600, t + 1.2);
    }
    // a few claps
    for (let i = 0; i < 14; i++) this._noise(t + 0.1 + Math.random() * 1.3, 0.03, 'bandpass', 1600 + Math.random() * 1200, 2, 0.15, 0.001);
  }

  whistle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 2900;
    const lfo = c.createOscillator(); lfo.frequency.value = 38;
    const lg = c.createGain(); lg.gain.value = 120;
    lfo.connect(lg).connect(o.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    g.gain.setValueAtTime(0.12, t + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g).connect(this.master);
    o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
  }
}
