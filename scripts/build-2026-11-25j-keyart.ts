// Bakes key art (1200×630 WebP) for the thirty-fifth batch of originals (2026-11-25)
// (garden-pipes, gumball-volley, boing-up) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25j-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import { BEAN_ART, BERRY_ART, LEAF_ART, SHROOM_ART, WILT_ART } from "../src/lib/games/boing-up-art";
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

async function pipes(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#d3f9d8");
  const g = rng(35);
  for (let k = 0; k < 120; k++) r.rect(Math.floor(g() * W), Math.floor(g() * H), 6, 6, "#b2f2bb");
  // a 5 × 4 garden, the water running from the tap through part of it
  const cell = 88;
  const x0 = 370;
  const y0 = 215;
  r.rect(x0 - 10, y0 - 10, cell * 5 + 20, cell * 4 + 20, "#8a5a2b");
  // openings: up 1, right 2, down 4, left 8, and whether the water reaches it
  const tiles = [[6, 1], [10, 1], [12, 1], [6, 0], [8, 0], [5, 1], [1, 0], [5, 1], [3, 0], [4, 0], [5, 1], [6, 1], [9, 1], [10, 0], [13, 0], [3, 1], [9, 1], [1, 0], [3, 0], [9, 0]];
  tiles.forEach(([m, wet], i) => {
    const x = x0 + (i % 5) * cell;
    const y = y0 + Math.floor(i / 5) * cell;
    r.rect(x, y, cell, cell, (i % 5) % 2 === Math.floor(i / 5) % 2 ? "#a9e34b" : "#94d82d");
    const c = wet ? "#339af0" : "#adb5bd";
    const pw = 20;
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    r.rect(cx - pw / 2, cy - pw / 2, pw, pw, c);
    if (m & 1) r.rect(cx - pw / 2, y, pw, cell / 2, c);
    if (m & 2) r.rect(cx, cy - pw / 2, cell / 2, pw, c);
    if (m & 4) r.rect(cx - pw / 2, cy, pw, cell / 2, c);
    if (m & 8) r.rect(x, cy - pw / 2, cell / 2, pw, c);
    const ends = [1, 2, 4, 8].filter((b) => m & b).length;
    if (ends === 1 && i !== 0) {
      r.rect(cx - 22, cy - 22, 44, 44, wet ? "#ff8fab" : "#69db7c");
      r.rect(cx - 10, cy - 10, 20, 20, wet ? "#ffd43b" : "#2f9e44");
    }
  });
  r.rect(x0 + cell / 2 - 10, y0 - 60, 20, 50, "#868e96");
  r.rect(x0 + cell / 2 - 30, y0 - 70, 60, 16, "#868e96");
  r.rect(x0 + cell / 2 - 10, y0 - 84, 20, 14, "#e03131");
  await save("garden-pipes", r, titleSvg("정원 물길 · Garden Pipes", "Turn the pipes, and every flower blooms", 600, 70, "#2b8a3e"));
}

async function gumballs(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#fff4e6");
  r.rect(0, 560, W, 70, "#d9480f");
  r.rect(0, 552, W, 8, "#e8590c");
  const C = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa", "#f783ac"];
  const blocks: Array<[number, number, number]> = [[0, 0, 7], [1, 0, 3], [3, 0, 9], [5, 0, 4], [6, 0, 6], [0, 1, 2], [2, 1, 5], [4, 1, 8], [6, 1, 3], [1, 2, 4], [3, 2, 2], [5, 2, 6]];
  const cell = 96;
  const x0 = 264;
  for (const [cx, cy, v] of blocks) {
    const x = x0 + cx * cell;
    const y = 150 + cy * cell;
    r.rect(x + 4, y + 4, cell - 8, cell - 8, C[(cx * 3 + v) % 7]);
    r.rect(x + 12, y + 12, cell - 46, 10, "#ffffff", 0.4);
  }
  // a stream of gumballs on its way up through a gap
  const pts: Array<[number, number]> = [[620, 540], [640, 500], [660, 460], [680, 420], [700, 380], [720, 340], [742, 300]];
  for (const [x, y] of pts) disc(r, x, y, 12, "#f06595");
  disc(r, 610, 552, 14, "#f06595");
  await save("gumball-volley", r, titleSvg("껌볼 발리 · Gumball Volley", "One aim, and a whole volley bounces through", 600, 70, "#c2255c"));
}

async function boing(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#d0ebff");
  for (const [x, y] of [[120, 160], [880, 220], [300, 480], [1000, 520]]) {
    r.rect(x, y, 160, 30, "#ffffff");
    r.rect(x + 30, y - 20, 90, 24, "#ffffff");
  }
  r.rect(592, 0, 16, H, "#2f9e44");
  r.sprite(LEAF_ART, 520, 560, 8);
  r.sprite(WILT_ART, 760, 440, 8);
  r.sprite(LEAF_ART, 470, 330, 8);
  r.sprite(SHROOM_ART, 720, 230, 7);
  r.sprite(BERRY_ART, 610, 420, 7);
  r.sprite(BERRY_ART, 560, 200, 7);
  for (let k = 0; k < 6; k++) r.rect(500 + k * 14, 520 - k * 30, 10, 10, "#51cf66", 0.25 + k * 0.1);
  r.sprite(BEAN_ART, 600, 300, 14);
  await save("boing-up", r, titleSvg("뽀잉 점프 · Boing Up", "It bounces itself; you only steer", 600, 70, "#1971c2"));
}

await pipes();
await gumballs();
await boing();
