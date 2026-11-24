// Bakes key art (1200×630 WebP) for the thirty-second batch of originals (2026-11-25)
// (sleepy-windows, juice-swipe, dart-drift) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25g-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import { BEE_ART, FRUIT_ART } from "../src/lib/games/juice-swipe-art";
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
async function windows(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1b1f3b");
  const g = rng(32);
  for (let k = 0; k < 70; k++) r.rect(Math.floor(g() * W), Math.floor(g() * 200), 3, 3, "#3b3f6b");
  // a round pixel moon
  for (let y = -30; y <= 30; y += 6) for (let x = -30; x <= 30; x += 6) if (Math.hypot(x, y) <= 30) r.rect(990 + x, 180 + y, 6, 6, Math.hypot(x - 10, y - 8) < 9 ? "#f1e3a0" : "#fff9db");
  // a block of flats, a few windows still lit
  const lit = [1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  r.rect(380, 150, 440, 30, "#495057");
  r.rect(390, 180, 420, 450, "#868e96");
  for (let i = 0; i < 20; i++) {
    const x = 410 + (i % 5) * 80;
    const y = 200 + Math.floor(i / 5) * 105;
    r.rect(x - 4, y - 4, 68, 86, "#212529");
    r.rect(x, y, 60, 78, lit[i] ? "#ffe066" : "#2b3a67");
    if (lit[i]) {
      r.rect(x + 24, y + 26, 12, 12, "#f59f00");
      r.rect(x + 20, y + 38, 20, 40, "#f59f00");
    }
    r.rect(x + 29, y, 2, 78, "#212529");
  }
  await save("sleepy-windows", r, titleSvg("잠드는 창문 · Sleepy Windows", "Switch one off and the neighbours flip too", 600, 70, "#fff9db"));
}

async function juice(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#fff4e6");
  for (let x = 0; x < W; x += 60) r.rect(x, 0, 60, 40, (x / 60) % 2 ? "#ff8787" : "#ffffff");
  r.rect(0, 560, W, 70, "#ffd8a8");
  // fruit in the air, a blade stroke through two, a bee to dodge, the blender
  const spots: Array<[number, number, number]> = [[300, 300, 0], [470, 230, 1], [640, 260, 2], [820, 330, 3], [980, 250, 5]];
  for (const [x, y, k] of spots) r.sprite(FRUIT_ART[k], x, y, 11);
  for (let k = 0; k < 40; k++) r.rect(260 + k * 11, 340 - k * 3, 8, 8, "#ffffff");
  r.sprite(BEE_ART, 740, 420, 9);
  r.rect(1040, 440, 90, 120, "#adb5bd");
  r.rect(1050, 470, 70, 80, "#ff922b");
  await save("juice-swipe", r, titleSvg("주스 스와이프 · Juice Swipe", "Slice the fruit, spare the bees", 600, 70, "#c92a2a"));
}

async function darts(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#3b2f4a");
  for (let y = 0; y < H; y += 40) r.rect(0, y, W, 3, "#4a3b5c");
  const cx = 600;
  const cy = 380;
  const R = 220;
  r.rect(cx - R - 24, cy - R - 24, (R + 24) * 2, (R + 24) * 2, "#5c3a1e");
  for (let y = -R - 12; y <= R + 12; y += 6)
    for (let x = -R - 12; x <= R + 12; x += 6) {
      const d = Math.hypot(x, y) / R;
      if (d > 1.06) continue;
      const ang = (Math.atan2(x, -y) * 180) / Math.PI;
      const k = Math.floor((((ang + 9) % 360) + 360) % 360 / 18);
      let c = k % 2 ? "#f8f0e3" : "#212529";
      if (d > 1) c = "#212529";
      else if (d < 0.06) c = "#e03131";
      else if (d < 0.13) c = "#2f9e44";
      else if ((d >= 0.56 && d < 0.64) || d >= 0.92) c = k % 2 ? "#2f9e44" : "#e03131";
      r.rect(cx + x - 3, cy + y - 3, 6, 6, c);
    }
  // the swaying ring and two darts in
  for (let a = 0; a < 360; a += 6) {
    const t = (a * Math.PI) / 180;
    r.rect(Math.round(cx + 40 + Math.cos(t) * 22) - 3, Math.round(cy - 90 + Math.sin(t) * 22) - 3, 6, 6, "#ffd43b");
  }
  for (const [x, y] of [[cx - 4, cy - 2], [cx + 6, cy - 130]]) {
    r.rect(x - 2, y - 30, 4, 30, "#adb5bd");
    r.rect(x - 9, y - 44, 18, 16, "#4dabf7");
  }
  await save("dart-drift", r, titleSvg("흔들 다트 · Dart Drift", "A swaying sight, one shot at the bullseye", 600, 70, "#ffd43b"));
}

await windows();
await juice();
await darts();
