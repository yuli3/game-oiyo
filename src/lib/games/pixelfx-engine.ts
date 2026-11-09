/**
 * OIYO PixelFX Dual-Buffer VFX Engine & Hit-Stop Controller
 *
 * WHY (2026-11-10): Adapts the core dual-buffer pixel art VFX architecture from
 * `vendor/pixelfx` (`pixelfx` skill + `game-feel` skill) into a typed, zero-dependency
 * TypeScript module for game.oiyo.net canvas games.
 * - Strictly excludes `font.js` (Patch Pixel font) per `oiyo-game-router` rule.
 * - Uses two Uint32Array buffers per frame:
 *   1. `color`: Opaque pixel buffer faded ONLY via 4x4 Bayer ordered dithering (never alpha-blended, preserving crisp pixel palette steps).
 *   2. `light`: Additive glow buffer composited over `color`.
 * - Includes `HitStopController` (`game-feel` skill pattern #2) for 40-80ms impact freeze frames.
 */

export const TAU = Math.PI * 2;

export const clamp = (x: number, a = 0, b = 1): number => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const seg = (t: number, t0: number, t1: number): number =>
  t1 === t0 ? 0 : clamp((t - t0) / (t1 - t0));
export const bump = (t: number, t0: number, t1: number): number =>
  t <= t0 || t >= t1 ? 0 : Math.sin(Math.PI * seg(t, t0, t1));

export const ease = {
  linear: (t: number): number => t,
  inQuad: (t: number): number => t * t,
  outQuad: (t: number): number => 1 - (1 - t) * (1 - t),
  outCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  outQuart: (t: number): number => 1 - Math.pow(1 - t, 4),
  outExpo: (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t: number, s = 1.70158): number =>
    t <= 0 ? 0 : t >= 1 ? 1 : 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};

/** 32-bit integer hash for deterministic per-particle RNG. */
export function hash(...ns: number[]): number {
  let h = 0x9e3779b9;
  for (const n of ns) {
    h = Math.imul(h ^ (n | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

export class SeededRng {
  private s: number;
  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }
}

export const rng = (...ns: number[]): SeededRng => new SeededRng(hash(...ns));

export const rgb = (r: number, g: number, b: number): number =>
  ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
export const red = (c: number): number => c & 255;
export const green = (c: number): number => (c >>> 8) & 255;
export const blue = (c: number): number => (c >>> 16) & 255;

export function hex(h: string | number): number {
  if (typeof h === 'number') return h >>> 0;
  let s = h.replace('#', '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const v = parseInt(s.slice(0, 6), 16) || 0;
  return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255);
}

export function mix(a: number, b: number, t: number): number {
  const k = clamp(t);
  return rgb(
    red(a) + (red(b) - red(a)) * k,
    green(a) + (green(b) - green(a)) * k,
    blue(a) + (blue(b) - blue(a)) * k,
  );
}

export const ramp = (list: readonly string[]): number[] => list.map(hex);
export const at = (r: readonly number[], t: number): number =>
  r[clamp(Math.floor(t * r.length), 0, r.length - 1)];
export function blend(r: readonly number[], t: number): number {
  const x = clamp(t) * (r.length - 1);
  const i = Math.min(r.length - 2, Math.floor(x));
  return mix(r[i], r[i + 1], x - i);
}

/** Hue-shifted pixel art color ramps (dark shadow -> bright highlight). */
export const PAL = {
  fire: ['#1f0b10', '#4a1118', '#8c1d1c', '#cc3a1a', '#f2701f', '#ffae35', '#ffe27a', '#fff8d6'],
  ember: ['#1a0a0e', '#3d1012', '#701a14', '#a8301a', '#e0561e', '#ff8a2a', '#ffc46a'],
  ice: ['#0c1430', '#162c5c', '#1f4f94', '#2f7fcc', '#58b4ec', '#9bdcff', '#d8f4ff', '#ffffff'],
  water: ['#081830', '#0e2e5a', '#14508c', '#1c76bc', '#36a2e0', '#78ccf4', '#c4ecff', '#ffffff'],
  electric: ['#0a0f2e', '#172a78', '#2550d0', '#3f8cff', '#7cc8ff', '#c8f0ff', '#ffffff'],
  poison: ['#0d1a0c', '#173a14', '#265e18', '#3f8a1e', '#6cb82a', '#a8e04a', '#e0ff8a'],
  holy: ['#2a1c08', '#5a3e10', '#9a6c18', '#d8a428', '#ffd84a', '#fff09a', '#fffbe6', '#ffffff'],
  heal: ['#08201a', '#0f3f2c', '#17663e', '#24924e', '#3ec466', '#7ee88a', '#c8ffc4', '#ffffff'],
  arcane: ['#140a26', '#2b1252', '#481c88', '#6b2cc0', '#9a48ec', '#c684ff', '#ecc8ff', '#ffffff'],
  blood: ['#14040a', '#3a0a14', '#6a101c', '#a01824', '#d42a30', '#ff5a50', '#ff9a8a'],
  gold: ['#1e1206', '#4a2c08', '#86520c', '#c48412', '#f0b424', '#ffe066', '#fff6c4', '#ffffff'],
  leaf: ['#0c1a0e', '#163418', '#225224', '#357530', '#4f9a3a', '#7cc048', '#b4e070', '#e4ffb0'],
  cyber: ['#041418', '#08303a', '#0c5260', '#108088', '#18b4b0', '#4ce8d8', '#b4fff0', '#ffffff'],
} as const;

export type PaletteKey = keyof typeof PAL;

export const RAMP: Record<PaletteKey, number[]> = {
  fire: ramp(PAL.fire),
  ember: ramp(PAL.ember),
  ice: ramp(PAL.ice),
  water: ramp(PAL.water),
  electric: ramp(PAL.electric),
  poison: ramp(PAL.poison),
  holy: ramp(PAL.holy),
  heal: ramp(PAL.heal),
  arcane: ramp(PAL.arcane),
  blood: ramp(PAL.blood),
  gold: ramp(PAL.gold),
  leaf: ramp(PAL.leaf),
  cyber: ramp(PAL.cyber),
};

/** Closed-form trajectory for a particle launched from (x, y) at (vx, vy) under gravity g and linear drag. */
export function fly(
  x: number,
  y: number,
  vx: number,
  vy: number,
  t: number,
  g = 0,
  drag = 0,
): [number, number] {
  if (drag <= 0) return [x + vx * t, y + vy * t + 0.5 * g * t * t];
  const f = (1 - Math.exp(-drag * t)) / drag;
  const vt = g / drag;
  return [x + vx * f, y + vt * t + (vy - vt) * f];
}

export function burst(n: number, seed: number, fn: (r: SeededRng, i: number) => void): void {
  for (let i = 0; i < n; i++) {
    fn(rng(seed, i), i);
  }
}

export interface PixelFrame {
  w: number;
  h: number;
  ox: number;
  oy: number;
  color: Uint32Array;
  light: Uint32Array;
}

export function createFrame(w: number, h: number, ox = 0, oy = 0): PixelFrame {
  return {
    w,
    h,
    ox,
    oy,
    color: new Uint32Array(w * h),
    light: new Uint32Array(w * h),
  };
}

export function clearFrame(f: PixelFrame): PixelFrame {
  f.color.fill(0);
  f.light.fill(0);
  return f;
}

// 4x4 Bayer ordered dither matrix thresholds in (0..1)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export class PixelPainter {
  readonly frame: PixelFrame;
  w = 0;
  h = 0;
  ox = 0;
  oy = 0;
  tx = 0;
  ty = 0;
  fade = 1;
  lightK = 1;

  constructor(frame: PixelFrame) {
    this.frame = frame;
    this.reset();
  }

  reset(): this {
    this.w = this.frame.w;
    this.h = this.frame.h;
    this.ox = this.frame.ox | 0;
    this.oy = this.frame.oy | 0;
    this.tx = 0;
    this.ty = 0;
    this.fade = 1;
    this.lightK = 1;
    return this;
  }

  place(x: number, y: number): this {
    this.tx = x;
    this.ty = y;
    return this;
  }

  put(sx: number, sy: number, c: number, a = 1): void {
    if (!c) return;
    const alpha = a * this.fade;
    if (alpha <= 0) return;
    const ix = Math.floor(sx);
    const iy = Math.floor(sy);
    if (alpha < 1 && alpha <= BAYER[((iy & 3) << 2) | (ix & 3)]) return;
    const x = ix - this.ox;
    const y = iy - this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.frame.color[y * this.w + x] = c >>> 0;
  }

  addLight(sx: number, sy: number, c: number, k = 1): void {
    const strength = k * this.fade * this.lightK;
    if (strength <= 0.004) return;
    const x = Math.floor(sx) - this.ox;
    const y = Math.floor(sy) - this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    const d = this.frame.light[i];
    const r = Math.min(255, (d & 255) + (c & 255) * strength) | 0;
    const g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * strength) | 0;
    const b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * strength) | 0;
    this.frame.light[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }

  dot(x: number, y: number, c: number, a = 1): void {
    this.put(this.tx + x, this.ty + y, c, a);
  }

  light(x: number, y: number, c: number, k = 1): void {
    this.addLight(this.tx + x, this.ty + y, c, k);
  }

  circle(
    cx: number,
    cy: number,
    r: number,
    c: number | ((d: number) => number),
    a: number | ((d: number) => number) = 1,
  ): void {
    if (r < 0.6) {
      const col = typeof c === 'function' ? c(0) : c;
      const alp = typeof a === 'function' ? a(0) : a;
      this.dot(cx, cy, col, alp);
      return;
    }
    const x0 = Math.floor(cx - r);
    const x1 = Math.ceil(cx + r);
    const y0 = Math.floor(cy - r);
    const y1 = Math.ceil(cy + r);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 > r * r) continue;
        const d = Math.sqrt(d2) / r;
        const col = typeof c === 'function' ? c(d) : c;
        const alp = typeof a === 'function' ? a(d) : a;
        this.dot(x, y, col, alp);
      }
    }
  }

  ring(
    cx: number,
    cy: number,
    r: number,
    w: number,
    c: number | ((v: number) => number),
    a: number | ((v: number) => number) = 1,
  ): void {
    const r0 = Math.max(0, r - w);
    const x0 = Math.floor(cx - r);
    const x1 = Math.ceil(cx + r);
    const y0 = Math.floor(cy - r);
    const y1 = Math.ceil(cy + r);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 > r * r || d2 < r0 * r0) continue;
        const v = w > 0 ? (Math.sqrt(d2) - r0) / (r - r0 || 1) : 1;
        const col = typeof c === 'function' ? c(v) : c;
        const alp = typeof a === 'function' ? a(v) : a;
        this.dot(x, y, col, alp);
      }
    }
  }

  glow(x: number, y: number, r: number, c: number, k = 0.5): void {
    if (r < 1 || k <= 0.004) return;
    const cx = this.tx + x;
    const cy = this.ty + y;
    const x0 = Math.floor(cx - r);
    const x1 = Math.ceil(cx + r);
    const y0 = Math.floor(cy - r);
    const y1 = Math.ceil(cy + r);
    for (let sy = y0; sy <= y1; sy++) {
      const dy = (sy + 0.5 - cy) / r;
      for (let sx = x0; sx <= x1; sx++) {
        const dx = (sx + 0.5 - cx) / r;
        const d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        this.addLight(sx, sy, c, f * f * k);
      }
    }
  }

  glowRing(x: number, y: number, R: number, r: number, c: number, k = 0.5): void {
    if (r < 1 || k <= 0.004) return;
    const cx = this.tx + x;
    const cy = this.ty + y;
    const E = R + r;
    for (let sy = Math.floor(cy - E); sy <= Math.ceil(cy + E); sy++) {
      for (let sx = Math.floor(cx - E); sx <= Math.ceil(cx + E); sx++) {
        const d = Math.abs(Math.hypot(sx + 0.5 - cx, sy + 0.5 - cy) - R) / r;
        if (d >= 1) continue;
        const f = 1 - d;
        this.addLight(sx, sy, c, f * f * k);
      }
    }
  }
}

/**
 * Composites `frame.color` + additive `frame.light` into an RGBA Uint8ClampedArray (length w * h * 4).
 */
export function composite(
  f: PixelFrame,
  out: Uint8ClampedArray,
  lightK = 1,
): Uint8ClampedArray {
  const n = f.w * f.h;
  const C = f.color;
  const L = f.light;
  for (let i = 0; i < n; i++) {
    const c = C[i];
    const l = L[i] & 0xffffff;
    const ca = c >>> 24;
    let r = c & 255;
    let g = (c >>> 8) & 255;
    let b = (c >>> 16) & 255;
    let a = ca;

    if (l) {
      const lr = (l & 255) * lightK;
      const lg = ((l >>> 8) & 255) * lightK;
      const lb = ((l >>> 16) & 255) * lightK;
      if (a < 255) {
        const pa = a / 255;
        const pr = r * pa + lr;
        const pg = g * pa + lg;
        const pb = b * pa + lb;
        const na = Math.min(1, Math.max(pa, Math.max(lr, lg, lb) / 255));
        if (na > 0) {
          r = Math.min(255, pr / na);
          g = Math.min(255, pg / na);
          b = Math.min(255, pb / na);
          a = na * 255;
        }
      } else {
        r = Math.min(255, r + lr);
        g = Math.min(255, g + lg);
        b = Math.min(255, b + lb);
      }
    }
    const j = i * 4;
    out[j] = r;
    out[j + 1] = g;
    out[j + 2] = b;
    out[j + 3] = a;
  }
  return out;
}

export type PixelFxPresetName =
  | 'slash-impact'
  | 'frost-nova'
  | 'coin-sparkle'
  | 'ore-shatter'
  | 'nature-bloom'
  | 'water-splash';

export interface PixelFxBurstInstance {
  id: number;
  preset: PixelFxPresetName;
  x: number;
  y: number;
  t: number;
  duration: number;
  seed: number;
  palette: PaletteKey;
  scale: number;
}

/**
 * Draws a single 4-beat PixelFX preset at normalized progress u in [0, 1].
 * Beats:
 *  1. Anticipation (0..0.12): inward gather / spark core
 *  2. Contact Spike (0.12..0.24): bright white/highlight core + shockwave ring
 *  3. Follow-through (0.24..0.75): expanding debris / ballistic particles under gravity & drag
 *  4. Settle (0.75..1.0): dithered fade + lingering additive light
 */
export function drawPixelFxPreset(
  p: PixelPainter,
  preset: PixelFxPresetName,
  t: number,
  duration: number,
  seed: number,
  paletteKey: PaletteKey,
): void {
  const u = clamp(t / Math.max(0.05, duration));
  const C = RAMP[paletteKey];
  const lastIdx = C.length - 1;

  // Beat 1 & 2: Anticipation core & contact flash
  const contactFlash = bump(u, 0.05, 0.28);
  if (contactFlash > 0) {
    p.circle(0, 0, 2 + contactFlash * 4, C[lastIdx], contactFlash);
    p.glow(0, 0, 7 + contactFlash * 8, C[Math.max(0, lastIdx - 1)], contactFlash * 0.85);
  }

  // Shockwave ring
  const ringProgress = ease.outQuart(seg(u, 0.1, 0.78));
  if (ringProgress > 0 && ringProgress < 1) {
    const rad = 2 + ringProgress * 11;
    const fade = 1 - ringProgress;
    p.ring(0, 0, rad, 1.6, (v) => at(C, 0.45 + v * 0.5), fade);
    p.glowRing(0, 0, rad, 3.5, C[Math.max(0, lastIdx - 2)], fade * 0.55);
  }

  // Preset-specific ballistic particles
  const particleTime = Math.max(0, (u - 0.08) * duration);
  const fadeOut = 1 - ease.inQuad(seg(u, 0.55, 1.0));

  if (preset === 'slash-impact' || preset === 'ore-shatter') {
    const gravity = preset === 'ore-shatter' ? 42 : 18;
    burst(12, seed, (r) => {
      const ang = r.range(0, TAU);
      const spd = r.range(14, 34);
      const [px, py] = fly(0, 0, Math.cos(ang) * spd, Math.sin(ang) * spd - 6, particleTime, gravity, 2.2);
      const col = at(C, clamp(0.35 + fadeOut * 0.6));
      p.dot(px, py, col, fadeOut);
      p.light(px, py, C[Math.max(0, lastIdx - 2)], fadeOut * 0.45);
    });
  } else if (preset === 'frost-nova' || preset === 'water-splash') {
    const gravity = preset === 'water-splash' ? 48 : 8;
    burst(10, seed, (r, i) => {
      const ang = (i / 10) * TAU + r.range(-0.15, 0.15);
      const spd = r.range(12, 28);
      const [px, py] = fly(0, 0, Math.cos(ang) * spd, Math.sin(ang) * spd - 8, particleTime, gravity, 1.8);
      p.circle(px, py, 1.1, C[Math.max(0, lastIdx - 1)], fadeOut);
      p.glow(px, py, 3, C[Math.max(0, lastIdx - 2)], fadeOut * 0.4);
    });
  } else {
    // coin-sparkle / nature-bloom: rising sparkles with negative gravity (buoyant)
    burst(10, seed, (r) => {
      const ang = r.range(0, TAU);
      const spd = r.range(8, 22);
      const [px, py] = fly(0, 0, Math.cos(ang) * spd, Math.sin(ang) * spd - 12, particleTime, -22, 1.5);
      const col = at(C, clamp(0.5 + fadeOut * 0.5));
      p.dot(px, py, col, fadeOut);
      p.glow(px, py, 3.5, C[Math.max(0, lastIdx - 1)], fadeOut * 0.55);
    });
  }
}

const DEFAULT_PALETTE_BY_PRESET: Record<PixelFxPresetName, PaletteKey> = {
  'slash-impact': 'fire',
  'frost-nova': 'ice',
  'coin-sparkle': 'gold',
  'ore-shatter': 'arcane',
  'nature-bloom': 'heal',
  'water-splash': 'water',
};

/**
 * Manages active PixelFX dual-buffer bursts and renders them onto a 2D canvas.
 */
export class PixelFxController {
  private instances: PixelFxBurstInstance[] = [];
  private nextId = 1;
  private readonly frame: PixelFrame;
  private readonly painter: PixelPainter;
  private readonly rgba: Uint8ClampedArray;
  private scratchCanvas: HTMLCanvasElement | null = null;

  constructor(bufferSize = 32) {
    this.frame = createFrame(bufferSize, bufferSize, -bufferSize / 2, -bufferSize / 2);
    this.painter = new PixelPainter(this.frame);
    this.rgba = new Uint8ClampedArray(bufferSize * bufferSize * 4);
  }

  spawn(
    preset: PixelFxPresetName,
    x: number,
    y: number,
    options?: { palette?: PaletteKey; duration?: number; scale?: number },
  ): number {
    const id = this.nextId++;
    this.instances.push({
      id,
      preset,
      x,
      y,
      t: 0,
      duration: options?.duration ?? 0.48,
      seed: hash(id, Math.round(x), Math.round(y)),
      palette: options?.palette ?? DEFAULT_PALETTE_BY_PRESET[preset],
      scale: options?.scale ?? 2,
    });
    return id;
  }

  update(dt: number): void {
    const clampedDt = Math.min(Math.max(0, dt), 0.05);
    for (let i = this.instances.length - 1; i >= 0; i--) {
      const inst = this.instances[i];
      inst.t += clampedDt;
      if (inst.t >= inst.duration) {
        this.instances.splice(i, 1);
      }
    }
  }

  getActiveCount(): number {
    return this.instances.length;
  }

  /** Renders a single burst instance into the dual buffer and returns the composited RGBA buffer. */
  renderInstanceBuffer(inst: PixelFxBurstInstance): Uint8ClampedArray {
    clearFrame(this.frame);
    this.painter.reset().place(0, 0);
    drawPixelFxPreset(this.painter, inst.preset, inst.t, inst.duration, inst.seed, inst.palette);
    return composite(this.frame, this.rgba, 1);
  }

  /** Draws all active bursts onto a 2D Canvas context with crisp nearest-neighbor pixel scaling. */
  drawToCanvas(ctx: CanvasRenderingContext2D): void {
    if (this.instances.length === 0) return;
    if (typeof document === 'undefined') return;

    if (!this.scratchCanvas) {
      this.scratchCanvas = document.createElement('canvas');
      this.scratchCanvas.width = this.frame.w;
      this.scratchCanvas.height = this.frame.h;
    }
    const sCtx = this.scratchCanvas.getContext('2d');
    if (!sCtx) return;

    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;

    for (const inst of this.instances) {
      const out = this.renderInstanceBuffer(inst);
      const imgData = new ImageData(new Uint8ClampedArray(out), this.frame.w, this.frame.h);
      sCtx.putImageData(imgData, 0, 0);
      const drawW = this.frame.w * inst.scale;
      const drawH = this.frame.h * inst.scale;
      ctx.drawImage(this.scratchCanvas, inst.x - drawW / 2, inst.y - drawH / 2, drawW, drawH);
    }

    ctx.imageSmoothingEnabled = prevSmoothing;
  }
}

/**
 * HitStopController (`game-feel` skill pattern #2):
 * Freezes simulation frames for 35-85ms on heavy impacts while keeping input & render shake alive.
 */
export class HitStopController {
  private remainingMs = 0;

  trigger(durationMs = 55): void {
    this.remainingMs = Math.max(this.remainingMs, clamp(durationMs, 16, 150));
  }

  update(dtSeconds: number): boolean {
    if (this.remainingMs <= 0) return false;
    this.remainingMs = Math.max(0, this.remainingMs - dtSeconds * 1000);
    return this.remainingMs > 0;
  }

  isFreezing(): boolean {
    return this.remainingMs > 0;
  }

  getTimeScale(): number {
    return this.remainingMs > 0 ? 0 : 1;
  }
}

/**
 * Shared multi-layer Web Audio synthesizer (`game-audio-design` skill):
 * Combines primary oscillator + harmonic sub-oscillator + BiquadFilter + pitch jitter.
 */
export function playMultiLayerPixelSfx(
  freq: number,
  durationSec = 0.12,
  type: OscillatorType = 'square',
  accent = false,
): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Pitch jitter (+/- 5%) to prevent ear fatigue on repeated actions
    const jitter = 1 + (Math.random() * 10 - 5) * 0.01;
    const pitchedFreq = Math.max(60, freq * jitter);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(pitchedFreq * (accent ? 4.5 : 3.2), now);
    filter.Q.setValueAtTime(accent ? 2.4 : 1.4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.11 : 0.075, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    const oscMain = ctx.createOscillator();
    oscMain.type = type;
    oscMain.frequency.setValueAtTime(pitchedFreq, now);
    oscMain.detune.setValueAtTime(Math.random() * 14 - 7, now);
    if (accent) {
      oscMain.frequency.exponentialRampToValueAtTime(pitchedFreq * 1.35, now + durationSec);
    }

    const oscSub = ctx.createOscillator();
    oscSub.type = type === 'sine' ? 'triangle' : 'sine';
    oscSub.frequency.setValueAtTime(pitchedFreq * 0.5, now);
    oscSub.detune.setValueAtTime(6, now);

    oscMain.connect(filter);
    oscSub.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    oscMain.start(now);
    oscSub.start(now);
    oscMain.stop(now + durationSec + 0.02);
    oscSub.stop(now + durationSec + 0.02);
    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, Math.ceil((durationSec + 0.1) * 1000));
  } catch {
    // Ignore audio context restrictions prior to user gesture
  }
}
