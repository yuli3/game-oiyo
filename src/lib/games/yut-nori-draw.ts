// Canvas renderer for Yut Nori. Board, stations, pieces and the four sticks are all drawn in code.
import { CENTER, DONE, HOME, STATIONS, THROW_STEPS, stationXY, type Throw, type YutState } from "./yut-nori";

export const YUT_W = 600;
export const YUT_H = 710;
const BOARD = { x: 60, y: 50, size: 480 };
const TRAY_Y = 600;

export const TEAM_COLORS = [
  { fill: "#2f5fb3", rim: "#173a7a", soft: "rgba(47,95,179,0.25)" }, // 청
  { fill: "#c8402f", rim: "#7e2116", soft: "rgba(200,64,47,0.25)" }, // 홍
];

export function stationPx(s: number): { x: number; y: number } {
  const { x, y } = stationXY(s);
  return { x: BOARD.x + x * BOARD.size, y: BOARD.y + y * BOARD.size };
}

const isCorner = (s: number) => s === 0 || s === 5 || s === 10 || s === 15 || s === CENTER;

/** Nearest station to a canvas point, or null when the tap is not on one. */
export function stationAt(px: number, py: number): number | null {
  let best: number | null = null;
  let bestD = 34 * 34;
  for (const s of STATIONS) {
    const p = stationPx(s);
    const d = (p.x - px) ** 2 + (p.y - py) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** Stick faces for a throw: true = flat side up. Index 0 is the marked (빽도) stick. */
export function facesFor(t: Throw, seed: number): boolean[] {
  if (t === "backdo") return [true, false, false, false];
  const flats = t === "mo" ? 0 : THROW_STEPS[t];
  const order = [0, 1, 2, 3].sort((a, b) => ((a * 7 + seed * 13) % 11) - ((b * 7 + seed * 13) % 11));
  // for 도 the single flat stick must not be the marked one
  const pool = t === "do" ? order.filter((i) => i !== 0) : order;
  const faces = [false, false, false, false];
  for (let k = 0; k < flats; k++) faces[pool[k]] = true;
  return faces;
}

export interface Anim {
  player: number;
  pieces: number[];
  path: number[]; // stations from start (exclusive) to end (inclusive)
  from: number;
  start: number;
}
export const STEP_MS = 140;

export interface ThrowAnim {
  start: number;
  faces: boolean[];
  duration: number;
}

export interface DrawOpts {
  now: number;
  shake: { x: number; y: number };
  highlights: number[]; // destination stations for the selected throw
  sources: number[]; // stations whose stack can move
  anim: Anim | null;
  throwAnim: ThrowAnim | null;
  lastFaces: boolean[] | null;
  label: string | null;
  labelAt: number;
}

function drawMat(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, YUT_W, YUT_H);
  g.addColorStop(0, "#d9b77c");
  g.addColorStop(1, "#b98f52");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, YUT_W, YUT_H);
  // straw weave
  ctx.strokeStyle = "rgba(120,80,30,0.18)";
  ctx.lineWidth = 2;
  for (let y = 6; y < YUT_H; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(YUT_W, y);
    ctx.stroke();
  }
  // cloth board
  const pad = 30;
  ctx.fillStyle = "#f6ead0";
  ctx.strokeStyle = "#a3322a";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(BOARD.x - pad, BOARD.y - pad, BOARD.size + pad * 2, BOARD.size + pad * 2, 14);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#2f5fb3";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(BOARD.x - pad + 8, BOARD.y - pad + 8, BOARD.size + pad * 2 - 16, BOARD.size + pad * 2 - 16, 10);
  ctx.stroke();
}

function drawLines(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = "rgba(60,40,20,0.55)";
  ctx.lineWidth = 3;
  const corners = [0, 5, 10, 15].map(stationPx);
  ctx.beginPath();
  corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.moveTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[0].x, corners[0].y);
  ctx.stroke();
}

function drawStations(ctx: CanvasRenderingContext2D, o: DrawOpts): void {
  for (const s of STATIONS) {
    const p = stationPx(s);
    const big = isCorner(s);
    const r = s === CENTER ? 26 : big ? 22 : 14;
    ctx.fillStyle = big ? "#fbf3e1" : "#fffaf0";
    ctx.strokeStyle = s === 0 ? "#a3322a" : "rgba(60,40,20,0.7)";
    ctx.lineWidth = s === 0 ? 4 : 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (big) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r - 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // 참먹이 arrow (start / finish)
  const start = stationPx(0);
  ctx.fillStyle = "#a3322a";
  ctx.beginPath();
  ctx.moveTo(start.x + 40, start.y + 6);
  ctx.lineTo(start.x + 30, start.y - 10);
  ctx.lineTo(start.x + 50, start.y - 10);
  ctx.closePath();
  ctx.fill();
  // move targets
  const pulse = 0.5 + 0.5 * Math.sin(o.now / 180);
  for (const s of o.sources) {
    if (s === HOME) continue;
    const p = stationPx(s);
    ctx.strokeStyle = `rgba(250,204,21,${0.55 + pulse * 0.4})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const s of o.highlights) {
    if (s === DONE) {
      const p = stationPx(0);
      ctx.fillStyle = `rgba(22,163,74,${0.35 + pulse * 0.35})`;
      ctx.beginPath();
      ctx.arc(p.x + 40, p.y + 34, 16, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const p = stationPx(s);
    ctx.fillStyle = `rgba(22,163,74,${0.25 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

function token(ctx: CanvasRenderingContext2D, x: number, y: number, player: number, count: number, lift = 0): void {
  const c = TEAM_COLORS[player];
  const offs = player === 0 ? -7 : 7;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x + offs, y + 10, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < count; k++) {
    const ty = y - k * 6 - lift;
    ctx.fillStyle = c.rim;
    ctx.beginPath();
    ctx.ellipse(x + offs, ty + 4, 15, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.fill;
    ctx.beginPath();
    ctx.ellipse(x + offs, ty, 15, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (count > 1) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`×${count}`, x + offs, y - (count - 1) * 6 - lift);
  }
}

function animPos(a: Anim, now: number): { x: number; y: number; lift: number } | null {
  const t = (now - a.start) / STEP_MS;
  if (t >= a.path.length) return null;
  const i = Math.floor(t);
  const f = t - i;
  const fromS = i === 0 ? a.from : a.path[i - 1];
  const toS = a.path[i];
  const from = fromS === HOME ? { x: YUT_W - 40, y: TRAY_Y - 20 } : stationPx(fromS);
  const to = toS === DONE ? { x: stationPx(0).x + 40, y: stationPx(0).y + 34 } : stationPx(toS);
  return { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f, lift: Math.sin(f * Math.PI) * 16 };
}

function drawPieces(ctx: CanvasRenderingContext2D, s: YutState, o: DrawOpts): void {
  const moving = o.anim && o.now - o.anim.start < o.anim.path.length * STEP_MS ? o.anim : null;
  for (let pl = 0; pl < 2; pl++) {
    const byPos = new Map<number, number>();
    s.pieces[pl].forEach((p, i) => {
      if (p.pos === HOME || p.pos === DONE) return;
      if (moving && moving.player === pl && moving.pieces.includes(i)) return;
      byPos.set(p.pos, (byPos.get(p.pos) ?? 0) + 1);
    });
    for (const [pos, n] of byPos) {
      const p = stationPx(pos);
      token(ctx, p.x, p.y, pl, n);
    }
  }
  if (moving) {
    const p = animPos(moving, o.now);
    if (p) token(ctx, p.x, p.y, moving.player, moving.pieces.length, p.lift);
  }
}

function stick(ctx: CanvasRenderingContext2D, cx: number, cy: number, angle: number, flip: number, flat: boolean, marked: boolean): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(Math.max(0.08, Math.abs(flip)), 1);
  const w = 30;
  const h = 88;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 4, -h / 2 + 6, w, h, 12);
  ctx.fill();
  if (flat) {
    ctx.fillStyle = "#f3dcaa";
    ctx.strokeStyle = "#9b6a2c";
  } else {
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, "#7a4a1d");
    g.addColorStop(0.5, "#a8692e");
    g.addColorStop(1, "#6b3f17");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#4b2a0e";
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 12);
  ctx.fill();
  ctx.stroke();
  if (flat) {
    // painted X marks on the flat face
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 2;
    for (const y of [-26, 0, 26]) {
      ctx.beginPath();
      ctx.moveTo(-7, y - 7);
      ctx.lineTo(7, y + 7);
      ctx.moveTo(7, y - 7);
      ctx.lineTo(-7, y + 7);
      ctx.stroke();
    }
    if (marked) {
      ctx.fillStyle = "#a3322a";
      ctx.beginPath();
      ctx.arc(0, -h / 2 + 12, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = "rgba(40,20,5,0.4)";
    for (const x of [-6, 4]) {
      ctx.beginPath();
      ctx.moveTo(x, -h / 2 + 10);
      ctx.lineTo(x + 1, h / 2 - 10);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSticks(ctx: CanvasRenderingContext2D, o: DrawOpts): void {
  const baseY = TRAY_Y + 55;
  const xs = [150, 250, 350, 450];
  if (o.throwAnim) {
    const k = Math.min(1, (o.now - o.throwAnim.start) / o.throwAnim.duration);
    const air = Math.sin(k * Math.PI) * 150;
    xs.forEach((x, i) => {
      const spin = (1 - k) * (6 + i) * Math.PI;
      const flip = Math.cos(spin * 1.3 + i);
      const settled = k > 0.92;
      const flat = settled ? o.throwAnim!.faces[i] : flip > 0;
      stick(ctx, x + Math.sin(i * 2 + k * 5) * 20 * (1 - k), baseY - air, (1 - k) * (i - 1.5) * 1.2 + (settled ? (i - 1.5) * 0.06 : 0), settled ? 1 : flip, flat, i === 0);
    });
    return;
  }
  const faces = o.lastFaces ?? [false, true, false, true];
  xs.forEach((x, i) => stick(ctx, x, baseY, (i - 1.5) * 0.06, 1, faces[i], i === 0));
}

function drawLabel(ctx: CanvasRenderingContext2D, o: DrawOpts): void {
  if (!o.label) return;
  const age = o.now - o.labelAt;
  if (age > 1400) return;
  const a = age < 1000 ? 1 : 1 - (age - 1000) / 400;
  const scale = 1 + Math.max(0, 0.35 - age / 600);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(YUT_W / 2, BOARD.y + BOARD.size / 2);
  ctx.scale(scale, scale);
  ctx.font = "900 72px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.strokeText(o.label, 0, 0);
  ctx.fillStyle = "#a3322a";
  ctx.fillText(o.label, 0, 0);
  ctx.restore();
}

export function drawYut(ctx: CanvasRenderingContext2D, s: YutState, o: DrawOpts): void {
  ctx.save();
  ctx.clearRect(0, 0, YUT_W, YUT_H);
  ctx.translate(o.shake.x, o.shake.y);
  drawMat(ctx);
  drawLines(ctx);
  drawStations(ctx, o);
  drawPieces(ctx, s, o);
  drawSticks(ctx, o);
  drawLabel(ctx, o);
  ctx.restore();
}
