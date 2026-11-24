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
const STRAW: PixelArt = { palette: { y: "#fcc419", o: "#e67700", k: "#8c693c" }, rows: ["yoy", "yyy", "kkk", "yyy", "yoy"] };
const NEEDLE: PixelArt = { palette: { s: "#adb5bd", d: "#495057", k: "#e9c46a" }, rows: ["k", "s", "s", "s", "s", "s", "d"] };
const BALL: PixelArt = { palette: { r: "#c92a2a", d: "#8b1a1a" }, rows: [".rr.", "rdrr", "rrdr", ".rr."] };
const SEAL: PixelArt = { palette: { r: "#c92a2a", w: "#fff5f5" }, rows: ["rrrrr", "rwrwr", "rrrrr", "rwrwr", "rrrrr"] };

function disc(r: Raster, cx: number, cy: number, rad: number, hex: string, alpha = 1): void {
  for (let y = -rad; y <= rad; y += 4) for (let x = -rad; x <= rad; x += 4) if (x * x + y * y <= rad * rad) r.rect(cx + x, cy + y, 4, 4, hex, alpha);
}

async function daljip(): Promise<void> {
  const r = new Raster();
  const R = rng(191);
  r.rect(0, 0, W, H, "#0c1633");
  for (let i = 0; i < 80; i++) r.rect(Math.floor(R() * W), Math.floor(R() * 300), 4, 4, "#ffffff", 0.6);
  disc(r, 960, 150, 70, "#fff3bf");
  for (let x = 0; x < W; x += 4) {
    const top = 380 + Math.round(40 * Math.sin(x / 160));
    r.rect(x, top, 4, H - top, "#1b2a4a");
  }
  // the cone, pine below and flames climbing it, straw bundles glowing
  for (let row = 0; row < 12; row++) {
    const half = (row / 11) * 4;
    for (let col = 0; col < 9; col++) {
      if (Math.abs(col - 4) > half + 0.01) continue;
      const x = 420 + col * 40;
      const y = 140 + row * 38;
      const lit = row > 4 || (col === 4 && row > 1);
      r.rect(x, y, 38, 36, lit ? "#ff922b" : "#2b5a3a");
      if (lit) r.rect(x + 6, y + 4, 26, 14, "#ffd43b", 0.8);
      if ((row === 3 && col === 4) || (row === 6 && col === 3) || (row === 8 && col === 5)) r.sprite(STRAW, x + 19, y + 18, 7);
    }
  }
  for (let k = 0; k < 40; k++) r.rect(500 + Math.floor(R() * 200), 80 + Math.floor(R() * 200), 6, 6, k % 2 ? "#ffd43b" : "#fa5252");
  await save("daljip-fire", r, titleSvg("달집태우기 · Daljip Fire", "Burn to the top as the moon rises", 600, 96, "#fff3bf"));
}

async function scarf(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#5c3d2e");
  // a long scarf with a red-and-cream motif, the needle and a ball of yarn
  const rows = [
    [0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
    [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0],
    [1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
    [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1],
  ];
  for (let band = 0; band < 3; band++)
    rows.forEach((row, ri) =>
      row.forEach((v, ci) => r.rect(160 + ci * 40, 190 + (band * 4 + ri) * 30, 38, 28, v ? "#c92a2a" : "#f8f1e0")),
    );
  r.sprite(NEEDLE, 1080, 360, 26);
  r.sprite(BALL, 90, 470, 30);
  await save("scarf-knit", r, titleSvg("목도리 뜨기 · Scarf Knit", "Change yarn where the chart changes", 600, 110, "#fff4e6"));
}

async function ipchun(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#7a2e1f");
  r.rect(300, 170, 600, 420, "#fbf6ea");
  // a few thick-to-thin brush strokes of 永 laid down in ink
  const stroke = (pts: [number, number][], widths: number[]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
      for (let k = 0; k <= steps; k++) {
        const f = k / steps;
        const w = widths[i] + (widths[i + 1] - widths[i]) * f;
        disc(r, Math.round(x0 + (x1 - x0) * f), Math.round(y0 + (y1 - y0) * f), Math.round(w), "#212529");
      }
    }
  };
  stroke([[560, 200], [585, 225], [600, 250]], [6, 12, 16]);
  stroke([[480, 300], [600, 296], [720, 290]], [16, 8, 14]);
  stroke([[600, 290], [600, 470], [600, 540], [565, 515]], [14, 10, 12, 4]);
  stroke([[580, 380], [500, 470], [420, 540]], [14, 9, 4]);
  stroke([[620, 360], [700, 450], [800, 540], [850, 555]], [5, 10, 18, 5]);
  r.sprite(SEAL, 860, 230, 12);
  await save("ipchun-brush", r, titleSvg("입춘 붓글씨 · Ipchun Brush", "Slow for thick, quick for thin", 600, 100, "#fff4e6"));
}

await daljip();
await scarf();
await ipchun();
