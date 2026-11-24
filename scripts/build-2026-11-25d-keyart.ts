// Bakes key art (1200×630 WebP) for the twenty-ninth batch of originals (2026-11-25)
// (trio-tray, cork-spin, gondola-queue) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25d-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import { SNACKS } from "../src/lib/games/trio-tray-art";
import { tint } from "../src/lib/games/pixel-kit";
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

async function trio(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 40) for (let x = 0; x < W; x += 40) r.rect(x, y, 40, 40, ((x + y) / 40) % 2 ? "#ffe3e3" : "#ff8787");
  // a pile of tiles in layers, then the tray with two of a kind waiting for the third
  const g = rng(29);
  for (let z = 0; z < 3; z++)
    for (let k = 0; k < 9 - z * 2; k++) {
      const x = 250 + (k % 5) * 130 + z * 40 + (z % 2) * 20;
      const y = 150 + Math.floor(k / 5) * 130 + z * 30 - z * 12;
      r.rect(x + 6, y + 10, 110, 110, "#7f5539");
      r.rect(x, y, 110, 110, z === 2 ? "#fff9db" : "#ced4da");
      r.sprite(SNACKS[Math.floor(g() * SNACKS.length)], x + 55, y + 55, 12);
    }
  r.rect(160, 520, 880, 100, "#a87545");
  const tray = [0, 0, 3, 3, 8];
  for (let k = 0; k < 7; k++) {
    r.rect(180 + k * 122, 532, 110, 80, "#f1f3f5");
    if (k < tray.length) r.sprite(SNACKS[tray[k]], 180 + k * 122 + 55, 572, 9);
  }
  await save("trio-tray", r, titleSvg("간식 트레이 · Trio Tray", "Seven slots on the tray, three of a kind and pop", 600, 70, "#5c1f1f"));
}

async function cork(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#e9ecef");
  for (let y = 0; y < H; y += 40) r.rect(0, y, W, 3, "#dee2e6");
  const cx = 600;
  const cy = 380;
  const R = 160;
  const heads = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#7048e8", "#0c8599", "#495057", "#495057"];
  const angles = [0.2, 0.9, 1.6, 2.3, 3.0, 3.6, 5.9, 2.7];
  // pins first, then the board over their points
  angles.forEach((a, k) => {
    for (let d = 0; d < 60; d += 4) r.rect(Math.round(cx + Math.cos(a) * (R - 10 + d)) - 3, Math.round(cy + Math.sin(a) * (R - 10 + d)) - 3, 7, 7, "#adb5bd");
    r.rect(Math.round(cx + Math.cos(a) * (R + 66)) - 14, Math.round(cy + Math.sin(a) * (R + 66)) - 14, 28, 28, heads[k]);
  });
  for (let y = -R; y <= R; y += 8)
    for (let x = -R; x <= R; x += 8) {
      const d = Math.hypot(x, y);
      if (d > R) continue;
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      r.rect(cx + x - 4, cy + y - 4, 8, 8, d > R - 16 ? "#7f5539" : n - Math.floor(n) > 0.82 ? "#b07d3e" : "#d9a066");
    }
  r.rect(cx - 20, cy - 20, 40, 40, "#7f5539");
  await save("cork-spin", r, titleSvg("코르크 핀꽂기 · Cork Spin", "Can you pin every gap on a spinning board?", 600, 70, "#212529"));
}

const HIKER: PixelArt = { palette: { s: "#ffd8a8", h: "#5c3a1e", j: "#e03131", p: "#343a40", b: "#a87545" }, rows: ["..hhh..", "..sss..", "..sss..", ".jjjjb.", "jjjjjjb", "j.jjj.b", "..p.p..", "..p.p.."] };
const JACKETS = ["#e03131", "#1971c2", "#f59f00", "#2f9e44", "#7048e8", "#e8590c"];

async function gondola(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#a5d8ff");
  for (let x = 0; x < W; x += 8) {
    const h = 120 + Math.round(Math.abs(Math.sin(x / 140)) * 160);
    r.rect(x, 330 - h + 100, 8, h, "#8ce99a");
  }
  r.line(0, 150, W, 120, "#495057", 4);
  // a gondola with two aboard, and the crowd below
  r.rect(560, 150, 8, 40, "#343a40");
  r.rect(470, 190, 190, 110, JACKETS[1]);
  r.rect(486, 206, 158, 44, "#e7f5ff");
  for (let k = 0; k < 2; k++) r.sprite(tint(HIKER, { j: JACKETS[1] }), 520 + k * 50, 240, 5);
  const g = rng(31);
  r.rect(180, 340, 840, 290, "#ced4da");
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 12; col++) {
      if (row === 0 && (col === 5 || col === 6)) continue;
      r.rect(190 + col * 70, 350 + row * 70, 68, 68, (row + col) % 2 ? "#e9ecef" : "#dee2e6");
      r.sprite(tint(HIKER, { j: JACKETS[Math.floor(g() * JACKETS.length)] }), 224 + col * 70, 384 + row * 70, 6);
    }
  await save("gondola-queue", r, titleSvg("곤돌라 줄서기 · Gondola Queue", "Three of a colour and the gondola's off", 600, 70, "#1b4332"));
}

await trio();
await cork();
await gondola();
