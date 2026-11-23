// Shared pixel-art kit (2026-11-23). Original sprites drawn as character maps,
// so games built without art can swap circles and rectangles for real sprites
// without shipping image files. Pure parts (sprite parsing, backdrop pixels)
// are testable; the canvas helpers cache one bitmap per sprite and scale.

export type SpriteMap = readonly string[];
export type SpritePalette = Readonly<Record<string, string>>;

export interface PixelArt {
  readonly rows: SpriteMap;
  readonly palette: SpritePalette;
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseHex(hex: string): Rgba {
  const h = hex.replace("#", "");
  const full = h.length === 3 || h.length === 4 ? h.split("").map((c) => c + c).join("") : h;
  const n = Number.parseInt(full.slice(0, 6), 16);
  const a = full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) : 255;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
}

/** RGBA bytes for a sprite. '.' and ' ' are transparent; unknown keys throw. */
export function spritePixels(art: PixelArt): { width: number; height: number; data: Uint8ClampedArray } {
  const height = art.rows.length;
  const width = height ? Math.max(...art.rows.map((r) => r.length)) : 0;
  const data = new Uint8ClampedArray(width * height * 4);
  const cache = new Map<string, Rgba>();
  for (let y = 0; y < height; y += 1) {
    const row = art.rows[y];
    for (let x = 0; x < width; x += 1) {
      const ch = row[x] ?? ".";
      if (ch === "." || ch === " ") continue;
      let c = cache.get(ch);
      if (!c) {
        const hex = art.palette[ch];
        if (!hex) throw new Error(`pixel-kit: no colour for '${ch}'`);
        c = parseHex(hex);
        cache.set(ch, c);
      }
      const i = (y * width + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = c.a;
    }
  }
  return { width, height, data };
}

/** Recolour a sprite by swapping palette entries. */
export function tint(art: PixelArt, swap: SpritePalette): PixelArt {
  return { rows: art.rows, palette: { ...art.palette, ...swap } };
}

// ─── Canvas helpers (browser only) ──────────────────────────────────────────

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

function toImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
  const img = new ImageData(width, height);
  img.data.set(data);
  return img;
}
const bitmapCache = new WeakMap<PixelArt, Map<number, AnyCanvas>>();

function makeCanvas(w: number, h: number): AnyCanvas | null {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  return null;
}

/** One cached bitmap per sprite and integer scale. */
export function spriteBitmap(art: PixelArt, scale = 1): AnyCanvas | null {
  const s = Math.max(1, Math.round(scale));
  let byScale = bitmapCache.get(art);
  if (!byScale) {
    byScale = new Map();
    bitmapCache.set(art, byScale);
  }
  const hit = byScale.get(s);
  if (hit) return hit;
  const { width, height, data } = spritePixels(art);
  if (!width || !height) return null;
  const base = makeCanvas(width, height);
  const out = makeCanvas(width * s, height * s);
  if (!base || !out) return null;
  const bctx = base.getContext("2d") as CanvasRenderingContext2D | null;
  const octx = out.getContext("2d") as CanvasRenderingContext2D | null;
  if (!bctx || !octx) return null;
  bctx.putImageData(toImageData(data, width, height), 0, 0);
  octx.imageSmoothingEnabled = false;
  octx.drawImage(base as CanvasImageSource, 0, 0, width * s, height * s);
  byScale.set(s, out);
  return out;
}

export interface DrawOpts {
  /** Integer pixel size. */
  scale?: number;
  /** Treat (x, y) as the sprite centre (default true). */
  center?: boolean;
  flipX?: boolean;
  alpha?: number;
  rotate?: number;
}

export function drawSprite(ctx: CanvasRenderingContext2D, art: PixelArt, x: number, y: number, opts: DrawOpts = {}): void {
  const scale = opts.scale ?? 2;
  const bmp = spriteBitmap(art, scale);
  if (!bmp) return;
  const w = bmp.width;
  const h = bmp.height;
  const center = opts.center ?? true;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
  ctx.translate(Math.round(x), Math.round(y));
  if (opts.rotate) ctx.rotate(opts.rotate);
  if (opts.flipX) ctx.scale(-1, 1);
  ctx.drawImage(bmp as CanvasImageSource, center ? -Math.round(w / 2) : 0, center ? -Math.round(h / 2) : 0);
  ctx.restore();
}

/** Data URL for a sprite, for <img> use in DOM games. Empty string on the server. */
const urlCache = new WeakMap<PixelArt, Map<number, string>>();
export function spriteDataUrl(art: PixelArt, scale = 4): string {
  if (typeof document === "undefined") return "";
  let byScale = urlCache.get(art);
  if (!byScale) {
    byScale = new Map();
    urlCache.set(art, byScale);
  }
  const hit = byScale.get(scale);
  if (hit) return hit;
  const { width, height, data } = spritePixels(art);
  const c = document.createElement("canvas");
  c.width = width * scale;
  c.height = height * scale;
  const base = document.createElement("canvas");
  base.width = width;
  base.height = height;
  const bctx = base.getContext("2d");
  const ctx = c.getContext("2d");
  if (!bctx || !ctx) return "";
  bctx.putImageData(toImageData(data, width, height), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/png");
  byScale.set(scale, url);
  return url;
}

// ─── Backdrops ──────────────────────────────────────────────────────────────

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * Pixel colour index for a vertical banded gradient with ordered dithering.
 * `t` is 0 at the top, 1 at the bottom; `bands` is the number of colours.
 */
export function ditherBand(x: number, y: number, t: number, bands: number): number {
  const pos = Math.min(0.9999, Math.max(0, t)) * (bands - 1);
  const lo = Math.floor(pos);
  const frac = pos - lo;
  const threshold = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  return Math.min(bands - 1, frac > threshold ? lo + 1 : lo);
}

export interface BackdropSpec {
  /** Sky colours from top to bottom. */
  sky: readonly string[];
  /** Twinkling stars density 0..1 (per pixel chance * 100). */
  stars?: number;
  starColor?: string;
  /** Optional ground: colours top to bottom, and height share 0..1. */
  ground?: readonly string[];
  groundShare?: number;
  /** Ridge silhouette colour drawn above the ground. */
  hills?: string;
  /** Moon or sun: centre share and radius in pixels. */
  orb?: { x: number; y: number; r: number; color: string; glow?: string };
  /** Grid tile pattern, e.g. dungeon floor: size and line colour. */
  tiles?: { size: number; line: string; alt?: string };
  seed?: number;
}

/** Paint a backdrop into a low-res buffer (w x h pixels). Pure. */
export function backdropPixels(w: number, h: number, spec: BackdropSpec): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  const sky = spec.sky.map(parseHex);
  const ground = (spec.ground ?? []).map(parseHex);
  const share = spec.ground ? spec.groundShare ?? 0.25 : 0;
  const groundTop = Math.round(h * (1 - share));
  const rnd = mulberry(spec.seed ?? 7);
  const hills = spec.hills ? parseHex(spec.hills) : null;
  // ridge line: sum of two sines, seeded phase
  const p1 = rnd() * 6.28;
  const p2 = rnd() * 6.28;
  const ridge = (x: number) =>
    groundTop - Math.round(h * 0.06 * (1 + Math.sin(x * 0.045 + p1)) + h * 0.03 * (1 + Math.sin(x * 0.13 + p2)));
  const put = (i: number, c: Rgba) => {
    out[i] = c.r;
    out[i + 1] = c.g;
    out[i + 2] = c.b;
    out[i + 3] = 255;
  };
  const line = spec.tiles ? parseHex(spec.tiles.line) : null;
  const alt = spec.tiles?.alt ? parseHex(spec.tiles.alt) : null;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      if (y >= groundTop && ground.length) {
        const t = (y - groundTop) / Math.max(1, h - groundTop);
        put(i, ground[ditherBand(x, y, t, ground.length)]);
        continue;
      }
      if (hills && y >= ridge(x)) {
        put(i, hills);
        continue;
      }
      const t = y / Math.max(1, groundTop || h);
      put(i, sky[ditherBand(x, y, t, sky.length)]);
      if (spec.tiles && line) {
        const s = spec.tiles.size;
        const tx = Math.floor(x / s);
        const ty = Math.floor(y / s);
        if (alt && (tx + ty) % 2 === 0 && x % s !== 0 && y % s !== 0) put(i, alt);
        if (x % s === 0 || y % s === 0) put(i, line);
        // brick-like chips on tile corners
        if (x % s === 1 && y % s === 1 && ((tx * 31 + ty * 17) & 3) === 0) put(i, line);
      }
    }
  }
  if (spec.orb) {
    const o = spec.orb;
    const cx = Math.round(o.x * w);
    const cy = Math.round(o.y * h);
    const col = parseHex(o.color);
    const glow = o.glow ? parseHex(o.glow) : null;
    for (let y = cy - o.r * 2; y <= cy + o.r * 2; y += 1) {
      for (let x = cx - o.r * 2; x <= cx + o.r * 2; x += 1) {
        if (x < 0 || y < 0 || x >= w || y >= groundTop) continue;
        const d = Math.hypot(x - cx, y - cy);
        const i = (y * w + x) * 4;
        if (d <= o.r) put(i, col);
        else if (glow && d <= o.r * 1.6 && (x + y) % 2 === 0) put(i, glow);
      }
    }
  }
  if (spec.stars) {
    const sc = parseHex(spec.starColor ?? "#fff7d6");
    const count = Math.round(w * h * spec.stars * 0.01);
    for (let k = 0; k < count; k += 1) {
      const x = Math.floor(rnd() * w);
      const y = Math.floor(rnd() * (groundTop || h) * 0.85);
      const i = (y * w + x) * 4;
      put(i, sc);
      if (rnd() < 0.12 && x + 1 < w && y + 1 < h) {
        // a few plus-shaped bright stars
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h) put((yy * w + xx) * 4, sc);
        }
      }
    }
  }
  return out;
}

const backdropCache = new Map<string, AnyCanvas>();

/** Draw a cached backdrop stretched (nearest neighbour) over the canvas. `px` = screen pixels per art pixel. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, spec: BackdropSpec, px = 3): void {
  const w = Math.max(1, Math.ceil(width / px));
  const h = Math.max(1, Math.ceil(height / px));
  const key = `${w}x${h}:${JSON.stringify(spec)}`;
  let bmp = backdropCache.get(key);
  if (!bmp) {
    const c = makeCanvas(w, h);
    const cctx = c?.getContext("2d") as CanvasRenderingContext2D | null | undefined;
    if (!c || !cctx) return;
    cctx.putImageData(toImageData(backdropPixels(w, h, spec), w, h), 0, 0);
    if (backdropCache.size > 24) backdropCache.clear();
    backdropCache.set(key, c);
    bmp = c;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bmp as CanvasImageSource, 0, 0, w * px, h * px);
  ctx.restore();
}

// ─── Pixel particles ────────────────────────────────────────────────────────

export interface PixelParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export function spawnBurst(list: PixelParticle[], x: number, y: number, colors: readonly string[], n = 14, speed = 120, seed = Date.now()): void {
  const rnd = mulberry(seed);
  for (let k = 0; k < n; k += 1) {
    const a = rnd() * Math.PI * 2;
    const v = speed * (0.35 + rnd() * 0.65);
    const max = 0.35 + rnd() * 0.45;
    list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, color: colors[k % colors.length], size: rnd() < 0.3 ? 4 : 2 });
  }
  if (list.length > 400) list.splice(0, list.length - 400);
}

export function stepParticles(list: PixelParticle[], dt: number, gravity = 160): void {
  for (let k = list.length - 1; k >= 0; k -= 1) {
    const p = list[k];
    p.life -= dt;
    if (p.life <= 0) {
      list.splice(k, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += gravity * dt;
    p.vx *= 0.98;
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, list: readonly PixelParticle[]): void {
  ctx.save();
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    const s = p.size;
    ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
  }
  ctx.restore();
}
