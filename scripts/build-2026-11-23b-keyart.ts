// Bakes key art (1200×630 WebP) for the second batch of 2026-11-23 winter originals
// (jegi-kick, snow-sled, kite-tangle) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-23b-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import sharp from "sharp";
import { join } from "node:path";
import { backdropPixels, mulberry, parseHex, spritePixels, type BackdropSpec, type PixelArt } from "../src/lib/games/pixel-kit";
import { SKIES } from "../src/lib/games/kite-tangle";

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
function kid(jacket: string, trim: string, kick: boolean): PixelArt {
  const head = ["....kkkk....", "...kkkkkk...", "...kssssk...", "...sesses...", "...pssssp...", "....ssss....", "..rrrrrrrr..", ".srrrwwrrrs.", ".s.rrwwrr.s.", "...rrrrrr...", "...bbbbbb..."];
  return {
    palette: { k: "#2b1d16", s: "#f3c9a0", e: "#1f1410", r: jacket, w: trim, b: "#3b4a7a", o: "#5c3a21", p: "#f28b9b" },
    rows: kick ? [...head, "...bb..bbb..", "...bb...bbbo", "...bb.....oo", "..ooo......."] : [...head, "...bb..bb...", "...bb..bb...", "...bb..bb...", "..ooo..ooo.."],
  };
}
const JEGI: PixelArt = {
  palette: { r: "#e03131", b: "#1971c2", w: "#fff9db", g: "#2f9e44", y: "#f2c94c", d: "#a6791c" },
  rows: [".r..b..g.", ".rw.b.wg.", "..rwbwg..", "...rwg...", "...www...", "..yyyyy..", ".yyddyyy.", "..yyyyy.."],
};
const HANOK: PixelArt = {
  palette: { r: "#3d3a4b", t: "#57536a", w: "#f1e6d0", d: "#8a5a3b", y: "#ffd27a", s: "#ffffff" },
  rows: ["....ssssssssssssssss....", "..ssrrrrrrrrrrrrrrrrss..", "rrrrttttttttttttttttrrrr", "..r..................r..", "...wwwwwwwwwwwwwwwwww...", "...wddwyywwddwwyywddw...", "...wddwyywwddwwyywddw...", "...wwwwwwwwwwwwwwwwww...", "..dddddddddddddddddddd.."],
};
const SLED: PixelArt = {
  palette: { k: "#2b1d16", h: "#e03131", w: "#fff4e6", s: "#f3c9a0", r: "#8a4b22", b: "#5c3317", y: "#ffd43b", c: "#1c7ed6" },
  rows: ["..b....b..", ".bbbbbbbb.", ".rrrrrrrr.", ".rrhhhhrr.", ".rhhwwhhr.", ".rhcccchr.", ".rhcsschr.", ".rhkkkkhr.", ".rrhyyhrr.", ".rrrrrrrr.", ".rrrrrrrr.", ".bbbbbbbb.", "..b....b.."],
};
const PINE: PixelArt = {
  palette: { g: "#2b8a3e", d: "#1e5f2c", w: "#ffffff", t: "#6b4423" },
  rows: [".....w.....", "....wgw....", "....ggg....", "...wgggw...", "...ggdgg...", "..wgggggw..", "..gggdggg..", ".wggggdggw.", ".ggdgggggg.", "wgggggggdgw", "ggggdgggggg", ".....t.....", ".....t....."],
};
const SNOWMAN: PixelArt = {
  palette: { w: "#ffffff", g: "#d0dbe6", k: "#1f2937", o: "#f76707", r: "#e03131" },
  rows: ["...kkkk...", "...kkkk...", "..kkkkkk..", "..wwwwww..", "..wkwwkw..", "..wwwoow..", "..rrrrrr..", ".wwwwwwwg.", "wwwwkwwwwg", "wwwwwwwwwg", "wwwwkwwwwg", ".wwwwwwgg."],
};
const POUCH: PixelArt = { palette: { r: "#e03131", p: "#f783ac", y: "#ffd43b", d: "#a61e4d" }, rows: ["..y..y..", "...yy...", "..rrrr..", ".rrpprr.", "rrpyyprr", "rrryyrrr", "drrrrrrd", ".dddddd."] };
const FLAG = (c: string, d: string): PixelArt => ({ palette: { r: c, d, k: "#4a3728" }, rows: ["krrrr", "krrrd", "krrd.", "k....", "k....", "k....", "k...."] });
function shield(band: string, dark: string): PixelArt {
  return { palette: { o: dark, w: "#f8f1e1", b: band, k: "#3b2a20" }, rows: ["oooooooooo", "obbbbbbbbo", "owwwkwwwwo", "owwk..kwwo", "owk....kwo", "owwk..kwwo", "owwwkwwwwo", "owwwwwwwwo", "oooooooooo"] };
}
const KITES = [shield("#e03131", "#5c1a1a"), shield("#1c7ed6", "#14315c"), shield("#f59f00", "#6b4500"), shield("#2f9e44", "#174d22"), shield("#ae3ec9", "#4a1a57")];

async function jegiKick(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#9fd3ff", "#c5e5ff", "#e8f4ff"], ground: ["#ffffff", "#e9f1f8", "#d5e3ef"], groundShare: 0.2, hills: "#b9cde0", orb: { x: 0.88, y: 0.16, r: 9, color: "#fff3bf", glow: "#ffe08a" }, seed: 81 }, 6);
  r.sprite(HANOK, 200, 400, 9);
  r.sprite(HANOK, 1000, 420, 7);
  // two kids kicking one jegi back and forth, its arc dotted in the air
  r.sprite(kid("#d9480f", "#ffe8a3", true), 380, 470, 10);
  r.sprite(kid("#1c7ed6", "#e7f5ff", false), 840, 470, 10, true);
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    const x = 440 + t * 340;
    const y = 400 - Math.sin(t * Math.PI) * 220;
    if (k % 2 === 0 && k < 12) r.rect(Math.round(x), Math.round(y), 8, 8, "#ffffff", 0.75);
  }
  r.sprite(JEGI, 690, 210, 12);
  for (const [dx, dy] of [[-70, -10], [70, 0], [-40, 60], [50, 70], [0, -80]]) r.rect(690 + dx, 210 + dy, 12, 12, "#ffd43b");
  await save("jegi-kick", r, titleSvg("제기차기 · Jegi Kick", "톡 눌러 차올리기, 폰 하나로 둘이서도 — Tap to kick, play with a friend", 600, 80, "#1f2937"));
}

async function snowSled(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#f4f8fc");
  const rnd = mulberry(4242);
  for (let k = 0; k < 260; k++) r.rect(Math.floor(rnd() * W / 6) * 6, Math.floor(rnd() * H / 6) * 6, 6, 6, "#dde7f1");
  // the sled's S-shaped trail through two gates
  const path = (y: number) => 600 + Math.sin(y / 120) * 180;
  for (let y = 120; y < 500; y += 8) {
    r.rect(Math.round(path(y)) - 26, y, 6, 6, "#c9d7e6");
    r.rect(Math.round(path(y)) + 20, y, 6, 6, "#c9d7e6");
  }
  for (const gy of [200, 380]) {
    const gx = path(gy);
    r.sprite(FLAG("#e03131", "#a51111"), gx - 90, gy, 8);
    r.sprite(FLAG("#1c7ed6", "#0b4f8a"), gx + 90, gy, 8, true);
  }
  r.sprite(SLED, path(520), 520, 8);
  for (const [x, y] of [[120, 260], [230, 480], [1060, 230], [980, 470], [330, 160]]) r.sprite(PINE, x, y, 8);
  r.sprite(SNOWMAN, 900, 330, 8);
  r.sprite(POUCH, path(300), 300, 7);
  await save("snow-sled", r, titleSvg("눈썰매 깃발 레이스 · Snow Sled Slalom", "깃발 사이로 슝, 30코스 기록 깨기 — Beat the par on 30 courses", 600, 80, "#1f2937"));
}

async function kiteTangle(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#0f1636", "#1d2a5c", "#33457f", "#4f5f99"], stars: 0.7, orb: { x: 0.5, y: 0.8, r: 9, color: "#fff7d6", glow: "#ffe8a3" }, hills: "#16203f", ground: ["#1b2547", "#141c38"], groundShare: 0.08, seed: 95 }, 6);
  // left: a tangled sky (start layout), right: the same kites tidy (solved layout)
  const sky = SKIES[9];
  const draw = (pts: Array<{ x: number; y: number }>, ox: number, oy: number, size: number, tangled: boolean) => {
    const P = (k: number) => ({ x: ox + pts[k].x * size, y: oy + pts[k].y * size });
    sky.edges.forEach(([a, b], i) => {
      const p = P(a);
      const q = P(b);
      r.line(p.x, p.y, q.x, q.y, tangled && i % 3 === 0 ? "#ff6b6b" : "#f1f3f5", 4);
    });
    pts.forEach((_, k) => {
      const p = P(k);
      r.sprite(KITES[k % KITES.length], p.x, p.y, 4);
    });
  };
  draw(sky.start, 90, 150, 420, true);
  draw(sky.solved, 690, 150, 420, false);
  for (let k = 0; k < 5; k++) r.rect(560 + k * 18, 360, 12, 12, "#ffd43b");
  await save("kite-tangle", r, titleSvg("엉킨 연줄 풀기 · Kite Tangle", "연을 끌어 엇갈린 줄을 모두 풀기 — Drag kites until no strings cross", 600, 80, "#fff"));
}

const only = process.argv.slice(2);
const jobs: Record<string, () => Promise<void>> = { "jegi-kick": jegiKick, "snow-sled": snowSled, "kite-tangle": kiteTangle };
for (const [slug, job] of Object.entries(jobs)) if (!only.length || only.includes(slug)) await job();
