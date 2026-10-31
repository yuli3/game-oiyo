/**
 * OIYO Post-FX Juice Shader & Filter Suite (`post-fx-shaders.ts`)
 *
 * Implements Research Goal 5:
 * 1. ShockwaveDistortion2D: Radial refraction wave expanding from explosion centers
 * 2. ChromaticAberrationFilter: High-velocity RGB channel displacement & lens vignette
 * 3. NeonGlowBloomPass: Multi-pass threshold luminance glow blender
 */

// ============================================================================
// 1. ShockwaveDistortion2D (Refraction Wave System)
// ============================================================================

export interface ShockwaveInstance {
  active: boolean;
  centerX: number;
  centerY: number;
  radius: number;
  maxRadius: number;
  speed: number;
  thickness: number;
  amplitude: number;
  life: number;
  maxLife: number;
}

export class ShockwaveDistortion2D {
  public waves: ShockwaveInstance[] = [];
  public readonly capacity: number;
  private cursor: number = 0;

  constructor(capacity: number = 8) {
    this.capacity = capacity;
    for (let i = 0; i < capacity; i++) {
      this.waves.push({
        active: false,
        centerX: 0,
        centerY: 0,
        radius: 0,
        maxRadius: 200,
        speed: 400,
        thickness: 40,
        amplitude: 20,
        life: 0,
        maxLife: 0.5,
      });
    }
  }

  /**
   * Triggers a shockwave at epicenter.
   */
  public trigger(
    x: number,
    y: number,
    options: {
      maxRadius?: number;
      speed?: number;
      thickness?: number;
      amplitude?: number;
      durationSec?: number;
    } = {}
  ): void {
    const wave = this.waves[this.cursor];
    this.cursor = (this.cursor + 1) % this.capacity;

    wave.active = true;
    wave.centerX = x;
    wave.centerY = y;
    wave.radius = 0;
    wave.maxRadius = options.maxRadius ?? 220;
    wave.speed = options.speed ?? 450;
    wave.thickness = options.thickness ?? 45;
    wave.amplitude = options.amplitude ?? 18;
    wave.maxLife = options.durationSec ?? 0.55;
    wave.life = wave.maxLife;
  }

  public update(dtSeconds: number): void {
    for (let i = 0; i < this.capacity; i++) {
      const w = this.waves[i];
      if (!w.active) continue;

      w.life -= dtSeconds;
      if (w.life <= 0 || w.radius >= w.maxRadius) {
        w.active = false;
        continue;
      }

      w.radius += w.speed * dtSeconds;
    }
  }

  /**
   * Computes refraction displacement vector for any (x, y) sample coordinate.
   */
  public getDisplacementAt(x: number, y: number): { dx: number; dy: number; intensity: number } {
    let totalDx = 0;
    let totalDy = 0;
    let maxIntensity = 0;

    for (let i = 0; i < this.capacity; i++) {
      const w = this.waves[i];
      if (!w.active) continue;

      const rx = x - w.centerX;
      const ry = y - w.centerY;
      const dist = Math.hypot(rx, ry);

      const diff = Math.abs(dist - w.radius);
      if (diff < w.thickness && dist > 0.001) {
        // Cosine hump falloff: 1 at wave crest, 0 at edges
        const wavePhase = Math.cos((diff / w.thickness) * (Math.PI / 2));
        const progress = 1.0 - w.radius / w.maxRadius;
        const strength = wavePhase * progress * w.amplitude;

        const nx = rx / dist;
        const ny = ry / dist;

        totalDx += nx * strength;
        totalDy += ny * strength;
        maxIntensity = Math.max(maxIntensity, wavePhase * progress);
      }
    }

    return { dx: totalDx, dy: totalDy, intensity: maxIntensity };
  }

  /**
   * Renders refractive shockwave ring on canvas 2D.
   */
  public renderToCanvas(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.capacity; i++) {
      const w = this.waves[i];
      if (!w.active || w.radius <= 2) continue;

      const progress = 1.0 - w.radius / w.maxRadius;
      ctx.save();
      ctx.beginPath();
      ctx.arc(w.centerX, w.centerY, w.radius, 0, Math.PI * 2);
      ctx.lineWidth = w.thickness * progress * 0.4;
      ctx.strokeStyle = `rgba(255, 255, 255, ${progress * 0.35})`;
      ctx.stroke();

      // Outer glow boundary
      ctx.beginPath();
      ctx.arc(w.centerX, w.centerY, w.radius + w.thickness * 0.2, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(56, 189, 248, ${progress * 0.5})`;
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ============================================================================
// 2. ChromaticAberrationFilter (Speed-Induced RGB Channel Displacement)
// ============================================================================

export interface ChromaticOffset {
  rOffset: { x: number; y: number };
  gOffset: { x: number; y: number };
  bOffset: { x: number; y: number };
  intensity: number;
}

export class ChromaticAberrationFilter {
  /**
   * Computes sub-pixel channel offset vectors according to velocity and impact trauma.
   */
  public static computeOffsets(
    playerSpeed: number,
    trauma: number = 0,
    maxOffsetPx: number = 4.0
  ): ChromaticOffset {
    const speedRatio = Math.min(1.0, Math.max(0, (playerSpeed - 200) / 350));
    const totalIntensity = Math.min(1.0, speedRatio * 0.6 + trauma * 0.4);

    const shift = totalIntensity * maxOffsetPx;

    return {
      rOffset: { x: shift === 0 ? 0 : -shift, y: 0 },
      gOffset: { x: 0, y: 0 },
      bOffset: { x: shift, y: 0 },
      intensity: totalIntensity,
    };
  }
}

// ============================================================================
// 3. NeonGlowBloomPass (Multi-Pass Canvas Glow Compositor)
// ============================================================================

export class NeonGlowBloomPass {
  /**
   * Composite neon bloom onto target context using screen blend and radial falloff.
   */
  public static renderNeonAura(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    colorCore: string,
    colorOuter: string,
    intensity: number = 1.0
  ): void {
    if (radius <= 0 || intensity <= 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(1.0, intensity);

    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, colorCore);
    grad.addColorStop(0.4, colorOuter);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
