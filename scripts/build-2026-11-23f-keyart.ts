// Bakes key art (1200×630 WebP) for the sixth batch of 2026-11-23 winter originals
// (tuho-toss, neol-jump, snow-plow) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-23f-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import sharp from "sharp";
import { join } from "node:path";
import { PUZZLES } from "../src/lib/games/snow-plow";
import { backdropPixels, parseHex, spritePixels, type BackdropSpec, type PixelArt } from "../src/lib/games/pixel-kit";

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
  backdrop(spec: BackdropSpec, px: number): void {
    const w = Math.ceil(W / px);
    const h = Math.ceil(H / px);
    const buf = backdropPixels(w, h, spec);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const j = (Math.floor(y / px) * w + Math.floor(x / px)) * 4;
      const i = (y * W + x) * 4;
      this.data[i] = buf[j];
      this.data[i + 1] = buf[j + 1];
      this.data[i + 2] = buf[j + 2];
      this.data[i + 3] = 255;
    }
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

// Sprites mirrored from the game components (kept small and local on purpose).
const KID: PixelArt = {
  palette: { k: "#212529", s: "#f3d2b3", r: "#e03131", y: "#ffd43b", b: "#4dabf7", p: "#f783ac", w: "#ffffff", g: "#2f9e44" },
  rows: ["...kkkk...", "..kkkkkk..", "..kssssk..", "..sksksk..", "...ssss...", "..rrwwyy..", ".rrrwwyys.", ".bbrrryys.", "..pppppp..", ".pppbbppp.", ".ppbbbbpp.", "pppggggppp", "..ww..ww.."],
};
const GIRL: PixelArt = {
  palette: { k: "#212529", s: "#f3d2b3", r: "#e03131", y: "#ffd43b", w: "#ffffff", b: "#a61e4d" },
  rows: ["...kkk...", "..kkkkk..", "..ksssk.k", "..sksks.k", "...sss...", "..yywyy..", ".yyywyyy.", ".s.rrr.s.", "..rrrrr..", ".rrrrrrr.", ".rrbrbrr.", "rrrrrrrrr", "..w...w.."],
};
const FRIEND: PixelArt = {
  palette: { k: "#212529", s: "#f3d2b3", r: "#1c7ed6", y: "#f783ac", w: "#ffffff", b: "#1864ab" },
  rows: ["...kkk...", "..kkkkk..", "k.ksssk..", "k.sksks..", "...sss...", "..yywyy..", ".yyywyyy.", ".s.rrr.s.", "..rrrrr..", ".rrrrrrr.", ".rrbrbrr.", "rrrrrrrrr", "..w...w.."],
};
const POUCH: PixelArt = {
  palette: { r: "#e03131", d: "#a61e1e", y: "#ffd43b", k: "#5c3d2e" },
  rows: ["..y.y..", "...k...", ".rrrrr.", "rrryrrr", "rryyyrr", "rrryrrr", ".rdddr."],
};
const MAGPIE: PixelArt = { palette: { k: "#1b1f3b", w: "#ffffff", b: "#1c7ed6" }, rows: ["k.......", "kk...kk.", ".kkwkkkk", "..wwkkbb", "...k...."] };
const ROOF: PixelArt = {
  palette: { d: "#343a40", g: "#495057", w: "#f1f3f5", r: "#c92a2a", y: "#e9c46a" },
  rows: ["d..................d", "dd................dd", ".dddddddddddddddddd.", "..gggggggggggggggg..", "..wwwrwwwwwwwwrwww..", "..wwwrwyywwyywrwww..", "..wwwrwyywwyywrwww.."],
};
const PLOW: PixelArt = {
  palette: { o: "#f76707", d: "#c2410c", k: "#212529", w: "#e7f5ff", g: "#adb5bd", y: "#ffd43b" },
  rows: ["...y....", ".oooo...", ".owwo...", "ooooood.", "oooooodg", "oooooodg", ".k..k.dg", "........"],
};
const HOUSE: PixelArt = {
  palette: { d: "#343a40", g: "#495057", w: "#ffffff", r: "#c92a2a", y: "#f1c27d", b: "#8a5a3b" },
  rows: ["w........w", "ww......ww", ".wwwwwwww.", "..dddddd..", "..ryyyyr..", "..ryybyr..", "..ryybyr.."],
};
const PILE: PixelArt = { palette: { w: "#ffffff", b: "#a5d8ff", s: "#d0ebff" }, rows: ["...ww...", "..wwws..", ".wwwwss.", "wwwwwwsb"] };
const HEAP: PixelArt = {
  palette: { w: "#ffffff", b: "#74c0fc", s: "#d0ebff" },
  rows: ["....ww....", "...wwws...", "..wwwwss..", ".wwwwwwss.", "wwwwwwwwsb", "wwwwwwwwsb"],
};

async function tuhoToss(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#f3e3c3", "#efd9b0", "#e9cf9f"], ground: ["#a8703e", "#8f5b2f"], groundShare: 0.2, seed: 22 }, 6);
  for (let x = 40; x < W; x += 120) r.rect(x, 40, 6, 400, "#c9a26b");
  for (let y = 40; y <= 440; y += 80) r.rect(40, y, W - 80, 6, "#c9a26b");
  const floor = 504;
  // the jar: blue-and-white, neck and two ears, with arrows already in
  const px = 860;
  const half = 30;
  for (let y = 380; y < floor; y += 6) {
    const t = (y - 380) / (floor - 380);
    const w = Math.round(110 * (0.75 + Math.sin(Math.min(1, t * 1.25) * Math.PI) * 0.25));
    r.rect(px - w, y, w * 2, 6, "#e7f0f7");
    r.rect(px - w, y, 8, 6, "#1c4f8c");
    r.rect(px + w - 8, y, 8, 6, "#1c4f8c");
  }
  r.rect(px - 80, 420, 160, 8, "#1c4f8c");
  for (const k of [-1, 0, 1]) r.rect(px + k * 34 - 8, 444, 16, 16, "#1c4f8c");
  r.rect(px - half - 8, 310, (half + 8) * 2, 70, "#d0dde8");
  r.rect(px - half - 8, 310, 8, 70, "#1c4f8c");
  r.rect(px + half, 310, 8, 70, "#1c4f8c");
  r.rect(px - half - 14, 298, (half + 14) * 2, 14, "#14325a");
  for (const ex of [px - 92, px + 92]) {
    r.rect(ex - 14, 332, 28, 40, "#1c4f8c");
    r.rect(ex - 8, 334, 16, 6, "#0b1a2e");
  }
  const arrowIn = (x: number, tip: number, lean: number) => {
    for (let k = 0; k < 120; k += 6) r.rect(Math.round(x + lean * k), tip - k, 6, 6, "#c0894a");
    for (let k = 96; k < 120; k += 6) r.rect(Math.round(x + lean * k) - 3, tip - k, 12, 6, "#e03131");
  };
  arrowIn(px - 10, 330, -0.12);
  arrowIn(px + 12, 330, 0.1);
  arrowIn(px + 92, 352, 0.06);
  // an arrow in flight on its arc
  for (let k = 0; k <= 12; k++) {
    const t = k / 14;
    const x = 230 + t * 520;
    const y = 360 - Math.sin(t * Math.PI) * 220;
    if (k % 2 === 0) r.rect(Math.round(x), Math.round(y), 10, 10, "#f08c00");
  }
  r.line(700, 190, 760, 214, "#c0894a", 6);
  r.rect(690, 184, 14, 14, "#e03131");
  r.sprite(KID, 170, 430, 11);
  await save("tuho-toss", r, titleSvg("투호 던지기 · Tuho Toss", "당겼다 놓아 항아리에 쏙 — Pull back, let go, land it in the pot", 600, 92, "#3b2414"));
}

async function neolJump(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#74c0fc", "#a5d8ff", "#e7f5ff"], seed: 9 }, 6);
  // village roofs beyond the wall
  for (let k = 0; k < 6; k++) r.sprite(ROOF, 100 + k * 200, 330 + (k % 2) * 14, 9);
  r.rect(0, 380, W, 160, "#adb5bd");
  for (let y = 392; y < 540; y += 24) for (let x = ((y / 24) % 2) * 20; x < W; x += 40) r.rect(x, y, 34, 4, "#868e96");
  r.rect(0, 372, W, 14, "#495057");
  r.rect(0, 540, W, 90, "#f8f9fa");
  // board on its bundle
  r.rect(560, 556, 80, 40, "#d4a373");
  r.line(300, 586, 900, 548, "#8a5a3b", 12);
  r.sprite(FRIEND, 880, 498, 8);
  // the player soaring over the wall, pouches around
  r.sprite(GIRL, 330, 262, 10);
  for (const [x, y] of [[170, 230], [520, 200], [460, 330], [1060, 230]]) r.sprite(POUCH, x, y, 8);
  r.sprite(MAGPIE, 800, 210, 8);
  for (let k = 0; k < 4; k++) r.rect(310 + k * 4, 340 + k * 24, 8, 14, "#ffffff", 0.7);
  await save("neol-jump", r, titleSvg("널뛰기 · Neol Seesaw Jump", "박자 맞춰 톡, 담장 너머까지 — Tap on the beat, fly over the wall", 600, 86, "#1f2937"));
}

async function snowPlow(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#cfe6ff", "#e3f0ff", "#f4f8fc"], ground: ["#f4f8fc", "#e9f0f7"], groundShare: 0.8, seed: 31 }, 6);
  const p = PUZZLES[12];
  const cell = 64;
  const x0 = 1200 - 60 - p.w * cell;
  const y0 = 630 - 40 - p.h * cell;
  for (let i = 0; i < p.cells.length; i++) {
    const x = x0 + (i % p.w) * cell;
    const y = y0 + Math.floor(i / p.w) * cell;
    if (p.cells[i] === "road") {
      r.rect(x, y, cell, cell, "#adb5bd");
      r.rect(x + 3, y + 3, cell - 6, cell - 6, "#ced4da");
    } else if (p.cells[i] === "yard") {
      r.rect(x, y, cell, cell, "#2f9e44");
      r.rect(x + 4, y + 4, cell - 8, cell - 8, "#f1f8f1");
    } else {
      r.rect(x, y, cell, cell, "#f8f9fa");
      r.sprite(HOUSE, x + cell / 2, y + cell / 2, 6);
    }
    if (p.snow[i]) r.sprite(p.snow[i] > 1 ? HEAP : PILE, x + cell / 2, y + cell / 2 + 4, p.snow[i] > 1 ? 6 : 7);
  }
  const at = p.start;
  r.sprite(PLOW, x0 + (at % p.w) * cell + cell / 2, y0 + Math.floor(at / p.w) * cell + cell / 2, 7);
  r.sprite(PLOW, 200, 470, 18);
  for (const [x, y] of [[330, 470], [350, 420], [360, 520]]) r.sprite(PILE, x, y, 9);
  await save("snow-plow", r, titleSvg("눈 치우기 · Snow Plow", "눈을 밀어 설날 길을 열어라 — Push the snow, open the road", 48, 96, "#1f2937", "start"));
}

const only = process.argv.slice(2);
const jobs: Record<string, () => Promise<void>> = { "tuho-toss": tuhoToss, "neol-jump": neolJump, "snow-plow": snowPlow };
for (const [slug, job] of Object.entries(jobs)) if (!only.length || only.includes(slug)) await job();
