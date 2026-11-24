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
const DUCK: PixelArt = { palette: { y: "#ffd43b", o: "#fd7e14", k: "#212529" }, rows: ["..yy..", ".yyko.", ".yyyoo", "yyyyy.", "yyyyy.", ".yyy.."] };
const MOM: PixelArt = { palette: { w: "#f8f9fa", g: "#2b8a3e", o: "#fd7e14", k: "#212529", b: "#a87545" }, rows: ["...gg...", "..ggko..", "..gggoo.", "..ww....", ".wwwwww.", "bwwwwwww", ".wwwwww.", "..o..o.."] };

async function ducks(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#8ce99a");
  r.rect(340, 0, 600, H, "#e9d8a6");
  // two gates across the path, the parade marching up
  r.rect(370, 200, 260, 90, "#4dabf7");
  r.rect(650, 200, 260, 90, "#fa5252");
  r.sprite(MOM, 500, 470, 12);
  for (let k = 0; k < 18; k++) r.sprite(DUCK, 400 + (k % 6) * 40, 560 + Math.floor(k / 6) * 36, 6);
  await save("duck-parade", r, titleSvg("오리 행렬 · Duck Parade", "Pick the ×2 gate and the ducklings double", 640, 80, "#1b4332"));
}

async function cables(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#c8a27a");
  for (let y = 0; y < H; y += 40) r.rect(0, y, W, 3, "#b88a5c");
  // a knot of cables between plugs
  const pts: Array<[number, number]> = [[300, 260], [980, 300], [420, 600], [880, 620], [640, 420], [240, 480], [1060, 480]];
  const line = (a: [number, number], b: [number, number], c: string) => {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 4;
    for (let k = 0; k <= n; k++) r.rect(Math.round(a[0] + ((b[0] - a[0]) * k) / n) - 4, Math.round(a[1] + ((b[1] - a[1]) * k) / n) - 4, 9, 9, c);
  };
  const edges: Array<[number, number, string]> = [[0, 3, "#e03131"], [1, 2, "#e03131"], [5, 1, "#e03131"], [6, 0, "#e03131"], [4, 2, "#2b8a3e"], [4, 3, "#2b8a3e"]];
  for (const [a, b, c] of edges) line(pts[a], pts[b], c);
  const cols = ["#1971c2", "#e8590c", "#2f9e44", "#7048e8", "#c2255c", "#0c8599", "#f08c00"];
  pts.forEach(([x, y], k) => {
    r.rect(x - 26, y - 26, 52, 52, "#212529");
    r.rect(x - 22, y - 22, 44, 44, cols[k]);
    r.rect(x - 12, y - 8, 6, 16, "#f1f3f5");
    r.rect(x + 6, y - 8, 6, 16, "#f1f3f5");
  });
  await save("cable-knot", r, titleSvg("엉킨 전선 · Cable Knot", "Can you untangle every charging cable?", 640, 80, "#212529"));
}

async function roller(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#c4cad0");
  const s = 30;
  for (let y = 0; y < H; y += s) for (let x = (y / s) % 2 ? 0 : s; x < W; x += 2 * s) r.rect(x, y, s, s, "#ced4da");
  // a painted patch with a loop being closed
  r.rect(420, 330, 270, 240, "#e64980");
  for (let k = 0; k < 6; k++) r.rect(690 + k * s, 330, s, s, "#faa2c1");
  for (let k = 0; k < 5; k++) r.rect(840, 360 + k * s, s, s, "#faa2c1");
  r.rect(840, 510, s, s, "#212529");
  r.rect(844, 514, s - 8, s - 8, "#ffd43b");
  for (const [x, y] of [[300, 220], [980, 600], [1100, 300]]) {
    r.rect(x, y, 28, 28, "#1971c2");
    r.rect(x + 6, y + 6, 6, 6, "#ffffff");
  }
  await save("roller-claim", r, titleSvg("롤러 땅따기 · Roller Claim", "Loop back home and it's all yours", 640, 80, "#212529"));
}

await ducks();
await cables();
await roller();
