#!/usr/bin/env node
const sharp = require("sharp");
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const IMG = process.env.IMG;
const WT = process.cwd();
if (!IMG) {
  console.error("IMG=... required");
  process.exit(1);
}

async function jpgToPng(src, dest) {
  await sharp(src).ensureAlpha().png().toFile(dest);
}

async function scaled(src, dest, s) {
  const meta = await sharp(src).metadata();
  const cw = meta.width ?? 256;
  const ch = meta.height ?? 256;
  const factor = Math.min(1, Math.max(0.2, s));
  const w = Math.max(1, Math.round(cw * factor));
  const h = Math.max(1, Math.round(ch * factor));
  await sharp({
    create: { width: cw, height: ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: await sharp(src).resize(w, h).png().toBuffer(), gravity: "centre" }])
    .png()
    .toFile(dest);
}

async function faded(src, dest, alpha) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * alpha);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(dest);
}

(async () => {
  const tmp = path.join(WT, ".tmp-frames");
  fs.mkdirSync(tmp, { recursive: true });
  fs.mkdirSync(path.join(WT, "public/assets/sprites/fx"), { recursive: true });

  await jpgToPng(`${IMG}/3.jpg`, `${tmp}/cat.png`);
  await jpgToPng(`${IMG}/8.jpg`, `${tmp}/exhaust.png`);
  await jpgToPng(`${IMG}/9.jpg`, `${tmp}/bb0.png`);
  await jpgToPng(`${IMG}/5.jpg`, `${tmp}/bb1.png`);
  await jpgToPng(`${WT}/public/assets/sprites/star-blaster/burst.png`, `${tmp}/bb2.png`);
  await jpgToPng(`${IMG}/6.jpg`, `${tmp}/bb3.png`);
  await jpgToPng(`${IMG}/4.jpg`, `${tmp}/gb0.png`);
  await sharp(`${WT}/public/assets/sprites/block-burst/burst.png`).png().toFile(`${tmp}/gb1.png`);
  await jpgToPng(`${IMG}/7.jpg`, `${tmp}/gb2.png`);

  execSync(
    `node scripts/key-sprite-edge.mjs ${tmp}/cat.png ${tmp}/exhaust.png ${WT}/public/assets/sprites/fx/spark-base.png ${tmp}/gb0.png ${tmp}/gb2.png`,
    { stdio: "inherit" },
  );
  execSync(`node scripts/key-sprite-edge.mjs --black ${tmp}/bb0.png ${tmp}/bb1.png ${tmp}/bb2.png ${tmp}/bb3.png`, {
    stdio: "inherit",
  });

  await sharp(`${tmp}/cat.png`).png().toFile(`${WT}/public/assets/sprites/animal-pop/cat.png`);

  await scaled(`${tmp}/exhaust.png`, `${tmp}/ex0.png`, 0.7);
  await scaled(`${tmp}/exhaust.png`, `${tmp}/ex1.png`, 0.88);
  await scaled(`${tmp}/exhaust.png`, `${tmp}/ex2.png`, 1.0);
  await scaled(`${tmp}/exhaust.png`, `${tmp}/ex3.png`, 0.82);

  await scaled(`${WT}/public/assets/sprites/fx/spark-base.png`, `${tmp}/sp0.png`, 0.55);
  await scaled(`${WT}/public/assets/sprites/fx/spark-base.png`, `${tmp}/sp1.png`, 1.0);
  await scaled(`${WT}/public/assets/sprites/fx/spark-base.png`, `${tmp}/sp2.png`, 1.22);
  await scaled(`${WT}/public/assets/sprites/fx/spark-base.png`, `${tmp}/sp3.png`, 0.7);

  await faded(`${tmp}/bb3.png`, `${tmp}/bb4.png`, 0.65);
  await faded(`${tmp}/bb3.png`, `${tmp}/bb5.png`, 0.35);
  await faded(`${tmp}/gb2.png`, `${tmp}/gb3.png`, 0.55);
  await faded(`${tmp}/gb2.png`, `${tmp}/gb4.png`, 0.25);

  execSync(
    `node scripts/compose-sprite-sheet.mjs --out public/assets/sprites/star-blaster/exhaust-sheet.png --cols 4 ${tmp}/ex0.png ${tmp}/ex1.png ${tmp}/ex2.png ${tmp}/ex3.png`,
    { stdio: "inherit" },
  );
  execSync(
    `node scripts/compose-sprite-sheet.mjs --out public/assets/sprites/fx/spark-sheet.png --cols 4 ${tmp}/sp0.png ${tmp}/sp1.png ${tmp}/sp2.png ${tmp}/sp3.png`,
    { stdio: "inherit" },
  );
  execSync(
    `node scripts/compose-sprite-sheet.mjs --out public/assets/sprites/star-blaster/burst-sheet.png --cols 8 ${tmp}/bb0.png ${tmp}/bb1.png ${tmp}/bb2.png ${tmp}/bb2.png ${tmp}/bb3.png ${tmp}/bb4.png ${tmp}/bb5.png ${tmp}/bb5.png`,
    { stdio: "inherit" },
  );
  execSync(
    `node scripts/compose-sprite-sheet.mjs --out public/assets/sprites/block-burst/burst-sheet.png --cols 8 ${tmp}/gb0.png ${tmp}/gb0.png ${tmp}/gb1.png ${tmp}/gb1.png ${tmp}/gb2.png ${tmp}/gb3.png ${tmp}/gb4.png ${tmp}/gb4.png`,
    { stdio: "inherit" },
  );
  console.log("sheets done");
})();
