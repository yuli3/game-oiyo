// Bakes key art (1200×630 WebP) for the eleventh batch of winter originals (2026-11-24)
// (ski-jump, bokjori-run, snow-halfpipe) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-24b-keyart.ts
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
const FLY: PixelArt = {
  palette: { k: "#212529", r: "#e03131", b: "#1c7ed6", s: "#f1c27d", y: "#ffd43b" },
  rows: ["k..........", ".k...rr....", "..k.rrrs...", "...bbbbbb..", "....bbbbbbb", ".....k.....", "......k....", ".......k..."],
};
const PINE: PixelArt = { palette: { g: "#2b8a3e", d: "#1e5f2c", w: "#ffffff", t: "#6b4423" }, rows: ["...w...", "..wgw..", "..ggg..", ".wgggw.", ".ggdgg.", "wgggggw", "ggdggdg", "...t..."] };
const RUNNER: PixelArt = {
  palette: { k: "#212529", h: "#343a40", s: "#f1c27d", r: "#c92a2a", w: "#f8f9fa", y: "#e9c46a", b: "#5c3a21" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", "yrrrrrr.", "yyrrrrrs", "yyrrrrr.", ".wwwwww.", ".bb..bb.", ".kk..kk."],
};
const STRAINER: PixelArt = { palette: { y: "#e9c46a", d: "#b8893a", r: "#c92a2a" }, rows: ["..rr..", ".dyyd.", "dyyyyd", "dydyyd", ".dyyd.", "..dd.."] };
const LANTERN: PixelArt = { palette: { r: "#e03131", y: "#ffd43b", k: "#5c3a21" }, rows: ["..k..", ".rrr.", "ryyyr", "ryyyr", ".rrr.", "..k.."] };
const DOG: PixelArt = {
  palette: { b: "#a0522d", d: "#6b3a1e", k: "#212529", w: "#f8f9fa", p: "#f783ac" },
  rows: ["d.........", "dd.....bb.", ".bbbbbbbkb", ".bbbbbbbbp", ".bwwbbbbb.", ".b.b..b.b.", ".d.d..d.d."],
};
const RIDER: PixelArt = {
  palette: { k: "#212529", h: "#f08c00", s: "#f1c27d", g: "#1098ad", b: "#364fc7", w: "#f8f9fa", r: "#e03131" },
  rows: ["...hhh....", "..hhhhh...", "..ksssk...", "...sss....", "..ggggg...", ".ggggggg..", ".g.ggg.g..", "..bbbbb...", "..bb.bb...", "rrrrrrrrrr"],
};

async function skiJump(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 6) r.rect(0, y, W, 6, y < 200 ? "#4dabf7" : y < 400 ? "#a5d8ff" : "#e7f5ff");
  for (let k = 0; k < 6; k++) for (let i = 0; i < 40; i++) r.rect(k * 240 - 60 + i * 6, 380 - i * 4 + (k % 2) * 30, 360 - i * 12, 4, "#c5d8ea");
  // the in-run and the landing hill
  r.line(40, 120, 330, 300, "#8a5a3b", 10);
  for (let x = 330; x < W; x += 4) {
    const t = (x - 330) / 870;
    const y = Math.round(310 + Math.min(1, t * 1.6) * 260 - Math.max(0, t - 0.75) * 120);
    r.rect(x, y, 4, H - y, "#f8fbff");
  }
  r.rect(840, 470, 90, 6, "#e03131");
  for (let x = 380; x < W; x += 140) r.sprite(PINE, x, 300 + (x - 330) * 0.3, 7);
  r.sprite(FLY, 660, 270, 14);
  for (let k = 0; k < 18; k++) r.rect(330 + k * 14, 300 - Math.sin((k / 18) * Math.PI) * 60 - k * 4, 6, 6, "#ffffff", 0.5 + k * 0.02);
  await save("ski-jump", r, titleSvg("스키점프 · Ski Jump", "끝에서 떼고, 바람을 타요 — Let go at the lip, ride the air", 600, 90, "#0b3d6b"));
}

async function bokjoriRun(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 6) r.rect(0, y, W, 6, y < 220 ? "#0b1026" : y < 470 ? "#1f2a58" : "#5c4a3a");
  const rand = rng(7);
  for (let k = 0; k < 60; k++) r.rect(Math.floor(rand() * W), Math.floor(rand() * 260), 3, 3, "#ffffff", 0.5 + rand() * 0.5);
  for (let y = -26; y <= 26; y += 4) for (let x = -26; x <= 26; x += 4) if (x * x + y * y < 26 * 26) r.rect(1060 + x, 90 + y, 4, 4, "#fff3bf");
  for (const hx of [420, 780]) {
    r.rect(hx + 120, 300, 200, 170, "#e9dcc3");
    for (let k = 0; k < 4; k++) r.rect(hx + 140 + k * 50, 330, 8, 140, "#8a5a3b");
    for (let i = 0; i < 40; i++) r.rect(hx + 100 + i * 3, 300 - i * 1.6, 240 - i * 6, 4, "#343a40");
    r.sprite(LANTERN, hx + 220, 360, 8);
    r.rect(hx, 360, 40, 110, "#adb5bd");
    r.rect(hx - 6, 350, 52, 12, "#495057");
  }
  r.rect(0, 470, W, 6, "#e7f0f8");
  r.sprite(RUNNER, 200, 420, 10);
  r.sprite(DOG, 330, 450, 6);
  for (let k = 0; k < 24; k++) {
    const t = k / 24;
    r.rect(Math.round(240 + t * 400), Math.round(360 - Math.sin(t * Math.PI) * 220), 6, 6, "#ffd43b", 0.3 + t * 0.6);
  }
  r.sprite(STRAINER, 650, 380, 9);
  await save("bokjori-run", r, titleSvg("복조리 배달 · Bokjori Run", "담 너머로 복을 던져요 — Toss luck over the walls", 600, 560, "#ffd43b"));
}

async function snowHalfpipe(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 6) r.rect(0, y, W, 6, y < 250 ? "#4dabf7" : "#d0ebff");
  for (let x = 0; x < W; x += 4) {
    const u = Math.abs(x - 600) / 460;
    const y = Math.round(300 + 260 * (1 - Math.min(1, Math.pow(u, 2.2))));
    r.rect(x, Math.min(y, 300 + 260), 4, H, u > 1 ? "#f8fbff" : "#f1f6fb");
    r.rect(x, Math.min(y, 560), 4, 4, "#a5d8ff");
  }
  r.rect(130, 296, 20, 8, "#1c7ed6");
  r.rect(1050, 296, 20, 8, "#1c7ed6");
  // the rider mid-spin above the lip, with a spin arc
  for (let k = 0; k < 30; k++) {
    const a = (k / 30) * Math.PI * 1.6 - Math.PI / 2;
    r.rect(Math.round(1000 + Math.cos(a) * 90), Math.round(170 + Math.sin(a) * 90), 8, 8, "#2f9e44", 0.4 + k * 0.02);
  }
  r.sprite(RIDER, 1000, 170, 13);
  for (let k = 0; k < 20; k++) r.rect(Math.round(1060 + k * 4), Math.round(300 - k * 6), 6, 6, "#ffffff", 0.6);
  await save("snow-halfpipe", r, titleSvg("하프파이프 · Snow Halfpipe", "펌핑하고, 돌고, 착지! — Pump, spin, stick it", 520, 110, "#0b3d6b"));
}

await skiJump();
await bokjoriRun();
await snowHalfpipe();
