// Bakes key art (1200×630 WebP) for the thirty-sixth batch of originals (2026-11-25)
// (snack-swing, sun-moon, carton-flip) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25k-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import { COOKIE_ART, HAMSTER_ART, SPARKLE_ART, THORN_ART } from "../src/lib/games/snack-swing-art";
import sharp from "sharp";
import { join } from "node:path";
import { parseHex, spritePixels, type PixelArt } from "../src/lib/games/pixel-kit";

const root = join(import.meta.dirname, "..");
const W = 1200;
const H = 630;

class Raster {
  data = new Uint8ClampedArray(W * H * 4);
  put(x: number, y: number, hex: string, alpha = 1): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const c = parseHex(hex);
    const i = (y * W + x) * 4;
    const a = (c.a / 255) * alpha;
    this.data[i] = this.data[i] * (1 - a) + c.r * a;
    this.data[i + 1] = this.data[i + 1] * (1 - a) + c.g * a;
    this.data[i + 2] = this.data[i + 2] * (1 - a) + c.b * a;
    this.data[i + 3] = 255;
  }
  rect(x: number, y: number, w: number, h: number, hex: string, alpha = 1): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.put(xx, yy, hex, alpha);
  }
  sprite(art: PixelArt, cx: number, cy: number, scale: number, flip = false): void {
    const { width, height, data } = spritePixels(art);
    const x0 = Math.round(cx - (width * scale) / 2);
    const y0 = Math.round(cy - (height * scale) / 2);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const sx = flip ? width - 1 - x : x;
      const j = (y * width + sx) * 4;
      if (!data[j + 3]) continue;
      const hex = `#${[data[j], data[j + 1], data[j + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      this.rect(x0 + x * scale, y0 + y * scale, scale, scale, hex);
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, hex: string, size: number): void {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / size);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = Math.round((x0 + (x1 - x0) * t) / size) * size;
      const y = Math.round((y0 + (y1 - y0) * t) / size) * size;
      this.rect(x, y, size, size, hex);
    }
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
function titleSvg(main: string, sub: string, x: number, y: number, fill: string, anchor = "middle"): Buffer {
  const size = Math.min(76, Math.floor(1700 / Math.max(10, main.length)));
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
      `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="800" fill="${fill}" stroke="rgba(0,0,0,.45)" stroke-width="4" paint-order="stroke">${esc(main)}</text>` +
      `<text x="${x}" y="${y + 52}" text-anchor="${anchor}" font-family="sans-serif" font-size="30" font-weight="700" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="3" paint-order="stroke">${esc(sub)}</text>` +
      `</svg>`,
  );
}

async function save(slug: string, r: Raster, overlay: Buffer): Promise<void> {
  await sharp(Buffer.from(r.data.buffer), { raw: { width: W, height: H, channels: 4 } })
    .composite([{ input: overlay }])
    .webp({ quality: 90 })
    .toFile(join(root, `public/games/${slug}-keyart.webp`));
  console.log(slug);
}




function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const disc = (r: Raster, cx: number, cy: number, rad: number, hex: string) => {
  for (let y = -rad; y <= rad; y += 4) for (let x = -rad; x <= rad; x += 4) if (Math.hypot(x, y) <= rad) r.rect(cx + x - 2, cy + y - 2, 4, 4, hex);
};

async function snack(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#e7f5ff");
  for (let y = 0; y < H; y += 60) r.rect(0, y, W, 3, "#d0ebff");
  r.rect(0, 590, W, 40, "#c08a4a");
  // two pegs, two ropes to the cookie, sparkles on the way, the hamster waiting below
  const pegs: Array<[number, number]> = [[440, 150], [760, 170]];
  const cx = 600;
  const cy = 330;
  for (const [px, py] of pegs) {
    r.rect(px - 10, py - 10, 20, 20, "#495057");
    const n = 30;
    for (let i = 0; i <= n; i++) r.rect(Math.round(px + ((cx - px) * i) / n) - 3, Math.round(py + ((cy - py) * i) / n) - 3, 6, 6, "#8a5a2b");
  }
  r.sprite(COOKIE_ART, cx, cy, 9);
  r.sprite(SPARKLE_ART, 520, 420, 7);
  r.sprite(SPARKLE_ART, 680, 460, 7);
  r.sprite(THORN_ART, 900, 420, 7);
  r.sprite(HAMSTER_ART, 600, 545, 9);
  await save("snack-swing", r, titleSvg("간식 그네 · Snack Swing", "Snip at just the right moment, straight into the hamster", 600, 70, "#1971c2"));
}

async function sunmoon(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W / 2, H, "#fff9db");
  r.rect(W / 2, 0, W / 2, H, "#dbe4ff");
  const n = 6;
  const cell = 70;
  const x0 = 390;
  const y0 = 170;
  const grid = [1, 2, 1, 2, 2, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 0, 2, 2, 2, 2, 1, 0, 1, 1, 0, 1, 2, 1, 2, 0, 1, 0, 1, 2, 0, 2];
  r.rect(x0 - 8, y0 - 8, n * cell + 16, n * cell + 16, "#495057");
  grid.forEach((v, i) => {
    const x = x0 + (i % n) * cell;
    const y = y0 + Math.floor(i / n) * cell;
    r.rect(x + 2, y + 2, cell - 4, cell - 4, i % 5 === 0 ? "#e9ecef" : "#ffffff");
    if (v === 1) {
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        r.rect(Math.round(x + cell / 2 + Math.cos(a) * 26) - 3, Math.round(y + cell / 2 + Math.sin(a) * 26) - 3, 6, 6, "#fab005");
      }
      disc(r, x + cell / 2, y + cell / 2, 18, "#ffd43b");
    } else if (v === 2) {
      disc(r, x + cell / 2, y + cell / 2, 20, "#4c6ef5");
      disc(r, x + cell / 2 + 9, y + cell / 2 - 7, 16, i % 5 === 0 ? "#e9ecef" : "#ffffff");
    }
  });
  await save("sun-moon", r, titleSvg("해달 타일 · Sun & Moon", "Half and half in every line, never three in a row", 600, 70, "#364fc7"));
}

async function carton(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#fff4e6");
  for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? 0 : 20; x < W; x += 40) r.rect(x, y, 36, 36, "#ffe8cc");
  // the counter, two shelves and the fridge, a carton mid-tumble with its arc
  r.rect(80, 520, 260, 20, "#8a5a2b");
  r.rect(480, 420, 200, 16, "#8a5a2b");
  r.rect(820, 300, 200, 16, "#ced4da");
  r.rect(840, 316, 160, 320, "#e9ecef");
  r.rect(980, 360, 8, 60, "#adb5bd");
  for (let k = 0; k < 12; k++) {
    const t = k / 11;
    r.rect(Math.round(210 + 360 * t) - 3, Math.round(480 - 300 * Math.sin(Math.PI * t) + 40 * t) - 3, 6, 6, "#4dabf7", 0.5);
  }
  // a carton standing on the counter and one turning in the air
  r.rect(190, 440, 40, 80, "#f8f9fa");
  r.rect(190, 470, 40, 18, "#4dabf7");
  r.rect(208, 432, 12, 8, "#e03131");
  for (let y = -40; y < 40; y += 4) for (let x = -20; x < 20; x += 4) {
    const a = 0.9;
    const px = Math.round(400 + x * Math.cos(a) - y * Math.sin(a));
    const py = Math.round(230 + x * Math.sin(a) + y * Math.cos(a));
    r.rect(px, py, 4, 4, y > -10 && y < 8 ? "#4dabf7" : "#f8f9fa");
  }
  await save("carton-flip", r, titleSvg("우유팩 플립 · Carton Flip", "One flip, and it lands standing up", 600, 70, "#1971c2"));
}

await snack();
await sunmoon();
await carton();
