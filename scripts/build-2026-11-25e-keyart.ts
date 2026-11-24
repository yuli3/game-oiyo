// Bakes key art (1200×630 WebP) for the thirtieth batch of originals (2026-11-25)
// (beaver-chop, prism-hop, paint-flood) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25e-keyart.ts
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
const BEAVER: PixelArt = {
  palette: { b: "#8a5a2b", d: "#5c3a1e", t: "#f8f9fa", k: "#212529", n: "#e8590c", p: "#3b2414" },
  rows: ["..bb.....", ".bbbb....", "bbkbbb...", "bbbbbbn..", ".tbbbb...", "..bbbbb..", ".bbbbbbb.", ".bbbbbbpp", "..d..d.pp"],
};

async function beaver(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#c5f6fa");
  for (let x = 0; x < W; x += 40) r.rect(x, 330 + ((x / 40) % 3) * 16, 40, 300, "#8ce99a");
  r.rect(0, 560, W, 70, "#69db7c");
  // the trunk with branches either side, the beaver at its foot and a log flying off
  const tx = 600;
  const branches = [0, 1, 0, -1, -1, 0, 1, 0];
  for (let k = 0; k < 6; k++) {
    const y = 560 - (k + 1) * 66;
    r.rect(tx - 50, y, 100, 70, k % 2 ? "#9c6b3c" : "#8a5a2b");
    r.rect(tx - 34, y + 14, 6, 42, "#5c3a1e");
    if (branches[k]) {
      const bx = branches[k] < 0 ? tx - 50 - 120 : tx + 50;
      r.rect(bx, y + 28, 120, 16, "#6b4423");
      r.rect(branches[k] < 0 ? bx - 16 : bx + 96, y + 14, 40, 30, "#40c057");
    }
  }
  r.sprite(BEAVER, tx - 140, 520, 9);
  r.rect(800, 440, 100, 40, "#8a5a2b");
  for (let k = 0; k < 10; k++) r.rect(720 + k * 18, 470 - (k % 3) * 20, 10, 10, "#d9a066");
  await save("beaver-chop", r, titleSvg("비버 도끼질 · Beaver Chop", "Gnaw fast, dodge the branches, don't get bonked", 600, 70, "#1b4332"));
}

async function prism(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1b1b2f");
  const hues = ["#f03e3e", "#fcc419", "#22b8cf", "#be4bdb"];
  const g = rng(30);
  for (let k = 0; k < 80; k++) r.rect(Math.floor(g() * W), Math.floor(g() * H), 3, 3, "#3b3b5c");
  // a spinning ring of four colours with the bead passing through, a bar below
  const cx = 600;
  const cy = 330;
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    const seg = Math.floor(((a + 45) % 360) / 90);
    r.rect(Math.round(cx + Math.cos(rad) * 170) - 9, Math.round(cy + Math.sin(rad) * 170) - 9, 18, 18, hues[seg]);
  }
  for (let x = 0; x < W; x += 8) r.rect(x, 560, 8, 22, hues[Math.floor(((x + 60) % 480) / 120)]);
  r.rect(cx - 24, 470, 48, 48, hues[1]);
  r.rect(cx - 30, 476, 60, 36, hues[1]);
  r.rect(cx - 12, 480, 12, 12, "#ffffff");
  for (let s = 0; s < 4; s++) r.rect(cx - 16 + (s % 2) * 16, 150 + Math.floor(s / 2) * 16, 16, 16, hues[s]);
  await save("prism-hop", r, titleSvg("프리즘 점프 · Prism Hop", "Only your colour gets through!", 600, 70, "#f8f9fa"));
}

async function flood(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#f1e3c8");
  const paints = ["#e03131", "#1971c2", "#f59f00", "#2f9e44", "#9c36b5", "#0c8599"];
  const n = 12;
  const cell = 36;
  const ox = 384;
  const oy = 150;
  r.rect(ox - 14, oy - 14, n * cell + 28, n * cell + 28, "#a87545");
  const g = rng(31);
  const cells: number[] = [];
  for (let i = 0; i < n * n; i++) cells.push(g() < 0.3 && i % n ? cells[i - 1] : Math.floor(g() * 6));
  // a patch already spread from the corner
  for (let i = 0; i < n * n; i++) {
    const row = Math.floor(i / n);
    const col = i % n;
    const mine = row + col < 9 - (row % 3);
    r.rect(ox + col * cell, oy + row * cell, cell, cell, mine ? paints[1] : paints[cells[i]]);
  }
  for (let k = 0; k < 6; k++) {
    r.rect(80 + (k % 2) * 110, 170 + Math.floor(k / 2) * 140, 90, 120, "#495057");
    r.rect(90 + (k % 2) * 110, 190 + Math.floor(k / 2) * 140, 70, 90, paints[k]);
  }
  await save("paint-flood", r, titleSvg("물감 번지기 · Paint Flood", "How few strokes to paint it all one colour?", 600, 70, "#212529"));
}

await beaver();
await prism();
await flood();
