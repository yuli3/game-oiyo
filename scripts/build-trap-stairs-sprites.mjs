#!/usr/bin/env node
// Bakes Trap Stairs' hand-written vector art into WebP sprites.
//   node scripts/build-trap-stairs-sprites.mjs
// Outputs: public/assets/sprites/trap-stairs/*.webp and public/games/trap-stairs-keyart.webp
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public/assets/sprites/trap-stairs");
mkdirSync(out, { recursive: true });

const svg = (body, w = 64, h = 64) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

// Hero: a round rice-cake blob with a red scarf. Frames: idle, run-a, run-b, jump, dead.
function hero(frame) {
  const squash = frame === "jump" ? "scale(0.9 1.1)" : frame === "dead" ? "scale(1.15 0.75)" : "scale(1 1)";
  const legL = frame === "run-a" ? "M24 54 L18 62" : frame === "run-b" ? "M24 54 L28 62" : "M24 54 L22 62";
  const legR = frame === "run-a" ? "M40 54 L44 62" : frame === "run-b" ? "M40 54 L36 62" : "M40 54 L42 62";
  const eyes =
    frame === "dead"
      ? `<path d="M22 30 l6 6 m0 -6 l-6 6 M38 30 l6 6 m0 -6 l-6 6" stroke="#2b2b3a" stroke-width="3" stroke-linecap="round"/>`
      : `<ellipse cx="25" cy="33" rx="3.2" ry="4.2" fill="#2b2b3a"/><ellipse cx="41" cy="33" rx="3.2" ry="4.2" fill="#2b2b3a"/><circle cx="26" cy="31.5" r="1.2" fill="#fff"/><circle cx="42" cy="31.5" r="1.2" fill="#fff"/>`;
  return svg(`
    <g transform="translate(32 56) ${squash} translate(-32 -56)">
      <path d="${legL} ${legR}" stroke="#5b4a6b" stroke-width="5" stroke-linecap="round"/>
      <path d="M8 44 Q8 12 32 12 Q56 12 56 44 Q56 56 32 56 Q8 56 8 44 Z" fill="#fbf7f0" stroke="#3a3350" stroke-width="3"/>
      <ellipse cx="18" cy="42" rx="5" ry="3" fill="#f6b8c4" opacity=".8"/><ellipse cx="46" cy="42" rx="5" ry="3" fill="#f6b8c4" opacity=".8"/>
      ${eyes}
      <path d="M28 42 Q32 ${frame === "dead" ? 40 : 46} 36 42" stroke="#2b2b3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M9 47 Q32 54 55 47 L55 52 Q32 59 9 52 Z" fill="#d64045"/>
      <path d="M48 50 L58 ${frame === "jump" ? 40 : 58} L52 ${frame === "jump" ? 42 : 60} Z" fill="#d64045"/>
    </g>`);
}

const STONE = svg(`
  <rect width="64" height="64" fill="#4b3f72"/>
  <rect x="2" y="2" width="28" height="28" rx="3" fill="#5d4f8a"/><rect x="34" y="2" width="28" height="28" rx="3" fill="#584a83"/>
  <rect x="-14" y="34" width="28" height="28" rx="3" fill="#584a83"/><rect x="18" y="34" width="28" height="28" rx="3" fill="#5d4f8a"/><rect x="50" y="34" width="28" height="28" rx="3" fill="#584a83"/>
  <rect x="2" y="2" width="60" height="4" fill="#7b6cb0" opacity=".55"/>`);

const TOP = svg(`
  <rect width="64" height="64" fill="#4b3f72"/>
  <rect x="2" y="12" width="28" height="22" rx="3" fill="#5d4f8a"/><rect x="34" y="12" width="28" height="22" rx="3" fill="#584a83"/>
  <rect x="-14" y="38" width="28" height="24" rx="3" fill="#584a83"/><rect x="18" y="38" width="28" height="24" rx="3" fill="#5d4f8a"/><rect x="50" y="38" width="28" height="24" rx="3" fill="#584a83"/>
  <rect y="0" width="64" height="10" fill="#7ac27a"/><path d="M0 10 Q8 16 16 10 Q24 16 32 10 Q40 16 48 10 Q56 16 64 10" fill="#5ea35e"/>`);

const SPIKE = svg(`
  <path d="M4 64 L16 30 L28 64 Z M22 64 L32 26 L42 64 Z M36 64 L48 30 L60 64 Z" fill="#d9dce6" stroke="#5b5f73" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M16 34 L13 50 M32 30 L29 48 M48 34 L45 50" stroke="#fff" stroke-width="2" opacity=".7"/>`);

const DOOR = svg(`
  <rect x="10" y="4" width="44" height="60" rx="20" fill="#7a4a2a" stroke="#3b2414" stroke-width="3"/>
  <rect x="16" y="12" width="32" height="52" rx="14" fill="#a8683c"/>
  <path d="M32 12 V64" stroke="#7a4a2a" stroke-width="3"/>
  <circle cx="40" cy="40" r="3.5" fill="#f2c14e"/>
  <path d="M20 4 Q32 -6 44 4" stroke="#f2c14e" stroke-width="4" fill="none"/>`);

const BLOCK = svg(`
  <rect x="2" y="2" width="60" height="60" rx="8" fill="#8d6a9f" stroke="#3a3350" stroke-width="3"/>
  <path d="M14 14 H50 V50 H14 Z" fill="none" stroke="#b79ac8" stroke-width="3"/>
  <circle cx="24" cy="30" r="4" fill="#2b2b3a"/><circle cx="40" cy="30" r="4" fill="#2b2b3a"/>
  <path d="M22 44 Q32 38 42 44" stroke="#2b2b3a" stroke-width="3" fill="none" stroke-linecap="round"/>`);

const HIDDEN = svg(`
  <rect x="2" y="2" width="60" height="60" rx="8" fill="#e0b84a" stroke="#7a5a12" stroke-width="3"/>
  <text x="32" y="46" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="38" fill="#7a5a12">!</text>`);

const PAD = svg(`
  <rect x="6" y="46" width="52" height="16" rx="4" fill="#3a3350"/>
  <path d="M10 46 Q32 20 54 46 Z" fill="#4fb3a9" stroke="#1f5f59" stroke-width="3"/>
  <path d="M22 38 Q32 30 42 38" stroke="#bff0ea" stroke-width="3" fill="none"/>`);

async function write(name, s, size = 64) {
  await sharp(Buffer.from(s)).resize(size, size).webp({ quality: 92, alphaQuality: 100 }).toFile(join(out, `${name}.webp`));
}

for (const f of ["idle", "run-a", "run-b", "jump", "dead"]) await write(`hero-${f}`, hero(f));
await write("stone", STONE);
await write("stone-top", TOP);
await write("spike", SPIKE);
await write("door", DOOR);
await write("dropper", BLOCK);
await write("hidden", HIDDEN);
await write("pad", PAD);

// Key art: a stairwell at night, the hero mid-jump over spikes towards a door.
const strip = (inner) => inner.replace(/<\/?svg[^>]*>/g, "");
const tiles = [];
for (let c = 0; c < 19; c++) {
  const h = c < 6 ? 2 : c < 9 ? 3 : c < 12 ? 4 : c < 15 ? 5 : 6;
  for (let r = 0; r < h; r++) tiles.push(`<g transform="translate(${c * 64} ${630 - (r + 1) * 64})">${strip(r === h - 1 ? TOP : STONE)}</g>`);
}
const keyart = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1638"/><stop offset="1" stop-color="#4a3a7a"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#sky)"/>
  ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 197) % 1200}" cy="${(i * 89) % 330}" r="${1 + (i % 3)}" fill="#fff" opacity=".6"/>`).join("")}
  ${tiles.join("")}
  <g transform="translate(448 438)">${strip(SPIKE)}</g><g transform="translate(512 438)">${strip(SPIKE)}</g>
  <g transform="translate(440 250) scale(2.2)">${strip(hero("jump"))}</g>
  <g transform="translate(1050 140) scale(1.8)">${strip(DOOR)}</g>
  <g transform="translate(700 120) scale(1.4)">${strip(BLOCK)}</g>
  <rect x="60" y="40" width="520" height="96" rx="18" fill="#1d1638" opacity=".8"/>
  <text x="320" y="106" text-anchor="middle" font-family="sans-serif" font-size="56" font-weight="800" fill="#fbf7f0">TRAP STAIRS</text>
</svg>`;
await sharp(Buffer.from(keyart)).webp({ quality: 88 }).toFile(join(root, "public/games/trap-stairs-keyart.webp"));
console.log("trap-stairs sprites written");
