// Bakes key art (1200×630 WebP) for the 2026-11-23 winter originals from the games' own
// pixel art (same sprites, pictures and skies as play), plus a title strip.
//   npx tsx scripts/build-2026-11-23-keyart.ts [slug ...]
// Outputs: public/games/<slug>-keyart.webp
import sharp from "sharp";
import { join } from "node:path";
import { backdropPixels, parseHex, spritePixels, type BackdropSpec, type PixelArt } from "../src/lib/games/pixel-kit";
import { LEVELS as ETCH_LEVELS, motifColor, parse as parseEtch, routeCells } from "../src/lib/games/ice-etch";

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
const SKATER: PixelArt = {
  palette: { h: "#f59f00", s: "#ffd7b5", o: "#1f2a44", r: "#e03131", b: "#3b5bdb", g: "#ced4da" },
  rows: ["...hhhh...", "..hhhhhh..", "..ssssss..", "..sossos..", "..ssssss..", ".rrrrrrr..", ".bbbbbbrr.", "bbbbbbbbr.", ".bbbbbbb..", "..bb..bb..", "..oo..oo..", ".gggg.gggg"],
};
function shieldKite(band: string, dark: string): PixelArt {
  return {
    palette: { o: dark, w: "#f8f1e1", b: band, d: "#d9ccb0", k: "#3b2a20" },
    rows: ["oooooooooooo", "obbbbbbbbbbo", "obbbbbbbbbbo", "owwwwkwwwwwo", "owwwkwkwwwwo", "owwk....kwwo", "owk......kwo", "owk......kwo", "owwk....kwwo", "owwwkwkwwwwo", "owwwwkwwwwdo", "owwwwwwwwddo", "oddddddddddo", "oooooooooooo"],
  };
}
const MAGPIE: PixelArt = { palette: { k: "#111827", w: "#f9fafb", b: "#1e3a8a" }, rows: ["bb........", ".bbk...kk.", "..kkkkkkkk", ".kwwwkkk..", "kkkk......"] };

async function iceEtch(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#0b1430", "#122047", "#1a2d5c"], stars: 0.8, seed: 5 }, 6);
  // a finished pond: the 2027 red goat, plus a half-skated pond beside it
  const show = (idx: number, ox: number, oy: number, cell: number, upto: number) => {
    const lvl = ETCH_LEVELS[idx];
    const p = parseEtch(lvl);
    const done = new Set(routeCells(p, lvl.route).slice(0, upto));
    const art = 8;
    const ps = cell / art;
    r.rect(ox - 8, oy - 8, p.w * cell + 16, p.h * cell + 16, "#e7f5ff");
    for (let cy = 0; cy < p.h; cy++) for (let cx = 0; cx < p.w; cx++) {
      const i = cy * p.w + cx;
      for (let ay = 0; ay < art; ay++) for (let ax = 0; ax < art; ax++) {
        const px = cx * art + ax;
        const py = cy * art + ay;
        let col: string;
        if (done.has(i) || upto >= p.iceCount) col = motifColor(lvl.motif, lvl.tone, (px + 0.5) / (p.w * art), (py + 0.5) / (p.h * art), px, py);
        else if (p.blocked[i]) col = (ax + ay) % 5 === 0 ? "#b9d4f0" : "#f8fbff";
        else col = (ax + ay * 3 + cx * 5 + cy * 7) % 9 === 0 ? "#b7dcff" : "#cde8ff";
        r.rect(Math.round(ox + px * ps), Math.round(oy + py * ps), Math.ceil(ps), Math.ceil(ps), col);
      }
    }
    return p;
  };
  const goat = ETCH_LEVELS.findIndex((l) => l.motif === "goat" && l.tone === 1);
  show(goat, 90, 190, 56, 999);
  const kiteIdx = ETCH_LEVELS.findIndex((l) => l.motif === "kite" && l.tone === 0);
  const p = show(kiteIdx, 720, 250, 56, 11);
  const cells = routeCells(p, ETCH_LEVELS[kiteIdx].route).slice(0, 11);
  const head = cells[cells.length - 1];
  r.sprite(SKATER, 720 + (head % p.w) * 56 + 28, 250 + Math.floor(head / p.w) * 56 + 28, 5);
  await save("ice-etch", r, titleSvg("빙판 그림 스케이트 · Ice Etch", "한 번씩 다 지나면 그림 완성 — Skate every cell once, reveal the art", 600, 90, "#fff"));
}

async function firstSunrise(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#1b1d4a", "#3b2f6e", "#7a4f8f", "#d9779a", "#ffb38a", "#ffd59a"], stars: 0.5, seed: 91 }, 6);
  // the sun rising out of a gap in the clouds
  const cx = 600;
  const cy = 330;
  for (let y = -150; y <= 150; y += 6) for (let x = -150; x <= 150; x += 6) {
    const d = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    if (d < 96) r.rect(cx + x, cy + y, 6, 6, d > 86 ? "#e8590c" : x < -20 && y < -20 && d > 50 ? "#fff3a6" : "#ffcc33");
    else if (d < 140 && Math.abs(Math.sin(a * 6)) < 0.3) r.rect(cx + x, cy + y, 6, 6, d > 126 ? "#e8590c" : "#ff922b");
  }
  r.rect(cx - 42, cy - 24, 12, 12, "#5c2b0b");
  r.rect(cx + 30, cy - 24, 12, 12, "#5c2b0b");
  r.rect(cx - 24, cy + 24, 48, 9, "#c2410c");
  // pixel clouds parting to the sides
  const cloud = (x: number, y: number, w: number, h: number) => {
    for (let yy = 0; yy < h; yy += 6) for (let xx = 0; xx < w; xx += 6) {
      const edge = xx < 6 || yy < 6 || xx >= w - 6 || yy >= h - 6;
      const corner = (xx < 18 || xx >= w - 18) && (yy < 18 || yy >= h - 18);
      if (corner && Math.hypot(Math.min(xx, w - xx) - 18, Math.min(yy, h - yy) - 18) > 18) continue;
      r.rect(x + xx, y + yy, 6, 6, edge ? "#6b5b95" : yy > h - 24 ? "#d8c7f0" : "#fdf4ff");
    }
  };
  cloud(60, 250, 330, 100);
  cloud(810, 230, 330, 100);
  cloud(130, 420, 200, 110);
  cloud(880, 430, 240, 100);
  cloud(380, 500, 100, 110);
  r.sprite(MAGPIE, 980, 180, 7, true);
  // mountain ridge
  for (let x = 0; x < W; x += 6) {
    const top = 560 + Math.round((Math.sin(x * 0.012) * 26 + Math.sin(x * 0.031 + 1) * 14) / 6) * 6;
    r.rect(x, top, 6, H - top, "#2e1f45");
  }
  await save("first-sunrise", r, titleSvg("첫 해 구름 밀기 · First Sunrise", "구름을 밀어 2027년 첫 해를 — Push the clouds, raise the 2027 sun", 600, 100, "#fff8e1"));
}

async function kiteDuel(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#ff9a76", "#ffbf8a", "#ffe0a8", "#cfe6ff"], orb: { x: 0.12, y: 0.25, r: 10, color: "#ffe066", glow: "#ffb347" }, seed: 72 }, 6);
  const red = { x: 800, y: 190 };
  const blue = { x: 400, y: 210 };
  r.line(100, 640, red.x, red.y + 60, "#c92a2a", 4);
  r.line(1100, 640, blue.x, blue.y + 60, "#1864ab", 4);
  // sparks at the crossing
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    r.rect(Math.round(600 + Math.cos(a) * (20 + (k % 3) * 14)), Math.round(380 + Math.sin(a) * (16 + (k % 2) * 12)), 8, 8, k % 2 ? "#ffd43b" : "#ffffff");
  }
  r.sprite(shieldKite("#e03131", "#5c1a1a"), red.x, red.y, 10);
  r.sprite(shieldKite("#1c7ed6", "#14315c"), blue.x, blue.y, 10);
  for (let k = 0; k < 8; k++) {
    r.rect(red.x - 10 + Math.round(Math.sin(k) * 10), red.y + 80 + k * 18, 12, 12, k % 2 ? "#ff8787" : "#fff3bf");
    r.rect(blue.x - 6 + Math.round(Math.cos(k) * 10), blue.y + 80 + k * 18, 12, 12, k % 2 ? "#74c0fc" : "#fff3bf");
  }
  r.sprite(MAGPIE, 1000, 470, 8, true);
  await save("kite-duel", r, titleSvg("연싸움 · Kite Duel", "폰 하나로 둘이서 연줄 끊기 — Cut the rival string, two on one phone", 600, 560, "#ffffff"));
}

const jobs: Record<string, () => Promise<void>> = { "ice-etch": iceEtch, "first-sunrise": firstSunrise, "kite-duel": kiteDuel };
const only = process.argv.slice(2);
for (const [slug, make] of Object.entries(jobs)) {
  if (only.length && !only.includes(slug)) continue;
  await make();
}
