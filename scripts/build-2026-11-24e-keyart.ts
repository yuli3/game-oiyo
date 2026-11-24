// Bakes key art (1200×630 WebP) for the fourteenth batch of winter originals (2026-11-24)
// (bridge-walk, saealsim-roll, sell-the-heat) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-24e-keyart.ts
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
const WALKER: PixelArt = {
  palette: { k: "#212529", s: "#f1c27d", w: "#f8f9fa", p: "#e64980", b: "#4263eb", y: "#fab005" },
  rows: ["...kk...", "..kssk..", "..ssss..", "...yy...", ".pppppp.", "p.pppp.p", "..wwww..", "..wwww..", "..b..b..", ".kk..kk."],
};
const POT: PixelArt = {
  palette: { k: "#212529", g: "#495057", r: "#a61e4d", w: "#f8f9fa" },
  rows: ["..kkkkkkkk..", ".krrrrrrrrk.", "kgrrwrrrwrgk", "kggggggggggk", "kggggggggggk", ".kggggggggk.", "..kkkkkkkk.."],
};
const FACE: PixelArt = {
  palette: { k: "#212529", s: "#f1c27d", r: "#e64980", w: "#f8f9fa", h: "#5c3d2e" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssh..", ".skssks.", ".ssssss.", "..srrs..", "..ssss..", ".rrrrrr."],
};
const HAND: PixelArt = { palette: { s: "#f1c27d", k: "#5c3d2e" }, rows: ["s.s.s", "sssss", "sssss", ".sss.", ".sss.", ".kkk."] };

function disc(r: Raster, cx: number, cy: number, rad: number, hex: string): void {
  for (let y = -rad; y <= rad; y += 3) for (let x = -rad; x <= rad; x += 3) if (x * x + y * y <= rad * rad) r.rect(cx + x, cy + y, 3, 3, hex);
}

async function bridgeWalk(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 6) r.rect(0, y, W, 6, y < 250 ? "#141a3a" : y < 420 ? "#3b5bdb" : "#1864ab");
  disc(r, 1110, 190, 46, "#fff3bf");
  for (let k = 0; k < 14; k++) r.rect(k * 90, 420, 84, 22, k % 4 === 2 ? "#d0ebff" : "#8b5a2b");
  for (let k = 0; k < 14; k++) r.rect(k * 90 + 38, 442, 10, 60, "#5c3d2e");
  r.sprite(WALKER, 600, 330, 16);
  for (let k = 0; k < 5; k++) r.rect(200 + k * 40, 260 + k * 3, 30, 4, "#ffffff", 0.7);
  await save("bridge-walk", r, titleSvg("다리밟기 · Bridge Walk", "넘어지지 말고 다리를 건너요 — Keep your balance, cross the bridge", 560, 110, "#f8f9fa"));
}

async function saealsimRoll(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#3b2a20");
  r.rect(80, 200, 1040, 380, "#c08a5a");
  for (let k = 0; k < 7; k++) r.rect(80, 230 + k * 50, 1040, 4, "#a8744a");
  disc(r, 470, 390, 110, "#fffdf7");
  for (let a = 0; a < 40; a++) {
    const t = (a / 40) * Math.PI * 1.7;
    r.rect(Math.round(470 + Math.cos(t) * 160), Math.round(390 + Math.sin(t) * 160), 10, 10, "#ffd43b", 0.5 + a / 80);
  }
  r.sprite(POT, 900, 420, 18);
  for (let k = 0; k < 6; k++) disc(r, 840 + k * 26, 380 + (k % 2) * 10, 9, "#fffdf7");
  await save("saealsim-roll", r, titleSvg("새알심 빚기 · Saealsim Roll", "동글동글, 퐁당! — Roll it round, drop it in", 600, 110, "#fff4e6"));
}

async function sellTheHeat(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#a5d8ff");
  r.rect(0, 170, W, 40, "#212529");
  r.rect(0, 210, W, 420, "#e9ecef");
  r.rect(0, 210, W, 10, "#8b5a2b");
  for (let k = 0; k < 5; k++) {
    const x = 70 + k * 230;
    r.rect(x - 8, 262, 196, 236, "#6b4423");
    r.rect(x, 270, 180, 220, k === 2 ? "#fff9db" : "#f1e7d0");
    if (k === 2) {
      r.sprite(FACE, x + 90, 390, 18);
      r.sprite(HAND, x + 150, 320, 12);
    } else {
      for (let j = 1; j < 4; j++) r.rect(x + j * 45 - 2, 270, 4, 220, "#c9a37a");
      for (let j = 1; j < 4; j++) r.rect(x, 270 + j * 55 - 2, 180, 4, "#c9a37a");
    }
  }
  await save("sell-the-heat", r, titleSvg("더위팔기 · Sell the Heat", "내 더위 사 가라! — Sell your heat first!", 600, 110, "#212529"));
}

await bridgeWalk();
await saealsimRoll();
await sellTheHeat();
