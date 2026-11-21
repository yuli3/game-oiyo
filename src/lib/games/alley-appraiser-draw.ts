/**
 * Canvas drawing for Alley Appraiser items. Each trait option draws a visibly
 * different detail; "fine" details are small enough to need the loupe and "uv"
 * details only appear under the UV lamp.
 */
import type { Category } from "./alley-appraiser";

export type ViewMode = "normal" | "uv";

type Ctx = CanvasRenderingContext2D;

const METALS = ["#d9a93b", "#c7ccd4", "#b0703a"]; // gold, silver, bronze
const GLAZES = ["#8fbfa8", "#ece6d6", "#5b7fb8"]; // celadon, white porcelain, cobalt
const GEMS = ["#d0344a", "#2f8f5b", "#3a62c9"];
const INKS = ["#c0392b", "#2c6e49", "#4b3f8f"];
const UV_GLOW = "#c9a8ff";

function uvMark(ctx: Ctx, kind: number, x: number, y: number, r: number) {
  ctx.save();
  ctx.strokeStyle = UV_GLOW;
  ctx.fillStyle = UV_GLOW;
  ctx.shadowColor = UV_GLOW;
  ctx.shadowBlur = r * 0.8;
  ctx.lineWidth = Math.max(1.5, r * 0.18);
  ctx.beginPath();
  if (kind === 0) {
    // five-point star
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (kind === 1) {
    // three waves
    for (let k = -1; k <= 1; k++) {
      const yy = y + k * r * 0.5;
      ctx.moveTo(x - r, yy);
      ctx.quadraticCurveTo(x - r / 2, yy - r * 0.35, x, yy);
      ctx.quadraticCurveTo(x + r / 2, yy + r * 0.35, x + r, yy);
    }
    ctx.stroke();
  } else {
    // ring with a dot
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function tinyMark(ctx: Ctx, kind: number, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.8, r * 0.25);
  ctx.beginPath();
  if (kind === 0) {
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 1) {
    ctx.rect(x - r, y - r, r * 2, r * 2);
    ctx.stroke();
  } else {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawVase(ctx: Ctx, t: number[], s: number, mode: ViewMode) {
  const [shape, glaze, pattern, handles, seal, uv] = t;
  const cx = s / 2;
  ctx.save();
  ctx.fillStyle = GLAZES[glaze];
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  const top = s * 0.14;
  const bottom = s * 0.86;
  const neck = s * 0.07;
  const belly = shape === 0 ? s * 0.3 : shape === 1 ? s * 0.19 : s * 0.25;
  ctx.moveTo(cx - neck, top);
  if (shape === 2) {
    // gourd: two bulges
    ctx.bezierCurveTo(cx - s * 0.2, top + s * 0.08, cx - s * 0.2, top + s * 0.28, cx - s * 0.09, top + s * 0.32);
    ctx.bezierCurveTo(cx - belly - s * 0.04, top + s * 0.38, cx - belly, bottom - s * 0.05, cx - s * 0.12, bottom);
    ctx.lineTo(cx + s * 0.12, bottom);
    ctx.bezierCurveTo(cx + belly, bottom - s * 0.05, cx + belly + s * 0.04, top + s * 0.38, cx + s * 0.09, top + s * 0.32);
    ctx.bezierCurveTo(cx + s * 0.2, top + s * 0.28, cx + s * 0.2, top + s * 0.08, cx + neck, top);
  } else {
    ctx.bezierCurveTo(cx - neck, top + s * 0.18, cx - belly * 1.15, top + s * 0.3, cx - belly, s * 0.62);
    ctx.bezierCurveTo(cx - belly * 0.9, bottom - s * 0.05, cx - s * 0.14, bottom, cx - s * 0.12, bottom);
    ctx.lineTo(cx + s * 0.12, bottom);
    ctx.bezierCurveTo(cx + s * 0.14, bottom, cx + belly * 0.9, bottom - s * 0.05, cx + belly, s * 0.62);
    ctx.bezierCurveTo(cx + belly * 1.15, top + s * 0.3, cx + neck, top + s * 0.18, cx + neck, top);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // lip
  ctx.fillRect(cx - neck * 1.4, top - s * 0.02, neck * 2.8, s * 0.03);
  ctx.strokeRect(cx - neck * 1.4, top - s * 0.02, neck * 2.8, s * 0.03);
  if (handles === 1) {
    ctx.beginPath();
    ctx.arc(cx - neck - s * 0.05, top + s * 0.1, s * 0.05, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + neck + s * 0.05, top + s * 0.1, s * 0.05, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
  }
  // pattern
  ctx.strokeStyle = glaze === 2 ? "#e8eef8" : "#2d4f7c";
  ctx.lineWidth = s * 0.01;
  if (pattern === 0) {
    // crane: body + wings
    const py = s * 0.56;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.1, py);
    ctx.quadraticCurveTo(cx - s * 0.03, py - s * 0.09, cx, py);
    ctx.quadraticCurveTo(cx + s * 0.03, py - s * 0.09, cx + s * 0.1, py);
    ctx.moveTo(cx, py);
    ctx.lineTo(cx + s * 0.05, py + s * 0.06);
    ctx.stroke();
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.arc(cx, py - s * 0.01, s * 0.012, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern === 1) {
    for (let k = 0; k < 3; k++) {
      const px = cx - s * 0.1 + k * s * 0.1;
      const py = s * 0.58 + (k % 2) * s * 0.05;
      ctx.beginPath();
      ctx.arc(px, py, s * 0.03, Math.PI, 0);
      ctx.arc(px + s * 0.04, py, s * 0.02, Math.PI, 0);
      ctx.stroke();
    }
  }
  // fine: foot seal
  tinyMark(ctx, seal, cx, bottom - s * 0.035, s * 0.012, "#7a1f1f");
  ctx.restore();
  if (mode === "uv") uvMark(ctx, uv, cx, s * 0.42, s * 0.06);
}

function drawCoin(ctx: Ctx, t: number[], s: number, mode: ViewMode) {
  const [metal, hole, glyph, dots, notch, uv] = t;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.36;
  ctx.save();
  ctx.fillStyle = METALS[metal];
  ctx.strokeStyle = "#5a4520";
  ctx.lineWidth = s * 0.014;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  if (notch === 1) {
    ctx.fillStyle = "#1d1a16";
    ctx.beginPath();
    ctx.arc(cx, cy - r, s * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }
  // fine: rim dots
  const n = [8, 12, 16][dots];
  ctx.fillStyle = "#4a3a1a";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.91, cy + Math.sin(a) * r * 0.91, s * 0.006, 0, Math.PI * 2);
    ctx.fill();
  }
  if (hole === 0) {
    ctx.fillStyle = "#1d1a16";
    ctx.fillRect(cx - r * 0.18, cy - r * 0.18, r * 0.36, r * 0.36);
  }
  // glyph marks around the centre
  ctx.strokeStyle = "#3d2f12";
  ctx.lineWidth = s * 0.014;
  const g = r * 0.45;
  const places: Array<[number, number]> = [
    [0, -g],
    [g, 0],
    [0, g],
    [-g, 0],
  ];
  places.forEach(([dx, dy], i) => {
    const x = cx + dx;
    const y = cy + dy;
    ctx.beginPath();
    if (glyph === 0) {
      ctx.moveTo(x - s * 0.03, y);
      ctx.lineTo(x + s * 0.03, y);
      if (i % 2 === 0) {
        ctx.moveTo(x, y - s * 0.03);
        ctx.lineTo(x, y + s * 0.03);
      }
    } else if (glyph === 1) {
      ctx.arc(x, y, s * 0.022, 0, Math.PI * 2);
    } else {
      ctx.moveTo(x - s * 0.025, y - s * 0.025);
      ctx.lineTo(x + s * 0.025, y + s * 0.025);
      ctx.moveTo(x + s * 0.025, y - s * 0.025);
      ctx.lineTo(x - s * 0.025, y + s * 0.025);
    }
    ctx.stroke();
  });
  ctx.restore();
  if (mode === "uv") uvMark(ctx, uv, cx + r * 0.55, cy + r * 0.55, s * 0.05);
}

function drawWatch(ctx: Ctx, t: number[], s: number, mode: ViewMode) {
  const [kase, hands, markers, crown, engraving, uv] = t;
  const cx = s / 2;
  const cy = s * 0.54;
  const r = s * 0.3;
  ctx.save();
  ctx.strokeStyle = "#333";
  ctx.lineWidth = s * 0.012;
  // chain loop + crown
  ctx.fillStyle = METALS[kase];
  const crownAngle = crown === 0 ? -Math.PI / 2 : -Math.PI / 4;
  const kx = cx + Math.cos(crownAngle) * (r + s * 0.03);
  const ky = cy + Math.sin(crownAngle) * (r + s * 0.03);
  ctx.fillRect(kx - s * 0.025, ky - s * 0.025, s * 0.05, s * 0.05);
  ctx.strokeRect(kx - s * 0.025, ky - s * 0.025, s * 0.05, s * 0.05);
  ctx.beginPath();
  ctx.arc(kx + Math.cos(crownAngle) * s * 0.05, ky + Math.sin(crownAngle) * s * 0.05, s * 0.035, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r + s * 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f7f3e8";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#222";
  ctx.strokeStyle = "#222";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r * 0.82;
    const y = cy + Math.sin(a) * r * 0.82;
    if (markers === 0) {
      ctx.beginPath();
      ctx.arc(x, y, s * (i % 3 === 0 ? 0.014 : 0.008), 0, Math.PI * 2);
      ctx.fill();
    } else if (markers === 1) {
      ctx.lineWidth = s * (i % 3 === 0 ? 0.012 : 0.006);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.74, cy + Math.sin(a) * r * 0.74);
      ctx.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
      ctx.stroke();
    } else if (i % 3 === 0) {
      ctx.lineWidth = s * 0.008;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.02);
      ctx.lineTo(x, y + s * 0.02);
      ctx.moveTo(x - s * 0.01, y - s * 0.02);
      ctx.lineTo(x + s * 0.01, y - s * 0.02);
      ctx.moveTo(x - s * 0.01, y + s * 0.02);
      ctx.lineTo(x + s * 0.01, y + s * 0.02);
      ctx.stroke();
    }
  }
  // hands
  ctx.lineCap = "round";
  ctx.lineWidth = s * 0.016;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * 0.35, cy - r * 0.3);
  ctx.stroke();
  ctx.lineWidth = s * 0.01;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - r * 0.1, cy - r * 0.7);
  ctx.stroke();
  if (hands === 1) {
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = s * 0.004;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - r * 0.6, cy + r * 0.4);
    ctx.stroke();
  }
  // fine: maker's engraving under 12
  const ex = cx;
  const ey = cy - r * 0.45;
  ctx.fillStyle = "#555";
  ctx.strokeStyle = "#555";
  ctx.lineWidth = s * 0.003;
  if (engraving === 0) {
    tinyStar(ctx, ex, ey, s * 0.012);
  } else if (engraving === 1) {
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.011, Math.PI * 0.3, Math.PI * 1.7);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(ex, ey, s * 0.006, s * 0.012, Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  if (mode === "uv") uvMark(ctx, uv, cx, cy + r * 0.45, s * 0.05);
}

function tinyStar(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function drawScroll(ctx: Ctx, t: number[], s: number, mode: ViewMode) {
  const [peaks, sky, sealColor, sealSide, signature, uv] = t;
  const x0 = s * 0.22;
  const x1 = s * 0.78;
  const y0 = s * 0.08;
  const y1 = s * 0.92;
  ctx.save();
  ctx.fillStyle = "#6b4a2b";
  ctx.fillRect(x0 - s * 0.04, y0 - s * 0.02, x1 - x0 + s * 0.08, s * 0.03);
  ctx.fillRect(x0 - s * 0.04, y1 - s * 0.01, x1 - x0 + s * 0.08, s * 0.03);
  ctx.fillStyle = "#efe4c8";
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = "#8b6b43";
  ctx.lineWidth = s * 0.006;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  // sky
  ctx.fillStyle = sky === 0 ? "#d9534f" : "#f4e6a1";
  ctx.strokeStyle = "#7a6a40";
  ctx.beginPath();
  ctx.arc(x1 - s * 0.1, y0 + s * 0.12, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
  if (sky === 1) {
    ctx.fillStyle = "#efe4c8";
    ctx.beginPath();
    ctx.arc(x1 - s * 0.085, y0 + s * 0.11, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  // peaks
  const count = peaks + 1;
  ctx.fillStyle = "#4a5a52";
  for (let i = 0; i < count; i++) {
    const px = x0 + ((i + 1) / (count + 1)) * (x1 - x0);
    const h = s * (0.3 + ((i * 37) % 3) * 0.06);
    ctx.beginPath();
    ctx.moveTo(px - s * 0.13, s * 0.7);
    ctx.lineTo(px, s * 0.7 - h);
    ctx.lineTo(px + s * 0.13, s * 0.7);
    ctx.closePath();
    ctx.globalAlpha = 0.75;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#4a5a52";
  ctx.lineWidth = s * 0.006;
  ctx.beginPath();
  ctx.moveTo(x0 + s * 0.03, s * 0.74);
  ctx.quadraticCurveTo(s * 0.5, s * 0.7, x1 - s * 0.03, s * 0.76);
  ctx.stroke();
  // seal
  const sx = sealSide === 0 ? x0 + s * 0.07 : x1 - s * 0.07;
  ctx.fillStyle = sealColor === 0 ? "#c0392b" : "#222";
  ctx.fillRect(sx - s * 0.03, s * 0.8, s * 0.06, s * 0.06);
  ctx.fillStyle = "#efe4c8";
  ctx.fillRect(sx - s * 0.012, s * 0.818, s * 0.024, s * 0.024);
  // fine: signature strokes
  ctx.strokeStyle = "#222";
  ctx.lineWidth = s * 0.003;
  const gx = sealSide === 0 ? x1 - s * 0.07 : x0 + s * 0.07;
  for (let i = 0; i <= signature; i++) {
    ctx.beginPath();
    ctx.moveTo(gx - s * 0.012, s * 0.8 + i * s * 0.014);
    ctx.lineTo(gx + s * 0.012, s * 0.806 + i * s * 0.014);
    ctx.stroke();
  }
  ctx.restore();
  if (mode === "uv") uvMark(ctx, uv, s * 0.5, s * 0.25, s * 0.06);
}

function drawRing(ctx: Ctx, t: number[], s: number, mode: ViewMode) {
  const [metal, gem, cut, prongs, hallmark, uv] = t;
  const cx = s / 2;
  const cy = s * 0.6;
  ctx.save();
  ctx.strokeStyle = METALS[metal];
  ctx.lineWidth = s * 0.06;
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.26, s * 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#5a4520";
  ctx.lineWidth = s * 0.006;
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.29, s * 0.25, 0, 0, Math.PI * 2);
  ctx.stroke();
  // fine: hallmark inside the band (bottom)
  tinyMark(ctx, hallmark, cx, cy + s * 0.22, s * 0.01, "#3a2a10");
  // setting
  const gy = cy - s * 0.27;
  const gr = s * 0.085;
  ctx.fillStyle = METALS[metal];
  ctx.fillRect(cx - s * 0.07, gy + gr * 0.6, s * 0.14, s * 0.05);
  // prongs (fine)
  const pc = prongs === 0 ? 4 : 6;
  ctx.fillStyle = METALS[metal];
  for (let i = 0; i < pc; i++) {
    const a = (i / pc) * Math.PI * 2 + Math.PI / pc;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * gr * 1.05, gy + Math.sin(a) * gr * 1.05, s * 0.009, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = GEMS[gem];
  ctx.strokeStyle = "#ffffffaa";
  ctx.lineWidth = s * 0.005;
  ctx.beginPath();
  if (cut === 0) ctx.arc(cx, gy, gr, 0, Math.PI * 2);
  else ctx.rect(cx - gr * 0.85, gy - gr * 0.85, gr * 1.7, gr * 1.7);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - gr * 0.4, gy - gr * 0.3);
  ctx.lineTo(cx, gy - gr * 0.6);
  ctx.stroke();
  ctx.restore();
  if (mode === "uv") uvMark(ctx, uv, cx, cy, s * 0.05);
}

function drawStamp(ctx: Ctx, t: number[], s: number, mode: ViewMode) {
  const [ink, figure, value, perf, corner, uv] = t;
  const x0 = s * 0.2;
  const y0 = s * 0.15;
  const w = s * 0.6;
  const h = s * 0.7;
  ctx.save();
  ctx.fillStyle = "#fbf7ec";
  ctx.fillRect(x0, y0, w, h);
  // fine: perforation
  const step = perf === 0 ? s * 0.03 : s * 0.05;
  ctx.fillStyle = "#d8d2c2";
  for (let x = x0; x <= x0 + w + 0.1; x += step) {
    for (const y of [y0, y0 + h]) {
      ctx.beginPath();
      ctx.arc(x, y, s * 0.008, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let y = y0; y <= y0 + h + 0.1; y += step) {
    for (const x of [x0, x0 + w]) {
      ctx.beginPath();
      ctx.arc(x, y, s * 0.008, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const color = INKS[ink];
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.01;
  ctx.strokeRect(x0 + s * 0.04, y0 + s * 0.04, w - s * 0.08, h - s * 0.08);
  ctx.fillStyle = color;
  const fx = s / 2;
  const fy = y0 + h * 0.45;
  ctx.beginPath();
  if (figure === 0) {
    // bird
    ctx.ellipse(fx, fy, s * 0.08, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + s * 0.08, fy - s * 0.04, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx - s * 0.02, fy);
    ctx.lineTo(fx - s * 0.05, fy - s * 0.1);
    ctx.lineTo(fx + s * 0.03, fy - s * 0.02);
    ctx.fill();
  } else if (figure === 1) {
    // flower
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(fx + Math.cos(a) * s * 0.05, fy + Math.sin(a) * s * 0.05, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fbf7ec";
    ctx.beginPath();
    ctx.arc(fx, fy, s * 0.025, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // fish
    ctx.ellipse(fx, fy, s * 0.09, s * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx + s * 0.08, fy);
    ctx.lineTo(fx + s * 0.14, fy - s * 0.05);
    ctx.lineTo(fx + s * 0.14, fy + s * 0.05);
    ctx.closePath();
    ctx.fill();
  }
  // value: 1/2/3 bars at the bottom
  ctx.fillStyle = color;
  for (let i = 0; i <= value; i++) ctx.fillRect(x0 + s * 0.08 + i * s * 0.05, y0 + h - s * 0.14, s * 0.03, s * 0.06);
  // fine: corner mark
  tinyMark(ctx, corner, x0 + w - s * 0.08, y0 + s * 0.08, s * 0.012, color);
  ctx.restore();
  if (mode === "uv") uvMark(ctx, uv, s / 2, y0 + h * 0.75, s * 0.05);
}

const DRAW: Record<Category, (ctx: Ctx, t: number[], s: number, mode: ViewMode) => void> = {
  vase: drawVase,
  coin: drawCoin,
  watch: drawWatch,
  scroll: drawScroll,
  ring: drawRing,
  stamp: drawStamp,
};

/** Draws one item filling a square of side `s` at the origin. */
export function drawItem(ctx: Ctx, category: Category, traits: number[], s: number, mode: ViewMode): void {
  ctx.save();
  if (mode === "uv") {
    ctx.filter = "grayscale(0.85) brightness(0.45)";
  }
  DRAW[category](ctx, traits, s, "normal");
  ctx.restore();
  if (mode === "uv") {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    DRAW_UV_ONLY(ctx, category, traits, s);
    ctx.restore();
  }
}

function DRAW_UV_ONLY(ctx: Ctx, category: Category, traits: number[], s: number) {
  // Re-run the category drawer on a throwaway layer is costly; instead draw only the UV mark.
  const uv = traits[traits.length - 1];
  const pos: Record<Category, [number, number, number]> = {
    vase: [0.5, 0.42, 0.06],
    coin: [0.5 + 0.36 * 0.55, 0.5 + 0.36 * 0.55, 0.05],
    watch: [0.5, 0.54 + 0.3 * 0.45, 0.05],
    scroll: [0.5, 0.25, 0.06],
    ring: [0.5, 0.6, 0.05],
    stamp: [0.5, 0.15 + 0.7 * 0.75, 0.05],
  };
  const [x, y, r] = pos[category];
  uvMark(ctx, uv, x * s, y * s, r * s);
}
