/**
 * Game Juice & Native Game-Feel Engine (v1.0)
 *
 * Provides AAA-grade game feedback mechanics:
 * 1. CameraShake2D: Trauma-based non-linear screen shake (trauma^2) with rotational roll & frequency damping
 * 2. HitStopController: Micro-freeze frame physics (30ms..120ms) for visceral attack impacts
 * 3. ParticleSystem2D: Zero-GC SoA pooled particle physics (Sparks, Explosions, Smoke, Slash trails)
 * 4. SpringScale2D: Hooke's Law squash & stretch spring kinematics for characters and UI buttons
 * 5. FloatingCombatText: Springy damage / combo / loot popups
 * 6. LayeredAudioSynth: Web Audio procedural multi-layer synthesis (Sub-bass punch, metal clicks, lasers)
 */

export interface CameraShakeConfig {
  maxTranslationX?: number;
  maxTranslationY?: number;
  maxRotationDeg?: number;
  decayRate?: number; // trauma loss per second
  frequency?: number;
}

export class CameraShake2D {
  public trauma: number = 0; // 0..1
  public x: number = 0;
  public y: number = 0;
  public angleRad: number = 0;

  private time: number = 0;
  private readonly maxTransX: number;
  private readonly maxTransY: number;
  private readonly maxRotRad: number;
  private readonly decay: number;
  private readonly freq: number;

  constructor(config: CameraShakeConfig = {}) {
    this.maxTransX = config.maxTranslationX ?? 18;
    this.maxTransY = config.maxTranslationY ?? 18;
    this.maxRotRad = ((config.maxRotationDeg ?? 4) * Math.PI) / 180;
    this.decay = config.decayRate ?? 1.6;
    this.freq = config.frequency ?? 28;
  }

  /**
   * Adds trauma (clamped to 1.0). Typical hits add 0.3..0.5, massive explosions add 0.8..1.0.
   */
  public addTrauma(amount: number): void {
    this.trauma = Math.max(0, Math.min(1.0, this.trauma + amount));
  }

  public update(dtSeconds: number): void {
    if (this.trauma <= 0.0001) {
      this.trauma = 0;
      this.x = 0;
      this.y = 0;
      this.angleRad = 0;
      return;
    }

    // Decay trauma over time first
    this.trauma = Math.max(0, this.trauma - this.decay * dtSeconds);
    if (this.trauma <= 0.0001) {
      this.trauma = 0;
      this.x = 0;
      this.y = 0;
      this.angleRad = 0;
      return;
    }

    this.time += dtSeconds * this.freq;
    // Shake intensity scales quadratically with trauma (trauma^2) for visceral feel
    const shake = this.trauma * this.trauma;

    // Harmonic pseudo-noise displacement
    const s1 = Math.sin(this.time * 1.0);
    const s2 = Math.sin(this.time * 1.73 + 1.2);
    const s3 = Math.sin(this.time * 2.37 + 2.8);

    this.x = s1 * this.maxTransX * shake;
    this.y = s2 * this.maxTransY * shake;
    this.angleRad = s3 * this.maxRotRad * shake;
  }

  public applyToContext(ctx: CanvasRenderingContext2D, centerX: number = 0, centerY: number = 0): void {
    if (this.trauma <= 0.001) return;
    ctx.translate(centerX, centerY);
    ctx.rotate(this.angleRad);
    ctx.translate(-centerX + this.x, -centerY + this.y);
  }
}

// ============================================================================
// 2. Hit-Stop / Freeze Frame Controller
// ============================================================================

export class HitStopController {
  private freezeTimer: number = 0;
  private timeScale: number = 1.0;

  /**
   * Triggers a hit-stop freeze for durationSeconds (e.g. 0.06 = 60ms).
   */
  public trigger(durationSeconds: number = 0.06, slowMoScale: number = 0.0): void {
    this.freezeTimer = Math.max(this.freezeTimer, durationSeconds);
    this.timeScale = slowMoScale;
  }

  public update(realDtSeconds: number): { isFrozen: boolean; effectiveDt: number } {
    if (this.freezeTimer > 0) {
      this.freezeTimer -= realDtSeconds;
      if (this.freezeTimer <= 0) {
        this.freezeTimer = 0;
        return {
          isFrozen: false,
          effectiveDt: realDtSeconds,
        };
      }
      return {
        isFrozen: this.timeScale === 0,
        effectiveDt: realDtSeconds * this.timeScale,
      };
    }
    return {
      isFrozen: false,
      effectiveDt: realDtSeconds,
    };
  }

  public isFreezing(): boolean {
    return this.freezeTimer > 0;
  }
}

// ============================================================================
// 3. High-Performance Zero-GC 2D Particle System
// ============================================================================

export type ParticleKind = 'spark' | 'smoke' | 'blood' | 'ring' | 'glow';

export interface EmitParticleOptions {
  count?: number;
  kind?: ParticleKind;
  speedMin?: number;
  speedMax?: number;
  spreadAngleRad?: number;
  baseAngleRad?: number;
  lifeMin?: number;
  lifeMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  color?: string;
  gravity?: number;
  drag?: number;
}

export class ParticleSystem2D {
  public readonly capacity: number;

  // Structure of Arrays (SoA) for zero-allocation performance
  public readonly x: Float32Array;
  public readonly y: Float32Array;
  public readonly vx: Float32Array;
  public readonly vy: Float32Array;
  public readonly life: Float32Array;
  public readonly maxLife: Float32Array;
  public readonly size: Float32Array;
  public readonly gravity: Float32Array;
  public readonly drag: Float32Array;
  public readonly kind: Uint8Array; // 0: spark, 1: smoke, 2: blood, 3: ring, 4: glow
  public readonly colors: string[];

  private activeCount: number = 0;

  constructor(capacity: number = 512) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.kind = new Uint8Array(capacity);
    this.colors = new Array(capacity).fill('#facc15');
  }

  public emit(originX: number, originY: number, options: EmitParticleOptions = {}): number {
    const count = options.count ?? 12;
    const kindIdx =
      options.kind === 'smoke'
        ? 1
        : options.kind === 'blood'
        ? 2
        : options.kind === 'ring'
        ? 3
        : options.kind === 'glow'
        ? 4
        : 0;

    const baseAngle = options.baseAngleRad ?? 0;
    const spread = options.spreadAngleRad ?? Math.PI * 2;
    const speedMin = options.speedMin ?? 60;
    const speedMax = options.speedMax ?? 180;
    const lifeMin = options.lifeMin ?? 0.25;
    const lifeMax = options.lifeMax ?? 0.6;
    const sizeMin = options.sizeMin ?? 2;
    const sizeMax = options.sizeMax ?? 5;
    const grav = options.gravity ?? 180;
    const drag = options.drag ?? 0.95;
    const col = options.color ?? (kindIdx === 0 ? '#fbbf24' : kindIdx === 1 ? '#94a3b8' : '#ef4444');

    let spawned = 0;
    for (let i = 0; i < this.capacity && spawned < count; i++) {
      if (this.life[i] <= 0) {
        this.x[i] = originX;
        this.y[i] = originY;

        const ang = baseAngle - spread * 0.5 + Math.random() * spread;
        const spd = speedMin + Math.random() * (speedMax - speedMin);
        this.vx[i] = Math.cos(ang) * spd;
        this.vy[i] = Math.sin(ang) * spd;

        const l = lifeMin + Math.random() * (lifeMax - lifeMin);
        this.life[i] = l;
        this.maxLife[i] = l;
        this.size[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
        this.gravity[i] = grav;
        this.drag[i] = drag;
        this.kind[i] = kindIdx;
        this.colors[i] = col;

        spawned++;
      }
    }
    this.activeCount += spawned;
    return spawned;
  }

  public update(dtSeconds: number): void {
    let active = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] > 0) {
        this.life[i] -= dtSeconds;
        if (this.life[i] <= 0) {
          this.life[i] = 0;
          continue;
        }

        active++;
        this.x[i] += this.vx[i] * dtSeconds;
        this.y[i] += this.vy[i] * dtSeconds;
        this.vy[i] += this.gravity[i] * dtSeconds;
        this.vx[i] *= Math.pow(this.drag[i], dtSeconds * 60);
        this.vy[i] *= Math.pow(this.drag[i], dtSeconds * 60);
      }
    }
    this.activeCount = active;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.activeCount === 0) return;

    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) continue;

      const progress = 1 - this.life[i] / this.maxLife[i]; // 0 -> 1
      const alpha = Math.max(0, 1 - progress);

      ctx.save();
      ctx.globalAlpha = alpha;

      const k = this.kind[i];
      if (k === 3) {
        // Shockwave Ring
        const currentRadius = this.size[i] * (1 + progress * 4);
        ctx.strokeStyle = this.colors[i];
        ctx.lineWidth = Math.max(1, (1 - progress) * 3);
        ctx.beginPath();
        ctx.arc(this.x[i], this.y[i], currentRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (k === 1) {
        // Smoke
        const currentSize = this.size[i] * (1 + progress * 2.5);
        ctx.fillStyle = this.colors[i];
        ctx.beginPath();
        ctx.arc(this.x[i], this.y[i], currentSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Spark / Blood particle
        ctx.fillStyle = this.colors[i];
        ctx.beginPath();
        ctx.arc(this.x[i], this.y[i], this.size[i] * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  public getActiveCount(): number {
    return this.activeCount;
  }
}

// ============================================================================
// 4. SpringScale2D (Squash & Stretch Dynamics)
// ============================================================================

export class SpringScale2D {
  public scaleX: number = 1.0;
  public scaleY: number = 1.0;

  private velX: number = 0;
  private velY: number = 0;
  private readonly stiffness: number;
  private readonly damping: number;

  constructor(stiffness: number = 240, damping: number = 18) {
    this.stiffness = stiffness;
    this.damping = damping;
  }

  /**
   * Punches the scale (e.g. punch(1.4, 0.7) for a heavy landing squash).
   */
  public punch(targetScaleX: number, targetScaleY: number): void {
    this.scaleX = targetScaleX;
    this.scaleY = targetScaleY;
  }

  public update(dtSeconds: number): void {
    // Hooke's Law: F = -k*(x - 1) - c*v
    const forceX = -this.stiffness * (this.scaleX - 1.0) - this.damping * this.velX;
    const forceY = -this.stiffness * (this.scaleY - 1.0) - this.damping * this.velY;

    this.velX += forceX * dtSeconds;
    this.velY += forceY * dtSeconds;
    this.scaleX += this.velX * dtSeconds;
    this.scaleY += this.velY * dtSeconds;
  }
}

// ============================================================================
// 5. Floating Combat Text System
// ============================================================================

export interface FloatingTextItem {
  id: number;
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  isCrit: boolean;
}

export class JuiceFloatingText {
  private items: FloatingTextItem[] = [];
  private nextId: number = 1;

  public spawn(x: number, y: number, text: string, isCrit: boolean = false, color: string = '#facc15'): void {
    this.items.push({
      id: this.nextId++,
      text,
      x: x + (Math.random() - 0.5) * 16,
      y,
      vy: isCrit ? -90 : -60,
      life: isCrit ? 0.9 : 0.65,
      maxLife: isCrit ? 0.9 : 0.65,
      color: isCrit ? '#ef4444' : color,
      isCrit,
    });
  }

  public update(dtSeconds: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.vy * dtSeconds;
      item.vy += 40 * dtSeconds; // slight upward drag
      item.life -= dtSeconds;
      if (item.life <= 0) {
        this.items.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.items.length === 0) return;

    for (const item of this.items) {
      const progress = 1 - item.life / item.maxLife;
      const alpha = Math.max(0, 1 - progress);
      const scale = item.isCrit ? 1.3 - progress * 0.3 : 1.0;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(item.x, item.y);
      ctx.scale(scale, scale);
      ctx.font = item.isCrit ? 'bold 15px sans-serif' : 'bold 12px sans-serif';
      ctx.textAlign = 'center';

      // Outline shadow
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2.5;
      ctx.strokeText(item.text, 0, 0);

      // Main fill
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, 0, 0);
      ctx.restore();
    }
  }

  public getCount(): number {
    return this.items.length;
  }
}

// ============================================================================
// 6. Layered Procedural Audio Synthesizer
// ============================================================================

export class LayeredAudioSynth {
  private getContext: () => AudioContext | null;

  constructor(getContextFn?: () => AudioContext | null) {
    this.getContext = getContextFn ?? (() => null);
  }

  public setContextGetter(getContextFn: () => AudioContext | null): void {
    this.getContext = getContextFn;
  }

  /**
   * Visceral low-frequency punch + metallic impact transient
   */
  public playHeavyImpact(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // Layer 1: Sub-bass 55Hz pitch drop kick (the "THUMP")
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(120, now);
      subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.18);
      subGain.gain.setValueAtTime(0.25, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.22);

      // Layer 2: Distorted metal snap transient
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'triangle';
      snapOsc.frequency.setValueAtTime(480, now);
      snapOsc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      snapGain.gain.setValueAtTime(0.12, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now);
      snapOsc.stop(now + 0.08);
    } catch {
      // Audio blocked or suspended
    }
  }

  /**
   * Sharp whoosh / blade slash sweep
   */
  public playSlashBlade(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore
    }
  }

  /**
   * Crystal clear coin pickup chime with harmonic overtone
   */
  public playCoinChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [659.25, 987.77].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.08, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.16);
      });
    } catch {
      // Ignore
    }
  }
}

// ============================================================================
// 7. Unified Master GameJuice Controller
// ============================================================================

export class GameJuice {
  public readonly camera: CameraShake2D;
  public readonly hitStop: HitStopController;
  public readonly particles: ParticleSystem2D;
  public readonly spring: SpringScale2D;
  public readonly combatText: JuiceFloatingText;
  public readonly audio: LayeredAudioSynth;

  constructor(particleCapacity: number = 512) {
    this.camera = new CameraShake2D();
    this.hitStop = new HitStopController();
    this.particles = new ParticleSystem2D(particleCapacity);
    this.spring = new SpringScale2D();
    this.combatText = new JuiceFloatingText();
    this.audio = new LayeredAudioSynth();
  }

  /**
   * Primary step function. Returns effectiveDt for simulation.
   */
  public update(realDtSeconds: number): number {
    const { effectiveDt } = this.hitStop.update(realDtSeconds);
    this.camera.update(realDtSeconds);
    this.particles.update(realDtSeconds);
    this.spring.update(realDtSeconds);
    this.combatText.update(realDtSeconds);
    return effectiveDt;
  }

  /**
   * Full cinematic impact package: Screen Shake + Hit-Stop + Shockwave Sparks + Heavy Sound
   */
  public impact(x: number, y: number, intensity: 'light' | 'medium' | 'heavy' = 'medium', damageText?: string): void {
    if (intensity === 'light') {
      this.camera.addTrauma(0.25);
      this.hitStop.trigger(0.03);
      this.particles.emit(x, y, { count: 8, kind: 'spark', color: '#fef08a' });
    } else if (intensity === 'medium') {
      this.camera.addTrauma(0.45);
      this.hitStop.trigger(0.06);
      this.particles.emit(x, y, { count: 18, kind: 'spark', color: '#fbbf24' });
      this.particles.emit(x, y, { count: 1, kind: 'ring', sizeMin: 12, sizeMax: 12, color: '#f59e0b' });
      this.spring.punch(1.3, 0.7);
      this.audio.playHeavyImpact();
    } else {
      // Heavy / Critical
      this.camera.addTrauma(0.8);
      this.hitStop.trigger(0.1);
      this.particles.emit(x, y, { count: 35, kind: 'spark', color: '#ef4444', speedMax: 260 });
      this.particles.emit(x, y, { count: 2, kind: 'ring', sizeMin: 18, sizeMax: 24, color: '#dc2626' });
      this.spring.punch(1.6, 0.5);
      this.audio.playHeavyImpact();
    }

    if (damageText) {
      this.combatText.spawn(x, y, damageText, intensity === 'heavy');
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.particles.render(ctx);
    this.combatText.render(ctx);
  }
}
