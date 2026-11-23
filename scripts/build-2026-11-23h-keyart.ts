// Bakes key art (1200×630 WebP) for the eighth batch of 2026-11-23 winter originals
// (ttakji-flip, gotgam-mobile, gonggi-toss) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-23h-keyart.ts
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



// Sprites mirrored from the game components (kept small and local on purpose).
function tileArt(a: string, b: string, back: boolean): PixelArt {
  const rows: string[] = [];
  for (let y = 0; y < 12; y++) {
    let r = "";
    for (let x = 0; x < 12; x++) {
      if (x === 0 || y === 0 || x === 11 || y === 11) r += "k";
      else if (back) r += (x > 2 && x < 9 && y > 2 && y < 9) ? (x === y || x + y === 11 ? "k" : "b") : "a";
      else if (x === y || x + y === 11) r += "k";
      else r += (x < y) === (x + y < 11) ? "a" : "b";
    }
    rows.push(r);
  }
  return { palette: { a, b, k: "#212529" }, rows };
}
const KID: PixelArt = {
  palette: { h: "#343a40", s: "#f1c27d", r: "#c92a2a", w: "#fff", c: "#1c7ed6", k: "#212529", y: "#fab005" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", ".sssss..", "rrrrrrrr", ".cccccc.", "ccyccycc", "cccccccc", ".cc..cc.", ".kk..kk."],
};
const SNOW: PixelArt = { palette: { w: "#ffffff", g: "#dee2e6" }, rows: [".ww.", "wwww", "gwwg"] };
function persimmon(n: number): PixelArt {
  const rows: string[] = [];
  const r = n / 2;
  rows.push(".".repeat(Math.floor(r) - 1) + "gg" + ".".repeat(n - Math.floor(r) - 1));
  rows.push(".".repeat(Math.floor(r) - 2) + "gGGg" + ".".repeat(n - Math.floor(r) - 2));
  for (let y = 0; y < n - 1; y++) {
    let row = "";
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - (n - 1) / 2);
      if (d > r) row += ".";
      else if (d > r - 1) row += "d";
      else if (x < r - 1 && y < (n - 1) / 2 - 1 && x + y > r - 3) row += "h";
      else row += "o";
    }
    rows.push(row);
  }
  return { palette: { o: "#f76707", d: "#c2410c", h: "#ffa94d", g: "#2b8a3e", G: "#5c940d" }, rows };
}
const MAGPIE: PixelArt = {
  palette: { k: "#212529", w: "#f8f9fa", b: "#1864ab", y: "#495057" },
  rows: ["..kk....", ".kkkk...", "kkwkk...", "..kkkkbb", "..wwkkkb", "..wwwkk.", "...kk.kb", "...y..y."],
};
const BASKET: PixelArt = {
  palette: { b: "#a0703c", d: "#7c4f25", l: "#c4955a" },
  rows: ["dddddddddddddddddddd", "blblblblblblblblblbl", "lblblblblblblblblblb", "blblblblblblblblblbl", ".dddddddddddddddddd."],
};
const pebble = (a: string, b: string, h: string): PixelArt => ({ palette: { a, b, h }, rows: [".aaa.", "ahaab", "aaaab", "aaabb", ".bbb."] });
const STONES = [pebble("#4dabf7", "#1971c2", "#d0ebff"), pebble("#ffd43b", "#f08c00", "#fff3bf"), pebble("#69db7c", "#2b8a3e", "#d3f9d8"), pebble("#da77f2", "#9c36b5", "#f3d9fa")];
const MOTHER = pebble("#ff6b6b", "#c92a2a", "#ffe3e3");
const PALM: PixelArt = {
  palette: { s: "#f1c27d", d: "#d4a066", h: "#c92a2a", w: "#fff" },
  rows: [".s.s.s.s..", ".s.s.s.s..", ".sssssss..", "ssssssssss", "sssssssss.", ".sssssss..", "..ddddd...", "..hhhhh...", "..hwhwh..."],
};

async function ttakjiFlip(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#cfd8e3");
  for (let y = 20; y < 220; y += 30) for (let x = (y / 30) % 2 ? 0 : 40; x < W; x += 80) r.rect(x, y, 76, 4, "#b5c0cd");
  r.rect(0, 210, W, 14, "#8a5a3b");
  r.rect(0, 224, W, H - 224, "#efe6d8");
  for (let k = 0; k < 40; k++) r.rect((k * 197) % W, 250 + ((k * 61) % 360), 10, 6, "#e2d5c0");
  for (let k = 0; k < 7; k++) r.sprite(SNOW, 60 + k * 180, 236 + (k % 2) * 10, 10);
  r.sprite(KID, 1060, 150, 14);
  // the rival tile on the ground, mine slamming onto its edge, a won tile flying away
  r.rect(470, 470, 264, 24, "#000000", 0.12);
  r.sprite(tileArt("#e03131", "#1971c2", false), 590, 360, 22);
  r.sprite(tileArt("#ffd43b", "#495057", false), 600, 540, 12);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    r.rect(Math.round(600 + Math.cos(a) * 150), Math.round(545 + Math.sin(a) * 50), 12, 12, "#ffffff");
  }
  r.sprite(tileArt("#1971c2", "#e03131", true), 240, 330, 14);
  r.sprite(tileArt("#2f9e44", "#f08c00", true), 170, 420, 10);
  for (let k = 0; k < 4; k++) r.rect(880 + k * 20, 520 - k * 70, 12, 50, "#fab005");
  await save("ttakji-flip", r, titleSvg("딱지치기 · Ttakji Flip", "휙 쓸고 딱! 상대 딱지를 뒤집어라 — Swipe, slam, flip", 600, 96, "#ffffff"));
}

async function gotgamMobile(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#dbe4ff");
  for (let k = 0; k < 60; k++) r.rect((k * 167) % W, (k * 89) % 560, 6, 6, "#edf2ff");
  r.rect(0, 0, W, 70, "#495057");
  for (let x = 0; x < W; x += 48) r.rect(x, 56, 40, 26, "#343a40");
  r.rect(0, 82, W, 18, "#8a5a3b");
  r.rect(0, 560, W, 70, "#c0894a");
  // the main rod hangs level, a smaller rod hangs from its left end
  const cx = 760;
  r.rect(cx - 3, 100, 6, 130, "#212529");
  r.rect(cx - 330, 226, 660, 14, "#5c940d");
  r.rect(cx - 330, 226, 660, 5, "#82c91e");
  r.rect(cx - 8, 224, 16, 16, "#2f9e44");
  const hang = (x: number, y: number, n: number, sc: number) => {
    r.rect(x - 2, y, 4, 52, "#212529");
    r.sprite(persimmon(n), x, y + 52 + (n * sc) / 2, sc);
  };
  hang(cx + 300, 240, 8, 8);
  hang(cx + 150, 240, 10, 8);
  hang(cx - 150, 240, 6, 8);
  r.rect(cx - 302, 240, 4, 120, "#212529");
  r.rect(cx - 440, 356, 280, 12, "#5c940d");
  r.rect(cx - 440, 356, 280, 4, "#82c91e");
  r.rect(cx - 306, 354, 12, 12, "#2f9e44");
  hang(cx - 420, 368, 8, 7);
  hang(cx - 190, 368, 6, 7);
  r.sprite(MAGPIE, cx + 50, 205, 9);
  r.sprite(BASKET, 600, 590, 22);
  r.sprite(persimmon(8), 530, 560, 6);
  r.sprite(persimmon(10), 650, 556, 6);
  await save("gotgam-mobile", r, titleSvg("곶감 모빌", "Gotgam Mobile — 곶감을 걸어 대나무를 수평으로", 48, 160, "#3b2414", "start"));
}

async function gonggiToss(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#f2d38a");
  for (let y = 250; y < H; y += 110) r.rect(0, y, W, 4, "#e6c06e");
  for (let x = 0; x < W; x += 200) r.rect(x, 230, 4, H - 230, "#e6c06e");
  r.rect(0, 0, W, 220, "#fff9ef");
  for (let x = 0; x <= W; x += 80) r.rect(x, 0, 8, 220, "#8a5a3b");
  for (let y = 0; y <= 220; y += 54) r.rect(0, y, W, 8, "#8a5a3b");
  r.rect(0, 216, W, 18, "#8a5a3b");
  // stones scattered on the floor, the hand below, the red stone high in the air
  const pts = [[330, 420], [470, 470], [800, 430], [930, 500]];
  pts.forEach(([x, y], i) => {
    r.rect(x - 30, y + 26, 60, 10, "#000000", 0.12);
    r.sprite(STONES[i], x, y, 14);
  });
  r.sprite(PALM, 620, 560, 14);
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    r.rect(Math.round(620 + Math.cos(a) * 110), Math.round(520 + Math.sin(a) * 110 * 0.5), 10, 10, "#2f9e44");
  }
  for (let k = 0; k < 3; k++) r.rect(616, 460 - k * 40, 8, 22, "#ffffff", 0.6);
  r.sprite(MOTHER, 620, 300, 16);
  await save("gonggi-toss", r, titleSvg("공기놀이 · Gonggi Toss", "던지고, 줍고, 받고! — Toss, scoop, catch", 600, 96, "#3b2414"));
}

const only = process.argv.slice(2);
const jobs: Record<string, () => Promise<void>> = { "ttakji-flip": ttakjiFlip, "gotgam-mobile": gotgamMobile, "gonggi-toss": gonggiToss };
for (const [slug, job] of Object.entries(jobs)) if (!only.length || only.includes(slug)) await job();
