// Bakes key art (1200×630 WebP) for the seventeenth batch of winter originals (2026-11-24)
// (kimjang-salt, hwangtae-dry, yongal-scoop) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-24h-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
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

// Sprites mirrored from the game components (kept small and local on purpose).
const HAND: PixelArt = { palette: { s: "#ffd8a8", d: "#e8a87c", w: "#ffffff" }, rows: [".ss.", "ssss", "sdds", ".ww."] };
const FISH_GOLD: PixelArt = { palette: { b: "#fcc419", d: "#e67700", e: "#212529", t: "#f08c00" }, rows: [".tt.", "bbbb", "bbbb", "bbbb", "bddb", "bbbb", ".bb.", "bbbb", "b..b"] };
const DIPPER: PixelArt = { palette: { g: "#e9c46a", d: "#b8893a", k: "#6b4423" }, rows: ["..k..", ".ggg.", "ggdgg", "gdddg", "ggggg", ".ggg."] };

function disc(r: Raster, cx: number, cy: number, rad: number, hex: string, sy = 1): void {
  for (let y = -rad; y <= rad; y += 4)
    for (let x = -rad; x <= rad; x += 4) if (x * x + (y / sy) * (y / sy) <= rad * rad) r.rect(cx + x, cy + y, 4, 4, hex);
}

async function kimjangSalt(): Promise<void> {
  const r = new Raster();
  const R = rng(171);
  r.rect(0, 0, W, H, "#c9a26b");
  for (let y = 0; y < H; y += 44) r.rect(0, y, W, 4, "#b08850");
  disc(r, 600, 380, 230, "#c92a2a", 0.95);
  disc(r, 600, 380, 210, "#e03131", 0.95);
  // the halved cabbage: green leaf tips to white stems, patches salted white
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 6; col++) {
      const g = row / 4;
      const hex = `#${[Math.round(120 + 120 * g), Math.round(190 + 50 * g), Math.round(90 + 140 * g)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      r.rect(430 + col * 58, 230 + row * 58, 54, 54, hex);
      for (let d = 0; d < 6; d++) r.rect(436 + col * 58 + Math.floor(R() * 44), 236 + row * 58 + Math.floor(R() * 44), 4, 4, "#ffffff");
    }
  for (let k = 0; k < 40; k++) r.rect(560 + Math.floor(R() * 90), 200 + Math.floor(R() * 120), 4, 4, "#ffffff");
  r.sprite(HAND, 610, 200, 18);
  await save("kimjang-salt", r, titleSvg("김장 배추 절이기 · Kimjang Salt", "Lots on the stems, a little on the leaves", 600, 110, "#fff4e6"));
}

async function hwangtaeDry(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1b2a4a");
  for (let i = 0; i < 120; i++) r.rect((i * 97) % W, (i * 53) % 260, 4, 4, "#ffffff", 0.6);
  for (let x = 0; x < W; x += 4) {
    const top = 260 + Math.round(60 * Math.sin(x / 140) + 30 * Math.sin(x / 47));
    r.rect(x, top, 4, H - top, "#495057");
  }
  r.rect(0, 520, W, 110, "#f1f3f5");
  // the rack: poles, crossbars and rows of golden fish
  for (const px of [180, 1020]) r.rect(px, 250, 14, 290, "#6b4423");
  for (const py of [250, 380]) r.rect(180, py, 854, 12, "#6b4423");
  for (let row = 0; row < 2; row++) for (let x = 230; x < 1000; x += 62) r.sprite(FISH_GOLD, x, 320 + row * 130, 10);
  // a straw mat rolled half down on the right
  r.rect(760, 238, 280, 170, "#c9a26b", 0.9);
  for (let y = 244; y < 408; y += 14) r.rect(760, y, 280, 3, "#8c693c");
  await save("hwangtae-dry", r, titleSvg("황태 덕장 · Hwangtae Dry", "Freeze, thaw, and once more", 600, 110, "#ffe8a3"));
}

async function yongalScoop(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#141c3a");
  disc(r, 600, 380, 250, "#868e96");
  disc(r, 600, 380, 220, "#0b1d33");
  disc(r, 560, 390, 70, "#fff3bf");
  disc(r, 540, 375, 26, "#ffd43b");
  // ripples and the rope down to the dipper, leaning with its swing
  for (let k = 0; k < 3; k++) {
    const rad = 100 + k * 40;
    for (let a = 0; a < 360; a += 6) r.rect(Math.round(560 + Math.cos((a * Math.PI) / 180) * rad), Math.round(390 + Math.sin((a * Math.PI) / 180) * rad * 0.5), 4, 4, "#a5d8ff", 0.5);
  }
  r.line(600, 160, 700, 340, "#c9a26b", 6);
  r.sprite(DIPPER, 704, 360, 16);
  await save("yongal-scoop", r, titleSvg("용알뜨기 · Yongal Scoop", "Scoop the moon from the well", 600, 100, "#fff3bf"));
}

await kimjangSalt();
await hwangtaeDry();
await yongalScoop();
