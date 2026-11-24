// Bakes key art (1200×630 WebP) for the nineteenth batch of winter originals (2026-11-24)
// (daljip-fire, scarf-knit, ipchun-brush) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-24j-keyart.ts
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
const SUN: PixelArt = { palette: { y: "#ffd43b", o: "#fab005" }, rows: [".y.y.", "yoooy", ".ooo.", "yoooy", ".y.y."] };
const BUG: PixelArt = { palette: { g: "#2b8a3e", l: "#8ce99a", k: "#212529" }, rows: [".k.k.", "gglgg", "glllg", ".ggg."] };
const CROWN: PixelArt = { palette: { y: "#fab005", o: "#e67700", r: "#e03131" }, rows: ["y.y.y", "yyyyy", "yryry", "ooooo"] };

async function plant(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#e9ecef");
  // a laptop screen on the left, the window and the pot on the right
  r.rect(80, 200, 520, 330, "#343a40");
  r.rect(100, 220, 480, 290, "#f8f9fa");
  for (let k = 0; k < 9; k++) r.rect(130, 250 + k * 26, 160 + ((k * 97) % 240), 10, "#ced4da");
  r.rect(60, 530, 560, 20, "#495057");
  r.rect(680, 160, 440, 360, "#74c0fc");
  r.rect(895, 160, 10, 360, "#ced4da");
  r.rect(680, 330, 440, 10, "#ced4da");
  r.sprite(SUN, 1020, 230, 12);
  r.rect(640, 520, 520, 40, "#c0a080");
  r.rect(850, 440, 100, 80, "#d9480f");
  r.rect(840, 430, 120, 20, "#e8590c");
  r.rect(896, 230, 8, 200, "#2f9e44");
  for (let k = 0; k < 8; k++) r.rect(k % 2 ? 904 : 856, 400 - k * 22, 40, 14, k % 3 ? "#51cf66" : "#40c057");
  r.sprite(BUG, 940, 300, 6);
  await save("window-plant", r, titleSvg("창가 화분 · Window Plant", "Leave it open while you work", 600, 90, "#1c3d5a"));
}

async function boom(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1a1b2e");
  const cols = ["#ffd43b", "#ff922b", "#ff6b6b", "#cc5de8", "#5c7cfa", "#22b8cf"];
  // a chain of machines, the flow growing through each, sparks flying off the end
  cols.forEach((c, i) => {
    const x = 120 + i * 170;
    r.rect(x, 330 - i * 20, 120, 120 + i * 40, c);
    r.rect(x + 20, 350 - i * 20, 80, 30, "#1a1b2e", 0.4);
    if (i < 5) r.rect(x + 120, 380, 50, 12 + i * 4, "#495057");
  });
  const R = rng(231);
  for (let k = 0; k < 120; k++) r.rect(1000 + Math.floor(R() * 180), 150 + Math.floor(R() * 420), 8, 8, cols[k % 6]);
  await save("number-boom", r, titleSvg("숫자 폭발 · Number Boom", "From hundreds to 30 zeros in half an hour", 600, 90, "#ffe066"));
}

async function crowns(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#212529");
  const lands = ["#ffc9c9", "#ffd8a8", "#ffec99", "#c0eb75", "#96f2d7", "#a5d8ff"];
  const region = [
    [0, 0, 1, 1, 1, 2],
    [0, 3, 3, 1, 2, 2],
    [0, 3, 4, 4, 2, 5],
    [3, 3, 4, 5, 5, 5],
    [3, 4, 4, 4, 5, 5],
    [3, 3, 4, 5, 5, 5],
  ];
  const crown = [2, 0, 4, 1, 3, 5]; // a real answer: one crown per row, column and land, none touching
  const s = 70, x0 = 390, y0 = 170;
  region.forEach((row, y) => row.forEach((g, x) => {
    r.rect(x0 + x * s, y0 + y * s, s - 2, s - 2, lands[g]);
    if (crown[y] === x) r.sprite(CROWN, x0 + x * s + s / 2, y0 + y * s + s / 2, 9);
  }));
  await save("crown-regions", r, titleSvg("영토 왕관 · Crown Regions", "Today's crowns: how many seconds?", 600, 90, "#f8f9fa"));
}

await plant();
await boom();
await crowns();
