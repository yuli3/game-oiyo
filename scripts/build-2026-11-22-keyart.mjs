#!/usr/bin/env node
// Bakes key art (1200×630 WebP) for the 2026-11-22 originals from hand-written SVG.
//   node scripts/build-2026-11-22-keyart.mjs [slug ...]
// Outputs: public/games/<slug>-keyart.webp
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;
const svg = (body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;
const title = (text, sub, x = 600, fill = "#fff", y = 110) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${Math.min(72, Math.floor(1900 / text.length))}" font-weight="800" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="3" paint-order="stroke">${text}</text>` +
  `<text x="${x}" y="${y + 50}" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="600" fill="${fill}" opacity=".92">${sub}</text>`;

const PAL = ["#ff6b81", "#4dabf7", "#ffd43b", "#69db7c", "#b197fc", "#ff922b"];
const bubble = (x, y, r, c) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="rgba(255,255,255,.6)" stroke-width="3"/><ellipse cx="${x - r * 0.35}" cy="${y - r * 0.4}" rx="${r * 0.25}" ry="${r * 0.15}" fill="#fff" opacity=".75" transform="rotate(-30 ${x - r * 0.35} ${y - r * 0.4})"/>`;

function bubbleGarden() {
  let b = "";
  const r = 34;
  for (let row = 0; row < 5; row++) {
    const n = row % 2 ? 15 : 16;
    for (let c = 0; c < n; c++) {
      if ((row * 7 + c * 3) % 11 === 0) continue;
      b += bubble(70 + c * 70 + (row % 2 ? 35 : 0), 210 + row * 60, r, PAL[(row * 2 + c + (c > 7 ? 1 : 0)) % 6]);
    }
  }
  let sparks = "";
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    sparks += `<circle cx="${760 + Math.cos(a) * (60 + (i % 3) * 18)}" cy="${470 + Math.sin(a) * (50 + (i % 2) * 16)}" r="${6 + (i % 3) * 2}" fill="${PAL[i % 6]}" opacity=".85"/>`;
  }
  return svg(
    `<rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="40" fill="#8c6239"/>` + b + sparks +
      `<path d="M600 610 L600 520" stroke="#5c940d" stroke-width="22" stroke-linecap="round"/><path d="M600 520 L700 400" stroke="rgba(73,80,87,.55)" stroke-width="7" stroke-dasharray="4 16" stroke-linecap="round"/>` +
      bubble(600, 560, 40, PAL[0]) + `<path d="M0 630 Q300 590 600 630 Q900 590 1200 630 Z" fill="#94d82d"/>` +
      title("비눗방울 정원 · Bubble Garden", "겨누고, 튕기고, 우수수 — Aim. Bounce. Drop them all.", 600, "#2b2d42", 100),
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7f5ff"/><stop offset="1" stop-color="#d3f9d8"/></linearGradient>`,
  );
}

function pictureLogic() {
  const pic = ["....#.....", "..##.##...", ".#######..", "##########", "##########", "##########", "##########", ".########.", "..######..", "....##...."];
  const cell = 34;
  const ox = 440;
  const oy = 230;
  let cells = "";
  pic.forEach((row, y) => [...row].forEach((ch, x) => {
    const solved = x < 6;
    const fill = ch === "#" ? (solved ? (y < 2 ? "#2b8a3e" : "#fd7e14") : "#364fc7") : "#fff";
    const show = ch === "#" && (solved || (x + y) % 3 !== 0);
    cells += `<rect x="${ox + x * cell}" y="${oy + y * cell}" width="${cell}" height="${cell}" fill="${show ? fill : "#fff"}" stroke="#ced4da"/>`;
    if (ch !== "#" && x > 5 && (x * y) % 4 === 1) cells += `<path d="M${ox + x * cell + 9} ${oy + y * cell + 9} l16 16 M${ox + x * cell + 25} ${oy + y * cell + 9} l-16 16" stroke="#e03131" stroke-width="3"/>`;
  }));
  const rowClue = pic.map((r) => (r.match(/#+/g) ?? ["0"]).map((m) => (m === "0" ? 0 : m.length)).join(" "));
  const clues = rowClue.map((t, y) => `<text x="${ox - 14}" y="${oy + y * cell + 24}" text-anchor="end" font-family="sans-serif" font-size="22" font-weight="700" fill="#343a40">${t}</text>`).join("");
  return svg(
    `<rect width="${W}" height="${H}" fill="#fff4e6"/><rect x="${ox - 6}" y="${oy - 6}" width="${cell * 10 + 12}" height="${cell * 10 + 12}" fill="#495057" rx="6"/>` + cells + clues +
      `<g opacity=".9"><rect x="880" y="300" width="230" height="230" rx="20" fill="#fff" stroke="#adb5bd" stroke-width="4"/><text x="995" y="440" text-anchor="middle" font-family="sans-serif" font-size="120" font-weight="900" fill="#fd7e14">?</text></g>` +
      title("그림 로직 · Picture Logic", "숫자대로 칠하면 그림이 — Fill by numbers, reveal a picture", 600, "#5c3d2e", 100),
  );
}

function icePenguin() {
  let tiles = "";
  for (let y = 0; y < 6; y++) for (let x = 0; x < 13; x++) tiles += `<rect x="${x * 92 + 2}" y="${200 + y * 72}" width="90" height="70" fill="${(x + y) % 2 ? "#d0ebff" : "#e7f5ff"}"/>`;
  const rock = (x, y) => `<path d="M${x} ${y + 60} L${x + 10} ${y + 14} L${x + 44} ${y} L${x + 78} ${y + 16} L${x + 86} ${y + 60} Z" fill="#868e96"/><path d="M${x + 12} ${y + 16} L${x + 44} ${y + 3} L${x + 76} ${y + 18} Q${x + 44} ${y + 26} ${x + 12} ${y + 16}" fill="#fff"/>`;
  const fish = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="26" ry="14" fill="#ff922b"/><path d="M${x + 22} ${y} l18 -14 v28 z" fill="#ff922b"/><circle cx="${x - 12}" cy="${y - 3}" r="3" fill="#212529"/>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="#a5d8ff"/>` + tiles + rock(740, 340) + rock(90, 485) + rock(1010, 205) +
      fish(560, 380) + fish(930, 520) +
      `<path d="M140 300 L520 300" stroke="#fff" stroke-width="6" stroke-dasharray="14 12" stroke-linecap="round"/>` +
      `<g transform="translate(560 300)"><ellipse cx="0" cy="58" rx="40" ry="10" fill="rgba(0,0,0,.15)"/><ellipse cx="0" cy="0" rx="44" ry="56" fill="#212529"/><ellipse cx="8" cy="10" rx="28" ry="40" fill="#f8f9fa"/><circle cx="6" cy="-18" r="5" fill="#212529"/><circle cx="24" cy="-18" r="5" fill="#212529"/><path d="M8 -8 L28 -8 L40 0 Z" fill="#ff922b"/><rect x="-34" y="-2" width="68" height="9" fill="#e03131"/></g>` +
      `<path d="M1000 470 a90 90 0 0 1 180 0 Z" fill="#f8f9fa"/><path d="M1060 470 a30 30 0 0 1 60 0 Z" fill="#343a40"/>` +
      title("펭귄 얼음 배달 · Penguin Ice Post", "한 번 밀면 끝까지 쭉 — One push, all the way", 600, "#0b3d66", 100),
  );
}

function mirrorLanterns() {
  let stars = "";
  for (let i = 0; i < 60; i++) stars += `<circle cx="${(i * 197) % W}" cy="${(i * 89) % 200}" r="${1 + (i % 3)}" fill="#fff" opacity=".6"/>`;
  const mirror = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><circle r="40" fill="rgba(201,140,70,.25)" stroke="rgba(230,170,100,.7)" stroke-width="3"/><rect x="-36" y="-5" width="72" height="10" fill="#e9ecef"/><rect x="-36" y="5" width="72" height="5" fill="#b5743a"/></g>`;
  const lantern = (x, y, c) => `<rect x="${x - 4}" y="${y + 20}" width="8" height="40" fill="#5c3d2e"/><rect x="${x - 26}" y="${y - 30}" width="52" height="52" rx="14" fill="${c}" filter="url(#glow)"/><rect x="${x - 30}" y="${y - 38}" width="60" height="10" fill="#7f5539"/>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="#14213d"/>${stars}` +
      `<g filter="url(#glow)" stroke-linecap="round" stroke-width="10"><path d="M40 420 L360 420 L360 260 L800 260 L800 470" stroke="#ffc078" fill="none"/><path d="M1160 560 L620 560 L620 360" stroke="#74c0fc" fill="none"/></g>` +
      `<circle cx="40" cy="420" r="24" fill="#ffc078" filter="url(#glow)"/><circle cx="1160" cy="560" r="24" fill="#74c0fc" filter="url(#glow)"/>` +
      mirror(360, 420, -45) + mirror(360, 260, 45) + mirror(800, 260, 45) + mirror(620, 560, -45) +
      lantern(800, 500, "#ffc078") + lantern(620, 330, "#74c0fc") +
      `<g fill="#9775fa">${[0, 1, 2, 3, 4].map((k) => `<ellipse cx="${1000 + Math.cos(k * 1.256) * 16}" cy="${380 + Math.sin(k * 1.256) * 16}" rx="14" ry="8" transform="rotate(${k * 72} ${1000 + Math.cos(k * 1.256) * 16} ${380 + Math.sin(k * 1.256) * 16})"/>`).join("")}</g><circle cx="1000" cy="380" r="7" fill="#ffe066"/>` +
      title("등불 거울 정원 · Lantern Mirror Garden", "거울을 돌려 빛을 잇다 — Turn mirrors, light the night", 600, "#fff3bf", 100),
    `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
  );
}

function typingDefense() {
  const words = [["사과", 180, 200, "#fff"], ["bridge", 420, 230, "#fff"], ["나비", 720, 180, "#ffd43b"], ["lantern", 930, 260, "#ff6b6b"], ["바람", 560, 340, "#fff"]];
  const tags = words.map(([t, x, y, c]) => `<g><rect x="${x - 70}" y="${y - 34}" width="140" height="50" rx="12" fill="rgba(0,0,0,.45)" stroke="${c}" stroke-width="3"/><text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="700" fill="${c}">${t}</text></g>`).join("");
  let wall = "";
  for (let i = 0; i < 20; i++) wall += `<rect x="${i * 62}" y="${470 + (i % 2) * 6}" width="58" height="40" fill="#adb5bd" stroke="#495057" stroke-width="3"/>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="#1c2541"/><rect y="510" width="${W}" height="120" fill="#5c940d"/>${wall}${tags}` +
      `<rect x="330" y="545" width="540" height="62" rx="14" fill="#fff" stroke="#4dabf7" stroke-width="4"/><text x="360" y="588" font-family="sans-serif" font-size="32" fill="#212529">바람|</text>` +
      title("타자 방어선 · Typing Siege", "단어를 쳐서 성벽을 지켜라 — Type to hold the wall", 600, "#fff", 70),
  );
}

function spinSumo() {
  const top = (x, y, c, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse rx="78" ry="78" fill="${c}"/><path d="M-78 0 A78 78 0 0 1 78 0 Z" fill="rgba(255,255,255,.25)"/><circle r="22" fill="#fff"/><circle r="9" fill="#343a40"/></g>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="#e9c46a"/><ellipse cx="600" cy="390" rx="470" ry="210" fill="#d4a373" stroke="#7f5539" stroke-width="14"/><ellipse cx="600" cy="390" rx="380" ry="160" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="4" stroke-dasharray="18 14"/>` +
      top(470, 390, "#e03131", 20) + top(740, 370, "#1971c2", -30) +
      `<g fill="#fff3bf"><path d="M600 300 l18 50 l50 -20 l-34 42 l44 30 l-54 0 l-6 54 l-24 -48 l-24 48 l-6 -54 l-54 0 l44 -30 l-34 -42 l50 20 Z" opacity=".9"/></g>` +
      `<path d="M330 450 q-40 30 -90 20" stroke="#fff" stroke-width="6" fill="none" opacity=".7"/><path d="M880 330 q50 -20 90 0" stroke="#fff" stroke-width="6" fill="none" opacity=".7"/>` +
      title("팽이 씨름 · Spin Sumo", "꾹 눌렀다 떼면 돌진 — Hold, release, ram", 600, "#fff", 90),
  );
}

function spiderCards() {
  const card = (x, y, r, s, red) => `<g transform="translate(${x} ${y})"><rect width="110" height="156" rx="10" fill="#fff" stroke="#adb5bd" stroke-width="2"/><text x="10" y="34" font-family="sans-serif" font-size="30" font-weight="800" fill="${red ? "#e03131" : "#212529"}">${r}</text><text x="55" y="110" text-anchor="middle" font-family="sans-serif" font-size="54" fill="${red ? "#e03131" : "#212529"}">${s}</text></g>`;
  const back = (x, y) => `<rect x="${x}" y="${y}" width="110" height="156" rx="10" fill="#364fc7" stroke="#748ffc" stroke-width="3"/>`;
  const ranks = ["K", "Q", "J", "10", "9", "8", "7"];
  let cols = "";
  for (let c = 0; c < 7; c++) {
    const x = 90 + c * 150;
    for (let k = 0; k < 2; k++) cols += back(x, 200 + k * 16);
    const n = 1 + ((c * 3) % 4);
    for (let k = 0; k < n; k++) cols += card(x, 240 + k * 52, ranks[(c % 3) + k], c % 2 ? "♥" : "♠", c % 2 === 1);
  }
  let web = "";
  for (let k = 1; k < 6; k++) web += `<circle cx="1120" cy="40" r="${k * 30}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>`;
  for (let k = 0; k < 8; k++) web += `<line x1="1120" y1="40" x2="${1120 + Math.cos(k * 0.785) * 160}" y2="${40 + Math.sin(k * 0.785) * 160}" stroke="rgba(255,255,255,.25)" stroke-width="2"/>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="#2b8a3e"/>${web}${cols}` +
      title("스파이더 카드 · Spider Cards", "30판 모두 풀 수 있는 판 — 30 deals, all winnable", 560, "#fff", 90),
  );
}

function marketMercenaries() {
  const unit = (x, y, e, ring) => `<circle cx="${x}" cy="${y}" r="52" fill="#fff9db" stroke="${ring}" stroke-width="7"/><text x="${x}" y="${y + 20}" text-anchor="middle" font-size="58">${e}</text>`;
  let flags = "";
  for (let i = 0; i < 14; i++) flags += `<path d="M${i * 90} 20 L${i * 90 + 90} 20 L${i * 90 + 45} 70 Z" fill="${["#e03131", "#f59f00", "#1c7ed6", "#2f9e44"][i % 4]}"/>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="#ffe8cc"/><rect y="20" width="${W}" height="6" fill="#7f5539"/>${flags}` +
      `<rect x="60" y="250" width="380" height="300" rx="20" fill="#d9480f"/><rect x="60" y="230" width="380" height="50" rx="14" fill="#a61e4d"/>` +
      `<text x="250" y="268" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="800" fill="#fff">MARKET</text>` +
      unit(160, 360, "🗡️", "#adb5bd") + unit(340, 360, "🏹", "#4dabf7") + unit(250, 470, "🧙", "#f59f00") +
      unit(620, 420, "🛡️", "#1c7ed6") + unit(760, 420, "⚔️", "#1c7ed6") + unit(690, 540, "🌿", "#1c7ed6") +
      `<text x="890" y="455" font-family="sans-serif" font-size="70" font-weight="900" fill="#e8590c">VS</text>` +
      unit(1080, 420, "👹", "#e8590c") +
      title("장터 용병단 · Market Mercenaries", "사고, 합치고, 싸운다 — Buy, merge, battle", 600, "#7f2704", 150),
  );
}

function sunlitGlass() {
  const cols = ["#e03131", "#1971c2", "#f59f00", "#2f9e44"];
  let r = 7;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const x0 = 170, x1 = 470, yTop = 90, yBot = 540, nx = 5, ny = 8;
  const pts = [];
  for (let j = 0; j <= ny; j++) {
    pts.push([]);
    for (let i = 0; i <= nx; i++) {
      const edge = i === 0 || i === nx || j === 0 || j === ny;
      pts[j].push([x0 + ((x1 - x0) * i) / nx + (edge ? 0 : (rnd() - 0.5) * 36), yTop + ((yBot - yTop) * j) / ny + (edge ? 0 : (rnd() - 0.5) * 36)]);
    }
  }
  let panes = "";
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const [a, b, c, d] = [pts[j][i], pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]];
      const k = (i + 2 * j) % 4;
      const k2 = (i + 2 * j + 2) % 4;
      panes += `<path d="M${a} L${b} L${c} Z" fill="${cols[k]}"/><path d="M${a} L${c} L${d} Z" fill="${cols[k2]}"/>`;
    }
  const arch = `M${x0} ${yBot} L${x0} 240 A150 150 0 0 1 ${x1} 240 L${x1} ${yBot} Z`;
  let pools = "";
  for (let i = 0; i < 4; i++) pools += `<path d="M${560 + i * 150} 560 L${700 + i * 150} 560 L${760 + i * 150} 630 L${590 + i * 150} 630 Z" fill="${cols[i]}" opacity=".55"/>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="#2b2118"/>` +
      `<g opacity=".18" stroke="#000" stroke-width="3">${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="${i * 52}" x2="${W}" y2="${i * 52}"/>`).join("")}</g>` +
      `<rect y="550" width="${W}" height="80" fill="#4a3b2c"/>` +
      `<path d="M${x1} 240 L${x1} ${yBot} L1200 630 L1200 560 Z" fill="url(#ray)"/>` + pools +
      `<path d="${arch}" fill="#000" stroke="#8d7b68" stroke-width="22"/>` +
      `<g clip-path="url(#arch)">${panes}<g stroke="#1a1410" stroke-width="5" fill="none">${panes.replace(/fill="[^"]+"/g, "")}</g><rect x="${x0}" y="${yTop}" width="300" height="460" fill="url(#shine)"/></g>` +
      title("햇살 스테인드글라스", "Sunlit Glass — 맞닿은 조각은 다른 색", 830, "#fff3bf", 250) +
      `<text x="830" y="390" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="600" fill="#ffd8a8">30 windows · one answer each</text>`,
    `<clipPath id="arch"><path d="${arch}"/></clipPath>` +
      `<linearGradient id="ray" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3bf" stop-opacity=".35"/><stop offset="1" stop-color="#fff3bf" stop-opacity="0"/></linearGradient>` +
      `<radialGradient id="shine" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  );
}

function fingerHockey() {
  const mallet = (x, y, c) => `<circle cx="${x}" cy="${y}" r="58" fill="${c}" opacity=".25"/><circle cx="${x}" cy="${y}" r="44" fill="${c}"/><circle cx="${x}" cy="${y}" r="20" fill="#fff" opacity=".55"/>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="#0b1026"/>` +
      `<rect x="70" y="190" width="1060" height="400" rx="60" fill="#111a3d" stroke="#4dabf7" stroke-width="8"/>` +
      `<line x1="600" y1="190" x2="600" y2="590" stroke="#4dabf7" stroke-width="4" opacity=".6"/><circle cx="600" cy="390" r="80" fill="none" stroke="#4dabf7" stroke-width="4" opacity=".6"/>` +
      `<rect x="62" y="310" width="16" height="160" fill="#ff6b6b"/><rect x="1122" y="310" width="16" height="160" fill="#74c0fc"/>` +
      `<path d="M300 430 Q520 360 760 330" stroke="#ffe066" stroke-width="18" stroke-linecap="round" opacity=".35" fill="none"/>` +
      `<circle cx="770" cy="328" r="26" fill="#ffe066"/>` +
      mallet(260, 440, "#ff6b6b") + mallet(960, 380, "#4dabf7") +
      `<text x="330" y="560" text-anchor="middle" font-family="sans-serif" font-size="64" font-weight="900" fill="#ff6b6b" opacity=".8">3</text><text x="870" y="560" text-anchor="middle" font-family="sans-serif" font-size="64" font-weight="900" fill="#74c0fc" opacity=".8">2</text>` +
      title("손가락 에어하키 · Finger Air Hockey", "폰 하나로 둘이서 — Two players, one phone", 600, "#fff", 90),
  );
}

const jobs = { "bubble-garden": bubbleGarden, "picture-logic": pictureLogic, "ice-penguin": icePenguin, "mirror-lanterns": mirrorLanterns, "typing-defense": typingDefense, "spin-sumo": spinSumo, "spider-cards": spiderCards, "market-mercenaries": marketMercenaries, "sunlit-glass": sunlitGlass, "finger-hockey": fingerHockey };
const only = process.argv.slice(2);
for (const [slug, make] of Object.entries(jobs)) {
  if (only.length && !only.includes(slug)) continue;
  await sharp(Buffer.from(make())).webp({ quality: 88 }).toFile(join(root, `public/games/${slug}-keyart.webp`));
  console.log(slug);
}
