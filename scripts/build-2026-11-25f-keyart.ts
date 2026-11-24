// Bakes key art (1200×630 WebP) for the thirty-first batch of originals (2026-11-25)
// (hoop-flick, summit-cards, coin-slide) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25f-keyart.ts
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
const BALL: PixelArt = { palette: { o: "#f76707", d: "#a63f00", h: "#ffa94d" }, rows: ["..oooo..", ".ohoood.", "ohooddoo", "oooddooo", "dddoodod", "ooodoooo", ".oooood.", "..oooo.."] };
const COIN: PixelArt = { palette: { g: "#fcc419", d: "#e67700", h: "#fff3bf" }, rows: ["..gggg..", ".gghhgg.", "gghggdgg", "ggdddggg", "gggddggg", "ggdggdgg", ".ggddgg.", "..gggg.."] };
const POT: PixelArt = { palette: { w: "#f8f9fa", b: "#74c0fc", k: "#495057" }, rows: [".kkk.", "wwwww", "wbbbw", "wwwww", ".www."] };
const SPADE: PixelArt = { palette: { k: "#212529" }, rows: ["..k..", ".kkk.", "kkkkk", "kkkkk", "..k.."] };
const HEART: PixelArt = { palette: { r: "#e03131" }, rows: [".r.r.", "rrrrr", "rrrrr", ".rrr.", "..r.."] };

async function hoop(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#e7f5ff");
  for (let y = 0; y < 430; y += 50) r.rect(0, y, W, 3, "#d0ebff");
  r.rect(0, 430, W, 200, "#e8b77d");
  for (let x = 0; x < W; x += 40) r.rect(x, 430, 3, 200, "#d9a066");
  // backboard, ring and net on the right, a ball arcing in with its dotted path
  r.rect(900, 150, 12, 170, "#f8f9fa");
  r.rect(912, 150, 6, 170, "#adb5bd");
  for (let k = 0; k < 5; k++) r.rect(780 + k * 6, 300 + k * 14, 100 - k * 12, 5, "#f8f9fa");
  r.rect(770, 290, 120, 10, "#e8590c");
  for (let k = 0; k < 16; k++) {
    const t = k / 15;
    const x = 240 + t * 530;
    const y = 500 - Math.sin(t * Math.PI * 0.92) * 330;
    r.rect(Math.round(x) - 4, Math.round(y) - 4, 8, 8, "#868e96");
  }
  r.sprite(BALL, 760, 230, 9);
  r.sprite(BALL, 230, 500, 9);
  await save("hoop-flick", r, titleSvg("골대 플릭 · Hoop Flick", "Touch nothing but net for three", 600, 70, "#1864ab"));
}

async function summit(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#ffe8cc");
  r.rect(0, 0, W, 60, "#ffc078");
  r.rect(0, 380, W, 250, "#b2f2bb");
  // three peaks of cards: the tips lie on top, face up and ready; the rows under them wait face down
  const card = (x: number, y: number, up: boolean, red: boolean, glow: boolean) => {
    r.rect(x - 3, y - 3, 70, 96, glow ? "#f59f00" : "#343a40");
    if (!up) {
      r.rect(x, y, 64, 90, "#1864ab");
      r.rect(x + 10, y + 12, 44, 66, "#4dabf7");
      return;
    }
    r.rect(x, y, 64, 90, "#fff9db");
    r.sprite(red ? HEART : SPADE, x + 32, y + 52, 6);
  };
  const g = rng(31);
  for (let peak = 0; peak < 3; peak++) {
    const cx = 230 + peak * 370;
    for (let row = 3; row >= 0; row--) {
      const n = row + 1;
      for (let k = 0; k < n; k++) card(Math.round(cx - n * 40 + k * 80), 170 + row * 56, row <= 1, g() < 0.5, row === 0);
    }
  }
  card(560, 500, true, true, false);
  await save("summit-cards", r, titleSvg("봉우리 카드 · Summit Cards", "One rank up or down, and keep the run going", 600, 70, "#5c3a1e"));
}

async function slide(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#5c3a1e");
  // the long table seen from the player's end, bands at the far end
  r.rect(330, 150, 540, 480, "#c47d34");
  r.rect(346, 160, 508, 470, "#e0a96d");
  r.rect(346, 160, 508, 60, "#ffd8a8");
  r.rect(346, 220, 508, 70, "#ffe8cc");
  r.rect(346, 290, 508, 80, "#fff4e6");
  r.rect(346, 370, 508, 6, "#862e9c");
  r.rect(346, 152, 508, 8, "#212529");
  r.sprite(POT, 470, 330, 10);
  r.sprite(POT, 720, 420, 10);
  r.sprite(COIN, 560, 190, 10);
  r.sprite(COIN, 660, 250, 10);
  r.sprite(COIN, 600, 560, 12);
  for (let k = 0; k < 10; k++) r.rect(598, 520 - k * 30, 8, 8, "#5c3a1e");
  await save("coin-slide", r, titleSvg("카페 슬라이드 · Coin Slide", "Over the edge is nothing, stop right at it for full marks", 600, 70, "#fff4e6"));
}

await hoop();
await summit();
await slide();
