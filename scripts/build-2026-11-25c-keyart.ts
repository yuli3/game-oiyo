// Bakes key art (1200×630 WebP) for the twenty-eighth batch of originals (2026-11-25)
// (formula-lock, veggie-lanes, bounce-down) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25c-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import { score } from "../src/lib/games/formula-lock";
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

async function formula(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#343a40");
  r.rect(220, 150, 800, 460, "#495057");
  r.rect(230, 160, 780, 10, "#adb5bd");
  // a safe's rows of coloured squares, the last one opening
  const rows = ["12+35=47", "16+24=40", "15+34=49"];
  const marks = rows.map((row) => score(row, rows[2]));
  const col = ["#868e96", "#f59f00", "#2b8a3e"];
  rows.forEach((_, y) => marks[y].forEach((m, k) => r.rect(280 + k * 86, 220 + y * 120, 76, 76, col[m])));
  // the dial
  r.rect(1080, 320, 120, 120, "#212529");
  r.rect(1096, 336, 88, 88, "#ced4da");
  r.rect(1134, 336, 12, 44, "#212529");
  const g = rng(7);
  for (let k = 0; k < 30; k++) r.rect(Math.round(80 + g() * 140), Math.round(200 + g() * 400), 10, 10, "#ffd43b");
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
      rows.map((row, y) => [...row].map((ch, k) => `<text x="${280 + k * 86 + 38}" y="${220 + y * 120 + 54}" text-anchor="middle" font-family="monospace" font-size="44" font-weight="800" fill="#f8f9fa">${ch === "-" ? "−" : ch}</text>`).join("")).join("") +
      `</svg>`,
  );
  const title = titleSvg("수식 자물쇠 · Formula Lock", "Crack the safe's equation in six tries", 600, 70, "#f8f9fa");
  await sharp(Buffer.from(r.data.buffer), { raw: { width: W, height: H, channels: 4 } })
    .composite([{ input: svg }, { input: title }])
    .webp({ quality: 90 })
    .toFile(join(root, "public/games/formula-lock-keyart.webp"));
  console.log("formula-lock");
}

async function veggies(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#a5d8ff");
  const cw = 125;
  const ch = 92;
  for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) r.rect(60 + x * cw, 140 + y * ch, cw, ch, (x + y) % 2 ? "#69db7c" : "#8ce99a");
  r.rect(0, 140, 60, 460, "#862e9c");
  // dewflowers, radishes and a pumpkin wall against the snails
  for (let y = 0; y < 5; y++) {
    const cx = 60 + 30;
    const cy = 140 + y * ch + 30;
    for (const [dx, dy] of [[-18, 0], [18, 0], [0, -18], [0, 18]]) r.rect(cx + 20 + dx, cy + dy, 26, 26, "#e7f5ff");
    r.rect(cx + 20, cy, 26, 26, "#74c0fc");
    r.rect(60 + cw + 40, 140 + y * ch + 40, 50, 46, "#f8f9fa");
    r.rect(60 + cw + 40, 140 + y * ch + 24, 50, 20, "#e64980");
    if (y % 2 === 0) {
      r.rect(60 + 3 * cw + 20, 140 + y * ch + 14, 90, 70, "#fd7e14");
      r.rect(60 + 3 * cw + 44, 140 + y * ch + 14, 8, 70, "#e8590c");
    }
    for (let k = 0; k < 3; k++) r.rect(60 + cw + 120 + k * 120, 140 + y * ch + 52, 16, 16, "#f8f9fa");
    // a snail
    const sx = 60 + 6 * cw + (y * 37) % 200;
    r.rect(sx, 140 + y * ch + 70, 80, 18, "#a9805b");
    r.rect(sx + 20, 140 + y * ch + 30, 50, 42, "#e8590c");
    r.rect(sx + 34, 140 + y * ch + 44, 20, 14, "#ffa94d");
  }
  await save("veggie-lanes", r, titleSvg("텃밭 방어선 · Veggie Lanes", "Hold the garden against the snail parade", 600, 70, "#1b4332"));
}

async function bounce(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#2b2140");
  r.rect(570, 140, 60, H, "#f8f0fc");
  const candy = ["#f783ac", "#74c0fc", "#ffd43b", "#8ce99a", "#b197fc"];
  // floors seen from the front, each with a gap; one with a sour slice
  for (let f = 0; f < 4; f++) {
    const y = 220 + f * 120;
    for (let s = 4; s <= 8; s++) {
      const x0 = 600 + 320 * Math.sin(((s - 0.5) / 12) * Math.PI * 2);
      const x1 = 600 + 320 * Math.sin(((s + 0.5) / 12) * Math.PI * 2);
      r.rect(Math.round(Math.min(x0, x1)), y - 12, Math.max(4, Math.round(Math.abs(x1 - x0))), 20, "#495057");
    }
    for (let s = -3; s <= 3; s++) {
      if (s === (f % 2 ? 2 : -2) || s === (f % 2 ? 3 : -3)) continue;
      const x0 = 600 + 320 * Math.sin(((s - 0.5) / 12) * Math.PI * 2);
      const x1 = 600 + 320 * Math.sin(((s + 0.5) / 12) * Math.PI * 2);
      const sour = f === 1 && s === -1;
      r.rect(Math.round(Math.min(x0, x1)), y, Math.max(4, Math.round(Math.abs(x1 - x0))), 34, sour ? "#fa5252" : candy[f]);
      r.rect(Math.round(Math.min(x0, x1)), y, Math.max(4, Math.round(Math.abs(x1 - x0))), 8, "#ffffff");
    }
  }
  // the jelly ball mid-bounce
  r.rect(566, 140, 68, 60, "#e599f7");
  r.rect(576, 132, 48, 76, "#e599f7");
  r.rect(582, 150, 16, 16, "#ffffff");
  await save("bounce-down", r, titleSvg("통통 내려가기 · Bounce Down", "Spin the tower, drop through the gap", 600, 70, "#f8f9fa"));
}

await formula();
await veggies();
await bounce();
