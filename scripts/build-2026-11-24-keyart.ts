// Bakes key art (1200×630 WebP) for the tenth batch of winter originals (2026-11-24)
// (ice-sledge, snow-roll, jachigi) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-24-keyart.ts
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
const SLEDGE: PixelArt = {
  palette: { k: "#212529", h: "#c92a2a", s: "#f1c27d", c: "#1c7ed6", w: "#8a5a3b", d: "#5c3a21", m: "#adb5bd" },
  rows: ["..kkkk..", ".khhhhk.", ".hhsshh.", "cccssccc", "cccccccc", ".cccccc.", "wwwwwwww", "wdwwwwdw", "wwwwwwww", "m......m"],
};
const RIVAL: PixelArt = { palette: { ...SLEDGE.palette, h: "#2f9e44", c: "#f08c00" }, rows: SLEDGE.rows };
const STRAW: PixelArt = { palette: { y: "#e0b85a", b: "#b8893a", d: "#8a6526" }, rows: [".yyyyyy.", "yybyybyy", "dddddddd", "ybyyybyy", "yyybyyyb", ".yyyyyy."] };
const REED: PixelArt = { palette: { g: "#868e96", b: "#a37a3f" }, rows: ["b.b", "g.g", "gbg", ".g.", ".g."] };
const KID: PixelArt = {
  palette: { k: "#212529", h: "#e03131", s: "#f1c27d", c: "#364fc7", m: "#ffd43b", b: "#495057" },
  rows: ["..hhhh..", ".hhhhhh.", ".kssssk.", "..ssss..", "mcccccm.", ".cccccc.", ".cc..cc.", ".bb..bb."],
};
const FACE: PixelArt = { palette: { k: "#212529", o: "#f76707" }, rows: ["k...k", ".....", "..oo.", ".k.k.", "..k.."] };
const SCARF: PixelArt = { palette: { r: "#e03131", d: "#a51111" }, rows: ["rrrrrrrr", "drrrrrrd", "......rr", "......rd"] };
const ROCK: PixelArt = { palette: { a: "#868e96", b: "#adb5bd", d: "#495057", w: "#ffffff" }, rows: ["..wwww..", ".wwbbaa.", "abbbaaad", "abaaaadd", "aaaadddd", ".dddddd."] };
const BATTER: PixelArt = {
  palette: { k: "#212529", h: "#495057", s: "#f1c27d", r: "#c92a2a", b: "#364fc7", w: "#f8f9fa" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", ".rrrrrr.", "srrrrrrs", ".rrrrrr.", ".bbbbbb.", ".bb..bb.", ".kk..kk."],
};
const FIELDER: PixelArt = {
  palette: { k: "#212529", h: "#2b8a3e", s: "#f1c27d", g: "#2f9e44", b: "#5c3a21" },
  rows: ["s......s", "s.hhhh.s", "shhhhhhs", ".hsssss.", ".skssks.", "..ssss..", ".gggggg.", "gggggggg", ".gggggg.", ".bb..bb.", ".kk..kk."],
};
const PERSIMMON: PixelArt = { palette: { o: "#f76707", d: "#d9480f", g: "#2b8a3e" }, rows: [".g.", "ooo", "odo", ".o."] };

function disc(r: Raster, cx: number, cy: number, rad: number, fill: string, hi: string): void {
  for (let y = -rad; y <= rad; y += 4) for (let x = -rad; x <= rad; x += 4) {
    const d = Math.hypot(x, y);
    if (d > rad) continue;
    const lit = Math.hypot(x + rad * 0.3, y + rad * 0.3) < rad * 0.6;
    r.rect(cx + x, cy + y, 4, 4, d > rad - 6 ? "#9fb6cc" : lit ? hi : fill);
  }
}

async function iceSledge(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#eef5fb");
  // the frozen stream sweeping across the picture
  for (let y = 0; y < H; y += 6) {
    const cx = 600 + Math.sin(y / 140) * 160;
    r.rect(Math.round(cx - 300), y, 600, 6, "#cfe3f3");
    r.rect(Math.round(cx - 280), y, 560, 6, y % 66 === 0 ? "#d8ecfa" : "#a9d2ee");
  }
  const rand = rng(5);
  for (let k = 0; k < 40; k++) r.rect(Math.floor(rand() * W), Math.floor(rand() * H), 30, 3, "#ffffff", 0.6);
  for (let y = 20; y < H; y += 80) { r.sprite(REED, 600 + Math.sin(y / 140) * 160 - 320, y, 8); r.sprite(REED, 600 + Math.sin((y + 40) / 140) * 160 + 320, y + 40, 8); }
  r.sprite(STRAW, 860, 170, 9);
  // a hole in the ice
  for (let y = -40; y <= 40; y += 4) for (let x = -56; x <= 56; x += 4) if ((x / 56) ** 2 + (y / 40) ** 2 < 1) r.rect(380 + x, 300 + y, 4, 4, (x / 56) ** 2 + (y / 40) ** 2 > 0.75 ? "#e7f5ff" : "#1c3d5a");
  r.sprite(RIVAL, 760, 300, 9);
  r.sprite(RIVAL, 470, 250, 8);
  r.sprite(SLEDGE, 600, 450, 13);
  // the two sticks digging in, with ice spray
  r.rect(520, 440, 10, 90, "#495057");
  r.rect(670, 470, 10, 90, "#495057");
  for (let k = 0; k < 30; k++) r.rect(500 + Math.floor(rand() * 200), 520 + Math.floor(rand() * 60), 6, 6, "#ffffff", 0.8);
  await save("ice-sledge", r, titleSvg("얼음썰매 레이스 · Ice Sledge Race", "왼쪽, 오른쪽, 쭉쭉! — Pole left, right, faster", 600, 80, "#0b3d6b"));
}

async function snowRoll(): Promise<void> {
  const r = new Raster();
  // a snowy yard with a bare trail behind the rolling ball
  for (let y = 0; y < H; y += 12) for (let x = 0; x < W; x += 12) r.rect(x, y, 12, 12, (x + y) % 36 ? "#f8fbff" : "#eef4fb");
  for (let k = 0; k < 90; k++) {
    const t = k / 90;
    const x = 120 + t * 560;
    const y = 560 - Math.sin(t * Math.PI) * 220 - t * 80;
    r.rect(Math.round(x / 12) * 12 - 24, Math.round(y / 12) * 12 - 12, 48, 24, (k % 3) ? "#8a9a73" : "#7a8963");
  }
  r.sprite(ROCK, 1000, 520, 9);
  r.sprite(ROCK, 220, 170, 7);
  // the finished snowman, and the growing ball with the kid pushing it
  disc(r, 930, 400, 120, "#dde8f2", "#ffffff");
  disc(r, 930, 220, 78, "#dde8f2", "#ffffff");
  r.sprite(FACE, 930, 220, 12);
  r.sprite(SCARF, 930, 300, 11);
  disc(r, 690, 400, 70, "#dde8f2", "#ffffff");
  r.sprite(KID, 590, 430, 10);
  await save("snow-roll", r, titleSvg("눈덩이 굴리기 · Snowball Roll", "굴릴수록 커져요 — Roll it, grow it, build it", 600, 90, "#1c3d5a"));
}

async function jachigi(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 6) r.rect(0, y, W, 6, y < 300 ? "#cfe2f3" : y < 440 ? "#e7f0f8" : "#c9b48a");
  for (let x = 0; x < W; x += 240) for (let k = 0; k < 20; k++) r.rect(x + 120 - k * 6, 440 - 80 + k * 4, k * 12, 4, "#b5c7d6");
  for (let y = 456; y < H; y += 24) for (let x = (y / 24) % 2 ? 0 : 12; x < W; x += 24) r.rect(x, y, 4, 10, "#a98f63");
  r.rect(0, 438, W, 4, "#ffffff");
  // persimmon branch and fielders
  r.rect(1080, 0, 26, 230, "#5c3a21");
  r.rect(760, 220, 340, 14, "#5c3a21");
  for (let x = 790; x < 1080; x += 60) r.sprite(PERSIMMON, x, 248, 8);
  r.sprite(FIELDER, 860, 380, 10);
  r.sprite(FIELDER, 1060, 380, 10);
  r.sprite(BATTER, 180, 380, 12);
  // the long stick mid-swing and the short stick flying over everyone
  r.line(220, 330, 420, 240, "#8a5a3b", 12);
  const pts = Array.from({ length: 40 }, (_, k) => k / 40);
  for (const t of pts) r.rect(Math.round((430 + t * 640) / 6) * 6, Math.round((230 - Math.sin(t * Math.PI) * 170 + t * 60) / 6) * 6, 6, 6, "#ffffff", 0.35 + t * 0.4);
  r.line(700, 90, 760, 70, "#c0894a", 12);
  await save("jachigi", r, titleSvg("자치기 · Jachigi Stick Bat", "톡 띄우고 딱! — Flick it up, whack it far", 600, 540, "#ffffff"));
}

await iceSledge();
await snowRoll();
await jachigi();
