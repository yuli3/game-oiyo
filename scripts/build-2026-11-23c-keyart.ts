// Bakes key art (1200×630 WebP) for the third batch of 2026-11-23 winter originals
// (snowball-fight, tteok-pound, sebae-line) from the games' own pixel art, plus a title strip.
//   npx tsx scripts/build-2026-11-23c-keyart.ts
// Outputs: public/games/<slug>-keyart.webp
import sharp from "sharp";
import { join } from "node:path";
import { backdropPixels, mulberry, parseHex, spritePixels, type BackdropSpec, type PixelArt } from "../src/lib/games/pixel-kit";

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
function snowKid(coat: string, hat: string, duck = false): PixelArt {
  const head = ["...ww...", "..hhhh..", ".hhhhhh.", ".kssssk.", ".sesess.", ".psssps.", "..ssss.."];
  return {
    palette: { k: "#2b1d16", s: "#f3c9a0", e: "#1f1410", c: coat, h: hat, w: "#ffffff", p: "#f28b9b", b: "#3b3f5c", m: "#e9ecef" },
    rows: duck ? [...head, "cccccccc", "cccccccc"] : [...head, ".ccccccs", "scccccms", "s.cccc..", "..cccc..", "..bbbb..", "..b..b..", "..b..b..", ".kk..kk."],
  };
}
const PINE: PixelArt = {
  palette: { g: "#2b6a4a", d: "#1f4d36", w: "#ffffff", t: "#6b4426" },
  rows: ["...w...", "..wgw..", "..ggg..", ".wgggw.", ".ggdgg.", "wgggggw", "ggdggdg", "...t...", "...t..."],
};
const POUNDER: PixelArt = {
  palette: { k: "#2b1d16", s: "#f3c9a0", e: "#1f1410", r: "#c92a2a", y: "#ffd43b", w: "#fff4e6", b: "#5c4033", p: "#f28b9b" },
  rows: ["...kkkkk...", "..kkkkkkk..", "..kssssss..", "..sesssess.", "..psssssp..", "...sssss...", ".wwwrrrwww.", "wwwwrrrwwww", "wwwwrrrwwws", ".wwwrrrwww.", "..yyyyyyy..", "..yyyyyyy..", "..yyy.yyy..", "..bb...bb.."],
};
const PARTNER: PixelArt = {
  palette: { k: "#2b1d16", s: "#f3c9a0", e: "#1f1410", g: "#2b8a3e", w: "#fff4e6", n: "#364fc7", p: "#f28b9b" },
  rows: ["...kkkkk...", "..kkkkkkkk.", "..ssssssk..", ".ssessess..", "..psssssp..", "...sssss...", ".wwwgggwww.", "wwwwgggwwww", "wwwwgggwwww", ".wwwgggwww.", "..nnnnnnn..", "..nnnnnnn..", "..nnn.nnn..", "..kk...kk.."],
};
const MORTAR: PixelArt = {
  palette: { b: "#8a5a3b", d: "#6b4426", l: "#a8744f", k: "#4a2e1c" },
  rows: ["llllllllllllllllllllll", "bbbbbbbbbbbbbbbbbbbbbb", "dbbbbbbbbbbbbbbbbbbbbd", ".dbbbbbbbbbbbbbbbbbbd.", "..dddddddddddddddddd..", "....k............k....", "...kk............kk..."],
};
const HAND: PixelArt = { palette: { s: "#f3c9a0", d: "#d9a47a" }, rows: [".ssss.", "ssssss", "sssssd", "ssssd.", ".sss.."] };
function person(hair: string, robe: string, trim: string, extra: "beard" | "bun" | "glasses" | "tails" | "none", small = false): PixelArt {
  const head = [
    extra === "bun" ? "...kkk...." : extra === "tails" ? ".k.kkkk.k." : "..........",
    "..kkkkkk..",
    extra === "tails" ? "kkkkkkkkkk" : ".kkkkkkkk.",
    ".kssssssk.",
    extra === "glasses" ? ".gegsgeg.." : ".sesssess.",
    ".psssssp..",
    extra === "beard" ? "..bbbbbb.." : "..ssssss..",
  ];
  const body = small
    ? ["..rrrrrr..", ".srrttrrs.", "..rrrrrr..", "..rrrrrr..", "...e..e..."]
    : ["..rrrrrr..", ".rrrttrrr.", "srrrttrrrs", ".rrrrrrrr.", ".rrrrrrrr.", "rrrrrrrrrr", "..e....e.."];
  return { palette: { k: hair, s: "#f3c9a0", e: "#1f1410", r: robe, t: trim, w: "#ffffff", p: "#f28b9b", g: "#495057", b: "#e9ecef" }, rows: [...head, ...body] };
}
const FAMILY: PixelArt[] = [
  person("#dee2e6", "#f8f9fa", "#495057", "beard"),
  person("#ced4da", "#c2255c", "#ffd43b", "bun"),
  person("#2b1d16", "#1c7ed6", "#e7f5ff", "none"),
  person("#3b2a20", "#f783ac", "#2f9e44", "bun"),
  person("#2b1d16", "#5f3dc4", "#ffe066", "glasses"),
  person("#4a2e1c", "#f08c00", "#fff3bf", "none"),
  person("#2b1d16", "#e64980", "#ffec99", "tails", true),
  person("#2b1d16", "#2f9e44", "#ff922b", "none", true),
];

async function snowballFight(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#8fc9ff", "#bfe0ff", "#e8f4ff"], hills: "#cfe0ef", orb: { x: 0.9, y: 0.42, r: 8, color: "#fff3bf", glow: "#ffe08a" }, seed: 91 }, 6);
  // terraced hill rising to the right
  const steps = [[0, 520], [520, 470], [760, 400], [980, 330]];
  steps.forEach(([x0, y], k) => {
    const x1 = k + 1 < steps.length ? steps[k + 1][0] : W;
    r.rect(x0, y, x1 - x0, H - y, "#f8fbff");
    r.rect(x0, y + 24, x1 - x0, H - y - 24, "#d6e4f0");
  });
  // snow walls (blocks), one chipped
  const wall = (x: number, top: number, bottom: number, chip = false) => {
    for (let y = top; y < bottom; y += 12) for (let xx = x; xx < x + 36; xx += 12) {
      if (chip && y < top + 24 && xx > x + 6) continue;
      r.rect(xx, y, 12, 12, "#ffffff");
      r.rect(xx, y + 11, 12, 1, "#c5d8ea");
    }
  };
  wall(290, 440, 520, true);
  wall(660, 420, 470);
  wall(880, 350, 400);
  wall(1080, 280, 330);
  r.sprite(snowKid("#d9480f", "#c92a2a"), 230, 470, 6);
  r.sprite(snowKid("#2f9e44", "#e67700"), 730, 420, 6, true);
  r.sprite(snowKid("#2f9e44", "#e67700", true), 950, 370, 6, true);
  r.sprite(snowKid("#2f9e44", "#e67700"), 1140, 280, 6, true);
  // the throw arc and a snowball, plus a puff where a ball hit the wall
  for (let k = 0; k <= 16; k++) {
    const t = k / 16;
    const x = 260 + t * 460;
    const y = 420 - Math.sin(t * Math.PI) * 260 + t * 20;
    if (k % 2 === 0 && k < 15) r.rect(Math.round(x), Math.round(y), 10, 10, "#e03131", 0.8);
  }
  r.rect(640, 200, 22, 20, "#ffffff");
  r.rect(642, 216, 20, 4, "#94a3b8");
  for (const [dx, dy] of [[-20, -10], [20, -16], [0, -26], [-12, 14], [18, 10]]) r.rect(340 + dx, 440 + dy, 10, 10, "#ffffff");
  r.sprite(PINE, 80, 400, 10);
  r.sprite(PINE, 1120, 160, 7);
  await save("snowball-fight", r, titleSvg("눈싸움 · Snowball Hill", "당겨서 던지고 눈벽 뒤에 숨기, 둘이서도 — Pull, throw, duck; play with a friend", 600, 80, "#1f2937"));
}

async function tteokPound(): Promise<void> {
  const r = new Raster();
  r.backdrop({ sky: ["#ffd8a8", "#ffe8cc", "#fff4e6"], ground: ["#f8f0e3", "#eadbc4", "#dcc6a6"], groundShare: 0.3, hills: "#e8c6a0", orb: { x: 0.85, y: 0.2, r: 10, color: "#fff4e6", glow: "#ffa94d" }, seed: 62 }, 6);
  r.rect(260, 500, 680, 40, "#d8b878");
  for (let x = 266; x < 940; x += 18) r.rect(x, 500, 4, 40, "#c4a060");
  r.sprite(POUNDER, 340, 400, 10);
  r.sprite(PARTNER, 880, 410, 10, true);
  r.sprite(MORTAR, 610, 470, 10);
  // dough
  for (let k = 0; k < 6; k++) {
    const w = 200 - k * 26;
    r.rect(610 - w / 2, 426 - k * 8, w, 8, k > 3 ? "#ffffff" : "#f8f6f0");
  }
  // the mallet raised high, shaft from the pounder's hands
  r.line(380, 370, 450, 230, "#a8744f", 18);
  r.rect(400, 160, 110, 76, "#6b4426");
  r.rect(408, 168, 94, 60, "#8a5a3b");
  r.rect(408, 190, 94, 8, "#4a2e1c");
  r.rect(408, 208, 94, 8, "#4a2e1c");
  // partner's hand pulling away
  r.line(830, 380, 740, 330, "#2b8a3e", 18);
  r.sprite(HAND, 724, 326, 9, true);
  for (const [dx, dy] of [[-120, -40], [120, -50], [-60, -90], [70, -100]]) r.rect(610 + dx, 420 + dy, 14, 14, "#ffd43b");
  await save("tteok-pound", r, titleSvg("떡메치기 · Rice Cake Pounding", "손이 빠지는 순간 척! 둘이서 박자 맞추기 — Pound right after the fold", 600, 80, "#1f2937"));
}

async function sebaeLine(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#f4e3c3");
  for (let y = 0; y < 330; y += 36) r.rect(0, y, W, 3, "#e8d2a8");
  // folding screen
  const panels = 8;
  const pw = 1000 / panels;
  const colors = ["#2b8a3e", "#c92a2a", "#1864ab", "#e67700"];
  for (let k = 0; k < panels; k++) {
    const x = Math.round(100 + k * pw);
    r.rect(x, 170, Math.round(pw), 200, "#5c3a21");
    r.rect(x + 8, 180, Math.round(pw) - 16, 180, "#fff8e7");
    const cx = Math.round(x + pw / 2);
    r.rect(cx - 3, 250, 6, 90, colors[k % 4]);
    r.rect(cx - 16, 228, 32, 30, colors[k % 4]);
    r.rect(cx - 6, 238, 12, 10, "#ffd43b");
  }
  r.rect(0, 380, W, H - 380, "#c89b5c");
  for (let y = 392; y < H; y += 22) r.rect(0, y, W, 3, "#b5854a");
  // the family on their bowing mats
  const order = [1, 0, 2, 3, 4, 5, 6, 7];
  order.forEach((p, i) => {
    const x = 130 + i * 134;
    r.rect(x - 56, 548, 112, 26, "#9c2c2c");
    r.rect(x - 52, 552, 104, 4, "#e9b949");
    r.sprite(FAMILY[p], x, i >= 6 ? 500 : 470, i >= 6 ? 7 : 8);
  });
  await save("sebae-line", r, titleSvg("세배 줄 서기 · New Year Bow Line-up", "단서를 읽고 가족 자리 맞히기, 답은 하나 — Seat the family from clues", 600, 80, "#3b2a20"));
}

const only = process.argv.slice(2);
const jobs: Record<string, () => Promise<void>> = { "snowball-fight": snowballFight, "tteok-pound": tteokPound, "sebae-line": sebaeLine };
for (const [slug, job] of Object.entries(jobs)) if (!only.length || only.includes(slug)) await job();
