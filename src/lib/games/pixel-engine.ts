/**
 * Pixel Engine — Core foundation for Dot & Pixel-Art games in OIYO Game Studio.
 *
 * Provides:
 * 1. Curated retro palettes (PICO-8, GameBoy, NES, Cyberpunk).
 * 2. Integer pixel scaling mathematics (nearest-neighbor crisp viewport).
 * 3. ASCII 2D pixel matrix parser for procedural sprite definition.
 * 4. Micro 4x6 bitmap pixel font for zero-dependency retro UI text rendering.
 * 5. PixelCanvasBuffer — high performance offscreen buffer with Bresenham primitives.
 * 6. RetroChiptuneSynth — Web Audio API 8-bit pulse/triangle/noise generator.
 */

// ─── 1. RETRO PALETTES ────────────────────────────────────────────────────────

/** Classic 16-color PICO-8 fantasy console palette */
export const PICO8_PALETTE = [
  "#000000", // 0: Black
  "#1D2B53", // 1: Dark Blue
  "#7E2553", // 2: Dark Purple
  "#008751", // 3: Dark Green
  "#AB5236", // 4: Brown
  "#5F574F", // 5: Dark Gray
  "#C2C3C7", // 6: Light Gray
  "#FFF1E8", // 7: White / Cream
  "#FF004D", // 8: Red
  "#FFA300", // 9: Orange
  "#FFEC27", // 10: Yellow
  "#00E436", // 11: Green
  "#29ADFF", // 12: Light Blue
  "#83769C", // 13: Indigo / Slate
  "#FF77A8", // 14: Pink
  "#FFCCAA", // 15: Peach
] as const;

/** Original 4-shade GameBoy DMG monochrome palette */
export const GAMEBOY_PALETTE = [
  "#0F380F", // 0: Darkest Green
  "#306230", // 1: Dark Green
  "#8BAC0F", // 2: Light Green
  "#9BBC0F", // 3: Lightest Green
] as const;

/** Selected 16-color NES primary console palette */
export const NES_PALETTE = [
  "#000000", // 0: Black
  "#FCFCFC", // 1: White
  "#BCBCBC", // 2: Light Gray
  "#7C7C7C", // 3: Dark Gray
  "#F83800", // 4: Red
  "#E40058", // 5: Crimson
  "#881400", // 6: Dark Red
  "#F87800", // 7: Orange
  "#F8B800", // 8: Gold / Yellow
  "#00A800", // 9: Green
  "#005800", // 10: Dark Green
  "#0078F8", // 11: Blue
  "#0000FC", // 12: Deep Blue
  "#6844FC", // 13: Purple
  "#D800CC", // 14: Magenta
  "#F87858", // 15: Skin Tone
] as const;

/** Vibrant 8-color Cyberpunk Synthwave pixel palette */
export const CYBERPUNK_PALETTE = [
  "#0B0813", // 0: Deep Obsidian
  "#201135", // 1: Night Indigo
  "#FF2A85", // 2: Neon Magenta
  "#05FFA1", // 3: Neon Green
  "#00F0FF", // 4: Cyber Cyan
  "#FFE600", // 5: High-voltage Yellow
  "#7000FF", // 6: Electric Violet
  "#FFFFFF", // 7: Pure White
] as const;

export interface RgbColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function hexToRgb(hex: string): RgbColor {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a: 255,
  };
}

// ─── 2. INTEGER SCALING MATH ──────────────────────────────────────────────────

export interface PixelViewportFit {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Computes integer pixel scaling to fit native low-res buffer into available viewport
 * without any non-integer blur or sub-pixel distortion.
 */
export function computeIntegerPixelScale(
  viewportWidth: number,
  viewportHeight: number,
  nativeWidth: number,
  nativeHeight: number,
  options?: { minScale?: number; maxScale?: number; allowFractionalBelowOne?: boolean }
): PixelViewportFit {
  if (nativeWidth <= 0 || nativeHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { width: nativeWidth, height: nativeHeight, scale: 1, offsetX: 0, offsetY: 0 };
  }

  const rawScaleX = viewportWidth / nativeWidth;
  const rawScaleY = viewportHeight / nativeHeight;
  const rawScale = Math.min(rawScaleX, rawScaleY);

  let scale: number;
  if (rawScale < 1 && options?.allowFractionalBelowOne !== false) {
    scale = rawScale;
  } else {
    scale = Math.floor(rawScale);
    if (scale < 1) scale = 1;
  }

  if (options?.minScale && scale < options.minScale) scale = options.minScale;
  if (options?.maxScale && scale > options.maxScale) scale = options.maxScale;

  const width = Math.round(nativeWidth * scale);
  const height = Math.round(nativeHeight * scale);
  const offsetX = Math.floor((viewportWidth - width) / 2);
  const offsetY = Math.floor((viewportHeight - height) / 2);

  return { width, height, scale, offsetX, offsetY };
}

// ─── 3. ASCII PIXEL MATRIX SPRITE PARSER ─────────────────────────────────────

export interface PixelSprite {
  width: number;
  height: number;
  pixels: Int16Array; // -1 for transparent, 0..N for palette index
}

/**
 * Parses ASCII array of pixel strings into a compact PixelSprite.
 * Default mapping:
 * '.' or ' ' => -1 (transparent)
 * '0'..'9' => 0..9
 * 'a'..'f' or 'A'..'F' => 10..15
 */
export function parsePixelMatrix(
  rows: readonly string[],
  customMap?: Record<string, number>
): PixelSprite {
  const height = rows.length;
  if (height === 0) return { width: 0, height: 0, pixels: new Int16Array(0) };
  const width = rows[0].length;
  const pixels = new Int16Array(width * height);

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const ch = x < row.length ? row[x] : ".";
      let idx = -1;
      if (customMap && ch in customMap) {
        idx = customMap[ch];
      } else if (ch === "." || ch === " ") {
        idx = -1;
      } else if (ch >= "0" && ch <= "9") {
        idx = ch.charCodeAt(0) - 48;
      } else if (ch >= "a" && ch <= "f") {
        idx = ch.charCodeAt(0) - 97 + 10;
      } else if (ch >= "A" && ch <= "F") {
        idx = ch.charCodeAt(0) - 65 + 10;
      }
      pixels[y * width + x] = idx;
    }
  }

  return { width, height, pixels };
}

// ─── 4. BUILT-IN 4x6 MICRO BITMAP PIXEL FONT ─────────────────────────────────

/**
 * 4x6 font table (each glyph is 6 rows of 4 columns, packed as numbers).
 * Column 4 is usually spacing/kerning.
 */
const MICRO_FONT: Record<string, number[]> = {
  "0": [0x6, 0x9, 0x9, 0x9, 0x6, 0x0],
  "1": [0x2, 0x6, 0x2, 0x2, 0x7, 0x0],
  "2": [0x6, 0x1, 0x2, 0x4, 0x7, 0x0],
  "3": [0x6, 0x1, 0x2, 0x1, 0x6, 0x0],
  "4": [0x5, 0x5, 0x7, 0x1, 0x1, 0x0],
  "5": [0x7, 0x4, 0x6, 0x1, 0x6, 0x0],
  "6": [0x6, 0x4, 0x6, 0x5, 0x6, 0x0],
  "7": [0x7, 0x1, 0x2, 0x2, 0x2, 0x0],
  "8": [0x6, 0x5, 0x6, 0x5, 0x6, 0x0],
  "9": [0x6, 0x5, 0x7, 0x1, 0x6, 0x0],
  A: [0x2, 0x5, 0x7, 0x5, 0x5, 0x0],
  B: [0x6, 0x5, 0x6, 0x5, 0x6, 0x0],
  C: [0x3, 0x4, 0x4, 0x4, 0x3, 0x0],
  D: [0x6, 0x5, 0x5, 0x5, 0x6, 0x0],
  E: [0x7, 0x4, 0x6, 0x4, 0x7, 0x0],
  F: [0x7, 0x4, 0x6, 0x4, 0x4, 0x0],
  G: [0x3, 0x4, 0x5, 0x5, 0x3, 0x0],
  H: [0x5, 0x5, 0x7, 0x5, 0x5, 0x0],
  I: [0x7, 0x2, 0x2, 0x2, 0x7, 0x0],
  J: [0x1, 0x1, 0x1, 0x5, 0x2, 0x0],
  K: [0x5, 0x5, 0x6, 0x5, 0x5, 0x0],
  L: [0x4, 0x4, 0x4, 0x4, 0x7, 0x0],
  M: [0x5, 0x7, 0x5, 0x5, 0x5, 0x0],
  N: [0x6, 0x5, 0x5, 0x5, 0x5, 0x0],
  O: [0x2, 0x5, 0x5, 0x5, 0x2, 0x0],
  P: [0x6, 0x5, 0x6, 0x4, 0x4, 0x0],
  Q: [0x2, 0x5, 0x5, 0x6, 0x3, 0x0],
  R: [0x6, 0x5, 0x6, 0x5, 0x5, 0x0],
  S: [0x3, 0x4, 0x2, 0x1, 0x6, 0x0],
  T: [0x7, 0x2, 0x2, 0x2, 0x2, 0x0],
  U: [0x5, 0x5, 0x5, 0x5, 0x2, 0x0],
  V: [0x5, 0x5, 0x5, 0x2, 0x2, 0x0],
  W: [0x5, 0x5, 0x5, 0x7, 0x5, 0x0],
  X: [0x5, 0x5, 0x2, 0x5, 0x5, 0x0],
  Y: [0x5, 0x5, 0x2, 0x2, 0x2, 0x0],
  Z: [0x7, 0x1, 0x2, 0x4, 0x7, 0x0],
  " ": [0x0, 0x0, 0x0, 0x0, 0x0, 0x0],
  "!": [0x2, 0x2, 0x2, 0x0, 0x2, 0x0],
  "?": [0x6, 0x1, 0x2, 0x0, 0x2, 0x0],
  "-": [0x0, 0x0, 0x7, 0x0, 0x0, 0x0],
  "+": [0x0, 0x2, 0x7, 0x2, 0x0, 0x0],
  ".": [0x0, 0x0, 0x0, 0x0, 0x2, 0x0],
  ":": [0x0, 0x2, 0x0, 0x2, 0x0, 0x0],
  "/": [0x1, 0x1, 0x2, 0x4, 0x4, 0x0],
};

// ─── 5. PIXEL CANVAS BUFFER ──────────────────────────────────────────────────

export class PixelCanvasBuffer {
  public readonly width: number;
  public readonly height: number;
  public readonly palette: readonly string[];
  public readonly rgbPalette: RgbColor[];
  public readonly pixels: Int16Array;

  constructor(width: number, height: number, palette: readonly string[] = PICO8_PALETTE) {
    this.width = width;
    this.height = height;
    this.palette = palette;
    this.rgbPalette = palette.map(hexToRgb);
    this.pixels = new Int16Array(width * height);
    this.cls(0);
  }

  public cls(colorIndex: number = 0): void {
    this.pixels.fill(colorIndex);
  }

  public pset(x: number, y: number, colorIndex: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.pixels[y * this.width + x] = colorIndex;
  }

  public pget(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
    return this.pixels[y * this.width + x];
  }

  /**
   * Bresenham line algorithm for pixel-perfect straight/diagonal retro lines
   */
  public line(x0: number, y0: number, x1: number, y1: number, colorIndex: number): void {
    let x = Math.floor(x0);
    let y = Math.floor(y0);
    const targetX = Math.floor(x1);
    const targetY = Math.floor(y1);
    const dx = Math.abs(targetX - x);
    const dy = -Math.abs(targetY - y);
    const sx = x < targetX ? 1 : -1;
    const sy = y < targetY ? 1 : -1;
    let err = dx + dy;

    while (true) {
      this.pset(x, y, colorIndex);
      if (x === targetX && y === targetY) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  public rect(x: number, y: number, w: number, h: number, colorIndex: number, fill: boolean = false): void {
    const rx = Math.floor(x);
    const ry = Math.floor(y);
    const rw = Math.floor(w);
    const rh = Math.floor(h);

    if (fill) {
      for (let py = ry; py < ry + rh; py++) {
        for (let px = rx; px < rx + rw; px++) {
          this.pset(px, py, colorIndex);
        }
      }
    } else {
      this.line(rx, ry, rx + rw - 1, ry, colorIndex);
      this.line(rx + rw - 1, ry, rx + rw - 1, ry + rh - 1, colorIndex);
      this.line(rx + rw - 1, ry + rh - 1, rx, ry + rh - 1, colorIndex);
      this.line(rx, ry + rh - 1, rx, ry, colorIndex);
    }
  }

  public circle(cx: number, cy: number, r: number, colorIndex: number, fill: boolean = false): void {
    let x = Math.floor(r);
    let y = 0;
    let err = 0;

    const plot8 = (px: number, py: number) => {
      if (fill) {
        this.line(cx - px, cy + py, cx + px, cy + py, colorIndex);
        this.line(cx - px, cy - py, cx + px, cy - py, colorIndex);
        this.line(cx - py, cy + px, cx + py, cy + px, colorIndex);
        this.line(cx - py, cy - px, cx + py, cy - px, colorIndex);
      } else {
        this.pset(cx + px, cy + py, colorIndex);
        this.pset(cx + py, cy + px, colorIndex);
        this.pset(cx - py, cy + px, colorIndex);
        this.pset(cx - px, cy + py, colorIndex);
        this.pset(cx - px, cy - py, colorIndex);
        this.pset(cx - py, cy - px, colorIndex);
        this.pset(cx + py, cy - px, colorIndex);
        this.pset(cx + px, cy - py, colorIndex);
      }
    };

    while (x >= y) {
      plot8(x, y);
      y += 1;
      err += 1 + 2 * y;
      if (2 * (err - x) + 1 > 0) {
        x -= 1;
        err += 1 - 2 * x;
      }
    }
  }

  public drawSprite(
    x: number,
    y: number,
    sprite: PixelSprite,
    options?: { flipX?: boolean; flipY?: boolean; scale?: number; tintIndex?: number }
  ): void {
    const scale = options?.scale ?? 1;
    const flipX = options?.flipX ?? false;
    const flipY = options?.flipY ?? false;
    const tint = options?.tintIndex;

    for (let sy = 0; sy < sprite.height; sy++) {
      const srcY = flipY ? sprite.height - 1 - sy : sy;
      for (let sx = 0; sx < sprite.width; sx++) {
        const srcX = flipX ? sprite.width - 1 - sx : sx;
        const colorIdx = sprite.pixels[srcY * sprite.width + srcX];
        if (colorIdx === -1) continue;
        const drawColor = tint !== undefined ? tint : colorIdx;

        if (scale === 1) {
          this.pset(x + sx, y + sy, drawColor);
        } else {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              this.pset(x + sx * scale + dx, y + sy * scale + dy, drawColor);
            }
          }
        }
      }
    }
  }

  public drawText(text: string, x: number, y: number, colorIndex: number, scale: number = 1): void {
    let curX = x;
    const upper = text.toUpperCase();

    for (let i = 0; i < upper.length; i++) {
      const ch = upper[i];
      if (ch === "\n") {
        curX = x;
        y += 7 * scale;
        continue;
      }
      const glyph = MICRO_FONT[ch] ?? MICRO_FONT["?"];
      for (let gy = 0; gy < 6; gy++) {
        const bits = glyph[gy];
        for (let gx = 0; gx < 4; gx++) {
          if ((bits >> (2 - gx)) & 1) {
            if (scale === 1) {
              this.pset(curX + gx, y + gy, colorIndex);
            } else {
              for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                  this.pset(curX + gx * scale + dx, y + gy * scale + dy, colorIndex);
                }
              }
            }
          }
        }
      }
      curX += 4 * scale;
    }
  }

  /**
   * Blits current pixel buffer onto standard HTML5 Canvas 2D context with integer/crisp scaling
   */
  public renderToImageData(imgData: ImageData): void {
    const data = imgData.data;
    const count = this.width * this.height;
    for (let i = 0; i < count; i++) {
      const pIdx = this.pixels[i];
      const offset = i * 4;
      if (pIdx === -1) {
        data[offset + 3] = 0; // Transparent
      } else {
        const rgb = this.rgbPalette[pIdx] ?? this.rgbPalette[0];
        data[offset] = rgb.r;
        data[offset + 1] = rgb.g;
        data[offset + 2] = rgb.b;
        data[offset + 3] = 255;
      }
    }
  }
}

// ─── 6. RETRO CHIPTUNE SOUND SYNTHESIZER ─────────────────────────────────────

export class RetroChiptuneSynth {
  /**
   * 8-bit Mario/Celeste style Jump (Rising square wave sweep)
   */
  public static playJump(ctx: AudioContext | null, volume: number = 0.08): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * 8-bit Coin Pickup (Dual high-pitch arpeggio B5 -> E6)
   */
  public static playCoin(ctx: AudioContext | null, volume: number = 0.08): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * 8-bit Laser Shot (Fast downward frequency dive)
   */
  public static playLaser(ctx: AudioContext | null, volume: number = 0.07): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.1);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * 8-bit Hit / Hurt (Crunchy low sawtooth thump)
   */
  public static playHit(ctx: AudioContext | null, volume: number = 0.1): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.12);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * 8-bit Noise Explosion (Procedural White-noise burst with low-pass filter decay)
   */
  public static playExplosion(ctx: AudioContext | null, volume: number = 0.12): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.35);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(60, now + 0.35);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    whiteNoise.connect(filter).connect(gain).connect(ctx.destination);
    whiteNoise.start(now);
    whiteNoise.stop(now + 0.35);
  }

  /**
   * 8-bit Powerup Fanfare (Ascending major triad arpeggio C5 -> E5 -> G5 -> C6)
   */
  public static playPowerup(ctx: AudioContext | null, volume: number = 0.08): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  /**
   * 8-bit UI Dialogue / Blip (Short square pip)
   */
  public static playBlip(ctx: AudioContext | null, volume: number = 0.04): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(520, now + 0.04);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * 8-bit Game Over (Descending melancholic minor chime)
   */
  public static playGameOver(ctx: AudioContext | null, volume: number = 0.09): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 415.3, 392, 349.23]; // A4 -> G#4 -> G4 -> F4

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.28);
    });
  }
}
