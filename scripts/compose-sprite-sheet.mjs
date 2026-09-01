#!/usr/bin/env node
/**
 * Compose frames into a uniform-cell sheet. No divider lines.
 * Usage: node scripts/compose-sprite-sheet.mjs --out sheet.png --cols 8 f1.png f2.png ...
 */
import fs from "node:fs";
import sharp from "sharp";

const args = process.argv.slice(2);
let out = "";
let cols = 0;
const frames = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") out = args[++i];
  else if (args[i] === "--cols") cols = Number(args[++i]);
  else frames.push(args[i]);
}
if (!out || frames.length === 0) {
  console.error("usage: node scripts/compose-sprite-sheet.mjs --out sheet.png --cols N frame.png...");
  process.exit(1);
}
cols = Math.max(1, cols || frames.length);
const rows = Math.ceil(frames.length / cols);

const metas = [];
for (const f of frames) {
  if (!fs.existsSync(f)) {
    console.error("missing", f);
    process.exit(1);
  }
  metas.push(await sharp(f).metadata());
}
const cellW = Math.max(...metas.map((m) => m.width ?? 1));
const cellH = Math.max(...metas.map((m) => m.height ?? 1));
const composites = [];
for (let i = 0; i < frames.length; i++) {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const buf = await sharp(frames[i])
    .ensureAlpha()
    .resize(cellW, cellH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  composites.push({ input: buf, left: col * cellW, top: row * cellH });
}
await sharp({
  create: {
    width: cellW * cols,
    height: cellH * rows,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .png()
  .toFile(out);
console.log(`${out} ${cols}x${rows} cell ${cellW}x${cellH} frames ${frames.length}`);
