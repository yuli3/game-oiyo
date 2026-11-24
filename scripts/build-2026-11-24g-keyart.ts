// Bakes key art (1200×630 WebP) for the sixteenth batch of winter originals (2026-11-24)
// (icicle-knock, ice-road, mandu-pleat) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-24g-keyart.ts
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
const WALKER: PixelArt = { palette: { h: "#c92a2a", f: "#ffd8a8", c: "#1c7ed6", l: "#343a40" }, rows: [".hhh.", "hhhhh", ".fff.", "ccccc", "ccccc", ".l.l."] };
const WALKER2: PixelArt = { palette: { h: "#5f3dc4", f: "#ffd8a8", c: "#2f9e44", l: "#343a40" }, rows: [".hhh.", "hhhhh", ".fff.", "ccccc", "ccccc", ".l.l."] };
const TRUCK: PixelArt = {
  palette: { r: "#e03131", d: "#a51111", w: "#a5d8ff", k: "#212529", g: "#ced4da" },
  rows: [".rrrr.", "rwwwwr", "rrrrrr", "kggggk", ".gggg.", "kggggk", ".gggg.", "kggggk"],
};
const MANDU_OK: PixelArt = { palette: { w: "#f8f9fa", s: "#dee2e6", d: "#adb5bd" }, rows: ["..sws..", ".wwwww.", "wswswsw", "wwwwwww", ".ddddd."] };

function icicle(r: Raster, x: number, top: number, len: number, hex: string): void {
  for (let y = 0; y < len; y += 4) {
    const half = Math.round(16 * (1 - y / len));
    r.rect(x - half, top + y, half * 2, 4, hex);
  }
}

async function icicleKnock(): Promise<void> {
  const r = new Raster();
  const R = rng(161);
  r.rect(0, 0, W, H, "#1c2541");
  for (let i = 0; i < 160; i++) r.rect(Math.floor(R() * W), Math.floor(R() * H), 4, 4, "#ffffff", 0.7);
  r.rect(0, 90, W, 90, "#343a40");
  for (let x = 0; x < W; x += 36) r.rect(x, 90, 28, 90, "#495057");
  r.rect(0, 80, W, 14, "#f8f9fa");
  r.rect(0, 170, W, 20, "#6b4423");
  const lens = [120, 190, 150, 220, 110, 170, 140];
  lens.forEach((len, i) => icicle(r, 110 + i * 165, 190, len, i === 3 ? "#d0ebff" : "#74c0fc"));
  // a falling one and the cracked one about to go
  icicle(r, 605, 430, 60, "#d0ebff");
  r.rect(0, 520, W, 110, "#e9ecef");
  r.rect(0, 520, W, 6, "#ced4da");
  r.rect(560, 512, 90, 8, "#fa5252", 0.5);
  r.sprite(WALKER, 330, 478, 14);
  r.sprite(WALKER2, 900, 478, 14, true);
  await save("icicle-knock", r, titleSvg("고드름 따기 · Icicle Knock", "Who'll be under it when it lands?", 600, 330, "#ffffff"));
}

async function iceRoad(): Promise<void> {
  const r = new Raster();
  const shades = ["#c8ebfa", "#8fc1e6", "#5a8fc9", "#a9d4f0", "#3e6aa8"];
  shades.forEach((hex, i) => r.rect(0, i * 126, W, 126, hex));
  r.rect(520, 0, 160, H, "#ffffff", 0.45);
  for (let y = 0; y < H; y += 40) r.rect(598, y, 4, 20, "#495057", 0.4);
  r.rect(470, 200, 260, 18, "#ffffff");
  r.rect(470, 214, 260, 4, "#adb5bd");
  r.sprite(TRUCK, 600, 470, 18);
  // spreading cracks
  for (let k = 0; k < 6; k++) {
    const a = k * 1.05;
    r.line(600, 470, 600 + Math.cos(a) * 170, 470 + Math.sin(a) * 90, "#ffffff", 4);
  }
  // the speedometer with its red band
  r.rect(1040, 60, 90, 500, "#1c2541", 0.85);
  r.rect(1060, 180, 50, 120, "#fa5252");
  r.rect(1050, 360, 70, 8, "#69db7c");
  await save("ice-road", r, titleSvg("얼음길 운전 · Ice Road", "Not too fast, not too slow", 600, 110, "#ffffff"));
}

async function manduPleat(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#8d5524");
  for (let y = 20; y < H; y += 52) r.rect(0, y, W, 4, "#a0662f");
  // a folded half moon with even pleats
  const cx = 600;
  const cy = 420;
  for (let y = 0; y < 180; y += 6) {
    const half = Math.round(Math.sqrt(1 - ((180 - y) / 180) ** 2) * 260);
    r.rect(cx - half, cy - 180 + y, half * 2, 6, "#f8f9fa");
  }
  r.rect(cx - 260, cy - 8, 520, 16, "#dee2e6");
  for (let i = 1; i < 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    const x = cx + Math.cos(a) * 260;
    const y = cy + Math.sin(a) * 180;
    r.line(x, y, cx + (x - cx) * 0.7, cy + (y - cy) * 0.7, "#adb5bd", 6);
  }
  r.rect(cx + 120, cy - 200, 36, 36, "#ffc9c9");
  // the tray
  r.rect(60, 520, W - 120, 90, "#c92a2a");
  for (let i = 0; i < 9; i++) r.sprite(MANDU_OK, 150 + i * 110, 565, 10);
  await save("mandu-pleat", r, titleSvg("만두 빚기 · Mandu Pleat", "Just enough filling, even pleats", 600, 110, "#fff4e6"));
}

await icicleKnock();
await iceRoad();
await manduPleat();
