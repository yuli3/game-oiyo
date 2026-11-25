// Bakes key art (1200×630 WebP) for the thirty-seventh batch of originals (2026-11-25)
// (bakery-shelf, chalk-roll, boba-pins) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25l-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import { BREAD_ART } from "../src/lib/games/bakery-shelf-art";
import { MARBLE_ART, PAIL_ART, TACK_ART } from "../src/lib/games/chalk-roll-art";
import { CHILI_ART, KNOB_ART, PEARL_BROWN_ART, PEARL_WHITE_ART } from "../src/lib/games/boba-pins-art";
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
const disc = (r: Raster, cx: number, cy: number, rad: number, hex: string) => {
  for (let y = -rad; y <= rad; y += 4) for (let x = -rad; x <= rad; x += 4) if (Math.hypot(x, y) <= rad) r.rect(cx + x - 2, cy + y - 2, 4, 4, hex);
};

async function bakery(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#fff4e6");
  for (let x = 0; x < W; x += 60) r.rect(x, 0, 28, H, "#ffe8cc");
  // three shelves: a sold-out sparkle on the middle one, breads waiting faded behind
  const shelves: Array<[number, number, number[]]> = [[150, 330, [0, 2, 5]], [470, 330, [3, 3, 3]], [790, 330, [1, 6, 7]]];
  shelves.forEach(([x, y, row], s) => {
    r.rect(x, y, 260, 18, s === 1 ? "#ffd43b" : "#a0652d");
    r.rect(x, y + 18, 260, 8, "#6f4219");
    row.forEach((v, i) => r.sprite(BREAD_ART[v], x + 45 + i * 85, y - 42, 7));
    [4, 1, 2].forEach((v, i) => r.sprite(BREAD_ART[(v + s) % 8], x + 45 + i * 85, y - 130, 4));
  });
  for (let k = 0; k < 8; k++) r.sprite(BREAD_ART[k], 110 + k * 140, 520, 6);
  await save("bakery-shelf", r, titleSvg("빵집 진열대 · Bakery Shelf", "Three of the same bread on a shelf, and they sell", 600, 70, "#d9480f"));
}

async function chalk(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#24443a");
  for (let y = 0; y < H; y += 12) r.rect(0, y, W, 2, "#2c5145");
  r.rect(0, 0, W, 16, "#8a5a2b");
  r.rect(0, 0, 16, H, "#8a5a2b");
  r.rect(W - 16, 0, 16, H, "#8a5a2b");
  r.rect(0, H - 24, W, 24, "#8a5a2b");
  // a chalk slope from the marble down to the pail, a dotted path of the roll, two thumbtacks
  r.line(300, 230, 760, 420, "#f8f9fa", 8);
  for (let k = 0; k < 10; k++) {
    const t = k / 9;
    r.rect(Math.round(760 + 90 * t), Math.round(400 + 60 * t * t), 6, 6, "#ffd43b", 0.6);
  }
  r.sprite(MARBLE_ART, 330, 196, 8);
  r.sprite(PAIL_ART, 880, 520, 9);
  r.sprite(TACK_ART, 420, 470, 6);
  r.sprite(TACK_ART, 600, 230, 6);
  await save("chalk-roll", r, titleSvg("분필 굴림길 · Chalk Roll", "Draw one line, and the marble rolls into the pail", 600, 90, "#f8f9fa"));
}

async function boba(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#fff0f6");
  // the machine walls, a pulled pin, pearls falling into the milk-tea cup
  r.rect(360, 140, 24, 300, "#7048e8");
  r.rect(816, 140, 24, 300, "#7048e8");
  r.rect(588, 140, 24, 160, "#7048e8");
  r.rect(384, 300, 204, 18, "#fab005");
  r.sprite(KNOB_ART, 600, 309, 6);
  for (let k = 0; k < 6; k++) for (let j = 0; j < 3; j++) r.sprite(PEARL_WHITE_ART, 420 + k * 30, 270 - j * 30, 6);
  for (let k = 0; k < 6; k++) for (let j = 0; j < 2; j++) r.sprite(j === 0 && k % 2 ? CHILI_ART : PEARL_BROWN_ART, 640 + k * 30, 290 - j * 30, 6);
  r.rect(400, 420, 400, 190, "#f3e1c7");
  r.rect(400, 416, 400, 6, "#adb5bd");
  for (let k = 0; k < 12; k++) for (let j = 0; j < 3; j++) r.sprite(PEARL_BROWN_ART, 430 + k * 30, 590 - j * 30, 6);
  for (let k = 0; k < 4; k++) r.sprite(PEARL_BROWN_ART, 650 + (k % 2) * 40, 360 + k * 16, 6);
  await save("boba-pins", r, titleSvg("버블티 핀 뽑기 · Boba Pins", "Pull the pins in the right order for the perfect bubble tea", 600, 70, "#862e9c"));
}

await bakery();
await chalk();
await boba();
