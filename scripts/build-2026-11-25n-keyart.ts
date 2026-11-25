// Bakes key art (1200×630 WebP) for the thirty-ninth batch (games 301–303) of originals (2026-11-25)
// (bee-lines, twin-rooms, bead-parade) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25n-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import { BEE_ART, PAIR_COLORS, flowerArt } from "../src/lib/games/bee-lines-art";
import { itemArt } from "../src/lib/games/twin-rooms-art";
import { BEAD_COLORS, BURROW_ART, LAUNCHER_ART } from "../src/lib/games/bead-parade-art";
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

async function bee(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#e6fcf5");
  // a 6 × 4 patch of meadow with three trails drawn and a bee on the last one
  const cell = 70;
  const ox = 390;
  const oy = 160;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) r.rect(ox + x * cell, oy + y * 70, cell, 70, (x + y) % 2 ? "#b2f2bb" : "#c3fae8");
  const trails: number[][] = [[0, 1, 2, 8, 14, 13, 12, 18, 24], [3, 4, 5, 11, 17, 16, 15, 21], [6, 7, 9, 10]];
  const at = (i: number): [number, number] => [ox + (i % 6) * cell + 35, oy + Math.floor(i / 6) * 70 + 35];
  trails.forEach((t, k) => {
    for (let j = 1; j < t.length; j++) {
      const [ax, ay] = at(t[j - 1]);
      const [bx, by] = at(t[j]);
      for (let s = 0; s <= 10; s++) r.rect(Math.round(ax + ((bx - ax) * s) / 10) - 12, Math.round(ay + ((by - ay) * s) / 10) - 12, 24, 24, PAIR_COLORS[k]);
    }
    for (const i of [t[0], t[t.length - 1]]) r.sprite(flowerArt(PAIR_COLORS[k]), ...at(i), 7);
  });
  r.sprite(flowerArt(PAIR_COLORS[3]), ...at(19), 7);
  r.sprite(flowerArt(PAIR_COLORS[3]), ...at(35), 7);
  r.sprite(BEE_ART, at(10)[0] + 10, at(10)[1] - 40, 7);
  await save("bee-lines", r, titleSvg("꿀벌 길잇기 · Bee Lines", "Join each flower to its twin and fill the meadow", 600, 70, "#2b8a3e"));
}

async function twin(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#f8f9fa");
  // two rooms side by side, the right one with three differences circled
  const room = (ox: number, changed: boolean) => {
    r.rect(ox, 140, 520, 300, "#fff4e6");
    r.rect(ox, 330, 520, 110, "#e9c46a");
    r.rect(ox + 20, 270, 480, 10, "#8a5a2b");
    r.sprite(itemArt(3, 0), ox + 90, 190, 6);
    r.sprite(itemArt(4, changed ? 1 : 0), ox + 260, 190, 6);
    r.sprite(itemArt(5, 0), ox + 150, 245, 5);
    if (!changed) r.sprite(itemArt(6, 0), ox + 330, 245, 5);
    r.sprite(itemArt(0, 0), ox + 440, 230, 6);
    r.sprite(itemArt(2, 0, changed), ox + 160, 380, 6);
    r.sprite(itemArt(1, 0), ox + 380, 380, 6);
    if (changed) r.sprite(itemArt(9, 0), ox + 270, 395, 5);
  };
  room(60, false);
  room(620, true);
  for (const [x, y] of [[880, 190], [950, 245], [780, 380]]) {
    for (let a = 0; a < 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      r.rect(Math.round(x + Math.cos(t) * 46) - 3, Math.round(y + Math.sin(t) * 46) - 3, 6, 6, "#e03131");
    }
  }
  await save("twin-rooms", r, titleSvg("쌍둥이 방 · Twin Rooms", "Two rooms that look the same: circle what's different", 600, 80, "#495057"));
}

async function bead(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#d3f9d8");
  for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? 0 : 20; x < W; x += 40) r.rect(x, y, 8, 8, "#b2f2bb");
  // a spiral track with a parade of beads, the launcher in the middle, a bead on its way
  const cx = 600;
  const cy = 370;
  let prev: [number, number] | null = null;
  for (let i = 0; i <= 260; i++) {
    const t = i / 260;
    const a = -2.6 + t * 1.5 * Math.PI * 2;
    const rr = 1 - t * 0.62;
    const p: [number, number] = [cx + Math.cos(a) * 470 * rr, cy + Math.sin(a) * 205 * rr];
    if (prev) disc(r, Math.round(p[0]), Math.round(p[1]), 20, "#e9c46a");
    prev = p;
  }
  for (let i = 0; i < 26; i++) {
    const t = 0.1 + i * 0.026;
    const a = -2.6 + t * 1.5 * Math.PI * 2;
    const rr = 1 - t * 0.62;
    disc(r, Math.round(cx + Math.cos(a) * 470 * rr), Math.round(cy + Math.sin(a) * 205 * rr), 17, BEAD_COLORS[[0, 0, 1, 2, 2, 3, 1, 1, 4, 0, 2, 2, 3, 3, 1, 4, 4, 0, 2, 1, 1, 3, 0, 0, 4, 2][i]]);
  }
  const endA = -2.6 + 1.5 * Math.PI * 2;
  r.sprite(BURROW_ART, Math.round(cx + Math.cos(endA) * 470 * 0.38), Math.round(cy + Math.sin(endA) * 205 * 0.38), 7);
  r.sprite(LAUNCHER_ART, cx, cy, 9);
  disc(r, cx + 120, cy - 70, 16, BEAD_COLORS[2]);
  await save("bead-parade", r, titleSvg("구슬 행렬 · Bead Parade", "Make three of a colour and break the parade", 600, 70, "#2b8a3e"));
}

await bee();
await twin();
await bead();
