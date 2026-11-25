// Bakes key art (1200×630 WebP) for the thirty-fourth batch of originals (2026-11-25)
// (jelly-gates, upside-dash, pin-roll) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25i-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import { BATTERY_ART, BOT_ART } from "../src/lib/games/upside-dash-art";
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

async function jelly(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#fff0f6");
  const g = rng(34);
  for (let k = 0; k < 120; k++) r.rect(Math.floor(g() * W), Math.floor(g() * H), 6, 6, "#ffdeeb");
  // a tray with gates in its rim and jellies, one popping out of its gate
  r.rect(380, 150, 440, 450, "#adb5bd");
  r.rect(400, 170, 400, 410, "#f8f9fa");
  const C = ["#ff6b81", "#4dabf7", "#ffd43b", "#69db7c"];
  const D = ["#c2255c", "#1971c2", "#f08c00", "#2f9e44"];
  r.rect(480, 150, 160, 20, C[0]);
  r.rect(800, 330, 20, 160, C[1]);
  r.rect(560, 580, 160, 20, C[2]);
  r.rect(380, 250, 20, 160, C[3]);
  const blob = (x: number, y: number, w: number, h: number, c: number) => {
    r.rect(x, y + 8, w, h, D[c]);
    r.rect(x, y, w, h - 4, C[c]);
    r.rect(x + 10, y + 10, Math.max(10, w / 4), 10, "#ffffff", 0.6);
    r.rect(x + w / 2 - 18, y + h / 2 - 8, 10, 10, "#343a40");
    r.rect(x + w / 2 + 8, y + h / 2 - 8, 10, 10, "#343a40");
  };
  blob(410, 190, 150, 70, 3);
  blob(580, 270, 70, 150, 1);
  blob(660, 450, 130, 120, 2);
  blob(420, 430, 70, 70, 1);
  blob(840, 360, 90, 90, 1); // popping out of the blue gate
  await save("jelly-gates", r, titleSvg("젤리 탈출 · Jelly Gates", "Out through its own colour's gate", 600, 70, "#c2255c"));
}

async function upside(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1c2541");
  for (let x = 0; x < W; x += 90) r.rect(x, 150, 36, 380, "#243156");
  r.rect(0, 530, W, 100, "#495057");
  r.rect(0, 110, W, 40, "#495057");
  // spikes on the floor and the ceiling, a saw in the middle
  const teeth = (x0: number, n: number, floor: boolean) => {
    for (let s = 0; s < n; s++) for (let k = 0; k < 4; k++) {
      const w = 24 - k * 6;
      const x = x0 + s * 24 + k * 3;
      if (floor) r.rect(x, 526 - k * 8, w, 8, "#ff6b6b");
      else r.rect(x, 150 + k * 8, w, 8, "#ff6b6b");
    }
  };
  teeth(500, 6, true);
  teeth(820, 5, false);
  teeth(150, 4, false);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    r.rect(Math.round(700 + Math.cos(a) * 40) - 7, Math.round(340 + Math.sin(a) * 40) - 7, 14, 14, "#ced4da");
  }
  r.rect(676, 316, 48, 48, "#868e96");
  // the robot mid-flip, with a trail, and batteries on the way
  for (let k = 0; k < 6; k++) r.rect(260 + k * 18, 470 - k * 34, 10, 10, "#4dabf7", 0.25 + k * 0.1);
  r.sprite(BOT_ART, 420, 280, 12);
  r.sprite(BATTERY_ART, 560, 200, 8);
  r.sprite(BATTERY_ART, 980, 480, 8);
  await save("upside-dash", r, titleSvg("거꾸로 대시 · Upside Dash", "One tap and you're on the ceiling", 600, 70, "#a5d8ff"));
}

async function pins(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#2b2d42");
  // the lane seen from the bowler's end, pins at the far end, a post, the ball rolling in
  r.rect(380, 120, 440, 520, "#495057");
  r.rect(420, 120, 360, 520, "#e9b872");
  for (let x = 420; x < 780; x += 30) r.rect(x, 120, 4, 520, "#d4a05c");
  for (let k = 0; k < 5; k++) r.rect(450 + k * 70, 470, 14, 22, "#c92a2a");
  const cx = 600;
  for (let row = 0; row < 4; row++) for (let k = 0; k <= row; k++) {
    const x = cx + (k - row / 2) * 56;
    const y = 300 - row * 46;
    disc(r, x + 4, y + 6, 18, "#00000055");
    disc(r, x, y, 18, "#f8f9fa");
    r.rect(x - 14, y - 3, 28, 6, "#e03131");
  }
  disc(r, 700, 400, 20, "#ff922b");
  disc(r, 700, 400, 10, "#ffc078");
  for (let k = 0; k < 8; k++) r.rect(560 - k * 4, 560 - k * 24, 10, 10, "#ffffff", 0.3 + k * 0.08);
  disc(r, 540, 500, 32, "#3b5bdb");
  disc(r, 530, 488, 8, "#91a7ff");
  await save("pin-roll", r, titleSvg("핀 롤 · Pin Roll", "Flick for a strike, round the rubber posts", 600, 70, "#ffd43b"));
}

await jelly();
await upside();
await pins();
