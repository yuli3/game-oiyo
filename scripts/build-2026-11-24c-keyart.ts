// Bakes key art (1200×630 WebP) for the twelfth batch of winter originals (2026-11-24)
// (speed-skate, yeot-stretch, biathlon) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-24c-keyart.ts
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
const SKATER: PixelArt = {
  palette: { k: "#212529", r: "#e03131", s: "#f1c27d", b: "#1c7ed6", w: "#f8f9fa" },
  rows: ["...kk...", "..kssk..", "..rrrr..", ".rrrrrr.", "r.rrrr.r", "..bbbb..", "..b..b..", ".ww..ww."],
};
const GHOST: PixelArt = {
  palette: { k: "#495057", g: "#868e96", w: "#dee2e6" },
  rows: ["...kk...", "..kggk..", "..gggg..", ".gggggg.", "g.gggg.g", "..gggg..", "..g..g..", ".ww..ww."],
};
const HAND: PixelArt = {
  palette: { k: "#5c3d2e", s: "#f1c27d", d: "#d9a066" },
  rows: ["..ss.ss..", ".ssssssss", "sssssssss", "sdsssssss", "sssssssd.", ".sssssss.", "..sssss..", "..kkkkk.."],
};
const PEG: PixelArt = {
  palette: { k: "#3b2414", b: "#8b5a2b", l: "#b07a46" },
  rows: ["kkkkkk", "kbllbk", "kbllbk", "kbllbk", "kbllbk", "kbbbbk", "kbbbbk", "kkkkkk"],
};
const SKIER: PixelArt = {
  palette: { k: "#212529", y: "#fab005", b: "#1971c2", s: "#f1c27d", g: "#495057" },
  rows: ["....yy....", "...ksk....", "...bbb.g..", "..bbbbbg..", ".g.bbb.g..", "g..bbb..g.", "...b.b....", "..b...b...", "kkkkkkkkkk"],
};
const PINE: PixelArt = {
  palette: { g: "#2b8a3e", d: "#1b5e20", w: "#f8f9fa", t: "#5c3d2e" },
  rows: ["...w...", "..ggg..", ".gwggd.", "..ggg..", ".ggwgd.", "ggggggd", "...t...", "...t..."],
};

async function speedSkate(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#dbe4ff");
  for (let i = 0; i < 30; i++) r.rect(i * 40 + 4, 16, 32, 10, "#4c6ef5");
  // a long straight with a lane, seen from the side, curving away to the right
  r.rect(0, 300, W, 330, "#f1f7ff");
  r.rect(0, 420, W, 40, "#74c0fc");
  r.rect(0, 438, W, 4, "#e7f5ff");
  for (let x = 0; x < W; x += 120) r.rect(x, 520, 60, 6, "#c5f6fa");
  const go = rng(5);
  for (let k = 0; k < 40; k++) r.rect(Math.round(go() * 700), 400 + Math.round(go() * 80), 30 + Math.round(go() * 50), 3, "#ffffff", 0.8);
  r.sprite(GHOST, 980, 400, 14);
  r.sprite(SKATER, 760, 420, 16);
  // left / right beat marks
  r.rect(560, 560, 120, 50, "#1c7ed6");
  r.rect(700, 560, 120, 50, "#e03131");
  await save("speed-skate", r, titleSvg("스피드스케이팅 · Speed Skate", "왼발, 오른발, 곡선은 오른발! — Left, right, cross over the curve", 600, 130, "#1c2a6b"));
}

async function yeotStretch(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#fff4e6");
  for (let y = 40; y < H; y += 60) r.rect(0, y, W, 2, "#ffe8cc");
  r.rect(0, 470, W, 160, "#a0522d");
  for (let x = 0; x < W; x += 96) r.rect(x, 470, 3, 160, "#8b4513");
  // a long pulled rope of taffy from the peg to the hand, with a few strands beside it
  const y0 = 340;
  for (let k = 0; k < 4; k++) r.line(150, y0 + k * 6 - 9, 1010, y0 + 20 + k * 6 - 9, k === 1 ? "#fff8e6" : "#f3d9a4", 6);
  r.line(150, y0, 1010, y0 + 20, "#e0a050", 6);
  r.sprite(PEG, 130, y0, 14);
  r.sprite(HAND, 1050, y0 + 20, 13);
  for (let x = 1080; x < 1100; x += 4) for (let y = 220; y < 470; y += 24) r.rect(1090, y, 6, 12, "#2f9e44");
  await save("yeot-stretch", r, titleSvg("엿 늘이기 · Yeot Taffy Stretch", "길게 늘이고, 끊지 말고, 접어요 — Pull it long, don't let it snap", 600, 130, "#5c3d2e"));
}

async function biathlon(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 6) r.rect(0, y, W, 6, y < 320 ? "#74c0fc" : "#f8f9fa");
  for (let x = 0; x < W; x += 6) {
    const y = Math.round(300 + Math.sin(x / 90) * 24);
    r.rect(x, y, 6, 340 - y + 20, "#dee2e6");
  }
  for (let k = 0; k < 8; k++) r.sprite(PINE, 60 + k * 150, 340 + (k % 2) * 30, 9);
  r.rect(0, 470, W, 4, "#a5d8ff");
  r.rect(0, 486, W, 4, "#a5d8ff");
  r.sprite(SKIER, 280, 430, 14);
  // the target plate with five targets and a crosshair
  r.rect(640, 190, 470, 170, "#343a40");
  for (let k = 0; k < 5; k++) {
    const cx = 690 + k * 92;
    for (let y = -30; y <= 30; y += 3) for (let x = -30; x <= 30; x += 3) if (x * x + y * y <= 900) r.rect(cx + x, 275 + y, 3, 3, k < 3 ? "#f8f9fa" : "#111111");
  }
  const sx = 966;
  const sy = 275;
  for (let a = 0; a < 60; a++) {
    const t = (a / 60) * Math.PI * 2;
    r.rect(Math.round(sx + Math.cos(t) * 46), Math.round(sy + Math.sin(t) * 46), 6, 6, "#40c057");
  }
  r.rect(sx - 70, sy - 3, 140, 6, "#40c057");
  r.rect(sx - 3, sy - 70, 6, 140, "#40c057");
  await save("biathlon", r, titleSvg("바이애슬론 · Biathlon", "힘껏 달리고, 심장을 가라앉혀요 — Ski hard, then calm your heart", 600, 110, "#0b3d6b"));
}

await speedSkate();
await yeotStretch();
await biathlon();
