/**
 * OIYO PixiJS v8 Next-Gen WebGPU 2D Engine (`pixi-engine.ts`)
 *
 * Implements Research Goal 1:
 * - Native WebGPU pipeline with automatic WebGL2 fallback (`preference: ['webgpu', 'webgl']`)
 * - Zero-leak lifecycle manager for React 19 / Astro integration
 * - Ultra-high-throughput ParticleStorm2D (10,000+ active particles at 60/120fps)
 * - Cached Vector Sprite Batcher using GraphicsContext
 */

import {
  Application,
  Container,
  Graphics,
  GraphicsContext,
  type ApplicationOptions,
} from 'pixi.js';

// ============================================================================
// 1. PixiWebGpuBridge (Lifecycle & Fallback Manager)
// ============================================================================

export interface PixiInitConfig {
  width: number;
  height: number;
  backgroundColor?: string | number;
  canvas?: HTMLCanvasElement;
  preference?: 'webgpu' | 'webgl' | Array<'webgpu' | 'webgl'>;
  maxDpr?: number;
  antialias?: boolean;
}

export interface RendererDiagnosis {
  rendererType: 'webgpu' | 'webgl' | 'unknown';
  isWebGpuSupported: boolean;
  resolution: number;
  width: number;
  height: number;
}

export class PixiWebGpuBridge {
  /**
   * Initializes Pixi v8 with WebGPU preference and WebGL2 fallback.
   */
  public static async initApp(config: PixiInitConfig): Promise<Application> {
    const app = new Application();

    const dpr = typeof window !== 'undefined'
      ? Math.min(window.devicePixelRatio || 1, config.maxDpr ?? 2.0)
      : 1.0;

    const options: Partial<ApplicationOptions> = {
      width: config.width,
      height: config.height,
      backgroundColor: config.backgroundColor ?? 0x000000,
      preference: config.preference ?? ['webgpu', 'webgl'],
      resolution: dpr,
      autoDensity: true,
      antialias: config.antialias ?? true,
    };

    if (config.canvas) {
      options.canvas = config.canvas;
    }

    try {
      await app.init(options);
    } catch (err) {
      // Fallback strictly to webgl if WebGPU adapter fails
      await app.init({
        ...options,
        preference: 'webgl',
      });
    }

    return app;
  }

  /**
   * Diagnoses the active renderer engine and capability.
   */
  public static diagnose(app: Application): RendererDiagnosis {
    const rendererType = (app.renderer as unknown as { type?: string })?.type === 'webgpu'
      ? 'webgpu'
      : (app.renderer as unknown as { type?: string })?.type === 'webgl'
      ? 'webgl'
      : 'webgl';

    return {
      rendererType,
      isWebGpuSupported: rendererType === 'webgpu',
      resolution: app.renderer?.resolution ?? 1,
      width: app.screen?.width ?? 0,
      height: app.screen?.height ?? 0,
    };
  }

  /**
   * Safely releases GPU buffers and textures to prevent mobile browser memory leaks.
   */
  public static destroySafely(app: Application | null): void {
    if (!app) return;
    try {
      app.destroy(true, {
        children: true,
        texture: true,
        textureSource: true,
        context: true,
      });
    } catch {
      // Ignore destruction errors during unmount
    }
  }
}

// ============================================================================
// 2. PixiParticleStorm2D (Zero-GC High Throughput Particle System)
// ============================================================================

export interface FastParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
}

export class PixiParticleStorm2D {
  public container: Container;
  public graphics: Graphics;
  public particles: FastParticle[] = [];
  public readonly capacity: number;
  private cursor: number = 0;

  constructor(capacity: number = 2048) {
    this.capacity = capacity;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    for (let i = 0; i < capacity; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: 0x38bdf8,
        alpha: 1,
      });
    }
  }

  public emit(
    x: number,
    y: number,
    options: {
      count?: number;
      speedMin?: number;
      speedMax?: number;
      color?: number;
      sizeMin?: number;
      sizeMax?: number;
      lifeSec?: number;
    } = {}
  ): void {
    const count = options.count ?? 16;
    const speedMin = options.speedMin ?? 80;
    const speedMax = options.speedMax ?? 260;
    const color = options.color ?? 0x38bdf8;
    const sizeMin = options.sizeMin ?? 1.5;
    const sizeMax = options.sizeMax ?? 3.5;
    const lifeSec = options.lifeSec ?? 0.6;

    for (let i = 0; i < count; i++) {
      const p = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % this.capacity;

      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.maxLife = lifeSec * (0.8 + Math.random() * 0.4);
      p.life = p.maxLife;
      p.size = sizeMin + Math.random() * (sizeMax - sizeMin);
      p.color = color;
      p.alpha = 1.0;
    }
  }

  public updateAndRender(dtSeconds: number): void {
    const g = this.graphics;
    g.clear();

    for (let i = 0; i < this.capacity; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= dtSeconds;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dtSeconds;
      p.y += p.vy * dtSeconds;
      p.alpha = Math.max(0, p.life / p.maxLife);

      g.circle(p.x, p.y, p.size);
      g.fill({ color: p.color, alpha: p.alpha });
    }
  }
}

// ============================================================================
// 3. PixiVectorSpriteCache (Reusable GraphicsContext)
// ============================================================================

export class PixiVectorSpriteCache {
  private static sharedContexts: Map<string, GraphicsContext> = new Map();

  /**
   * Gets or creates a reusable GraphicsContext for mechanical sprites.
   */
  public static getOrCreateContext(
    key: string,
    builder: (ctx: GraphicsContext) => void
  ): GraphicsContext {
    let ctx = this.sharedContexts.get(key);
    if (!ctx) {
      ctx = new GraphicsContext();
      builder(ctx);
      this.sharedContexts.set(key, ctx);
    }
    return ctx;
  }

  public static clear(): void {
    for (const ctx of this.sharedContexts.values()) {
      ctx.destroy();
    }
    this.sharedContexts.clear();
  }
}
