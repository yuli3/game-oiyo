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
const TEDDY: PixelArt = { palette: { n: "#9c6b4e", l: "#d9a066", k: "#212529" }, rows: [".nn..nn.", "nnnnnnnn", "nknnnnkn", "nnnllnnn", "nnnkknnn", ".nnnnnn.", "nnllllnn", ".nn..nn."] };
const SOLDIER: PixelArt = { palette: { r: "#e03131", s: "#ffd8a8", k: "#212529", b: "#1971c2", y: "#fab005" }, rows: ["..rrrr..", "..rrrr..", "..ssss..", "..sksk..", "..ssss..", ".bbybb..", ".bbybb..", "..k..k.."] };
const ROCKET: PixelArt = { palette: { w: "#f8f9fa", r: "#e03131", o: "#fd7e14", d: "#1c7ed6" }, rows: ["...rr...", "..wwww..", "..wddw..", "..wwww..", "..wwww..", ".rwwwwr.", "rr.oo.rr", "...oo..."] };
const KNIGHT: PixelArt = { palette: { s: "#ced4da", d: "#495057", b: "#1971c2" }, rows: ["..ssss..", ".ssddss.", ".ssssss.", "..ssss..", "bbsssss.", "bbbssss.", "bb.ss.s.", "..d..d.."] };
const ARCHER: PixelArt = { palette: { g: "#2f9e44", s: "#ffd8a8", w: "#a87545", k: "#212529" }, rows: ["..gggg..", ".gggggg.", "..ssss.w", "..sksk.w", "..ssss.w", ".gggggww", ".gggggw.", "..k..k.."] };
const MAGE: PixelArt = { palette: { p: "#7048e8", s: "#ffd8a8", y: "#fab005", k: "#212529" }, rows: ["...pp...", "..pppp..", ".pppppp.", "..ssss.y", "..sksk.y", ".pppppp.", ".pppppp.", "..k..k.."] };
const CAT: PixelArt = { palette: { c: "#f08c00", k: "#212529" }, rows: [".c...c.", ".ccccc.", ".ckcck.", "ccccccc", "c.c.c.c"] };
const DARKCAT: PixelArt = { palette: { c: "#343a40", k: "#c0eb75" }, rows: [".c...c.", ".ccccc.", ".ckcck.", "ccccccc", "c.c.c.c"] };

async function toys(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#2b2140");
  r.rect(0, 430, W, 30, "#c9a27a");
  r.rect(0, 250, W, 10, "#c9a27a");
  // my line on the left facing their line on the right
  [TEDDY, KNIGHT, SOLDIER, ROCKET].forEach((s, i) => r.sprite(s, 520 - i * 120, 360, 12));
  [SOLDIER, TEDDY, ROCKET].forEach((s, i) => r.sprite(s, 760 + i * 120, 360, 12, true));
  const R = rng(251);
  for (let k = 0; k < 40; k++) r.rect(600 + Math.floor(R() * 140), 300 + Math.floor(R() * 100), 8, 8, k % 2 ? "#ffd43b" : "#ffffff");
  await save("toy-box-brawl", r, titleSvg("장난감 상자 대전 · Toy Box Brawl", "Line your toys up right and they win on their own", 640, 80, "#f8f9fa"));
}

async function guards(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1f2d1f");
  // the loop track, the camp's posts, monsters on the way round
  r.rect(260, 170, 760, 30, "#8a6a45");
  r.rect(260, 600, 760, 30, "#8a6a45");
  r.rect(260, 170, 30, 460, "#8a6a45");
  r.rect(990, 170, 30, 460, "#8a6a45");
  const posts = [ARCHER, MAGE, ARCHER, MAGE, MAGE, ARCHER, ARCHER, MAGE];
  posts.forEach((s, i) => {
    const x = 400 + (i % 4) * 140;
    const y = 300 + Math.floor(i / 4) * 150;
    r.rect(x - 60, y - 60, 120, 120, "#2b4a2b");
    r.sprite(s, x, y, 10);
  });
  for (let k = 0; k < 9; k++) r.rect(300 + k * 80, 176, 20, 20, "#e8590c");
  r.rect(980, 360, 40, 40, "#c92a2a");
  await save("summon-guard", r, titleSvg("소환 수비대 · Summon Guard", "Summon on luck, merge into legends", 640, 90, "#ffe066"));
}

async function cats(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1c2541");
  r.rect(1080, 120, 50, 50, "#fff3bf");
  const walls = ["#614c3e", "#4a4f5a", "#6e4a40", "#535a45", "#5d4a5e"];
  let x = 0;
  const R = rng(261);
  while (x < W) {
    const w = 140 + Math.floor(R() * 120);
    const h = 260 + Math.floor(R() * 260);
    const y = H - h;
    r.rect(x, y, w, h, walls[Math.floor(R() * walls.length)]);
    r.rect(x - 4, y - 16, w + 8, 18, "#2a2d36");
    for (let wy = y + 30; wy < H - 40; wy += 70)
      for (let wx = x + 20; wx < x + w - 40; wx += 56) r.rect(wx, wy, 30, 40, R() < 0.4 ? "#ffe066" : "#24345e");
    x += w;
  }
  r.sprite(CAT, 300, 520, 8);
  r.sprite(DARKCAT, 760, 455, 8);
  r.sprite(CAT, 980, 610, 8);
  await save("rooftop-cats", r, titleSvg("지붕 위 고양이 · Rooftop Cats", "How many cats are hiding on these roofs?", 640, 80, "#f8f9fa"));
}

await toys();
await guards();
await cats();
