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
const RED: PixelArt = { palette: { w: "#f8f9fa", k: "#212529", r: "#e03131" }, rows: ["....r.", "....kk", "kwwwk.", "wwwww.", "k...k."] };
const GREY: PixelArt = { palette: { g: "#868e96", w: "#f1f3f5", d: "#495057", r: "#c92a2a" }, rows: ["....r.", "....wd", "dgggd.", "ggggg.", "d...d."] };
const MACHINE: PixelArt = {
  palette: { b: "#1971c2", d: "#0b3d6b", w: "#f8f9fa", k: "#212529", y: "#fcc419", g: "#adb5bd" },
  rows: ["..kk......kk..", "gbbbbbbbbbbbby", "gbbwwbbbbbbbbb", "gbbwkbbbdddbbb", "gbbwkbbbdddbbb", "gbbwwbbbbbbbbb", "gbbbbbbbbbbbby", "..kk......kk.."],
};
const FOLK: PixelArt = { palette: { k: "#343a40", s: "#f3c9a0", r: "#c92a2a" }, rows: [".kk.", "kssk", ".ss.", "rrrr", "rrrr"] };

async function cranes(): Promise<void> {
  const r = new Raster();
  const R = rng(201);
  r.rect(0, 0, W, H, "#a5d8ff");
  r.rect(0, 300, W, 200, "#d0ebff");
  for (let x = 0; x < W; x += 4) {
    const top = 470 - Math.round(Math.abs(Math.sin(x / 140)) * 60);
    r.rect(x, top, 4, H - top, "#74a0c4");
  }
  r.rect(0, 520, W, H - 520, "#f8f9fa");
  for (let k = 0; k < 18; k++) r.rect(Math.floor(R() * W), 540 + Math.floor(R() * 80), 40, 4, "#ced4da");
  // a wide V of family groups, a few grey white-naped cranes among them
  for (let g = 0; g < 7; g++) {
    const gx = 340 + g * 90;
    const gy = 300 - Math.abs(g - 3) * 40;
    for (let i = 0; i < 3; i++) r.sprite(g === 2 && i === 1 ? GREY : g === 5 && i === 0 ? GREY : RED, gx + (i % 2) * 34, gy + i * 18, 6);
  }
  await save("crane-count", r, titleSvg("두루미 세기 · Crane Count", "That flock just now: how many cranes?", 600, 96, "#1c3d5a"));
}

async function rink(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#343a40");
  r.rect(140, 160, 920, 450, "#f1f3f5");
  r.rect(150, 170, 900, 430, "#a9b8c6");
  // lap after lap of smooth shining ice from the boards inward, the rest still scratched
  for (let lap = 0; lap < 3; lap++) {
    const d = 10 + lap * 50;
    r.rect(150 + d, 170 + d, 900 - 2 * d, 46, "#e7f5ff");
    r.rect(150 + d, 600 - d - 46, 900 - 2 * d, 46, "#e7f5ff");
    r.rect(150 + d, 170 + d, 46, 430 - 2 * d, "#e7f5ff");
    if (lap < 2) r.rect(1050 - d - 46, 170 + d, 46, 430 - 2 * d, "#e7f5ff");
  }
  for (let k = 0; k < 30; k++) r.rect(330 + ((k * 97) % 520), 330 + ((k * 53) % 110), 10, 10, "#868e96");
  r.rect(150, 381, 900, 8, "#e03131", 0.5);
  r.sprite(MACHINE, 940, 460, 9);
  await save("rink-resurface", r, titleSvg("빙판 정빙 · Rink Resurface", "Lap from the outside in", 600, 70, "#f8f9fa"));
}

async function ticket(): Promise<void> {
  const r = new Raster();
  const R = rng(203);
  r.rect(0, 0, W, H, "#1c3d5a");
  r.rect(240, 160, 720, 460, "#e9ecef");
  r.rect(570, 160, 60, 460, "#ced4da");
  // a seat map going fast: grey seats sold, a family's green seats booked, two picked in yellow
  const cols = [260, 410, 650, 800];
  for (let row = 0; row < 8; row++)
    cols.forEach((x, c) => {
      const y = 175 + row * 55;
      const v = R();
      const color = row === 3 && c >= 2 ? "#40c057" : row === 6 && c < 2 ? "#fcc419" : v < 0.55 ? "#868e96" : "#4dabf7";
      r.rect(x, y, 140, 46, color);
      r.rect(x, y, 140, 8, "#000000", 0.18);
      if (color === "#868e96") r.sprite(FOLK, x + 70, y + 26, 6);
    });
  await save("holiday-ticket", r, titleSvg("명절 기차표 예매 · Holiday Ticket", "Seat the family before it sells out", 600, 100, "#fff4e6"));
}

await cranes();
await rink();
await ticket();
