#!/usr/bin/env node
// Bakes key art (1200×630 WebP) for the four 2026-11-21 originals from hand-written SVG.
//   node scripts/build-2026-11-21-keyart.mjs
// Outputs: public/games/{rampart-keeper,link-duel,season-workshop,tidy-nook}-keyart.webp
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;
const svg = (body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;
const title = (text, sub, x = 600, fill = "#fff") =>
  `<text x="${x}" y="110" text-anchor="middle" font-family="sans-serif" font-size="76" font-weight="800" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="3" paint-order="stroke">${text}</text>` +
  `<text x="${x}" y="160" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="600" fill="${fill}" opacity=".9">${sub}</text>`;

function rampart() {
  let blocks = "";
  const cols = [[0, 0, "#8d99ae"], [0, 1, "#8d99ae"], [1, 0, "#b08968"], [1, 1, "#8d99ae"], [1, 2, "#b08968"], [2, 0, "#8d99ae"], [3, 0, "#b08968"], [3, 1, "#b08968"]];
  for (const [c, r, f] of cols) blocks += `<rect x="${300 + c * 62}" y="${500 - (r + 1) * 58}" width="58" height="56" rx="4" fill="${f}" stroke="#3b3b3b" stroke-width="3"/>`;
  blocks += `<rect x="292" y="320" width="230" height="20" rx="3" fill="#7f5539" stroke="#3b3b3b" stroke-width="3"/>`;
  let foes = "";
  for (let i = 0; i < 6; i++) {
    const x = 640 + i * 85, y = 470 - (i % 2) * 6;
    foes += `<rect x="${x}" y="${y - 50}" width="34" height="50" rx="8" fill="${i === 3 ? "#6d597a" : "#bc4749"}"/><circle cx="${x + 17}" cy="${y - 62}" r="15" fill="#f2c9a0"/><rect x="${x - 6}" y="${y - 40}" width="10" height="34" fill="#adb5bd"/>`;
  }
  foes += `<rect x="1000" y="420" width="140" height="50" rx="10" fill="#7f5539"/><circle cx="1025" cy="476" r="16" fill="#343a40"/><circle cx="1115" cy="476" r="16" fill="#343a40"/><rect x="960" y="432" width="60" height="18" rx="6" fill="#5e3a1f"/>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="980" cy="210" r="60" fill="#ffd166" opacity=".9"/>` +
      `<path d="M0 500 L1200 500 L1200 630 L0 630 Z" fill="#6a994e"/>` +
      `<rect x="40" y="250" width="200" height="250" fill="#adb5bd" stroke="#495057" stroke-width="4"/>` +
      Array.from({ length: 5 }, (_, i) => `<rect x="${40 + i * 42}" y="222" width="32" height="30" fill="#adb5bd" stroke="#495057" stroke-width="4"/>`).join("") +
      `<path d="M100 500 L100 400 Q140 350 180 400 L180 500 Z" fill="#5e3a1f" stroke="#343a40" stroke-width="4"/>` +
      blocks + foes +
      `<circle cx="760" cy="300" r="34" fill="#6c757d" stroke="#343a40" stroke-width="4"/><path d="M760 180 L760 255" stroke="#fff" stroke-width="4" stroke-dasharray="10 8"/>` +
      title("성벽 지기 · Rampart Keeper", "쌓고, 떨어뜨리고, 버텨라 — Stack. Drop. Hold."),
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e76f51"/><stop offset="1" stop-color="#f4a261"/></linearGradient>`,
  );
}

function linkDuel() {
  const bar = (y, w, c, label) => `<rect x="300" y="${y}" width="${w}" height="44" rx="22" fill="${c}"/><text x="${310 + w}" y="${y + 32}" font-family="sans-serif" font-size="28" font-weight="700" fill="#fff" dx="10">${label}</text>`;
  const tiles = ["7", "+", "?", "⏱", "1·2·3"].map((t, i) => `<rect x="${170 + i * 180}" y="420" width="140" height="140" rx="28" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.5)" stroke-width="3"/><text x="${240 + i * 180}" y="512" text-anchor="middle" font-family="sans-serif" font-size="${t.length > 2 ? 40 : 64}" font-weight="800" fill="#fff">${t}</text>`).join("");
  return svg(
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>` + bar(220, 520, "#ff6b6b", "YOU 742") + bar(290, 430, "#4dabf7", "FRIEND 655") +
      `<circle cx="220" cy="277" r="62" fill="#ffd43b"/><text x="220" y="297" text-anchor="middle" font-family="sans-serif" font-size="52" font-weight="900" fill="#3b1f6b">VS</text>` + tiles +
      title("링크 대결 · Link Duel", "링크 하나로 친구와 같은 10판 — One link, same ten rounds"),
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b1f6b"/><stop offset="1" stop-color="#1c3f8c"/></linearGradient>`,
  );
}

function seasonWorkshop() {
  let snow = "";
  for (let i = 0; i < 70; i++) snow += `<circle cx="${(i * 173) % W}" cy="${(i * 97) % 470}" r="${2 + (i % 3)}" fill="#fff" opacity=".8"/>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="url(#night)"/>${snow}<circle cx="1010" cy="230" r="46" fill="#fff3bf"/>` +
      `<path d="M0 520 Q600 470 1200 520 L1200 630 L0 630 Z" fill="#e9ecef"/>` +
      `<path d="M330 330 Q600 230 870 330 L840 345 Q600 270 360 345 Z" fill="#343a40"/>` +
      `<rect x="390" y="345" width="420" height="170" fill="#d4a373"/><rect x="380" y="505" width="440" height="20" fill="#7f5539"/>` +
      `<rect x="440" y="380" width="90" height="110" fill="#ffe8a3" stroke="#7f5539" stroke-width="6"/><rect x="670" y="380" width="90" height="110" fill="#ffe8a3" stroke="#7f5539" stroke-width="6"/>` +
      `<line x1="485" y1="380" x2="485" y2="490" stroke="#7f5539" stroke-width="4"/><line x1="715" y1="380" x2="715" y2="490" stroke="#7f5539" stroke-width="4"/>` +
      `<ellipse cx="600" cy="585" rx="90" ry="22" fill="#9c6644"/><path d="M515 585 Q600 470 685 585 Z" fill="#c1121f"/><circle cx="600" cy="560" r="22" fill="#fff"/>` +
      `<path d="M555 425 Q600 485 645 425 Z" fill="#fff8f0" stroke="#7f5539" stroke-width="4"/><ellipse cx="600" cy="425" rx="45" ry="9" fill="#8a1c1c"/><path d="M585 410 q6 -14 0 -26 M605 410 q6 -14 0 -26" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>` +
      `<g font-family="sans-serif" font-size="26" font-weight="700" fill="#fff">${["입춘", "하지", "추분", "동지"].map((t, i) => `<rect x="${130 + i * 250}" y="190" width="190" height="48" rx="24" fill="${i === 3 ? "#e63946" : "rgba(255,255,255,.18)"}"/><text x="${225 + i * 250}" y="223" text-anchor="middle">${t}</text>`).join("")}</g>` +
      title("절기 공방 · Season Workshop", "24절기를 지나 동지 팥죽까지 — Craft through 24 solar terms"),
    `<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3557"/><stop offset="1" stop-color="#457b9d"/></linearGradient>`,
  );
}

function tidyNook() {
  const C = ["#e07a5f", "#81b29a", "#f2cc8f", "#3d5a80", "#98c1d9", "#ffd166", "#b08968", "#cdb4db", "#ddb892", "#e5989b"];
  let cells = "";
  const map = ["0011223", "4415523", "6675889", "6x7799x"];
  map.forEach((row, y) => [...row].forEach((ch, x) => {
    const px = 330 + x * 78, py = 230 + y * 78;
    if (ch === "x") cells += `<rect x="${px}" y="${py}" width="74" height="74" rx="10" fill="#6b4f3a"/><path d="M${px + 24} ${py + 44} L${px + 50} ${py + 44} L${px + 46} ${py + 66} L${px + 28} ${py + 66} Z" fill="#e07a5f"/><circle cx="${px + 30}" cy="${py + 32}" r="11" fill="#81b29a"/><circle cx="${px + 45}" cy="${py + 28}" r="12" fill="#6a994e"/>`;
    else cells += `<rect x="${px}" y="${py}" width="74" height="74" rx="10" fill="${C[Number(ch)]}" stroke="rgba(0,0,0,.15)" stroke-width="3"/>`;
  }));
  return svg(
    `<rect width="${W}" height="${H}" fill="#fdf0d5"/><rect x="0" y="0" width="${W}" height="200" fill="#f6dfb8"/>` +
      `<rect x="60" y="230" width="150" height="190" rx="10" fill="#bde0fe" stroke="#a98467" stroke-width="10"/><line x1="135" y1="230" x2="135" y2="420" stroke="#a98467" stroke-width="6"/>` +
      `<rect x="306" y="206" width="594" height="360" rx="16" fill="#a98467"/>${cells}` +
      `<circle cx="1040" cy="300" r="40" fill="#b08968"/><circle cx="1010" cy="265" r="16" fill="#b08968"/><circle cx="1070" cy="265" r="16" fill="#b08968"/><circle cx="1040" cy="310" r="16" fill="#ddb892"/><circle cx="1026" cy="292" r="5" fill="#3b2a20"/><circle cx="1054" cy="292" r="5" fill="#3b2a20"/>` +
      `<rect x="1005" y="390" width="60" height="62" rx="10" fill="#e07a5f"/><path d="M1065 405 q24 0 24 18 q0 18 -24 18" stroke="#e07a5f" stroke-width="9" fill="none"/>` +
      `<rect x="1022" y="500" width="36" height="60" rx="6" fill="#f4a261"/><path d="M1040 470 q12 14 0 28 q-12 -14 0 -28" fill="#ffd166"/>` +
      title("아늑한 방 정리 · Tidy Nook", "딱 맞게 채우는 기분 — Everything in its place", 640, "#5c3d2e"),
  );
}

const jobs = { "rampart-keeper": rampart(), "link-duel": linkDuel(), "season-workshop": seasonWorkshop(), "tidy-nook": tidyNook() };
for (const [slug, s] of Object.entries(jobs)) {
  await sharp(Buffer.from(s)).webp({ quality: 88 }).toFile(join(root, `public/games/${slug}-keyart.webp`));
  console.log(slug);
}
