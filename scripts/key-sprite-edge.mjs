#!/usr/bin/env node
/**
 * Edge-flood chroma key. Never keys interior reds (terracotta / C4).
 * Magenta/hot-pink connected to the image border becomes transparent.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const rawArgs = process.argv.slice(2);
const keyBlack = rawArgs.includes("--black");
const files = rawArgs.filter((a) => !a.startsWith("-"));
if (files.length === 0) {
  console.error("usage: node scripts/key-sprite-edge.mjs [--black] <png...>");
  process.exit(1);
}

function isKey(r, g, b, a) {
  if (a < 8) return true;
  if (r > 180 && g < 90 && b > 140 && r > g + 60) return true;
  if (r > 170 && r < 240 && g > 30 && g < 110 && b > 90 && b < 170 && r > g + 50) return true;
  if (r > 200 && g > 80 && g < 160 && b > 140 && b < 210 && r > g + 30) return true;
  if (keyBlack && r + g + b < 30) return true;
  return false;
}

async function keyFile(file) {
  const img = sharp(file);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const seen = new Uint8Array(w * h);
  const q = [];
  const idx = (x, y) => y * w + x;
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = idx(x, y);
    if (seen[i]) return;
    const o = i * 4;
    if (!isKey(data[o], data[o + 1], data[o + 2], data[o + 3])) return;
    seen[i] = 1;
    q.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  let keyed = 0;
  while (q.length) {
    const i = q.pop();
    const o = i * 4;
    data[o + 3] = 0;
    keyed += 1;
    const x = i % w;
    const y = (i - x) / w;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(file);
  console.log(`${path.relative(process.cwd(), file)} keyed ${keyed} px`);
}

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error("missing", file);
    process.exit(1);
  }
  await keyFile(file);
}
