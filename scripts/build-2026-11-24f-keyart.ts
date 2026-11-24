// Bakes key art (1200×630 WebP) for the fifteenth batch of winter originals (2026-11-24)
// (avalanche-rescue, ogokbap-sort, chestnut-roast) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-24f-keyart.ts
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
const RESCUER: PixelArt = {
  palette: { k: "#212529", r: "#e03131", s: "#f1c27d", y: "#fab005", g: "#868e96" },
  rows: ["..kkk...", ".krrrk..", ".kssk...", "rrrrrr..", "rryrrr.g", "rrrrrrg.", ".kk.kk..", ".k...k.."],
};
const GRAINS: PixelArt[] = [
  { palette: { w: "#f8f9fa", g: "#dee2e6" }, rows: [".ww.", "wwww", "wwgw", ".ww."] },
  { palette: { y: "#e9c46a", d: "#b8893a" }, rows: [".yy.", "yyyy", "ydyy", "yyyy", ".yy."] },
  { palette: { y: "#ffd43b", o: "#f59f00" }, rows: ["yy", "yo"] },
  { palette: { k: "#212529", g: "#495057" }, rows: [".kkk.", "kkgkk", "kkkkk", ".kkk."] },
  { palette: { r: "#a61e4d", p: "#e64980" }, rows: [".rr.", "rrpr", "rrrr", ".rr."] },
];
const NUT: PixelArt = { palette: { b: "#e8590c", d: "#5c3d2e", l: "#ffd43b" }, rows: ["..d..", ".blb.", "bllbb", "bbbbb", ".bbb."] };
const NUT_RAW: PixelArt = { palette: { b: "#a0632f", d: "#6b4423", l: "#d9a066" }, rows: ["..d..", ".bbb.", "bblbb", "bbbbb", ".bbb."] };

function disc(r: Raster, cx: number, cy: number, rad: number, hex: string, alpha = 1): void {
  for (let y = -rad; y <= rad; y += 3) for (let x = -rad; x <= rad; x += 3) if (x * x + y * y <= rad * rad) r.rect(cx + x, cy + y, 3, 3, hex, alpha);
}

async function avalancheRescue(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 6) r.rect(0, y, W, 6, y < 220 ? "#1c3d6b" : "#f1f5fa");
  const go = rng(51);
  for (let i = 0; i < 70; i++) r.rect(Math.round(go() * W), 230 + Math.round(go() * 380), 20 + Math.round(go() * 40), 8 + Math.round(go() * 10), "#dbe4ef");
  r.sprite(RESCUER, 520, 440, 14);
  for (let a = 0; a < 3; a++) for (let t = 0; t < 60; t++) {
    const ang = (t / 60) * Math.PI * 2;
    r.rect(Math.round(520 + Math.cos(ang) * (90 + a * 40)), Math.round(440 + Math.sin(ang) * (90 + a * 40)), 6, 6, "#fab005", 0.7 - a * 0.2);
  }
  r.line(600, 420, 760, 380, "#e8590c", 10);
  r.rect(760, 360, 30, 40, "#e8590c");
  await save("avalanche-rescue", r, titleSvg("눈사태 구조 · Avalanche Rescue", "삐삐 소리를 따라가 빨리 파요 — Follow the beeps, dig fast", 600, 110, "#f8f9fa"));
}

async function ogokbapSort(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#fff4e6");
  r.rect(0, 0, W, 50, "#c08a5a");
  const bowl = ["#f8f9fa", "#e9c46a", "#ffd43b", "#343a40", "#a61e4d"];
  for (let b = 0; b < 5; b++) {
    const x = 60 + b * 220;
    r.rect(x, 470, 200, 20, bowl[b]);
    r.rect(x + 10, 490, 180, 80, "#8b5a2b");
    r.sprite(GRAINS[b], x + 100, 530, 10);
  }
  const go = rng(52);
  for (let i = 0; i < 14; i++) r.sprite(GRAINS[i % 5], 80 + Math.round(go() * 1040), 200 + Math.round(go() * 220), 9);
  await save("ogokbap-sort", r, titleSvg("오곡밥 담기 · Ogokbap Sort", "다섯 곡식, 다섯 그릇 — Five grains, five bowls", 600, 120, "#5c3d2e"));
}

async function chestnutRoast(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1b1b2f");
  disc(r, 600, 400, 240, "#e8590c");
  disc(r, 600, 400, 222, "#3d2b22");
  disc(r, 600, 400, 110, "#5c3d2e");
  const spots = [[520, 380], [640, 350], [700, 450], [560, 470], [470, 300], [760, 330], [430, 450]];
  spots.forEach(([x, y], i) => {
    if (i < 3) disc(r, x, y, 40, "#ffd43b", 0.35);
    r.sprite(i < 3 ? NUT : NUT_RAW, x, y, 12);
  });
  r.rect(950, 400, 160, 170, "#e9c46a");
  r.rect(950, 400, 160, 16, "#b8893a");
  await save("chestnut-roast", r, titleSvg("군밤 굽기 · Chestnut Roast", "노릇하게, 태우지 말고 — Golden, not burnt", 600, 110, "#fff4e6"));
}

await avalancheRescue();
await ogokbapSort();
await chestnutRoast();
