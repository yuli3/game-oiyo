// Bakes key art (1200×630 WebP) for the nineteenth batch of winter originals (2026-11-24)
// (daljip-fire, scarf-knit, ipchun-brush) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-24j-keyart.ts
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
const HOUSE: PixelArt = { palette: { r: "#c92a2a", w: "#fff4e6", b: "#8c6a43", y: "#ffd43b" }, rows: ["...rr...", "..rrrr..", ".rrrrrr.", "rrrrrrrr", ".wwwwww.", ".wybbyw.", ".wwbbww."] };
const TREE: PixelArt = { palette: { g: "#2f9e44", l: "#69db7c", b: "#8c6a43" }, rows: ["..gg..", ".glgg.", "gglggg", "gggggg", ".gggg.", "..bb..", "..bb.."] };
const WELL: PixelArt = { palette: { s: "#868e96", b: "#1971c2", r: "#8c6a43" }, rows: ["rrrrrr", "r....r", "r....r", "ssssss", "sbbbbs", "ssssss"] };
const LANTERN: PixelArt = { palette: { k: "#343a40", o: "#ff922b", y: "#ffe066" }, rows: ["..k..", ".kkk.", ".oyo.", ".oyo.", ".kkk.", "..k..", "..k.."] };
const VAN: PixelArt = { palette: { w: "#f8f9fa", b: "#1971c2", k: "#212529", g: "#adb5bd" }, rows: ["bbbbbbbb..", "bwwwwwwbb.", "bwwwwwwbgb", "bbbbbbbbbb", ".kk....kk."] };

function person(r: Raster, x: number, y: number, col: string, facing: number, s: number): void {
  r.rect(x - 2 * s, y, 4 * s, 4 * s, "#f3c9a0");
  r.rect(x - 2 * s, y, 4 * s, s, "#212529");
  r.rect(x - 3 * s, y + 4 * s, 6 * s, 8 * s, col);
  r.rect(x - 3 * s, y + 12 * s, 2 * s, 6 * s, "#343a40");
  r.rect(x + s, y + 12 * s, 2 * s, 6 * s, "#343a40");
  r.rect(x + facing * s, y + s, s, s, "#212529");
}

async function commute(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#212529");
  // the same car, twice: one with a passenger's coat changed colour
  for (const [x0, odd] of [[60, false], [640, true]] as Array<[number, boolean]>) {
    r.rect(x0, 160, 500, 400, "#e9ecef");
    r.rect(x0, 420, 500, 50, "#4dabf7");
    r.rect(x0, 470, 500, 90, "#adb5bd");
    r.rect(x0 + 40, 220, 120, 80, "#1c2a4a");
    r.rect(x0 + 300, 220, 120, 80, "#1c2a4a");
    r.rect(x0 + 190, 200, 70, 44, "#7048e8");
    for (let k = 0; k < 5; k++) r.rect(x0 + 60 + k * 95, 165, 4, 40, "#868e96");
    person(r, x0 + 120, 330, "#1971c2", 1, 6);
    person(r, x0 + 360, 330, odd ? "#e03131" : "#2f9e44", -1, 6);
    r.rect(x0 + 230, 400, 50, 34, "#f08c00");
  }
  r.rect(590, 160, 20, 400, "#868e96");
  await save("odd-commute", r, titleSvg("이상한 출근길 · Odd Commute", "Something changed? Turn back.", 600, 90, "#f8f9fa"));
}

async function sofa(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#5c4033");
  // a zig-zag hall with landings, the sofa half way round a corner, the van at the top
  r.rect(120, 470, 80, 160, "#d8c3a5");
  r.rect(80, 380, 160, 160, "#d8c3a5");
  r.rect(160, 420, 760, 80, "#d8c3a5");
  r.rect(880, 380, 160, 160, "#d8c3a5");
  r.rect(920, 160, 80, 260, "#d8c3a5");
  r.sprite(VAN, 960, 170, 12);
  for (let k = 0; k < 14; k++) r.rect(400 + k * 16, 440, 14, 40, k === 0 ? "#2f9e44" : k === 13 ? "#f76707" : k % 4 === 0 ? "#9c36b5" : "#cc5de8");
  person(r, 380, 400, "#2f9e44", 1, 5);
  person(r, 650, 400, "#f76707", -1, 5);
  await save("sofa-carry", r, titleSvg("둘이서 소파 옮기기 · Sofa Carry", "You take the front, I take the back", 600, 90, "#fff4e6"));
}

async function village(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#74c0fc");
  for (let k = 0; k < 30; k++) r.rect((k * 113) % W, 160 + ((k * 71) % 460), 24, 4, "#a5d8ff");
  // a little island of grass tiles with a cosy village on it
  const x0 = 390, y0 = 262, s = 80;
  const land = ["..LLL..", ".LLLLL.", "LLLLLLL", ".LLLLL.", "..LLL.."];
  const what: Record<string, PixelArt> = { "1,1": TREE, "2,1": HOUSE, "3,1": TREE, "2,2": WELL, "1,2": HOUSE, "3,2": HOUSE, "4,2": LANTERN, "5,1": TREE, "4,1": HOUSE, "2,3": TREE, "3,3": HOUSE, "4,3": TREE, "5,2": TREE };
  land.forEach((row, y) => row.split("").forEach((ch, x) => {
    if (ch !== "L") return;
    r.rect(x0 + x * s - 120, y0 + y * s, s, 10, "#e9d8a6");
    r.rect(x0 + x * s - 120, y0 + y * s - s + 10, s - 2, s - 4, (x + y) % 2 ? "#8ce99a" : "#b2f2bb");
    const art = what[`${x},${y}`];
    if (art) r.sprite(art, x0 + x * s - 120 + s / 2, y0 + y * s - s / 2 + 8, 7);
  }));
  await save("palm-village", r, titleSvg("손바닥 마을 · Palm Village", "Build a tiny village, keep its picture", 600, 90, "#1c3d5a"));
}

await commute();
await sofa();
await village();
