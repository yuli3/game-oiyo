// Bakes key art (1200×630 WebP) for the ninth batch of 2026-11-23 winter originals
// (jwibul-spin, sebaetdon-split, bureom-crack) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-23i-keyart.ts
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
const KID: PixelArt = {
  palette: { h: "#212529", s: "#f1c27d", r: "#c92a2a", b: "#364fc7", k: "#1a1a1a", w: "#f8f9fa" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", "rrrrrrrr", "rbbbbbbr", ".bbbbbb.", ".bb..bb.", ".kk..kk."],
};
const CAN: PixelArt = { palette: { g: "#adb5bd", d: "#495057", o: "#ff922b", y: "#ffd43b" }, rows: [".yoy.", "doyod", "dgggd", "dgdgd", "dgggd", ".ddd."] };
const TUFT: PixelArt = {
  palette: { y: "#d9b26f", b: "#a37a3f", d: "#6b4f2a" },
  rows: ["y..y.y..", ".y.yy.y.", "y.yyy.yy", ".yybyyb.", "byybbyyb", ".dddddd."],
};
const FLAME: PixelArt = {
  palette: { r: "#e8590c", o: "#ff922b", y: "#ffd43b", w: "#fff9db" },
  rows: ["...r....", "..ro..r.", ".rooro..", ".royyor.", "rooyyoor", "roywwyor", ".ryyyyr."],
};
const STACK: PixelArt = {
  palette: { y: "#e0b85a", b: "#b8893a", d: "#8a6526", k: "#5c4318" },
  rows: ["....dd....", "...dyyd...", "..dyybyd..", ".dyybyyyd.", ".dybyyybd.", "dyyybyyyyd", "dybyyyybyd", "dyyybyyyyd", "kddddddddk"],
};
const MOON: PixelArt = {
  palette: { y: "#fff3bf", w: "#fffbe6", g: "#ffe066" },
  rows: ["..yyyy..", ".ywwwyy.", "ywwwwgyy", "ywwgwwyy", "ywwwwwyy", "yywwwyyy", ".yyyyyy.", "..yyyy.."],
};
const ENVELOPE: PixelArt = {
  palette: { r: "#e03131", d: "#a51111", y: "#ffd43b", w: "#fff5f5" },
  rows: ["dddddddddddd", "drrrrrrrrrrd", "drdrrrrrrdrd", "drrdrrrrdrrd", "drrrdyydrrrd", "drrrryyrrrrd", "drrrrrrrrrrd", "drrrrrrrrrrd", "dddddddddddd"],
};
const GRANNY: PixelArt = {
  palette: { h: "#ced4da", s: "#f1c27d", k: "#343a40", p: "#c2255c", w: "#fff", g: "#2b8a3e" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", "pwwppwwp", "pppppppp", "gggggggg", "gggggggg"],
};
function bill(a: string, b: string, t: string): PixelArt {
  return { palette: { a, b, t }, rows: ["bbbbbbbbbbbbbb", "baaaaaaaaaaaab", "baattaaaaaaaab", "baattaaaatttab", "baaaaaaaaaaaab", "bbbbbbbbbbbbbb"] };
}
const BILLS = [bill("#ffe066", "#e67700", "#5c3200"), bill("#8ce99a", "#2b8a3e", "#123d1c"), bill("#ffa8a8", "#e8590c", "#6b2a06"), bill("#74c0fc", "#1c7ed6", "#0b3d6b")];
const COIN: PixelArt = { palette: { a: "#dee2e6", b: "#868e96", h: "#ffffff" }, rows: [".aaa.", "ahaab", "aaaab", "aaabb", ".bbb."] };
const NUTS: PixelArt[] = [
  { palette: { a: "#e9c58b", b: "#c9a063", d: "#8a6a3a" }, rows: [".aaa..", "abbaa.", "aaabaa", ".aaaab", "..abba", "..aaa.", ".abaa.", ".aaa.."] },
  { palette: { a: "#8b4a24", b: "#a85d2f", h: "#d08b55", d: "#e9c58b" }, rows: ["...a....", "..aaa...", ".abhaa..", "abhhbaa.", "abbbbbaa", "aabbbbba", ".dddddd.", "..dddd.."] },
  { palette: { a: "#b98a52", b: "#9a6c3a", d: "#6b4a26" }, rows: ["..aaaa..", ".abaaba.", "abaabaab", "aabbaaba", "abaabbaa", "baabaaba", ".abaaba.", "..aaaa.."] },
  { palette: { a: "#f1e3a8", b: "#d9c77a", d: "#a8944c" }, rows: ["..aa..", ".aaaa.", "aabaaa", "aaabaa", "aaaaab", ".aaab.", "..ab.."] },
  { palette: { a: "#f8f0dc", b: "#e0cfa8", d: "#b89f6f" }, rows: [".aa.", "aaab", "aabb", ".ab."] },
];
const TEETH: PixelArt = {
  palette: { w: "#ffffff", g: "#dee2e6", p: "#f783ac", d: "#c2255c" },
  rows: ["dddddddddddddddd", "pppppppppppppppp", "wwgwwgwwgwwgwwgw", "wwgwwgwwgwwgwwgw", "wwgwwgwwgwwgwwgw", ".w..w..w..w..w.."],
};
const TEETH_LOW: PixelArt = { palette: TEETH.palette, rows: TEETH.rows.slice().reverse() };

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

async function jwibulSpin(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 6) r.rect(0, y, W, 6, y < 440 ? (y < 160 ? "#0b1026" : y < 300 ? "#121a3d" : "#1b2752") : y < 520 ? "#3b2f22" : "#2b2219");
  const rand = rng(11);
  for (let k = 0; k < 70; k++) r.rect(Math.floor(rand() * W / 4) * 4, Math.floor(rand() * 300 / 4) * 4, 4, 4, "#ffffff", 0.4 + rand() * 0.6);
  r.sprite(MOON, 1060, 250, 14);
  // stubble rows
  for (let y = 452; y < H; y += 26) for (let x = (y / 26) % 2 ? 0 : 13; x < W; x += 26) r.rect(x, y, 4, 10, "#8a6a3a");
  // the ring of fire the can traces
  const cx = 600, cy = 400, R = 150;
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const fade = k / 64;
    r.rect(Math.round((cx + Math.cos(a) * R) / 6) * 6, Math.round((cy + Math.sin(a) * R * 0.55) / 6) * 6, 12, 12, fade > 0.6 ? "#ffd43b" : "#ff922b", 0.25 + fade * 0.75);
  }
  r.line(cx, cy - 30, cx + R, cy, "#868e96", 6);
  r.sprite(CAN, cx + R, cy, 9);
  r.sprite(KID, cx, cy - 20, 10);
  r.sprite(TUFT, 210, 520, 10);
  r.sprite(FLAME, 210, 460, 10);
  r.sprite(TUFT, 980, 540, 10);
  r.sprite(FLAME, 980, 480, 10);
  r.sprite(TUFT, 400, 580, 8);
  r.sprite(STACK, 820, 560, 9);
  await save("jwibul-spin", r, titleSvg("쥐불놀이 · Jwibul Fire Spin", "빙빙 돌려 불을 밝혀라 — Circle your finger, light the night", 520, 96, "#fff3bf"));
}

async function sebaetdonSplit(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#fff4e6");
  for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? 0 : 20; x < W; x += 40) r.rect(x, y, 6, 6, "#ffd8a8");
  r.rect(0, 470, W, 160, "#c08552");
  for (let x = 0; x < W; x += 60) r.rect(x, 470, 4, 160, "#a86b3c");
  r.sprite(GRANNY, 150, 380, 16);
  const xs = [470, 680, 890, 1100];
  xs.forEach((x, i) => {
    r.sprite(ENVELOPE, x, 330, 12);
    r.rect(x - 60, 400, 120, 34, "#ffffff");
    r.rect(x - 60, 400, 120, 4, i === 1 ? "#2b8a3e" : "#ced4da");
  });
  // bills fanned on the floor in front of granny
  BILLS.forEach((b, i) => r.sprite(b, 420 + i * 150, 540 + (i % 2) * 20, 8));
  r.sprite(COIN, 1060, 560, 9);
  r.sprite(COIN, 1110, 575, 9);
  await save("sebaetdon-split", r, titleSvg("세뱃돈 봉투 · Sebaetdon Envelopes", "봉투마다 딱 맞게 — Split the New Year money just right", 640, 110, "#7a1a1a"));
}

async function bureomCrack(): Promise<void> {
  const r = new Raster();
  for (let y = 0; y < H; y += 6) r.rect(0, y, W, 6, y < 470 ? (y < 200 ? "#ffe8cc" : "#ffd8a8") : "#a0663a");
  r.rect(0, 470, W, 6, "#7a4a24");
  // the bite: teeth above and below a walnut in mid-crack
  const cx = 600;
  r.sprite(TEETH, cx, 250, 14);
  r.sprite(TEETH_LOW, cx, 470, 14);
  r.sprite(NUTS[2], cx, 360, 13);
  r.line(cx - 10, 300, cx + 10, 360, "#3b2414", 8);
  r.line(cx + 10, 360, cx - 6, 410, "#3b2414", 8);
  // pressure gauge
  r.rect(1080, 220, 40, 300, "#495057");
  r.rect(1086, 226, 28, 288, "#e9ecef");
  r.rect(1086, 330, 28, 90, "#51cf66");
  r.rect(1086, 365, 28, 20, "#2b8a3e");
  r.rect(1070, 372, 60, 8, "#c92a2a");
  // nuts waiting on the tray
  [0, 1, 3, 4, 0].forEach((k, i) => r.sprite(NUTS[k], 130 + i * 90, 560, 8));
  const rand = rng(5);
  for (let k = 0; k < 22; k++) r.rect(cx - 120 + Math.floor(rand() * 60) * 4, 330 + Math.floor(rand() * 30) * 4, 8, 8, rand() < 0.5 ? "#e9c58b" : "#6b4a26");
  await save("bureom-crack", r, titleSvg("부럼 깨기 · Bureom Nut Crack", "꾹 깨물고, 딱! — Hold to bite, let go to crack", 600, 96, "#5c3200"));
}

const only = process.argv.slice(2);
const jobs: Record<string, () => Promise<void>> = { "jwibul-spin": jwibulSpin, "sebaetdon-split": sebaetdonSplit, "bureom-crack": bureomCrack };
for (const [slug, job] of Object.entries(jobs)) if (!only.length || only.includes(slug)) await job();
