// Bakes key art (1200×630 WebP) for the eighteenth batch of winter originals (2026-11-24)
// (mungpungji-seal, charye-table, yeontan-relay) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-24i-keyart.ts
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
const CANDLE: PixelArt = { palette: { f: "#ffd43b", o: "#ff922b", w: "#f8f9fa", b: "#ced4da" }, rows: ["..f..", ".fof.", ".fof.", "..o..", ".www.", ".www.", ".www.", ".bbb."] };
const FISH: PixelArt = { palette: { b: "#adb5bd", d: "#495057", e: "#212529" }, rows: ["..bbb.", "bbbbbe", "bdbbbb", "..bbb."] };
const PERSON: PixelArt = { palette: { h: "#343a40", f: "#ffd8a8", c: "#e8590c", v: "#fab005", l: "#495057" }, rows: [".hhh.", ".fff.", "ccvcc", "ccvcc", ".c.c.", ".l.l."] };
const COAL: PixelArt = { palette: { k: "#212529", g: "#495057" }, rows: ["kkkk", "kgkg", "kkkk", "gkgk"] };

function disc(r: Raster, cx: number, cy: number, rad: number, hex: string): void {
  for (let y = -rad; y <= rad; y += 4) for (let x = -rad; x <= rad; x += 4) if (x * x + y * y <= rad * rad) r.rect(cx + x, cy + y, 4, 4, hex);
}

async function mungpungji(): Promise<void> {
  const r = new Raster();
  const R = rng(181);
  r.rect(0, 0, W, H, "#5c3d2e");
  // the paper door: lattice panes, frost thickest around two drafts, a strip pasted on one
  const x0 = 330;
  const y0 = 180;
  const cw = 90;
  const ch = 72;
  const drafts = [[1, 2], [4, 3]];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 6; col++) {
      r.rect(x0 + col * cw + 6, y0 + row * ch + 6, cw - 12, ch - 12, "#f8f1e0");
      const f = drafts.reduce((s, [dc, dr]) => s + Math.exp(-((col - dc) ** 2 + (row - dr) ** 2) / 1.4), 0);
      if (f > 0.15) r.rect(x0 + col * cw + 6, y0 + row * ch + 6, cw - 12, ch - 12, "#a5d8ff", Math.min(0.85, f * 0.7));
      for (let k = 0; k < Math.floor(f * 8); k++) r.rect(x0 + col * cw + 12 + Math.floor(R() * (cw - 30)), y0 + row * ch + 12 + Math.floor(R() * (ch - 30)), 4, 4, "#ffffff");
    }
  for (let col = 0; col <= 6; col++) r.rect(x0 + col * cw - 5, y0, 10, 6 * ch, "#6b4423");
  for (let row = 0; row <= 6; row++) r.rect(x0, y0 + row * ch - 5, 6 * cw, 10, "#6b4423");
  r.rect(x0 + 1 * cw + 12, y0 + 2 * ch + ch / 2 - 14, cw - 24, 28, "#e9c46a");
  r.sprite(CANDLE, 180, 520, 14);
  await save("mungpungji-seal", r, titleSvg("문풍지 바르기 · Mungpungji Seal", "Read the frost, stop the draft", 600, 110, "#fff4e6"));
}

async function charye(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#e6d3b3");
  for (let x = 0; x < W; x += 120) r.rect(x, 0, 4, 170, "#d4bd94");
  r.rect(220, 190, 760, 420, "#7a2e1f");
  r.rect(236, 204, 728, 392, "#9c3b28");
  const rows: string[][] = [
    ["#f8f9fa", "#e9c46a", "#f8f9fa", "#e9c46a"],
    ["#a0522d", "#a0522d", "fish", "fish"],
    ["#d9a066", "#5c940d", "#5c940d", "#fff3bf"],
    ["#c92a2a", "#8d5524", "#f1f3c4", "#f08c00", "#f783ac"],
  ];
  rows.forEach((row, ri) => {
    row.forEach((hex, ci) => {
      const cx = 300 + (ci + 0.5) * (600 / row.length);
      const cy = 250 + ri * 96;
      disc(r, cx, cy + 10, 40, "#f8f9fa");
      if (hex === "fish") r.sprite(FISH, cx, cy + 4, 12);
      else disc(r, cx, cy + 2, 26, hex);
    });
  });
  await save("charye-table", r, titleSvg("차례상 차리기 · Charye Table", "Red east or jujube first? Every house differs", 600, 100, "#3d2b1f"));
}

async function yeontan(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#cfd8e3");
  for (let k = 0; k < 18; k++) {
    const f = k / 17;
    r.rect(140 + Math.round(f * 820), 560 - Math.round(f * 380), 120, 24, k % 2 ? "#868e96" : "#9aa0a6");
    r.rect(140 + Math.round(f * 820), 560 - Math.round(f * 380), 120, 6, "#f8f9fa");
  }
  for (let i = 0; i < 6; i++) {
    const f = i / 5;
    const x = 200 + f * 800;
    const y = 520 - f * 370;
    r.sprite(PERSON, x, y, 14);
    if (i % 2 === 0) r.sprite(COAL, x, y - 6, 9);
  }
  // a briquette mid-air between two people
  r.sprite(COAL, 520, 280, 9);
  r.rect(20, 520, 220, 90, "#1c7ed6");
  for (let k = 0; k < 10; k++) r.sprite(COAL, 50 + (k % 5) * 34, 540 + Math.floor(k / 5) * 32, 6);
  await save("yeontan-relay", r, titleSvg("연탄 나르기 · Yeontan Relay", "Hand to hand, pass on green", 600, 100, "#212529"));
}

await mungpungji();
await charye();
await yeontan();
