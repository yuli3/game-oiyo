#!/usr/bin/env node
// Bakes Alley Appraiser's hand-written vector art (customers, tools, key art) into WebP.
//   node scripts/build-alley-appraiser-sprites.mjs
// Outputs: public/assets/sprites/alley-appraiser/*.webp and public/games/alley-appraiser-keyart.webp
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public/assets/sprites/alley-appraiser");
mkdirSync(out, { recursive: true });

const SKIN = ["#f2c9a0", "#e0ac7e", "#c98b5e", "#f5d6b8", "#b9784f", "#eab88f"];
const COATS = ["#3d5a80", "#8d5a97", "#2a9d8f", "#bc4749", "#6c757d", "#e09f3e"];
const HAIR = ["#2b2118", "#d9d9d9", "#6f4e37", "#1b1b1b", "#a0522d", "#f0e2c0"];

function customer(i) {
  const skin = SKIN[i];
  const coat = COATS[i];
  const hair = HAIR[i];
  const hats = [
    `<path d="M58 70 Q128 20 198 70 Z" fill="${hair}"/>`,
    `<ellipse cx="128" cy="66" rx="74" ry="14" fill="#3b3b3b"/><rect x="88" y="26" width="80" height="42" rx="8" fill="#3b3b3b"/>`,
    `<path d="M60 92 Q60 36 128 36 Q196 36 196 92 Q170 64 128 66 Q86 64 60 92 Z" fill="${hair}"/>`,
    `<path d="M56 96 Q56 30 128 30 Q200 30 200 96 L200 150 Q188 120 186 90 Q128 70 70 90 Q68 120 56 150 Z" fill="${hair}"/>`,
    `<path d="M64 80 Q128 40 192 80 L192 70 Q128 18 64 70 Z" fill="#d62828"/><circle cx="128" cy="34" r="9" fill="#fff"/>`,
    `<path d="M62 84 Q70 40 128 38 Q186 40 194 84 Q160 60 128 70 Q96 60 62 84 Z" fill="${hair}"/><circle cx="128" cy="40" r="16" fill="${hair}"/>`,
  ][i];
  const extras = [
    `<rect x="92" y="108" width="28" height="18" rx="9" fill="none" stroke="#222" stroke-width="4"/><rect x="136" y="108" width="28" height="18" rx="9" fill="none" stroke="#222" stroke-width="4"/><line x1="120" y1="116" x2="136" y2="116" stroke="#222" stroke-width="4"/>`,
    `<path d="M104 150 Q128 166 152 150" stroke="#d9d9d9" stroke-width="10" fill="none" stroke-linecap="round"/>`,
    ``,
    `<circle cx="96" cy="136" r="8" fill="#f28482" opacity=".6"/><circle cx="160" cy="136" r="8" fill="#f28482" opacity=".6"/>`,
    `<path d="M100 146 L156 146" stroke="#6f4e37" stroke-width="6" stroke-linecap="round"/>`,
    `<circle cx="70" cy="128" r="6" fill="#ffd166"/><circle cx="186" cy="128" r="6" fill="#ffd166"/>`,
  ][i];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <path d="M40 256 Q40 186 128 182 Q216 186 216 256 Z" fill="${coat}"/>
  <path d="M110 186 L128 214 L146 186 Z" fill="#f8f9fa"/>
  <rect x="112" y="160" width="32" height="30" fill="${skin}"/>
  <ellipse cx="128" cy="112" rx="66" ry="72" fill="${skin}"/>
  <ellipse cx="62" cy="118" rx="10" ry="16" fill="${skin}"/><ellipse cx="194" cy="118" rx="10" ry="16" fill="${skin}"/>
  ${hats}
  <circle cx="106" cy="116" r="7" fill="#222"/><circle cx="150" cy="116" r="7" fill="#222"/>
  <circle cx="108" cy="113" r="2.4" fill="#fff"/><circle cx="152" cy="113" r="2.4" fill="#fff"/>
  <path d="M100 100 L114 98 M142 98 L156 100" stroke="#3b2b20" stroke-width="4" stroke-linecap="round"/>
  <path d="M110 146 Q128 ${i % 2 ? 152 : 158} 146 146" stroke="#7a3b2e" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse cx="128" cy="132" rx="7" ry="5" fill="#00000022"/>
  ${extras}
</svg>`;
}

const LOUPE = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect x="78" y="78" width="16" height="44" rx="6" transform="rotate(-45 86 100)" fill="#6b4a2b"/>
  <circle cx="54" cy="54" r="38" fill="#bfe3f2" stroke="#c9a227" stroke-width="10"/>
  <path d="M34 42 Q44 26 62 26" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>
</svg>`;

const UV = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect x="50" y="70" width="28" height="50" rx="6" fill="#343a40"/>
  <path d="M30 22 H98 L84 72 H44 Z" fill="#495057"/>
  <rect x="38" y="16" width="52" height="12" rx="4" fill="#7b2cbf"/>
  <path d="M40 10 L24 -14 M64 8 V-20 M88 10 L104 -14" stroke="#c9a8ff" stroke-width="7" stroke-linecap="round"/>
  <circle cx="64" cy="22" r="6" fill="#e0c3fc"/>
</svg>`;

const COIN = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="28" fill="#e9b949" stroke="#8a6a1a" stroke-width="4"/>
  <rect x="25" y="25" width="14" height="14" fill="#5a4520"/>
  <circle cx="32" cy="32" r="21" fill="none" stroke="#8a6a1a" stroke-width="2"/>
</svg>`;

const BOOK = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect x="18" y="16" width="92" height="98" rx="8" fill="#7f5539"/>
  <rect x="28" y="16" width="82" height="90" rx="6" fill="#b08968"/>
  <rect x="44" y="34" width="50" height="34" rx="4" fill="#ede0d4"/>
  <circle cx="69" cy="51" r="10" fill="none" stroke="#7f5539" stroke-width="4"/>
  <rect x="28" y="100" width="82" height="10" fill="#ede0d4"/>
</svg>`;

async function svgToWebp(svg, file, width) {
  await sharp(Buffer.from(svg)).resize({ width }).webp({ quality: 92, alphaQuality: 100 }).toFile(join(out, file));
}

for (let i = 0; i < 6; i++) await svgToWebp(customer(i), `customer-${i}.webp`, 256);
await svgToWebp(LOUPE, "loupe.webp", 128);
await svgToWebp(UV, "uv-lamp.webp", 128);
await svgToWebp(COIN, "coin.webp", 64);
await svgToWebp(BOOK, "catalogue.webp", 128);

// Key art 1200×630: shop counter, lamp light, two customers and a vase under the loupe.
const keyart = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><radialGradient id="lamp" cx="0.5" cy="0.2" r="0.8"><stop offset="0" stop-color="#ffe8a3"/><stop offset="1" stop-color="#2b1d14"/></radialGradient></defs>
  <rect width="1200" height="630" fill="url(#lamp)"/>
  <rect x="0" y="0" width="1200" height="40" fill="#3a2618"/>
  ${[0, 1, 2, 3, 4].map((k) => `<rect x="${60 + k * 230}" y="70" width="190" height="200" rx="10" fill="#5a3b26" opacity=".55"/>`).join("")}
  <rect x="0" y="430" width="1200" height="200" fill="#6b4226"/>
  <rect x="0" y="420" width="1200" height="22" fill="#8b5a33"/>
  <g transform="translate(70 170) scale(1.05)">${customer(1).replace(/<\/?svg[^>]*>/g, "")}</g>
  <g transform="translate(880 180) scale(1)">${customer(3).replace(/<\/?svg[^>]*>/g, "")}</g>
  <g transform="translate(470 150)">
    <path d="M110 40 C110 110 40 140 52 230 C60 270 90 282 110 282 L150 282 C170 282 200 270 208 230 C220 140 150 110 150 40 Z" fill="#8fbfa8" stroke="#2d3a33" stroke-width="5"/>
    <path d="M100 150 Q120 128 130 150 Q140 128 160 150" stroke="#2d4f7c" stroke-width="5" fill="none"/>
    <circle cx="180" cy="150" r="78" fill="#bfe3f222" stroke="#c9a227" stroke-width="14"/>
    <rect x="236" y="208" width="26" height="90" rx="8" transform="rotate(-45 249 253)" fill="#6b4a2b"/>
  </g>
  <rect x="300" y="520" width="600" height="80" rx="16" fill="#2b1d14" opacity=".85"/>
  <text x="600" y="575" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="700" fill="#ffe8a3">ALLEY APPRAISER</text>
</svg>`;
mkdirSync(join(root, "public/games"), { recursive: true });
await sharp(Buffer.from(keyart)).webp({ quality: 88 }).toFile(join(root, "public/games/alley-appraiser-keyart.webp"));
console.log("alley-appraiser sprites written");
