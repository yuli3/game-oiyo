/**
 * Grappling Arena Visual FX & Procedural Audio Engine (Mobile AAA Quality)
 *
 * Provides:
 * 1. ProceduralMusicEngine - Zero-asset Web Audio techno pulse BGM with Phase 1 / Phase 2 tempo shifts
 * 2. ParallaxStarfield - 3-layer parallax deep space nebula & reactive stars
 * 3. ThrusterTrail - Jetpack flame trail with color dissipation
 * 4. LaserBeamEffect - Telegraph aiming line and high-energy charged beam laser
 * 5. MobileHapticEngine - Native mobile vibration feedback
 */

// ============================================================================
// 1. Procedural Adaptive Battle BGM (Zero Network Payload)
// ============================================================================

export class ProceduralMusicEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private step: number = 0;
  private timerId: number | null = null;
  private bpm: number = 120;
  private masterGain: GainNode | null = null;
  public volume: number = 0.25;

  constructor(getContext?: () => AudioContext | null) {
    if (getContext) {
      this.ctx = getContext();
    }
  }

  public setAudioContext(ctx: AudioContext | null): void {
    this.ctx = ctx;
    if (ctx && !this.masterGain) {
      try {
        this.masterGain = ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
        this.masterGain.connect(ctx.destination);
      } catch {
        // Fallback if audio suspended
      }
    }
  }

  public setPhase(phase: 1 | 2): void {
    this.bpm = phase === 2 ? 138 : 120;
  }

  public start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.nextNoteTime = this.ctx ? this.ctx.currentTime + 0.05 : 0;
    this.step = 0;
    this.scheduleLoop();
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleLoop = (): void => {
    if (!this.isPlaying || !this.ctx || !this.masterGain) return;

    const secondsPerBeat = 60.0 / this.bpm;
    const stepDuration = secondsPerBeat / 4; // 16th notes

    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextNoteTime);
      this.nextNoteTime += stepDuration;
      this.step = (this.step + 1) % 16;
    }

    this.timerId = window.setTimeout(this.scheduleLoop, 40);
  };

  private playStep(step: number, time: number): void {
    if (!this.ctx || !this.masterGain) return;

    // 1. Kick on steps 0, 4, 8, 12 (4-on-the-floor)
    if (step % 4 === 0) {
      this.playKick(time);
    }

    // 2. Closed / Open Hi-hat on off-beats (step 2, 6, 10, 14)
    if (step % 2 === 0 && step % 4 !== 0) {
      this.playHiHat(time, step === 10);
    }

    // 3. Cyber Bass Arp
    const bassNotes = [55, 55, 65.4, 55, 73.4, 55, 82.4, 73.4]; // A1, C2, D2, E2 notes
    const freq = bassNotes[step % bassNotes.length];
    this.playBass(freq, time);
  }

  private playKick(time: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.08);

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  private playHiHat(time: number, isOpen: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    // Metallic noise synthesis with bandpass filter
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    const dur = isOpen ? 0.08 : 0.03;
    gain.gain.setValueAtTime(isOpen ? 0.18 : 0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + dur);
  }

  private playBass(freq: number, time: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.08);
  }
}

// ============================================================================
// 2. Parallax Starfield & Nebula
// ============================================================================

export interface Star {
  x: number;
  y: number;
  size: number;
  depth: number; // 0.2 (distant), 0.5 (mid), 1.0 (foreground)
  twinkleOffset: number;
  color: string;
}

export class ParallaxStarfield {
  public stars: Star[] = [];
  public width: number;
  public height: number;

  constructor(width: number, height: number, starCount: number = 100) {
    this.width = width;
    this.height = height;
    this.init(starCount);
  }

  public init(count: number): void {
    this.stars = [];
    const colors = ['#ffffff', '#93c5fd', '#c084fc', '#fef08a'];
    for (let i = 0; i < count; i++) {
      const depth = 0.2 + Math.random() * 0.8;
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: depth * 2.2,
        depth,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    timeSec: number,
    isPhase2: boolean
  ): void {
    ctx.save();

    // 1. Deep Space Dark Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, isPhase2 ? '#1a0505' : '#030712');
    bgGrad.addColorStop(1, isPhase2 ? '#0f0202' : '#0b0f19');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Cosmic Nebula Cloud
    const nebulaGrad = ctx.createRadialGradient(
      this.width * 0.5 - camX * 0.1,
      this.height * 0.4 - camY * 0.1,
      40,
      this.width * 0.5 - camX * 0.1,
      this.height * 0.4 - camY * 0.1,
      this.width * 0.6
    );
    if (isPhase2) {
      nebulaGrad.addColorStop(0, 'rgba(239, 68, 68, 0.15)');
      nebulaGrad.addColorStop(0.5, 'rgba(185, 28, 28, 0.08)');
      nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      nebulaGrad.addColorStop(0, 'rgba(147, 51, 234, 0.16)');
      nebulaGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.08)');
      nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 3. Cyber Floor Grid
    ctx.strokeStyle = isPhase2 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    const floorY = this.height - 45;
    for (let x = -((camX * 0.4) % 40); x < this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, floorY);
      ctx.lineTo(x + (x - this.width / 2) * 0.5, this.height);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(this.width, floorY);
    ctx.stroke();

    // 4. Parallax Stars
    for (const star of this.stars) {
      const sx = (star.x - camX * star.depth * 0.3 + this.width * 2) % this.width;
      const sy = (star.y - camY * star.depth * 0.3 + this.height * 2) % this.height;
      const alpha = 0.4 + 0.6 * Math.sin(timeSec * 3 + star.twinkleOffset);

      ctx.fillStyle = star.color;
      ctx.globalAlpha = alpha * star.depth;
      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ============================================================================
// 3. Jet Thruster Particle Trail
// ============================================================================

export interface ThrusterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class ThrusterTrail {
  public particles: ThrusterParticle[] = [];
  private poolCapacity: number = 32;

  public emit(x: number, y: number, dirX: number, dirY: number): void {
    if (this.particles.length >= this.poolCapacity) {
      this.particles.shift();
    }
    const spread = (Math.random() - 0.5) * 40;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: -dirX * 90 + spread,
      vy: -dirY * 90 + spread + 30, // downward exhaust bias
      life: 0.25,
      maxLife: 0.25,
      size: 3 + Math.random() * 3,
    });
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const progress = 1 - p.life / p.maxLife;
      const alpha = Math.max(0, 1 - progress);
      const radius = p.size * (1 - progress * 0.5);

      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = progress < 0.4 ? '#67e8f9' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ============================================================================
// 4. Charged Laser Beam Visuals
// ============================================================================

export class LaserBeamEffect {
  public active: boolean = false;
  public telegraph: boolean = false;
  public startX: number = 0;
  public startY: number = 0;
  public endX: number = 0;
  public endY: number = 0;
  public chargeProgress: number = 0; // 0 -> 1

  public setTelegraph(sx: number, sy: number, ex: number, ey: number, progress: number): void {
    this.telegraph = true;
    this.active = false;
    this.startX = sx;
    this.startY = sy;
    this.endX = ex;
    this.endY = ey;
    this.chargeProgress = progress;
  }

  public fire(sx: number, sy: number, ex: number, ey: number): void {
    this.telegraph = false;
    this.active = true;
    this.startX = sx;
    this.startY = sy;
    this.endX = ex;
    this.endY = ey;
  }

  public clear(): void {
    this.telegraph = false;
    this.active = false;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.telegraph && !this.active) return;

    ctx.save();
    if (this.telegraph) {
      // Aiming laser guide line with pulsing dots
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + this.chargeProgress * 0.5})`;
      ctx.lineWidth = 1.5 + this.chargeProgress * 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(this.endX, this.endY);
      ctx.stroke();

      // Glowing charge ring at origin
      ctx.beginPath();
      ctx.arc(this.startX, this.startY, 12 * this.chargeProgress, 0, Math.PI * 2);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.active) {
      // High-power death beam with outer glow and core
      // 1. Outer Bloom
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(this.endX, this.endY);
      ctx.stroke();

      // 2. Main Beam
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(this.endX, this.endY);
      ctx.stroke();

      // 3. Core Intense White Beam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(this.endX, this.endY);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ============================================================================
// 5. Native Mobile Haptic Feedback Helper
// ============================================================================

export function triggerMobileHaptic(type: 'light' | 'medium' | 'heavy' | 'warning'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.vibrate) {
    return;
  }
  try {
    switch (type) {
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(30);
        break;
      case 'heavy':
        navigator.vibrate([40, 20, 60]);
        break;
      case 'warning':
        navigator.vibrate([80, 40, 80]);
        break;
    }
  } catch {
    // Haptics not allowed without prior user activation or blocked by policy
  }
}
