// Bakes key art (1200×630 WebP) for the fifth batch of 2026-11-23 winter originals
// (wish-lanterns, hotteok-flip, snow-tracks) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-23e-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import sharp from "sharp";
import { join } from "node:path";
import { PUZZLES, solve } from "../src/lib/games/snow-tracks";
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
const LANTERN: PixelArt = {
  palette: { r: "#e8590c", o: "#ff922b", y: "#ffd43b", w: "#fff3bf", k: "#5c3d2e" },
  rows: ["..kkkk..", ".orrrro.", "orryyrro", "oryywyro", "oryywyro", "orryyrro", ".orrrro.", "..kkkk..", "...yy..."],
};
const BIRD: PixelArt = { palette: { k: "#1b1f3b", w: "#e9ecef" }, rows: ["k.....k", ".k...k.", "..kwk..", "...k..."] };
const ROOF: PixelArt = {
  palette: { d: "#141a33", g: "#20294a", w: "#ffd43b" },
  rows: ["d..............d", "dd............dd", ".dddddddddddddd.", "..gggggggggggg..", "..gggwwgggwwggg.", "..gggwwgggwwggg.", "..gggggggggggg.."],
};
const LAMP: PixelArt = {
  palette: { k: "#2b2b30", y: "#ffd43b", w: "#fff9db", o: "#f08c00" },
  rows: ["...kk...", "...kk...", ".kkkkkk.", "kooooook", ".yywwyy.", "..yyyy.."],
};
const PLATE: PixelArt = {
  palette: { w: "#f8f9fa", g: "#ced4da", b: "#4dabf7" },
  rows: ["..wwwwwwwwwwww..", "wwgggggggggggggww", ".wwbwwwwwwwwbww.", "...wwwwwwwwww..."],
};
const PINE: PixelArt = {
  palette: { g: "#2b6a4a", d: "#1f4d36", w: "#ffffff", t: "#6b4426" },
  rows: ["...w...", "..wgw..", "..ggg..", ".wgggw.", ".ggdgg.", "wgggggw", "ggdggdg", "...t..."],
};
const ANIMALS: PixelArt[] = [
  { palette: { w: "#ffffff", p: "#f783ac", k: "#212529", g: "#dee2e6" }, rows: [".w...w..", ".wp..wp.", ".ww.ww..", "wwwwwww.", "wkwwwkw.", "wwwpwww.", ".wwwwwg.", "..g..g.."] },
  { palette: { o: "#f76707", w: "#fff4e6", k: "#212529" }, rows: ["o.....o.", "oo...oo.", "ooooooo.", "okoooko.", "wwwkwww.", ".wwwww..", "..ooooww", "...o..ww"] },
  { palette: { b: "#a0522d", d: "#6f3a1d", w: "#fff4e6", k: "#212529" }, rows: ["d.d..d.d", ".d....d.", "..bbbb..", ".bkbbkb.", ".bbbbbb.", "..bwwb..", "..bbbb..", "..b..b.."] },
  { palette: { k: "#1b1f3b", w: "#ffffff", b: "#1c7ed6" }, rows: ["..kkk...", ".kkwk...", "kkkkkk..", ".wwwkkbb", ".wwwkkbb", "..kkk.bb", "...k....", "..kk...."] },
  { palette: { b: "#5c4033", d: "#3b2a20", p: "#e8a0a0", w: "#fff4e6" }, rows: ["........", ".d....d.", "bbbbbbb.", "bdbbbdbb", "bbbbbppw", "bbbbbbb.", ".b.b.b..", ".d.d.d.."] },
  { palette: { r: "#c2410c", d: "#7c2d12", w: "#fff4e6", k: "#212529" }, rows: ["r....rr.", ".r..rrrr", ".rrrrrrr", "rkrrrrr.", "rrwrrr..", ".rrrr...", ".rr.rr..", "........"] },
];
const TRAIL = ["#e64980", "#f76707", "#8d5524", "#1c7ed6", "#5c940d", "#ae3ec9", "#0ca678"];

function glow(r: Raster, cx: number, cy: number, rad: number, hex: string, peak: number): void {
  for (let y = -rad; y <= rad; y += 6) for (let x = -rad; x <= rad; x += 6) {
    const d = Math.hypot(x, y) / rad;
    if (d < 1) r.rect(cx + x, cy + y, 6, 6, hex, peak * (1 - d) * (1 - d));
  }
}

async function wishLanterns(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#070b24", "#0f1b45", "#22306b"], stars: 0.7, starColor: "#e7f5ff", orb: { x: 0.1, y: 0.5, r: 10, color: "#fff9db", glow: "#ffe066" }, seed: 15 }, 6);
  // a row of village roofs at the bottom
  for (let x = -40; x < W; x += 150) r.sprite(ROOF, x + 70, 580, 9);
  // power line with a gap the lanterns slip through
  for (const [a, b] of [[0, 520], [700, W]]) r.line(a, 330 + (a > 0 ? 6 : 0), b, 336, "#495057", 6);
  r.rect(514, 318, 12, 30, "#343a40");
  r.rect(694, 318, 12, 30, "#343a40");
  // a rising line of lanterns, glowing
  const ls: Array<[number, number, number]> = [[600, 470, 8], [560, 380, 8], [610, 270, 7], [730, 230, 7], [880, 210, 6], [1010, 190, 6], [1120, 150, 5], [380, 520, 8]];
  for (const [x, y] of ls) glow(r, x, y, 90, "#ffa94d", 0.45);
  for (const [x, y, s] of ls) r.sprite(LANTERN, x, y, s);
  // breeze strokes from the finger
  for (let k = 0; k < 8; k++) r.rect(420 + k * 18, 420 - k * 10, 12, 6, "#ffffff", 0.55);
  r.sprite(BIRD, 260, 220, 7);
  // home stars row
  for (let k = 0; k < 6; k++) r.rect(760 + k * 60, 50, 12, 12, "#ffe066");
  await save("wish-lanterns", r, titleSvg("소원등 날리기 · Wish Lanterns", "손끝 바람으로 소원등을 달까지 — Breeze your wishes to the moon", 48, 110, "#fff3bf", "start"));
}

async function hotteokFlip(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#141b38", "#1f2a52", "#2f3d6b"], stars: 0.35, starColor: "#dee2e6", seed: 44 }, 6);
  // stall awning stripes
  for (let x = 0; x < W; x += 60) r.rect(x, 150, 60, 42, (x / 60) % 2 ? "#f8f9fa" : "#e03131");
  for (let x = 0; x < W; x += 60) r.rect(x + 6, 192, 48, 12, (x / 60) % 2 ? "#f8f9fa" : "#e03131");
  r.sprite(LAMP, 260, 240, 8);
  r.sprite(LAMP, 940, 240, 8);
  glow(r, 260, 280, 150, "#ffd43b", 0.25);
  glow(r, 940, 280, 150, "#ffd43b", 0.25);
  // griddle and burner flames
  r.rect(150, 470, 900, 26, "#343a40");
  r.rect(150, 466, 900, 6, "#868e96");
  r.rect(170, 496, 860, 80, "#212529");
  for (let x = 200; x < 1000; x += 36) r.rect(x, 500, 18, 14, "#4dabf7", 0.9);
  // hotteok: one resting, one mid-flip, one tilted
  const cake = (cx: number, cy: number, ang: number, top: string, bottom: string) => {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    for (let u = -96; u <= 96; u += 6) for (let v = -18; v <= 18; v += 6) {
      if (u * u / (96 * 96) + v * v / (24 * 24) > 1.05) continue;
      r.rect(Math.round(cx + u * c - v * s), Math.round(cy + u * s + v * c), 7, 7, v < 0 ? top : bottom);
    }
  };
  cake(330, 442, 0, "#f0d39a", "#d9902f");
  cake(640, 270, 2.2, "#d9902f", "#f0d39a");
  cake(880, 442, 0, "#d9902f", "#d9902f");
  for (let k = 0; k < 5; k++) r.rect(580 + k * 26, 420 - k * 26, 10, 10, "#ffffff", 0.5);
  // sugar specks and steam
  for (const [x, y] of [[300, 400], [350, 390], [860, 395], [905, 405]]) r.rect(x, y, 8, 18, "#ffffff", 0.35);
  r.sprite(PLATE, 1080, 400, 7);
  await save("hotteok-flip", r, titleSvg("호떡 뒤집기 · Hotteok Flip", "손가락으로 튕겨 공중에서 뒤집기 — Flick, spin, land it golden", 600, 92, "#fff3bf"));
}

async function snowTracks(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#cfe6ff", "#e3f0ff", "#f4f8fc"], ground: ["#f4f8fc", "#e9f0f7"], groundShare: 0.8, hills: "#dbe7f3", seed: 52 }, 6);
  const p = PUZZLES[20];
  const ans = solve(p, 1).first!;
  const cell = 60;
  const x0 = 600 - (p.w * cell) / 2 + 160;
  const y0 = 180;
  r.rect(x0 - 8, y0 - 8, p.w * cell + 16, p.h * cell + 16, "#a5c8e6");
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = y * p.w + x;
    r.rect(x0 + x * cell + 2, y0 + y * cell + 2, cell - 4, cell - 4, "#ffffff");
    if (p.tree[i]) r.sprite(PINE, x0 + x * cell + cell / 2, y0 + y * cell + cell / 2, 6);
  }
  // draw every trail except the last animal's, which is left for the player
  const left = p.animals - 1;
  for (let i = 0; i < ans.length; i++) {
    const a = ans[i];
    if (a < 0 || a === left || p.tree[i]) continue;
    const x = i % p.w;
    const y = Math.floor(i / p.w);
    for (const j of [i + 1, i + p.w]) {
      if (j >= ans.length || ans[j] !== a || (j === i + 1 && x === p.w - 1)) continue;
      const jx = j % p.w;
      const jy = Math.floor(j / p.w);
      r.line(x0 + x * cell + cell / 2 - 6, y0 + y * cell + cell / 2 - 6, x0 + jx * cell + cell / 2 - 6, y0 + jy * cell + cell / 2 - 6, TRAIL[a], 12);
    }
    r.rect(x0 + x * cell + 18, y0 + y * cell + 22, 8, 10, "#212529", 0.35);
    r.rect(x0 + x * cell + 34, y0 + y * cell + 28, 8, 10, "#212529", 0.35);
  }
  for (let a = 0; a < Math.min(p.animals, ANIMALS.length); a++) {
    const d = p.den[a];
    r.sprite(ANIMALS[a], x0 + (d % p.w) * cell + cell / 2, y0 + Math.floor(d / p.w) * cell + cell / 2, 6);
    const f = p.food[a];
    r.rect(x0 + (f % p.w) * cell + 14, y0 + Math.floor(f / p.w) * cell + 14, cell - 28, cell - 28, TRAIL[a]);
  }
  r.sprite(ANIMALS[0], 190, 470, 14);
  r.sprite(ANIMALS[1], 330, 520, 11);
  r.sprite(PINE, 90, 360, 12);
  await save("snow-tracks", r, titleSvg("눈 위 발자국 · Snow Tracks", "굴에서 먹이까지, 답은 하나 — One answer per snowfield", 48, 100, "#1f2937", "start"));
}

const only = process.argv.slice(2);
const jobs: Record<string, () => Promise<void>> = { "wish-lanterns": wishLanterns, "hotteok-flip": hotteokFlip, "snow-tracks": snowTracks };
for (const [slug, job] of Object.entries(jobs)) if (!only.length || only.includes(slug)) await job();
