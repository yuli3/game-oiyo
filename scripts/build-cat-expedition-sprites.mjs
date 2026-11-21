#!/usr/bin/env node
// Bakes Cat Expedition's hand-written vector art into WebP sprites.
//   node scripts/build-cat-expedition-sprites.mjs
// Outputs: public/assets/sprites/cat-expedition/*.webp and public/games/cat-expedition-keyart.webp
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public/assets/sprites/cat-expedition");
mkdirSync(out, { recursive: true });
const svg = (body, w = 160, h = 160) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const strip = (s) => s.replace(/<\/?svg[^>]*>/g, "");

function cat({ body, dark, eye = "#3ba55c", wide = 1, extra = "", over = "", belly = "#fff4e6" }) {
  const w = 46 * wide;
  return svg(`
    <ellipse cx="80" cy="146" rx="${w + 6}" ry="8" fill="#00000026"/>
    <path d="M${80 + w - 6} 120 Q${80 + w + 30} 110 ${80 + w + 22} 78" stroke="${body}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <ellipse cx="80" cy="116" rx="${w}" ry="32" fill="${body}" stroke="#2b2233" stroke-width="4"/>
    <ellipse cx="80" cy="124" rx="${w * 0.55}" ry="20" fill="${belly}"/>
    ${extra}
    <path d="M42 62 L48 22 L72 46 Z M118 62 L112 22 L88 46 Z" fill="${body}" stroke="#2b2233" stroke-width="4" stroke-linejoin="round"/>
    <path d="M50 52 L52 34 L64 46 Z M110 52 L108 34 L96 46 Z" fill="#f4a6b6"/>
    <ellipse cx="80" cy="70" rx="42" ry="34" fill="${body}" stroke="#2b2233" stroke-width="4"/>
    <path d="M56 46 L60 56 M80 40 V52 M104 46 L100 56" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="64" cy="70" rx="7" ry="9" fill="${eye}"/><ellipse cx="96" cy="70" rx="7" ry="9" fill="${eye}"/>
    <ellipse cx="64" cy="71" rx="2.6" ry="7" fill="#1b1b1b"/><ellipse cx="96" cy="71" rx="2.6" ry="7" fill="#1b1b1b"/>
    <circle cx="66" cy="66" r="2" fill="#fff"/><circle cx="98" cy="66" r="2" fill="#fff"/>
    <path d="M76 82 L84 82 L80 87 Z" fill="#e07a8a"/>
    <path d="M80 87 Q74 94 68 90 M80 87 Q86 94 92 90" stroke="#2b2233" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M44 80 L24 76 M44 86 L24 88 M116 80 L136 76 M116 86 L136 88" stroke="#2b2233" stroke-width="2" opacity=".6"/>
    <ellipse cx="62" cy="144" rx="12" ry="7" fill="${body}" stroke="#2b2233" stroke-width="3"/><ellipse cx="98" cy="144" rx="12" ry="7" fill="${body}" stroke="#2b2233" stroke-width="3"/>
    ${over}`);
}

const CATS = {
  chonk: cat({ body: "#f2a541", dark: "#c46f12", wide: 1.3, over: `<path d="M50 104 Q80 96 110 104" stroke="#c46f12" stroke-width="5" fill="none"/>` }),
  hunter: cat({ body: "#9aa3ad", dark: "#4f5862", eye: "#e5b42b", extra: `<path d="M50 104 L58 124 M70 98 L74 120 M90 98 L86 120 M110 104 L102 124" stroke="#4f5862" stroke-width="5" stroke-linecap="round"/>`, over: `<path d="M38 52 Q80 34 122 52 L122 60 Q80 42 38 60 Z" fill="#d64045"/><path d="M122 56 L140 48 L136 64 Z" fill="#d64045"/>` }),
  kneader: cat({ body: "#fbf7f0", dark: "#e8d8c8", eye: "#5aa9e6", belly: "#ffe3ea", over: `<ellipse cx="62" cy="144" rx="12" ry="7" fill="#f7b2c4"/><ellipse cx="98" cy="144" rx="12" ry="7" fill="#f7b2c4"/><path d="M80 118 C70 106 56 116 80 134 C104 116 90 106 80 118 Z" fill="#e05a7a"/>` }),
  static: cat({ body: "#8ea8c3", dark: "#5c7590", eye: "#ffd23f", extra: `<path d="M36 100 l-10 -6 l10 -4 l-8 -8 l12 0" stroke="#ffd23f" stroke-width="4" fill="none"/>`, over: `<path d="M74 4 L62 30 L76 30 L66 52 L92 22 L78 22 L88 4 Z" fill="#ffd23f" stroke="#a37c00" stroke-width="3"/>` }),
  shadow: cat({ body: "#2f2a3a", dark: "#151219", eye: "#b8f171", belly: "#463e56", over: `<path d="M38 62 Q80 52 122 62 L122 74 Q80 64 38 74 Z" fill="#7b2cbf" opacity=".9"/><ellipse cx="64" cy="70" rx="7" ry="9" fill="#b8f171"/><ellipse cx="96" cy="70" rx="7" ry="9" fill="#b8f171"/><ellipse cx="64" cy="71" rx="2.6" ry="7" fill="#151219"/><ellipse cx="96" cy="71" rx="2.6" ry="7" fill="#151219"/>` }),
  boxer: cat({ body: "#fbf7f0", dark: "#d17a22", eye: "#3ba55c", extra: `<ellipse cx="60" cy="108" rx="16" ry="12" fill="#d17a22"/><ellipse cx="104" cy="118" rx="14" ry="10" fill="#2f2a3a"/>`, over: `<path d="M22 112 H138 V150 H22 Z" fill="#c8945a" stroke="#6b4a2b" stroke-width="4"/><path d="M22 112 L4 96 H44 Z M138 112 L156 96 H116 Z" fill="#b5824a" stroke="#6b4a2b" stroke-width="4"/><path d="M60 124 H100" stroke="#6b4a2b" stroke-width="4"/>` }),
};

const eyes = (x1, x2, y, c = "#1b1b1b") => `<circle cx="${x1}" cy="${y}" r="6" fill="#fff"/><circle cx="${x2}" cy="${y}" r="6" fill="#fff"/><circle cx="${x1 + 1}" cy="${y}" r="3.2" fill="${c}"/><circle cx="${x2 + 1}" cy="${y}" r="3.2" fill="${c}"/>`;
const angry = (x1, x2, y) => `<path d="M${x1 - 8} ${y - 12} L${x1 + 6} ${y - 6} M${x2 + 8} ${y - 12} L${x2 - 6} ${y - 6}" stroke="#1b1b1b" stroke-width="4" stroke-linecap="round"/>`;
const crown = (cx, y, s = 1, color = "#f2c14e") => `<path transform="translate(${cx} ${y}) scale(${s})" d="M-30 0 L-30 -26 L-15 -12 L0 -32 L15 -12 L30 -26 L30 0 Z" fill="${color}" stroke="#8a6a12" stroke-width="4" stroke-linejoin="round"/>`;
const shadow = `<ellipse cx="80" cy="148" rx="50" ry="8" fill="#00000026"/>`;

const rat = (extra = "", s = 1) => svg(`${shadow}<g transform="translate(80 100) scale(${s}) translate(-80 -100)">
  <path d="M120 120 Q150 120 146 90" stroke="#c48b9f" stroke-width="6" fill="none" stroke-linecap="round"/>
  <ellipse cx="86" cy="112" rx="44" ry="32" fill="#8d8a92" stroke="#3a3540" stroke-width="4"/>
  <circle cx="50" cy="66" r="18" fill="#8d8a92" stroke="#3a3540" stroke-width="4"/><circle cx="50" cy="66" r="9" fill="#e6a4b4"/>
  <circle cx="100" cy="62" r="18" fill="#8d8a92" stroke="#3a3540" stroke-width="4"/><circle cx="100" cy="62" r="9" fill="#e6a4b4"/>
  <path d="M38 96 Q74 52 112 92 Q100 118 74 118 Q44 116 38 96 Z" fill="#9c99a1" stroke="#3a3540" stroke-width="4"/>
  ${eyes(62, 88, 90)}${angry(62, 88, 90)}<circle cx="40" cy="100" r="5" fill="#e07a8a"/></g>${extra}`);
const pigeon = svg(`${shadow}<ellipse cx="80" cy="110" rx="44" ry="34" fill="#8aa0b8" stroke="#33404f" stroke-width="4"/>
  <path d="M84 96 Q130 92 132 126 Q104 130 84 112 Z" fill="#6f86a0" stroke="#33404f" stroke-width="4"/>
  <circle cx="62" cy="68" r="24" fill="#8aa0b8" stroke="#33404f" stroke-width="4"/><path d="M50 86 Q62 96 78 86" stroke="#5fb38a" stroke-width="8" fill="none"/>
  <path d="M38 70 L24 76 L40 80 Z" fill="#e0a43a" stroke="#7a5a12" stroke-width="3"/>${eyes(54, 72, 64, "#d64045")}${angry(54, 72, 64)}
  <path d="M64 144 L60 152 M96 144 L100 152" stroke="#e07a3a" stroke-width="5"/>`);
const stray = svg(`${shadow}<ellipse cx="88" cy="114" rx="46" ry="30" fill="#b07a4a" stroke="#3b2414" stroke-width="4"/>
  <path d="M130 108 Q150 90 140 74" stroke="#b07a4a" stroke-width="10" fill="none" stroke-linecap="round"/>
  <circle cx="56" cy="76" r="30" fill="#b07a4a" stroke="#3b2414" stroke-width="4"/><path d="M32 62 Q22 92 36 98 Q44 84 40 64 Z M76 56 Q92 80 82 92 Q72 80 70 60 Z" fill="#7a4a2a" stroke="#3b2414" stroke-width="3"/>
  <ellipse cx="44" cy="90" rx="16" ry="11" fill="#d9b48c"/><circle cx="34" cy="86" r="5" fill="#1b1b1b"/>${eyes(50, 68, 72)}${angry(50, 68, 72)}
  <path d="M40 98 L44 104 L48 98" fill="#fff"/><rect x="60" y="138" width="10" height="12" fill="#7a4a2a"/><rect x="104" y="138" width="10" height="12" fill="#7a4a2a"/>`);
const vacuum = (big = false) => svg(`${shadow}<g transform="translate(80 110) scale(${big ? 1.15 : 1}) translate(-80 -110)">
  <ellipse cx="80" cy="120" rx="58" ry="22" fill="#3a3f4b"/><ellipse cx="80" cy="108" rx="58" ry="26" fill="#d8dde6" stroke="#3a3f4b" stroke-width="4"/>
  <ellipse cx="80" cy="102" rx="34" ry="12" fill="#3a3f4b"/><rect x="56" y="96" width="48" height="10" rx="5" fill="#d64045"/>
  <circle cx="66" cy="101" r="3" fill="#ffd23f"/><circle cx="94" cy="101" r="3" fill="#ffd23f"/>
  <path d="M24 122 l-10 6 M136 122 l10 6" stroke="#3a3f4b" stroke-width="5" stroke-linecap="round"/></g>
  ${big ? crown(80, 76, 1.2) : ""}`);
const crow = svg(`${shadow}<ellipse cx="84" cy="108" rx="40" ry="34" fill="#2b2b3a" stroke="#0f0f16" stroke-width="4"/>
  <path d="M88 96 Q140 84 138 130 Q108 128 88 112 Z" fill="#3c3c52" stroke="#0f0f16" stroke-width="4"/>
  <circle cx="64" cy="68" r="24" fill="#2b2b3a" stroke="#0f0f16" stroke-width="4"/><path d="M42 66 L16 74 L42 82 Z" fill="#4a4a5a" stroke="#0f0f16" stroke-width="3"/>
  ${eyes(56, 74, 62, "#d64045")}${angry(56, 74, 62)}<path d="M70 144 L66 152 M98 144 L102 152" stroke="#4a4a5a" stroke-width="5"/>`);
const fan = svg(`${shadow}<rect x="72" y="96" width="16" height="44" fill="#6c757d"/><ellipse cx="80" cy="142" rx="34" ry="8" fill="#495057"/>
  <circle cx="80" cy="70" r="50" fill="#e9ecef" stroke="#495057" stroke-width="4"/>
  ${[0, 120, 240].map((a) => `<path transform="rotate(${a} 80 70)" d="M80 70 Q60 34 84 26 Q98 44 80 70 Z" fill="#8fbfe0" stroke="#3d6b8c" stroke-width="3"/>`).join("")}
  <circle cx="80" cy="70" r="9" fill="#495057"/>${eyes(66, 94, 104, "#d64045")}
  <path d="M30 40 l-12 -6 M26 66 l-14 0 M130 40 l12 -6 M134 66 l14 0" stroke="#8fbfe0" stroke-width="4" stroke-linecap="round"/>`);
const raccoon = svg(`${shadow}<path d="M118 118 Q150 112 146 82" stroke="#6c6a72" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M132 100 l12 4 M138 88 l12 2" stroke="#2b2b3a" stroke-width="6"/>
  <ellipse cx="84" cy="114" rx="44" ry="32" fill="#8d8a92" stroke="#2b2b3a" stroke-width="4"/>
  <path d="M40 76 L44 40 L66 58 Z M120 76 L116 40 L94 58 Z" fill="#8d8a92" stroke="#2b2b3a" stroke-width="4"/>
  <ellipse cx="80" cy="76" rx="40" ry="30" fill="#bdbac2" stroke="#2b2b3a" stroke-width="4"/>
  <path d="M44 72 Q62 58 80 72 Q98 58 116 72 Q106 88 80 80 Q54 88 44 72 Z" fill="#2b2b3a"/>${eyes(64, 96, 72)}${angry(64, 96, 72)}
  <circle cx="80" cy="90" r="5" fill="#1b1b1b"/>`);
const owl = (boss = false) => svg(`${shadow}<g transform="translate(80 100) scale(${boss ? 1.12 : 1}) translate(-80 -100)">
  <ellipse cx="80" cy="96" rx="48" ry="54" fill="${boss ? "#4b3f72" : "#9a7650"}" stroke="#2b2233" stroke-width="4"/>
  <path d="M36 60 L40 30 L60 50 Z M124 60 L120 30 L100 50 Z" fill="${boss ? "#4b3f72" : "#9a7650"}" stroke="#2b2233" stroke-width="4"/>
  <ellipse cx="80" cy="116" rx="30" ry="30" fill="${boss ? "#7b6cb0" : "#d9b48c"}"/>
  <path d="M60 110 l6 6 l6 -6 M76 122 l6 6 l6 -6 M90 108 l6 6 l6 -6" stroke="#2b2233" stroke-width="3" fill="none"/>
  <circle cx="62" cy="72" r="17" fill="#fff8e1" stroke="#2b2233" stroke-width="3"/><circle cx="98" cy="72" r="17" fill="#fff8e1" stroke="#2b2233" stroke-width="3"/>
  <circle cx="62" cy="72" r="8" fill="${boss ? "#c9a8ff" : "#e0a43a"}"/><circle cx="98" cy="72" r="8" fill="${boss ? "#c9a8ff" : "#e0a43a"}"/><circle cx="62" cy="72" r="4" fill="#1b1b1b"/><circle cx="98" cy="72" r="4" fill="#1b1b1b"/>
  ${angry(62, 98, 66)}<path d="M74 88 L86 88 L80 98 Z" fill="#e0a43a"/></g>
  ${boss ? `<path d="M118 16 A20 20 0 1 0 138 40 A16 16 0 1 1 118 16 Z" fill="#ffe8a3"/>${crown(80, 46, 1, "#c9a8ff")}` : ""}`);
const cloud = svg(`${shadow}<path d="M36 104 Q20 104 22 86 Q24 66 46 68 Q50 40 80 42 Q108 40 114 66 Q140 62 140 88 Q140 106 120 106 Z" fill="#6c7a91" stroke="#2f3a4d" stroke-width="4"/>
  ${eyes(64, 96, 80)}${angry(64, 96, 80)}<path d="M72 96 Q80 90 88 96" stroke="#1b1b1b" stroke-width="3" fill="none"/>
  <path d="M64 108 L54 130 L66 130 L58 150 L82 122 L70 122 L78 108 Z" fill="#ffd23f" stroke="#a37c00" stroke-width="3"/>
  <path d="M100 112 l-4 12 M114 110 l-4 12 M44 112 l-4 12" stroke="#8fbfe0" stroke-width="4" stroke-linecap="round"/>`);

const ENEMIES = {
  rat: rat(),
  pigeon,
  stray,
  "rat-boss": rat(crown(70, 40, 1.1), 1.15),
  vacuum: vacuum(false),
  crow,
  fan,
  "vacuum-boss": vacuum(true),
  raccoon,
  owl: owl(false),
  cloud,
  "owl-boss": owl(true),
};

const BACKDROPS = {
  alley: svg(`<rect width="640" height="360" fill="#e8d8b8"/><rect y="250" width="640" height="110" fill="#8a7f72"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${20 + i * 160}" y="40" width="130" height="210" fill="#c96f4a" stroke="#7a3f28" stroke-width="4"/><rect x="${45 + i * 160}" y="70" width="34" height="40" fill="#ffe8a3"/><rect x="${92 + i * 160}" y="70" width="34" height="40" fill="#7fa7c9"/>`).join("")}
    <rect x="520" y="200" width="60" height="50" fill="#5d6d7e"/><path d="M0 250 H640" stroke="#5c534a" stroke-width="6"/>`, 640, 360),
  site: svg(`<rect width="640" height="360" fill="#c9dbe8"/><rect y="250" width="640" height="110" fill="#b8956a"/>
    <path d="M60 250 V60 H90 V250 M60 90 H300 M60 140 H220" stroke="#e0a43a" stroke-width="12" fill="none"/>
    ${[0, 1, 2].map((i) => `<rect x="${360 + i * 80}" y="${200 - i * 30}" width="70" height="${50 + i * 30}" fill="#9aa3ad" stroke="#4f5862" stroke-width="4"/>`).join("")}
    <path d="M0 250 L640 250" stroke="#f2c14e" stroke-width="8" stroke-dasharray="30 20"/>`, 640, 360),
  roof: svg(`<rect width="640" height="360" fill="#1d1638"/>${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 131) % 640}" cy="${(i * 53) % 200}" r="${1 + (i % 3)}" fill="#fff" opacity=".7"/>`).join("")}
    <circle cx="520" cy="80" r="40" fill="#ffe8a3"/><path d="M0 260 L120 220 L240 260 L360 210 L480 250 L640 220 V360 H0 Z" fill="#3a2f5a"/>
    <rect y="270" width="640" height="90" fill="#4b3f72"/>${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 40} 270 q20 -14 40 0" stroke="#2b2244" stroke-width="4" fill="none"/>`).join("")}`, 640, 360),
};

async function write(name, s, w = 160, h = w) {
  await sharp(Buffer.from(s)).resize(w, h).webp({ quality: 90, alphaQuality: 100 }).toFile(join(out, `${name}.webp`));
}
for (const [k, s] of Object.entries(CATS)) await write(`cat-${k}`, s);
for (const [k, s] of Object.entries(ENEMIES)) await write(`enemy-${k}`, s);
for (const [k, s] of Object.entries(BACKDROPS)) await write(`bg-${k}`, s, 640, 360);

const keyart = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <g transform="scale(1.875)">${strip(BACKDROPS.roof)}</g>
  <g transform="translate(60 300) scale(1.6)">${strip(CATS.chonk)}</g>
  <g transform="translate(300 330) scale(1.4)">${strip(CATS.hunter)}</g>
  <g transform="translate(500 340) scale(1.3)">${strip(CATS.kneader)}</g>
  <g transform="translate(820 160) scale(2.2)">${strip(ENEMIES["owl-boss"])}</g>
  <rect x="40" y="36" width="640" height="100" rx="20" fill="#1d1638" opacity=".8"/>
  <text x="360" y="106" text-anchor="middle" font-family="sans-serif" font-size="58" font-weight="800" fill="#ffe8a3">CAT EXPEDITION</text>
</svg>`;
await sharp(Buffer.from(keyart)).webp({ quality: 88 }).toFile(join(root, "public/games/cat-expedition-keyart.webp"));
console.log("cat-expedition sprites written");
