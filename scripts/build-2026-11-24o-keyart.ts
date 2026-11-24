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

async function screws(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#343a40");
  const cols = ["#e03131", "#1971c2", "#2f9e44", "#f08c00"];
  // two waiting boxes at the top, stacked plates below, a spare tray at the bottom
  [0, 1].forEach((k) => {
    r.rect(380 + k * 280, 120, 240, 80, "#495057");
    r.rect(388 + k * 280, 128, 224, 64, cols[k]);
    for (let j = 0; j < 3; j++) r.rect(410 + k * 280 + j * 70, 145, 34, 34, j < 2 - k ? "#f8f9fa" : "#212529", j < 2 - k ? 1 : 0.35);
  });
  const plates = [[300, 260, 360, 200, "#b88a5c"], [520, 300, 380, 220, "#d4a373"], [420, 360, 320, 180, "#e0c097"]] as const;
  const R = rng(241);
  plates.forEach(([x, y, w, h, c]) => {
    r.rect(x + 8, y + 10, w, h, "#000000", 0.25);
    r.rect(x, y, w, h, c);
    for (let k = 0; k < 3; k++) {
      const sx = x + 40 + Math.floor(R() * (w - 80));
      const sy = y + 30 + Math.floor(R() * (h - 60));
      r.rect(sx - 14, sy - 14, 28, 28, cols[Math.floor(R() * 4)]);
      r.rect(sx - 8, sy - 2, 16, 4, "#f8f9fa");
      r.rect(sx - 2, sy - 8, 4, 16, "#f8f9fa");
    }
  });
  r.rect(340, 580, 600, 60, "#212529");
  for (let k = 0; k < 4; k++) r.rect(380 + k * 140, 592, 36, 36, k < 2 ? cols[3 - k] : "#495057");
  await save("screw-jam", r, titleSvg("나사 풀기 · Screw Jam", "That last screw just won't come out", 640, 70, "#f8f9fa"));
}

async function parking(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#212529");
  const s = 80, x0 = 400, y0 = 140, n = 6;
  r.rect(x0, y0, s * n, s * n, "#495057");
  for (let k = 0; k <= n; k++) {
    r.rect(x0 + k * s, y0, 2, s * n, "#868e96");
    r.rect(x0, y0 + k * s, s * n, 2, "#868e96");
  }
  // cars as [x, y, dir, len, colour]; dir 0 up, 1 right, 2 down, 3 left
  const cols = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#7048e8", "#0c8599", "#d6336c"];
  const cars = [[0, 0, 1, 2, 0], [2, 0, 2, 3, 1], [3, 1, 1, 2, 2], [0, 2, 0, 2, 3], [1, 3, 1, 3, 4], [5, 2, 2, 2, 5], [4, 5, 3, 3, 6], [0, 5, 0, 2, 1]];
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  for (const [x, y, d, len, c] of cars) {
    const xs = Array.from({ length: len }, (_, k) => x + DX[d] * k);
    const ys = Array.from({ length: len }, (_, k) => y + DY[d] * k);
    const ax = Math.min(...xs), ay = Math.min(...ys);
    const w = (Math.max(...xs) - ax + 1) * s, h = (Math.max(...ys) - ay + 1) * s;
    r.rect(x0 + ax * s + 6, y0 + ay * s + 6, w - 12, h - 12, cols[c]);
    const fx = x + DX[d] * (len - 1), fy = y + DY[d] * (len - 1);
    r.rect(x0 + fx * s + 20 + DX[d] * 6, y0 + fy * s + 20 + DY[d] * 6, 40, 40, "#d0ebff");
  }
  r.rect(x0 + 2 * s + 30, y0 + 4 * s + 30, 20, 20, "#adb5bd");
  await save("parking-out", r, titleSvg("주차장 탈출 · Parking Out", "Rush-hour car park: get every car out", 640, 80, "#f8f9fa"));
}

async function checkout(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1c1f3a");
  // night window with a moon, a counter with items, a till screen, notes and coins
  r.rect(80, 120, 300, 220, "#0b1026");
  r.rect(300, 150, 40, 40, "#fff3bf");
  r.rect(80, 400, 1120, 90, "#868e96");
  const items = ["#ffd8a8", "#b2f2bb", "#a5d8ff", "#ffc9c9", "#d0bfff"];
  items.forEach((c, k) => r.rect(460 + k * 110, 330, 90, 70, c));
  r.rect(460, 330, 40, 18, "#e03131");
  r.rect(900, 200, 260, 150, "#0b3d2e");
  for (let k = 0; k < 3; k++) r.rect(930, 230 + k * 36, 120 + k * 30, 16, "#8ce99a");
  ["#a9e34b", "#ffa94d", "#74c0fc"].forEach((c, k) => r.rect(160 + k * 170, 540, 150, 80, c));
  for (let k = 0; k < 2; k++) r.rect(700 + k * 120, 545, 70, 70, "#ced4da");
  r.rect(150, 200, 70, 90, "#f783ac");
  r.rect(160, 160, 50, 40, "#ffe8cc");
  await save("night-checkout", r, titleSvg("편의점 야간 계산대 · Night Checkout", "Night shift: get the change wrong and it's over", 640, 70, "#f8f9fa"));
}

await screws();
await parking();
await checkout();
