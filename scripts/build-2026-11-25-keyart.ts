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
const FOX: PixelArt = { palette: { o: "#f76707", w: "#f8f9fa", k: "#212529" }, rows: ["o.....o.", "oo...oo.", "ooooooo.", "okoooko.", "owwkwwo.", ".wwwww..", "..ooooo.", "..o...o."] };
const BEAR: PixelArt = { palette: { b: "#7a4a2a", l: "#c8a27a", k: "#212529" }, rows: [".b....b.", "bbbbbbbb", "bkbbbbkb", "bbbllbbb", "bbbkkbbb", ".bbbbbb.", "bbbbbbbb", "bb....bb"] };
const RABBIT: PixelArt = { palette: { w: "#f8f9fa", p: "#faa2c1", k: "#212529" }, rows: [".w..w...", ".wp.wp..", ".w..w...", ".wwww...", "wkwwkw..", "wwwwww..", ".wwwwww.", "..w..w.."] };
const OWL: PixelArt = { palette: { b: "#8b5a2b", w: "#f1e3d3", y: "#fab005", k: "#212529" }, rows: ["b......b", "bbbbbbbb", "bwwbbwwb", "bykbbkyb", "bbbyybbb", "bwwwwwwb", ".bwwwwb.", "..y..y.."] };

async function hole(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#8ce99a");
  for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? 0 : 40; x < W; x += 80) r.rect(x, y, 40, 40, "#7bd88a");
  r.rect(0, 420, W, 36, "#e9d8a6");
  // the hole, with a car and a tree tipping in, smaller things around
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    r.rect(Math.round(640 + Math.cos(a) * 150 - 10), Math.round(470 + Math.sin(a) * 110 - 10), 20, 20, "#5c3d2e");
  }
  for (let y = -100; y <= 100; y += 10) {
    const w = Math.round(Math.sqrt(1 - (y / 105) ** 2) * 145);
    r.rect(640 - w, 470 + y, w * 2, 10, "#1a1a1a");
  }
  r.rect(560, 380, 120, 50, "#e03131");
  r.rect(580, 390, 40, 22, "#d0ebff");
  r.rect(760, 300, 80, 90, "#2f9e44");
  r.rect(790, 390, 20, 50, "#8b5a2b");
  const R = rng(271);
  for (let k = 0; k < 24; k++) {
    const x = 120 + Math.floor(R() * 1040);
    const y = 220 + Math.floor(R() * 440);
    if (Math.hypot(x - 640, (y - 470) * 1.3) < 220) continue;
    r.rect(x, y, 14, 14, ["#f783ac", "#fd7e14", "#868e96", "#40c057"][k % 4]);
  }
  await save("gulp-hole", r, titleSvg("꿀꺽 구멍 · Gulp Hole", "A tiny hole that swallows the whole park", 640, 80, "#1b4332"));
}

async function cake(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#fff8ec");
  // the grid on the left, the half-eaten cake on the right, a suspect lineup
  const s = 44, x0 = 160, y0 = 200;
  for (let a = 0; a < 6; a++)
    for (let b = 0; b < 6; b++) {
      if (a >= 3 && b < 3) continue;
      r.rect(x0 + b * s, y0 + a * s, s - 4, s - 4, a < 3 ? (b < 3 ? "#ffe8cc" : "#e7f5ff") : "#ebfbee");
    }
  for (const [a, b] of [[0, 1], [1, 4], [2, 0], [4, 3]]) r.rect(x0 + b * s + 10, y0 + a * s + 10, 20, 20, "#e8590c");
  r.rect(820, 300, 260, 120, "#f8f9fa");
  r.rect(820, 270, 260, 36, "#f783ac");
  r.rect(990, 270, 90, 90, "#fff8ec");
  r.rect(930, 220, 24, 48, "#e03131");
  [FOX, RABBIT, BEAR].forEach((sp, i) => r.sprite(sp, 760 + i * 150, 560, 12));
  await save("cake-thief", r, titleSvg("케이크 도둑 · Cake Thief", "The thief is one of them", 640, 80, "#5c3d2e"));
}

async function blankets(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#94d82d");
  const cols = ["#e64980", "#fab005", "#4c6ef5"];
  cols.forEach((c, l) => {
    const x = 220 + l * 290;
    r.rect(x, 170, 260, 500, "#ffffff");
    for (let y = 170; y < 670; y += 26) for (let cx = x + (((y - 170) / 26) % 2) * 26; cx < x + 260; cx += 52) r.rect(cx, y, 26, 26, c, 0.55);
  });
  r.sprite(FOX, 350, 300, 10, true);
  r.sprite(OWL, 640, 300, 10, true);
  r.sprite(BEAR, 350, 540, 10);
  r.sprite(RABBIT, 930, 540, 10);
  r.sprite(OWL, 640, 540, 10);
  await save("blanket-battle", r, titleSvg("돗자리 쟁탈전 · Blanket Battle", "Hold two of the three and the picnic is yours", 640, 80, "#1b4332"));
}

await hole();
await cake();
await blankets();
