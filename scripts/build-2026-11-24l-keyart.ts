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
const KEY: PixelArt = { palette: { y: "#fcc419", o: "#e67700" }, rows: ["yyy.....", "y.yyyyyy", "yyy..o.o"] };
const ME: PixelArt = { palette: { k: "#212529", s: "#f3c9a0", r: "#5f3dc4" }, rows: [".kk.", "kssk", ".ss.", "rrrr", "r..r"] };
const STATION: PixelArt = { palette: { r: "#c92a2a", w: "#f8f9fa", k: "#343a40" }, rows: ["..rr..", ".rrrr.", "rrrrrr", "wwkkww", "wwkkww"] };
const FIRE: PixelArt = { palette: { r: "#fa5252", y: "#ffd43b" }, rows: ["..r..", ".rr..", ".ryr.", "rryrr", ".rrr."] };
const CROSS: PixelArt = { palette: { g: "#2f9e44", w: "#ffffff" }, rows: [".www.", ".wgw.", "wgggw", ".wgw.", ".www."] };
const VAN: PixelArt = { palette: { w: "#f8f9fa", r: "#e03131", k: "#212529" }, rows: [".rr..", "wwwww", "wwwww", ".k.k."] };
const HERO: PixelArt = {
  palette: { k: "#212529", s: "#f3c9a0", b: "#1971c2", w: "#dee2e6", y: "#fcc419" },
  rows: ["..kkk...", ".kssk...", ".ksss..w", "..bb..w.", ".bbbbyw.", "b.bb.y..", "..bb....", ".b..b...", ".b..b..."],
};
const RIVAL: PixelArt = {
  palette: { k: "#212529", s: "#e0b894", r: "#c92a2a", w: "#adb5bd", d: "#5c0d0d" },
  rows: ["w..kkk..", ".w.kssk.", "..wsssk.", "...rr...", "..rrrr.r", ".r.rr.r.", "...dd...", "..d..d..", "..d..d.."],
};

async function manor(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1b1530");
  // a half-drafted manor: built rooms with doorways, empty plots, the vault at the top
  const built = new Set(["2,4", "2,3", "1,3", "1,2", "2,2", "3,2", "3,1", "2,1"]);
  for (let c = 0; c < 5; c++)
    for (let row = 0; row < 5; row++) {
      const x = 350 + c * 100, y = 150 + row * 92;
      if (c === 2 && row === 0) {
        r.rect(x + 4, y + 4, 92, 84, "#5f3dc4");
        r.sprite(KEY, x + 50, y + 46, 6);
      } else if (built.has(`${c},${row}`)) {
        r.rect(x + 4, y + 4, 92, 84, c === 3 && row === 1 ? "#7a6a1f" : "#a68a64");
        r.rect(x + 4, y + 4, 30, 8, "#3d2b1f");
        r.rect(x + 66, y + 4, 30, 8, "#3d2b1f");
      } else r.rect(x + 8, y + 8, 84, 76, "#2b2445");
    }
  r.sprite(ME, 600, 334, 8);
  // three room cards offered on the right
  for (let k = 0; k < 3; k++) {
    r.rect(920 + k * 0, 170 + k * 140, 200, 120, "#f8f0e3");
    r.rect(980, 195 + k * 140, 80, 70, "#a68a64");
  }
  await save("draft-manor", r, titleSvg("방 뽑기 저택 · Draft Manor", "Today's manor: how many steps left?", 600, 90, "#f3f0ff"));
}

async function dispatch(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1c2433");
  for (let gx = 0; gx < 12; gx++) for (let gy = 0; gy < 6; gy++) r.rect(30 + gx * 98, 140 + gy * 80, 78, 62, "#2a3447");
  r.sprite(STATION, 600, 380, 12);
  const calls: Array<[number, number, PixelArt]> = [[260, 220, FIRE], [930, 260, CROSS], [420, 520, FIRE], [840, 520, CROSS]];
  for (const [x, y, art] of calls) {
    for (let a = 0; a < 40; a++) {
      const t = (a / 40) * Math.PI * 2;
      r.rect(Math.round(x + Math.cos(t) * 46), Math.round(y + Math.sin(t) * 46), 6, 6, "#ff8787");
    }
    r.sprite(art, x, y, 9);
  }
  r.sprite(VAN, 440, 300, 8);
  r.sprite(VAN, 760, 320, 8, true);
  await save("dispatch-desk", r, titleSvg("출동 배차 센터 · Dispatch Desk", "The right crew, right on time", 600, 90, "#f1f3f5"));
}

async function parry(): Promise<void> {
  const r = new Raster();
  r.rect(0, 0, W, H, "#1a1423");
  r.rect(0, 360, W, 270, "#2c2235");
  r.sprite(RIVAL, 820, 330, 20);
  r.sprite(HERO, 380, 420, 20);
  // the closing ring around the hero
  for (let a = 0; a < 90; a++) {
    const t = (a / 90) * Math.PI * 2;
    r.rect(Math.round(380 + Math.cos(t) * 150), Math.round(420 + Math.sin(t) * 150), 8, 8, "#ff8787");
    if (a % 2 === 0) r.rect(Math.round(380 + Math.cos(t) * 100), Math.round(420 + Math.sin(t) * 100), 6, 6, "#ffffff", 0.7);
  }
  for (let k = 0; k < 24; k++) r.rect(560 + ((k * 37) % 120), 300 + ((k * 53) % 140), 8, 8, k % 2 ? "#ffd43b" : "#ffffff");
  await save("parry-duel", r, titleSvg("막기 결투 · Parry Duel", "Tap as the ring lands: go no-hit", 600, 90, "#fff4e6"));
}

await manor();
await dispatch();
await parry();
