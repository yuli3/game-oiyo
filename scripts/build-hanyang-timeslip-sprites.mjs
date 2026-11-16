#!/usr/bin/env node
// Bakes the hand-written pixel art of Hanyang Timeslip into the shipped assets.
//   node --experimental-strip-types scripts/build-hanyang-timeslip-sprites.mjs [--preview out.png]
// Outputs (deterministic, rerun after editing src/lib/games/hanyang-timeslip-art.ts):
//   public/assets/sprites/hanyang-timeslip/sheet.webp   (lossless, 1× pixels; the game scales with nearest)
//   public/games/hanyang-timeslip-keyart.webp          (1200×630 share/catalog art built from the same sprites)
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const art = await import(join(root, "src/lib/games/hanyang-timeslip-art.ts"));

art.validateArt();
const sheet = art.renderSheetRGBA();
const raw = (buf, width, height) => sharp(Buffer.from(buf), { raw: { width, height, channels: 4 } });

const spriteDir = join(root, "public/assets/sprites/hanyang-timeslip");
mkdirSync(spriteDir, { recursive: true });
await raw(sheet.data, sheet.width, sheet.height).webp({ lossless: true, effort: 6 }).toFile(join(spriteDir, "sheet.webp"));

const previewAt = process.argv.indexOf("--preview");
if (previewAt > 0) {
  await raw(sheet.data, sheet.width, sheet.height)
    .resize(sheet.width * 6, sheet.height * 6, { kernel: "nearest" })
    .flatten({ background: "#556677" })
    .png()
    .toFile(process.argv[previewAt + 1]);
}

// ─── Key art: a 200×105 pixel scene scaled 6× to 1200×630 ───────────────────
const W = 200;
const H = 105;
const scene = new Uint8ClampedArray(W * H * 4);
const put = (x, y, color) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  scene[i] = (color >> 16) & 255;
  scene[i + 1] = (color >> 8) & 255;
  scene[i + 2] = color & 255;
  scene[i + 3] = 255;
};
// Dusk sky bands.
const sky = [0x2b3a67, 0x4b2d86, 0x7b4fc9, 0xc8423a, 0xf0c04a];
for (let y = 0; y < H; y++) {
  const band = sky[Math.min(sky.length - 1, Math.floor((y / 70) * sky.length))];
  for (let x = 0; x < W; x++) put(x, y, band);
}
// Mountain silhouette (북악 / 인왕 shape, invented).
for (let x = 0; x < W; x++) {
  const top = Math.round(48 + 10 * Math.sin(x / 17) + 6 * Math.sin(x / 7 + 1));
  for (let y = top; y < H; y++) put(x, y, 0x1f5a44);
}
const stamp = (id, ox, oy, scale = 1, flip = false) => {
  const f = sheet.frames[id];
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const i = ((f.y + y) * sheet.width + (f.x + x)) * 4;
      if (sheet.data[i + 3] === 0) continue;
      const color = (sheet.data[i] << 16) | (sheet.data[i + 1] << 8) | sheet.data[i + 2];
      const px = flip ? f.w - 1 - x : x;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) put(ox + px * scale + sx, oy + y * scale + sy, color);
    }
  }
};
for (let x = 0; x < W; x += 16) {
  stamp("tileGroundTop", x, 89);
}
for (let x = 0; x < W; x += 16) stamp("tileFortress", x, 73);
stamp("tileGate", 160, 57);
stamp("tileGate", 176, 57);
stamp("tileRift0", 104, 4, 2);
stamp("heroSide1", 40, 57, 2);
stamp("slash1", 68, 57, 2);
stamp("phone0", 100, 89 - 32 + 0, 2, true);
stamp("bottle1", 140, 22, 2, true);
stamp("shard", 134, 57, 2);
stamp("coin", 12, 40);
stamp("coin", 26, 32);
await raw(scene, W, H)
  .resize(W * 6, H * 6, { kernel: "nearest" })
  .webp({ quality: 90 })
  .toFile(join(root, "public/games/hanyang-timeslip-keyart.webp"));

console.log(`sheet ${sheet.width}×${sheet.height}, ${Object.keys(sheet.frames).length} sprites; key art written`);
