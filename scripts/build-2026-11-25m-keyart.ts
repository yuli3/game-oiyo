// Bakes key art (1200×630 WebP) for the thirty-eighth batch (games 298–300) of originals (2026-11-25)
// (sunny-pots, lily-loop, vine-leap) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-25m-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import { BLOOM_ART, GARDENER_ART, POT_ART } from "../src/lib/games/sunny-pots-art";
import { PAD_ART, frogArt } from "../src/lib/games/lily-loop-art";
import { BANANA_ART, KNOT_ART, MONKEY_ART } from "../src/lib/games/vine-leap-art";
import { PICTURES } from "../src/lib/games/lily-loop";
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

async function pots(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#ebfbee");
  // a sunroom floor with patches of sun, two pots in bloom and one on its way, the gardener pushing it
  const cell = 70;
  const x0 = 250;
  const y0 = 150;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 10; x++) r.rect(x0 + x * cell, y0 + y * cell, cell, cell, (x + y) % 2 ? "#ecd0a4" : "#f3d9b1");
  r.rect(x0 - 20, y0 - 20, 10 * cell + 40, 20, "#8ce99a");
  r.rect(x0 - 20, y0 + 6 * cell, 10 * cell + 40, 20, "#8ce99a");
  for (const [x, y] of [[2, 1], [7, 2], [5, 4]]) r.rect(x0 + x * cell + 5, y0 + y * cell + 5, cell - 10, cell - 10, "#ffe066");
  r.sprite(BLOOM_ART, x0 + 2 * cell + 35, y0 + cell + 35, 6);
  r.sprite(BLOOM_ART, x0 + 7 * cell + 35, y0 + 2 * cell + 35, 6);
  r.sprite(POT_ART, x0 + 4 * cell + 35, y0 + 4 * cell + 35, 6);
  r.sprite(GARDENER_ART, x0 + 3 * cell + 35, y0 + 4 * cell + 35, 6);
  for (let k = 0; k < 3; k++) r.rect(x0 + 4 * cell + 80 + k * 18, y0 + 4 * cell + 32, 10, 6, "#e8590c", 0.6);
  await save("sunny-pots", r, titleSvg("햇살 화분 · Sunny Pots", "Push the pots into the sun, and undo any step", 600, 70, "#2b8a3e"));
}

async function lily(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#c5f6fa");
  for (let y = 10; y < H; y += 30) r.rect((y * 13) % 80, y, 50, 3, "#99e9f2");
  // a berry cat mosaic, half eaten, frogs riding the loop around it
  const pic = PICTURES[7];
  const cell = 30;
  const cols = Math.max(...pic.rows.map((s) => s.length));
  const ox = 600 - (cols * cell) / 2;
  const oy = 180;
  r.rect(ox - 50, oy - 50, cols * cell + 100, 26, "#8ce99a");
  r.rect(ox - 50, oy + pic.rows.length * cell + 24, cols * cell + 100, 26, "#8ce99a");
  r.rect(ox - 50, oy - 50, 26, pic.rows.length * cell + 100, "#8ce99a");
  r.rect(ox + cols * cell + 24, oy - 50, 26, pic.rows.length * cell + 100, "#8ce99a");
  pic.rows.forEach((row, y) => row.split("").forEach((ch, x) => {
    if (ch === "." || (x < 3 && y < 3)) return;
    r.rect(ox + x * cell + 2, oy + y * cell + 2, cell - 4, cell - 4, pic.palette[ch]);
    r.rect(ox + x * cell + 5, oy + y * cell + 5, 6, 6, "#ffffff", 0.45);
  }));
  r.sprite(frogArt("#fd7e14"), ox + 60, oy - 37, 4);
  r.sprite(frogArt("#212529"), ox + cols * cell + 37, oy + 120, 4);
  r.sprite(frogArt("#ff8787"), ox - 37, oy + 200, 4);
  for (let k = 0; k < 3; k++) {
    r.sprite(PAD_ART, 440 + k * 160, 590, 5);
    r.sprite(frogArt(["#fd7e14", "#fff9db", "#ff8787"][k]), 440 + k * 160, 575, 5);
  }
  await save("lily-loop", r, titleSvg("개구리 한 바퀴 · Lily Loop", "Each frog rides once around and eats only its colour", 600, 70, "#0b7285"));
}

async function vine(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#d3f9d8");
  for (let k = 0; k < 18; k++) r.rect(k * 70, 0, 40, 50 + ((k * 37) % 60), "#b2f2bb");
  r.rect(0, 580, W, 50, "#4dabf7");
  for (let x = 0; x < W; x += 40) r.rect(x, 588, 20, 4, "#a5d8ff");
  r.rect(0, 470, 140, 160, "#8a5a2b");
  r.rect(0, 460, 140, 12, "#51cf66");
  r.rect(1060, 470, 140, 160, "#8a5a2b");
  r.rect(1060, 460, 140, 12, "#51cf66");
  r.rect(1090, 390, 6, 70, "#e03131");
  r.rect(1096, 390, 28, 18, "#e03131");
  // three vines, the monkey swinging on the middle one, bananas along the arc
  const hooks: Array<[number, number]> = [[330, 210], [620, 170], [900, 230]];
  for (const [hx, hy] of hooks) {
    r.rect(hx - 3, 0, 6, hy, "#2f9e44");
    r.sprite(KNOT_ART, hx, hy, 6);
  }
  const mx = 760;
  const my = 330;
  for (let k = 0; k <= 30; k++) r.rect(Math.round(620 + ((mx - 620) * k) / 30) - 3, Math.round(170 + ((my - 170) * k) / 30) - 3, 6, 6, "#2f9e44");
  r.sprite(MONKEY_ART, mx, my, 7);
  r.sprite(BANANA_ART, 470, 300, 6);
  r.sprite(BANANA_ART, 860, 290, 6);
  r.sprite(BANANA_ART, 990, 360, 6);
  await save("vine-leap", r, titleSvg("덩굴 도약 · Vine Leap", "Hold to swing, let go to fly", 600, 92, "#2b8a3e"));
}

await pots();
await lily();
await vine();
