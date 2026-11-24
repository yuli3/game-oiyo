// Bakes key art (1200×630 WebP) for the thirty-third batch of originals (2026-11-25)
// (pip-merge, vacuum-dash, pocket-shot) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25h-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import { DUST_ART, FURNITURE_ART, ROBOT_ART } from "../src/lib/games/vacuum-dash-art";
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
const PIPS: Record<number, Array<[number, number]>> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};
function die(r: Raster, x: number, y: number, s: number, v: number): void {
  r.rect(x, y + 6, s, s, "#495057");
  r.rect(x, y, s, s - 4, ["", "#fff5f5", "#fff9db", "#ebfbee", "#e7f5ff", "#f3f0ff", "#ffe8cc"][v]);
  const p = Math.round(s / 7);
  for (const [cx, cy] of PIPS[v]) r.rect(Math.round(x + s * (0.22 + cx * 0.28) - p / 2), Math.round(y + s * (0.22 + cy * 0.28) - p / 2), p, p, v === 6 ? "#e03131" : "#212529");
}

async function pips(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#2b8a3e");
  const g = rng(33);
  for (let k = 0; k < 160; k++) r.rect(Math.floor(g() * W), Math.floor(g() * H), 3, 3, "#37b24d");
  // a tray with dice about to merge, and a burst of sixes
  r.rect(330, 150, 540, 450, "#8a5a2b");
  r.rect(342, 162, 516, 426, "#5c3a1e");
  const grid = [3, 3, 0, 5, 1, 2, 0, 4, 5, 2, 0, 4, 4, 0, 6, 1, 2, 0, 6, 6];
  for (let i = 0; i < 20; i++) {
    const x = 356 + (i % 5) * 100;
    const y = 174 + Math.floor(i / 5) * 102;
    r.rect(x, y, 92, 94, "#1f6f30");
    if (grid[i]) die(r, x + 8, y + 6, 76, grid[i]);
  }
  for (let k = 0; k < 30; k++) r.rect(Math.round(850 + Math.cos(k) * (40 + (k % 5) * 14)), Math.round(470 + Math.sin(k) * (40 + (k % 5) * 14)), 8, 8, k % 2 ? "#ffd43b" : "#ff6b6b");
  die(r, 120, 260, 120, 3);
  die(r, 980, 240, 110, 5);
  await save("pip-merge", r, titleSvg("주사위 합치기 · Pip Merge", "Three alike go up a pip; three sixes go bang", 600, 70, "#fff3bf"));
}

async function vacuum(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#e9ecef");
  // a wooden floor with furniture, a dusty half and a shiny half
  for (let y = 140; y < 600; y += 60)
    for (let x = 120; x < 1080; x += 60) {
      const k = (x / 60 + y / 60) % 2;
      r.rect(x, y, 60, 60, k ? "#d9a066" : "#cf9557");
      r.rect(x, y + 57, 60, 3, "#b97f45");
    }
  for (let x = 120; x < 1080; x += 60) for (let y = 140; y < 600; y += 60) if (x > 600 && (x + y) % 120 !== 0) r.sprite(DUST_ART, x + 30, y + 30, 5);
  r.sprite(FURNITURE_ART[1], 210, 230, 10);
  r.sprite(FURNITURE_ART[0], 990, 230, 10);
  r.sprite(FURNITURE_ART[2], 210, 510, 10);
  r.sprite(FURNITURE_ART[3], 990, 510, 10);
  // the robot dashing right, a streak behind it
  for (let k = 0; k < 10; k++) r.rect(330 + k * 24, 386, 14, 8, "#ffffff", 0.3 + k * 0.06);
  r.sprite(ROBOT_ART, 600, 390, 14);
  await save("vacuum-dash", r, titleSvg("로봇청소기 대시 · Vacuum Dash", "A vacuum that only stops when it bumps into something", 600, 70, "#1971c2"));
}

async function pool(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#3b2a20");
  r.rect(110, 140, 980, 470, "#8a5a2b");
  r.rect(150, 180, 900, 390, "#1c7c54");
  for (let y = 180; y < 570; y += 12) r.rect(150, y, 900, 3, "#228a5e");
  const disc = (cx: number, cy: number, rad: number, hex: string) => {
    for (let y = -rad; y <= rad; y += 4) for (let x = -rad; x <= rad; x += 4) if (Math.hypot(x, y) <= rad) r.rect(cx + x - 2, cy + y - 2, 4, 4, hex);
  };
  for (const [x, y] of [[150, 180], [600, 172], [1050, 180], [150, 570], [600, 578], [1050, 570]]) disc(x, y, 34, "#111111");
  const colors = ["#fcc419", "#1c7ed6", "#e03131", "#7048e8", "#f76707", "#2f9e44"];
  [[760, 300], [800, 345], [720, 350], [880, 420], [640, 470]].forEach(([x, y], k) => {
    disc(x, y, 26, colors[k]);
    disc(x, y, 11, "#ffffff");
  });
  disc(360, 430, 26, "#f8f9fa");
  // the aiming line and the cue
  for (let k = 0; k < 14; k++) r.rect(Math.round(390 + k * 26), Math.round(420 - k * 7.5), 8, 8, "#ffffff", 0.8);
  r.line(120, 520, 320, 445, "#e9c46a", 10);
  await save("pocket-shot", r, titleSvg("포켓 샷 · Pocket Shot", "Pull, let go, and clear the table", 600, 70, "#ffe8cc"));
}

await pips();
await vacuum();
await pool();
