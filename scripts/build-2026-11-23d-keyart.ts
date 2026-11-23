// Bakes key art (1200×630 WebP) for the fourth batch of 2026-11-23 winter originals
// (sheep-herd, snowflake-cut, pond-stones) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-23d-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import sharp from "sharp";
import { join } from "node:path";
import { PUZZLES, flakeRaster } from "../src/lib/games/snowflake-cut";
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
const SHEEP: PixelArt = {
  palette: { w: "#ffffff", g: "#dfe6ee", k: "#2b2b2b", s: "#f3d6c0" },
  rows: [".wwwww...", "wwgwwwwkk", "wwwwwgkks", "gwwwwwkk.", ".wwwwww..", ".k.k.k.k."],
};
const GOAT: PixelArt = {
  palette: { b: "#2b2b30", d: "#45454d", h: "#c9b48a", e: "#ffd43b" },
  rows: ["......h.h", ".bbbbb.bb", "bbdbbbbeb", "bbbbbdbb.", ".bbbbbb..", ".b.b.b.b."],
};
const DOG: PixelArt = {
  palette: { o: "#d9822b", w: "#fff4e6", k: "#2b1d16", r: "#e03131" },
  rows: ["o......o.", "o.....ooo", ".ooooookw", ".oooooww.", ".wwrwwo..", ".o.o.o.o."],
};
const PINE: PixelArt = {
  palette: { g: "#2b6a4a", d: "#1f4d36", w: "#ffffff", t: "#6b4426" },
  rows: ["...w...", "..wgw..", "..ggg..", ".wgggw.", ".ggdgg.", "wgggggw", "ggdggdg", "...t...", "...t..."],
};
const SCISSORS: PixelArt = {
  palette: { k: "#212529", r: "#e03131", s: "#ced4da", w: "#f8f9fa" },
  rows: ["s.......s", "ws.....sw", ".ws...sw.", "..ws.sw..", "...wsw...", "....k....", "..rr.rr..", ".r..r..r.", ".r..r..r.", "..rr.rr.."],
};
function stoneArt(handle: string): PixelArt {
  return {
    palette: { g: "#868e96", d: "#5c636a", l: "#ced4da", h: handle, k: "#343a40" },
    rows: ["..dddd..", ".dggggd.", "dglhhgld", "dghhhhgd", "dgghhggd", "dggggggd", ".dkkkkd.", "..dddd.."],
  };
}
const BROOM: PixelArt = {
  palette: { b: "#8a5a3b", y: "#f2c14e", d: "#c9971c" },
  rows: ["....b", "...b.", "..b..", ".b...", "yyy..", "ydy..", "yyy.."],
};

async function sheepHerd(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#cfe6ff", "#e3f0ff", "#f4f8fc"], ground: ["#f4f8fc", "#e9f0f7"], groundShare: 0.7, hills: "#dbe7f3", seed: 33 }, 6);
  // pen with straw on the right, a fence and a red-post gate
  r.rect(820, 230, 300, 190, "#e8d49a");
  for (let y = 242; y < 420; y += 18) for (let x = 828 + ((y / 18) % 2) * 10; x < 1110; x += 26) r.rect(x, y, 12, 4, "#d9c27e");
  for (let x = 820; x <= 1120; x += 6) r.rect(x, 226, 6, 8, "#8a5a3b");
  for (let y = 230; y <= 420; y += 6) {
    r.rect(816, y, 8, 6, "#8a5a3b");
    r.rect(1116, y, 8, 6, "#8a5a3b");
  }
  for (let x = 820; x <= 1120; x += 6) if (x < 900 || x > 1040) r.rect(x, 416, 6, 8, "#8a5a3b");
  for (let x = 820; x <= 1120; x += 60) r.rect(x - 3, 218, 12, 20, "#6b4426");
  r.rect(892, 396, 14, 32, "#c92a2a");
  r.rect(1036, 396, 14, 32, "#c92a2a");
  // sheep already inside
  r.sprite(SHEEP, 900, 290, 7);
  r.sprite(SHEEP, 1010, 340, 7, true);
  // the flock streaming toward the gate, one goat sulking
  const flock: Array<[number, number, boolean]> = [[970, 470, false], [890, 500, false], [810, 470, false], [730, 510, false], [850, 545, false], [650, 480, false], [760, 555, false]];
  for (const [x, y, f] of flock) {
    r.rect(x - 30, y + 18, 60, 8, "#000000", 0.08);
    r.sprite(SHEEP, x, y, 7, f);
  }
  r.sprite(GOAT, 470, 545, 7, true);
  r.sprite(DOG, 560, 530, 7);
  for (const [dx, dy] of [[-60, 10], [-84, -2], [-104, 14]]) r.rect(560 + dx, 530 + dy, 12, 12, "#ffffff");
  r.sprite(PINE, 130, 430, 12);
  r.sprite(PINE, 320, 380, 8);
  await save("sheep-herd", r, titleSvg("양떼 몰이 · Snowfield Sheepdog", "2027 양띠 해, 강아지로 양떼를 우리에 — Herd the flock with your finger", 600, 90, "#1f2937"));
}

async function snowflakeCut(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#0b1d3a", "#132a52", "#1d3b6b"], stars: 0.6, starColor: "#dbe4ff", seed: 27 }, 6);
  // unfolded flakes from the real puzzles, drawn as chunky pixels
  const flake = (stage: number, cx: number, cy: number, size: number, px: number) => {
    const p = PUZZLES[stage];
    const raster = flakeRaster(p.grid, size);
    const at = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && raster[y * size + x] >= 0 && p.target[raster[y * size + x]];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (!at(x, y)) continue;
      const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      r.rect(Math.round(cx - (size * px) / 2 + x * px), Math.round(cy - (size * px) / 2 + y * px), px, px, edge ? "#a5d8ff" : (x + y) % 7 === 0 ? "#e7f5ff" : "#ffffff");
    }
  };
  flake(27, 600, 390, 64, 6);
  flake(12, 200, 430, 40, 5);
  flake(3, 1000, 440, 40, 5);
  r.sprite(SCISSORS, 870, 230, 9);
  for (const [x, y] of [[770, 210], [800, 270], [730, 250]]) r.rect(x, y, 10, 10, "#ffffff", 0.8);
  await save("snowflake-cut", r, titleSvg("눈송이 오리기 · Paper Snowflake", "접은 종이를 그어 오려 똑같은 눈송이 — Snip the fold, match the flake", 600, 80, "#f8f9fa"));
}

async function pondStones(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#dbeefe", "#cfe6fb", "#c3def8"], seed: 61 }, 6);
  for (let k = 0; k < 40; k++) r.rect((k * 233) % W, (k * 131) % H, 24 + (k % 3) * 12, 4, "#ffffff", 0.6);
  for (let x = 0; x < W; x += 16) r.rect(x, H - 30 - ((x / 16 + 1) % 3) * 6, 16, 40, "#ffffff");
  const ring = (cx: number, cy: number, rad: number, hex: string) => {
    for (let y = -rad; y <= rad; y += 6) for (let x = -rad; x <= rad; x += 6) if (x * x + y * y <= rad * rad) r.rect(cx + x, cy + y, 6, 6, hex);
  };
  ring(900, 360, 170, "#e03131");
  ring(900, 360, 108, "#ffffff");
  ring(900, 360, 48, "#339af0");
  r.rect(888, 348, 24, 24, "#ffffff");
  r.sprite(stoneArt("#fab005"), 880, 380, 9);
  r.sprite(stoneArt("#e03131"), 1010, 280, 9);
  r.sprite(stoneArt("#e03131"), 640, 420, 9);
  // a yellow stone curling in with a broom rubbing ahead
  for (let k = 0; k <= 10; k++) {
    const t = k / 12;
    const x = 120 + t * 520;
    const y = 560 - t * 120 - Math.sin(t * Math.PI) * 80;
    if (k % 2 === 0) r.rect(Math.round(x), Math.round(y), 10, 10, "#1f2937", 0.45);
  }
  r.sprite(stoneArt("#fab005"), 500, 420, 9);
  r.sprite(BROOM, 590, 380, 10);
  for (const [dx, dy] of [[-30, 30], [10, 46], [40, 20]]) r.rect(570 + dx, 390 + dy, 10, 10, "#ffffff");
  await save("pond-stones", r, titleSvg("얼음 돌 밀기 · Pond Stones", "당겨 던지고 얼음을 문질러라, 둘이서도 — Slide, curl, rub the ice", 600, 90, "#1f2937"));
}

const only = process.argv.slice(2);
const jobs: Record<string, () => Promise<void>> = { "sheep-herd": sheepHerd, "snowflake-cut": snowflakeCut, "pond-stones": pondStones };
for (const [slug, job] of Object.entries(jobs)) if (!only.length || only.includes(slug)) await job();
