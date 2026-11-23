// Bakes key art (1200×630 WebP) for the seventh batch of 2026-11-23 winter originals
// (top-whip, ondol-flue, tteok-slice) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-23g-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import sharp from "sharp";
import { join } from "node:path";
import { PUZZLES } from "../src/lib/games/ondol-flue";
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


// Sprites mirrored from the game components (kept small and local on purpose).
const TOP: PixelArt = {
  palette: { r: "#e03131", y: "#ffd43b", b: "#1c7ed6", w: "#c0894a" },
  rows: ["..wwwww..", ".wrrryyw.", "wrrryybbw", "wryybbbbw", "wyybbbrrw", "wybbbrrrw", ".wbrrrrw.", "..wwwww.."],
};
const FLAG_RED: PixelArt = { palette: { r: "#e03131", p: "#5c3d2e" }, rows: ["prrr.", "prrrr", "prrr.", "p....", "p....", "p....", "pp..."] };
const FLAG_BLUE: PixelArt = { palette: { r: "#1c7ed6", p: "#5c3d2e" }, rows: ["prrr.", "prrrr", "prrr.", "p....", "p....", "p....", "pp..."] };
const ROCK: PixelArt = { palette: { g: "#868e96", d: "#495057", w: "#f1f3f5" }, rows: ["..ww..", ".gwgg.", "ggggdd", "gggddd", ".gddd."] };
const BONFIRE: PixelArt = {
  palette: { r: "#e03131", o: "#f76707", y: "#ffd43b", b: "#8a5a3b" },
  rows: ["...r...", "..ror..", ".roorr.", ".royor.", "roy.yor", "bbbbbbb", ".b.b.b."],
};
const WKID: PixelArt = {
  palette: { s: "#f1c27d", k: "#343a40", r: "#c92a2a", b: "#1c7ed6", w: "#e9ecef" },
  rows: ["..kkk.", ".kssk.", ".ksss.", "rrrrr.", "rrrrrw", "rrrr.w", ".bb..w", ".b.b.."],
};
const SLEEPER: PixelArt = {
  palette: { s: "#f1c27d", k: "#343a40", r: "#e03131", p: "#f783ac", w: "#fff5f5" },
  rows: ["..kk......", ".ksskwwww.", ".ksskwwww.", "rrrrrrrrrr", "rpprpprppr", "rrrrrrrrrr"],
};
const FIRE: PixelArt = {
  palette: { r: "#e03131", o: "#f76707", y: "#ffd43b", w: "#fff9db" },
  rows: ["...r....", "..ro..r.", ".roor.or", ".royyoor", "royywyor", "roywwyor", ".ryyyyr."],
};
const POT: PixelArt = { palette: { k: "#212529", g: "#495057", l: "#868e96" }, rows: ["....kk....", "..kkkkkk..", "kkkkkkkkkk", ".gggggggg.", ".gllggggg.", "..gggggg.."] };
const CHIMNEY: PixelArt = { palette: { b: "#8a5a3b", d: "#5c3d2e", g: "#adb5bd" }, rows: ["dddddd", ".bbbb.", ".bgbb.", ".bbbb.", ".bbgb.", ".bbbb.", ".bbbb."] };
const KNIFE: PixelArt = {
  palette: { s: "#dee2e6", w: "#f8f9fa", d: "#868e96", b: "#5c3d2e", k: "#3b2a20" },
  rows: [".kk.", ".bb.", ".bb.", ".kk.", "dssd", "dswd", "dssd", "dswd", "dssd", "dssd", "dsd.", "dd..", "d..."],
};
const HAND: PixelArt = { palette: { s: "#f1c27d", d: "#e0a96d", r: "#c92a2a" }, rows: ["..ssss.rr", ".sssssdrr", "sssssddrr", "ssssdd.rr", ".ssss..rr"] };
const BOWL: PixelArt = {
  palette: { w: "#f8f9fa", b: "#1c4f8c", g: "#dee2e6", s: "#f1e3c6" },
  rows: ["bbbbbbbbbbbbbb", "bssssssssssssb", ".bggggggggggb.", "..bwwwwwwwwb..", "...bbbbbbbb...", ".....bbbb....."],
};
const EGG: PixelArt = { palette: { y: "#fcc419", w: "#ffffff" }, rows: ["wyw", "yyy", "wyw"] };

function disc(r: Raster, cx: number, cy: number, rad: number, hex: string, px = 6, alpha = 1): void {
  for (let y = -rad; y <= rad; y += px) {
    const hw = Math.floor(Math.sqrt(Math.max(0, rad * rad - y * y)) / px) * px;
    r.rect(cx - hw, cy + y, hw * 2, px, hex, alpha);
  }
}

async function topWhip(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#f8f9fa");
  r.rect(24, 24, W - 48, H - 48, "#d0ebff");
  for (let k = 0; k < 26; k++) r.rect(60 + ((k * 197) % 1060), 160 + ((k * 131) % 420), 80 + (k % 4) * 30, 6, "#e7f5ff");
  for (let k = 0; k < 8; k++) {
    const x = 120 + ((k * 263) % 940);
    const y = 190 + ((k * 151) % 380);
    r.rect(x, y, 30, 4, "#74c0fc");
    r.rect(x + 26, y + 4, 4, 20, "#74c0fc");
    r.rect(x + 26, y + 24, 24, 4, "#74c0fc");
  }
  disc(r, 980, 210, 70, "#ffffff", 8);
  disc(r, 330, 540, 54, "#ffffff", 8);
  disc(r, 760, 520, 60, "#1864ab", 6);
  r.sprite(ROCK, 640, 230, 10);
  r.sprite(ROCK, 1080, 470, 8);
  // gates
  r.sprite(FLAG_RED, 520, 330, 9);
  r.sprite(FLAG_BLUE, 560, 470, 9);
  r.rect(548, 380, 8, 8, "#ffffff");
  r.rect(548, 410, 8, 8, "#ffffff");
  r.rect(548, 440, 8, 8, "#ffffff");
  // bonfire circle
  disc(r, 930, 370, 96, "#ffd43b", 6, 0.35);
  r.sprite(BONFIRE, 1070, 360, 12);
  // the whip trail and the top mid-lash
  r.line(150, 520, 230, 430, "#5c3d2e", 8);
  r.line(230, 430, 330, 380, "#5c3d2e", 8);
  r.line(330, 380, 420, 380, "#8a5a3b", 8);
  for (let k = 0; k < 10; k++) r.rect(360 + ((k * 37) % 90) - 40, 330 + ((k * 53) % 100), 10, 10, k % 2 ? "#ffffff" : "#a5d8ff");
  r.rect(310, 470, 90, 12, "#000000", 0.12);
  r.sprite(TOP, 355, 420, 14);
  for (let k = 0; k < 6; k++) r.rect(430 + k * 44, 420 - k * 6, 18, 6, "#ffffff", 0.8);
  r.sprite(WKID, 110, 520, 14);
  await save("top-whip", r, titleSvg("팽이치기 · Top Whip", "손가락 채찍으로 얼음 위를 휙 — Whip the top across the ice", 600, 96, "#ffffff"));
}

async function ondolFlue(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1b1f3b");
  for (let k = 0; k < 40; k++) r.rect((k * 151) % W, 10 + ((k * 89) % 120), 4, 4, k % 3 ? "#dee2e6" : "#ffd43b");
  r.rect(0, 0, W, 6, "#343a40");
  const p = PUZZLES[19];
  const cs = 64;
  const ox = 1120 - p.w * cs;
  const oy = 120;
  // eaves and kitchen band
  r.rect(ox - 40, oy - 26, p.w * cs + 80, 26, "#343a40");
  for (let x = ox - 40; x < ox + p.w * cs + 40; x += 24) r.rect(x, oy - 26, 16, 8, "#495057");
  r.rect(ox - 20, oy + p.h * cs, p.w * cs + 40, 60, "#5c3d2e");
  r.sprite(CHIMNEY, ox + (p.chimney % p.w) * cs + cs / 2, oy - 60, 8);
  for (let k = 0; k < 5; k++) disc(r, ox + (p.chimney % p.w) * cs + cs / 2 + k * 22 + 10, oy - 96 - k * 4, 10 + k * 3, "#ced4da", 4, 0.55);
  for (let i = 0; i < p.solved.length; i++) {
    const x = ox + (i % p.w) * cs;
    const y = oy + Math.floor(i / p.w) * cs;
    const m = p.solved[i];
    if (!m) {
      r.rect(x + 2, y + 2, cs - 4, cs - 4, "#343a40");
      r.rect(x + 10, y + 10, 20, 14, "#495057");
      continue;
    }
    r.rect(x + 2, y + 2, cs - 4, cs - 4, "#ffc078");
    r.rect(x + 2, y + cs - 8, cs - 4, 6, "#f4a261", 0.6);
    const cw = 18;
    const c0 = cs / 2 - cw / 2;
    r.rect(x + c0, y + c0, cw, cw, "#f76707");
    if (m & 1) r.rect(x + c0, y, cw, cs / 2, "#f76707");
    if (m & 2) r.rect(x + cs / 2, y + c0, cs / 2, cw, "#f76707");
    if (m & 4) r.rect(x + c0, y + cs / 2, cw, cs / 2, "#f76707");
    if (m & 8) r.rect(x, y + c0, cs / 2, cw, "#f76707");
    const ln = 6;
    const l0 = cs / 2 - ln / 2;
    if (m & 1) r.rect(x + l0, y, ln, cs / 2, "#ffd43b");
    if (m & 2) r.rect(x + cs / 2, y + l0, cs / 2, ln, "#ffd43b");
    if (m & 4) r.rect(x + l0, y + cs / 2, ln, cs / 2, "#ffd43b");
    if (m & 8) r.rect(x, y + l0, cs / 2, ln, "#ffd43b");
  }
  for (const i of p.sleepers) r.sprite(SLEEPER, ox + (i % p.w) * cs + cs / 2, oy + Math.floor(i / p.w) * cs + cs / 2 + 10, 5);
  const fx = ox + (p.fire % p.w) * cs + cs / 2;
  r.sprite(POT, fx, oy + p.h * cs + 18, 5);
  r.sprite(FIRE, fx, oy + p.h * cs + 46, 5);
  r.sprite(SLEEPER, 230, 470, 14);
  for (let k = 0; k < 3; k++) r.rect(330 + k * 30, 370 - k * 34, 16 + k * 4, 6, "#74c0fc");
  await save("ondol-flue", r, titleSvg("온돌 구들 잇기", "Ondol Flue — 불길을 이어 온 집을 뜨끈하게", 48, 110, "#fff4e0", "start"));
}

async function tteokSlice(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#f3e5cf");
  for (let y = 0; y < 330; y += 36) r.rect(0, y, W, 3, "#e9d3b0");
  r.rect(880, 180, 280, 150, "#fff9ef");
  for (let x = 880; x <= 1160; x += 56) r.rect(x, 180, 8, 158, "#8a5a3b");
  for (let y = 180; y <= 330; y += 50) r.rect(880, y, 288, 8, "#8a5a3b");
  // board and the log sliding under the knife
  r.rect(40, 360, W - 80, 220, "#c0894a");
  for (let y = 380; y < 580; y += 26) r.rect(40, y, W - 80, 4, "#a9733c");
  r.rect(40, 580, W - 80, 16, "#8a5a3b");
  const kx = 520;
  r.rect(kx, 420, 640, 90, "#ffffff");
  r.rect(kx, 490, 640, 20, "#f1f3f5");
  for (let x = kx + 60; x < 1150; x += 60) r.rect(x, 420, 6, 22, "#868e96");
  r.sprite(HAND, 1150, 465, 12);
  r.sprite(KNIFE, kx - 4, 330, 16);
  r.rect(kx - 60, 530, 60, 8, "#fab005");
  r.rect(kx - 60, 516, 8, 32, "#fab005");
  r.rect(kx - 8, 516, 8, 32, "#fab005");
  // slices hopping into the bowl
  const hops = [[430, 400], [360, 330], [290, 290]];
  for (const [x, y] of hops) {
    r.rect(x - 26, y - 44, 52, 88, "#ffffff");
    r.rect(x - 26, y + 30, 52, 14, "#e9ecef");
  }
  r.sprite(BOWL, 170, 330, 18);
  for (let k = 0; k < 9; k++) {
    r.rect(70 + ((k * 61) % 200), 300 + (k % 3) * 8, 34, 18, "#ffffff");
    r.rect(70 + ((k * 61) % 200), 312 + (k % 3) * 8, 34, 6, "#e9ecef");
  }
  r.sprite(EGG, 150, 296, 8);
  for (let k = 0; k < 4; k++) r.rect(110 + k * 40, 210 - (k % 2) * 20, 8, 40, "#ffffff", 0.6);
  await save("tteok-slice", r, titleSvg("떡국 떡 썰기 · Tteok Slice", "탁 탁 탁, 딱 맞는 두께로 — Slice the rice cake just right", 600, 96, "#3b2414"));
}

const only = process.argv.slice(2);
const jobs: Record<string, () => Promise<void>> = { "top-whip": topWhip, "ondol-flue": ondolFlue, "tteok-slice": tteokSlice };
for (const [slug, job] of Object.entries(jobs)) if (!only.length || only.includes(slug)) await job();
