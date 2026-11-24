// Bakes key art (1200×630 WebP) for the thirteenth batch of winter originals (2026-11-24)
// (ice-climb, bobsleigh, tug-of-war) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-24d-keyart.ts
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
const CLIMBER: PixelArt = {
  palette: { k: "#212529", r: "#e8590c", s: "#f1c27d", b: "#364fc7", g: "#868e96", y: "#fab005" },
  rows: ["g..yy..g", "g.kssk.g", "grrrrrrg", ".rrrrrr.", "..rrrr..", "..bbbb..", "..b..b..", ".kk..kk."],
};
const SLED: PixelArt = {
  palette: { k: "#212529", r: "#e03131", y: "#fab005", w: "#f8f9fa", g: "#868e96" },
  rows: ["..kk.kk.", ".kyykyyk", "rrrrrrrr", "rwwrrwwr", "rrrrrrrr", ".gggggg.", "g......g"],
};
const US: PixelArt = {
  palette: { k: "#212529", s: "#f1c27d", b: "#1971c2", w: "#f8f9fa" },
  rows: ["..kk..", ".kssk.", "..ss..", ".bbbb.", "bbbbbb", ".bwwb.", ".b..b.", "kk..kk"],
};
const THEM: PixelArt = {
  palette: { k: "#212529", s: "#f1c27d", b: "#c92a2a", w: "#f8f9fa" },
  rows: ["..kk..", ".kssk.", "..ss..", ".bbbb.", "bbbbbb", ".bwwb.", ".b..b.", "kk..kk"],
};

async function iceClimb(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 6) r.rect(0, y, W, 6, y < 200 ? "#1c3d6b" : y < 400 ? "#2f5d95" : "#74c0fc");
  r.rect(0, 0, 360, H, "#495057");
  r.rect(840, 0, 360, H, "#495057");
  const ice = ["#a5d8ff", "#f1f7ff", "#adb5bd"];
  const go = rng(41);
  for (let i = 0; i < 12; i++) {
    const k = Math.floor(go() * 3);
    r.rect(360, H - (i + 1) * 70, 480, 66, ice[k]);
    r.rect(360, H - (i + 1) * 70 + 60, 480, 6, k === 2 ? "#495057" : "#4dabf7");
  }
  r.sprite(CLIMBER, 600, 470, 16);
  // the power meter
  r.rect(1050, 200, 50, 360, "#212529");
  r.rect(1050, 330, 50, 110, "#40c057");
  r.rect(1040, 370, 70, 12, "#fab005");
  await save("ice-climb", r, titleSvg("빙벽 등반 · Ice Climb", "휘두르고, 박고, 올라가요 — Swing, bite, pull up", 600, 110, "#f8f9fa"));
}

async function bobsleigh(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1c2541");
  // the chute in cross-section with the green band high on the right wall
  const cx = 600;
  const cy = 250;
  const R = 300;
  for (let a = -100; a <= 100; a += 0.5) {
    const t = (a * Math.PI) / 180;
    r.rect(Math.round(cx + R * Math.sin(t)), Math.round(cy + R * Math.cos(t)), 30, 30, "#dbe4ff");
  }
  for (let a = 40; a <= 70; a += 0.5) {
    const t = (a * Math.PI) / 180;
    r.rect(Math.round(cx + (R + 4) * Math.sin(t)), Math.round(cy + (R + 4) * Math.cos(t)), 22, 22, "#40c057");
  }
  const t = (56 * Math.PI) / 180;
  r.sprite(SLED, Math.round(cx + (R - 40) * Math.sin(t)), Math.round(cy + (R - 40) * Math.cos(t)), 14);
  const tf = (84 * Math.PI) / 180;
  r.line(Math.round(cx + (R - 30) * Math.sin(tf)), Math.round(cy + (R - 30) * Math.cos(tf)), Math.round(cx + (R + 50) * Math.sin(tf)), Math.round(cy + (R + 50) * Math.cos(tf)), "#e03131", 8);
  await save("bobsleigh", r, titleSvg("봅슬레이 · Bobsleigh", "벽을 타되, 뒤집히지 말아요 — Ride the wall, don't flip", 600, 110, "#f8f9fa"));
}

async function tugOfWar(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 6) r.rect(0, y, W, 6, y < 220 ? "#1b1f3b" : y < 420 ? "#364fc7" : "#e9ecef");
  for (let y = -60; y <= 60; y += 4) for (let x = -60; x <= 60; x += 4) if (x * x + y * y <= 3600) r.rect(1040 + x, 120 + y, 4, 4, "#fff3bf");
  r.rect(0, 400, W, 12, "#d9a066");
  for (let x = 0; x < W; x += 24) r.rect(x, 402, 8, 8, "#a0522d");
  r.rect(640, 330, 8, 70, "#fab005");
  r.rect(648, 330, 40, 24, "#e03131");
  r.rect(398, 400, 8, 120, "#c92a2a");
  r.rect(798, 400, 8, 120, "#1971c2");
  for (let k = 0; k < 4; k++) {
    r.sprite(THEM, 80 + k * 70, 430, 9);
    r.sprite(US, 1120 - k * 70, 430, 9);
  }
  await save("tug-of-war", r, titleSvg("줄다리기 · Tug of War", "상대가 미끄러질 때 당겨요 — Pull when they slip", 560, 110, "#f8f9fa"));
}

await iceClimb();
await bobsleigh();
await tugOfWar();
