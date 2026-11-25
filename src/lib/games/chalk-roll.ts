/**
 * Chalk Roll (분필 굴림길) — an OIYO original draw-a-line physics puzzle (2026-11-25).
 *
 * A glass marble waits at the top of a classroom blackboard. Draw one chalk line, and when you lift your finger the
 * marble drops and rolls along whatever you drew. Guide it into the little pail, keeping it off the thumbtacks. The
 * less chalk you use, the more stars.
 *
 * Pure and deterministic: fixed 1/240 s steps; every stage is placed from a seed per stage and kept only when a short
 * planned line lands the marble, a shaky hand drawing that line still lands it, and lines drawn at random don't.
 * Field px, y pointing down.
 */

export const CHALK_SLUG = "chalk-roll";
export const STAGE_COUNT = 30;
export const GRAVITY = 900;
export const BALL_R = 10;
export const TACK_R = 10;
export const DT = 1 / 240;
export const BOUNCE = 0.15;
export const STEP_MIN = 6; // chalk points closer than this to the last are skipped
export const W = 360;
export const H = 560;

export type Pt = [number, number];
/** A wall or ledge: x0, y0, x1, y1. */
export type Seg = [number, number, number, number];

export interface Pail {
  x: number; // left wall
  y: number; // rim
  w: number;
  h: number;
}

export interface ChalkStage {
  stage: number;
  ball: Pt;
  pail: Pail;
  walls: Seg[];
  tacks: Pt[];
  /** chalk you can draw (px of line) */
  ink: number;
  /** a line that lands the marble */
  plan: Pt[];
  /** the plan's length */
  par: number;
}

export interface Board {
  stage: ChalkStage;
  line: Pt[];
  used: number;
  rolling: boolean;
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  still: number; // seconds spent barely moving
  over: boolean;
  won: boolean;
}

export function newBoard(stage: ChalkStage): Board {
  return { stage, line: [], used: 0, rolling: false, t: 0, x: stage.ball[0], y: stage.ball[1], vx: 0, vy: 0, still: 0, over: false, won: false };
}

export const pailSegs = (p: Pail): Seg[] => [
  [p.x, p.y, p.x, p.y + p.h],
  [p.x, p.y + p.h, p.x + p.w, p.y + p.h],
  [p.x + p.w, p.y, p.x + p.w, p.y + p.h],
];

/** Adds a chalk point while drawing (skipped if too close; cut short when the chalk runs out). */
export function addPoint(b: Board, x: number, y: number): boolean {
  if (b.rolling || b.over) return false;
  const px = Math.max(0, Math.min(W, x));
  const py = Math.max(0, Math.min(H, y));
  const last = b.line[b.line.length - 1];
  if (!last) {
    b.line.push([px, py]);
    return true;
  }
  const d = Math.hypot(px - last[0], py - last[1]);
  if (d < STEP_MIN) return false;
  const left = b.stage.ink - b.used;
  if (left <= 0.5) return false;
  if (d > left) {
    const k = left / d;
    b.line.push([last[0] + (px - last[0]) * k, last[1] + (py - last[1]) * k]);
    b.used = b.stage.ink;
    return true;
  }
  b.line.push([px, py]);
  b.used += d;
  return true;
}

/** Lifts the chalk: the marble drops. */
export function release(b: Board): boolean {
  if (b.rolling || b.over) return false;
  b.rolling = true;
  return true;
}

function collide(b: Board, s: Seg): void {
  const [ax, ay, bx, by] = s;
  const dx = bx - ax;
  const dy = by - ay;
  const l = dx * dx + dy * dy;
  const k = l === 0 ? 0 : Math.max(0, Math.min(1, ((b.x - ax) * dx + (b.y - ay) * dy) / l));
  const qx = ax + dx * k;
  const qy = ay + dy * k;
  const ex = b.x - qx;
  const ey = b.y - qy;
  const d = Math.hypot(ex, ey);
  if (d >= BALL_R || d === 0) return;
  const nx = ex / d;
  const ny = ey / d;
  b.x = qx + nx * BALL_R;
  b.y = qy + ny * BALL_R;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + BOUNCE) * vn * nx;
    b.vy -= (1 + BOUNCE) * vn * ny;
  }
}

export function inPail(b: Board): boolean {
  const p = b.stage.pail;
  return b.x > p.x && b.x < p.x + p.w && b.y > p.y + BALL_R * 0.5 && b.y < p.y + p.h;
}

export function step(b: Board): void {
  if (b.over || !b.rolling) return;
  b.t += DT;
  b.vy += GRAVITY * DT;
  b.x += b.vx * DT;
  b.y += b.vy * DT;
  const segs: Seg[] = [...b.stage.walls, ...pailSegs(b.stage.pail)];
  for (let i = 1; i < b.line.length; i++) segs.push([b.line[i - 1][0], b.line[i - 1][1], b.line[i][0], b.line[i][1]]);
  for (let pass = 0; pass < 2; pass++) for (const s of segs) collide(b, s);
  // a little rolling friction
  b.vx *= 0.9997;
  b.vy *= 0.9997;
  if (inPail(b)) {
    b.over = true;
    b.won = true;
    return;
  }
  b.still = Math.hypot(b.vx, b.vy) < 8 ? b.still + DT : 0;
  if (b.stage.tacks.some(([x, y]) => Math.hypot(b.x - x, b.y - y) < TACK_R + BALL_R) || b.y > H + 40 || b.x < -30 || b.x > W + 30 || b.t > 12 || b.still > 1.5) b.over = true;
}

/** Rolls the marble to the end. */
export function runOut(b: Board): Board {
  release(b);
  for (let n = 0; n < 13 / DT && !b.over; n++) step(b);
  return b;
}

export function starsFor(b: Board): number {
  if (!b.won) return 0;
  const p = b.stage.par;
  if (b.used <= p * 1.35 + 20) return 3;
  if (b.used <= p * 1.8 + 40) return 2;
  return 1;
}

export function lengthOf(pts: Pt[]): number {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return n;
}

/** Draws a polyline the way a finger does: a point every few px along it. */
export function draw(b: Board, pts: Pt[]): void {
  if (!pts.length) return;
  addPoint(b, pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / STEP_MIN));
    for (let k = 1; k <= n; k++) addPoint(b, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n);
  }
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface DrawerOpts {
  /** how far (px) a shaky hand puts each corner of the line */
  shake?: number;
  seed?: number;
  mode?: "plan" | "random";
}

/** Plays a stage: the plan (drawn with a shake), or a line drawn at random. */
export function pilot(st: ChalkStage, opts: DrawerOpts = {}): Board {
  const { shake = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 2551 + 37);
  const b = newBoard(st);
  if (mode === "random") {
    // a stroke somewhere on the board, of a length a player might draw
    const x0 = 20 + rng() * (W - 40);
    const y0 = 60 + rng() * (H - 120);
    const a = rng() * Math.PI * 2;
    const len = 60 + rng() * Math.min(260, st.ink);
    const mid: Pt = [x0 + Math.cos(a) * len * 0.5 + gauss(rng) * 20, y0 + Math.sin(a) * len * 0.5 + gauss(rng) * 20];
    draw(b, [[x0, y0], mid, [x0 + Math.cos(a) * len, y0 + Math.sin(a) * len]]);
  } else {
    draw(b, st.plan.map(([x, y]) => [x + gauss(rng) * shake, y + gauss(rng) * shake] as Pt));
  }
  return runOut(b);
}

/** Human-like drawers: every corner of the line a few px off. */
export const HUMAN_DRAWERS: DrawerOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ shake: 5, seed }));

function shape(stage: number) {
  return {
    pailW: stage < 6 ? 72 : stage < 16 ? 62 : 54,
    tacks: stage < 3 ? 0 : Math.min(4, 1 + Math.floor((stage - 3) / 7)),
    ledges: stage < 8 ? 0 : stage < 18 ? 1 : 2,
    bend: stage >= 12, // a line with a bend in it
    reach: Math.min(220, 90 + stage * 5), // how far across the pail sits from the marble
  };
}

function wins(st: ChalkStage, line: Pt[]): Board {
  const b = newBoard(st);
  draw(b, line);
  return runOut(b);
}

export function buildStage(stage: number): ChalkStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 400; attempt++) {
    const rng = mulberry(681000 + stage * 449 + attempt * 7919);
    const ball: Pt = [Math.round(40 + rng() * 280), Math.round(80 + rng() * 40)];
    const dir = ball[0] < 180 ? 1 : -1;
    const pw = sh.pailW;
    const px = Math.round(ball[0] + dir * (sh.reach * (0.7 + rng() * 0.3)) - pw / 2);
    if (px < 10 || px + pw > W - 10) continue;
    const pail: Pail = { x: px, y: Math.round(400 + rng() * 70), w: pw, h: 44 };
    // ledges: short shelves between the marble and the pail that a careless line runs into
    const walls: Seg[] = [];
    for (let k = 0; k < sh.ledges; k++) {
      const cx = ball[0] + dir * (sh.reach * (0.3 + rng() * 0.4));
      const cy = ball[1] + 90 + rng() * (pail.y - ball[1] - 150);
      const half = 24 + rng() * 20;
      walls.push([Math.round(cx - half), Math.round(cy), Math.round(cx + half), Math.round(cy + (rng() * 2 - 1) * 10)]);
    }
    const base: ChalkStage = { stage, ball, pail, walls, tacks: [], ink: 0, plan: [], par: 0 };
    // with no line, the marble must not land by itself
    if (wins({ ...base, ink: 1 }, []).won) continue;
    // search lines: from just under the marble down toward the pail, straight or with one bend
    const found: Array<{ line: Pt[]; len: number }> = [];
    const starts: Pt[] = [
      [ball[0] - dir * 16, ball[1] + 26],
      [ball[0] - dir * 6, ball[1] + 40],
    ];
    const open = { ...base, ink: 9999 };
    for (const p0 of starts) {
      for (let ex = -50; ex <= pw + 50; ex += 10) {
        for (let ey = 20; ey <= 160; ey += 15) {
          const p1: Pt = [pail.x + ex, pail.y - ey];
          if (p1[1] <= p0[1] + 10) continue;
          const lines: Pt[][] = [[p0, p1]];
          if (sh.bend) {
            const mx = (p0[0] + p1[0]) / 2;
            const my = (p0[1] + p1[1]) / 2;
            for (const sag of [-40, 40]) lines.push([p0, [Math.round(mx), Math.round(my + sag)], p1]);
          }
          for (const line of lines) {
            const r = line.map(([x, y]) => [Math.round(x), Math.round(y)] as Pt);
            if (wins(open, r).won) found.push({ line: r, len: lengthOf(r) });
          }
        }
      }
    }
    if (!found.length) continue;
    // of the shortest few, the one a shaky hand lands most often
    found.sort((a, z) => a.len - z.len);
    let best: { line: Pt[]; len: number; sure: number } | null = null;
    for (const f of found.slice(0, 30)) {
      const st = { ...open, plan: f.line };
      const sure = [41, 42, 43, 44, 45, 46, 47, 48, 49, 50].filter((seed) => pilot(st, { shake: 7, seed }).won).length;
      if (!best || sure > best.sure) best = { ...f, sure };
    }
    if (!best || best.sure < 8) continue;
    const plan = best.line;
    const par = Math.round(lengthOf(plan));
    // thumbtacks off the planned path, where a stray marble goes
    const traceSt: ChalkStage = { ...base, ink: 9999, plan, par };
    const path: Pt[] = [];
    {
      const b = newBoard(traceSt);
      draw(b, plan);
      release(b);
      for (let n = 0; n < 13 / DT && !b.over; n++) {
        step(b);
        if (n % 8 === 0) path.push([b.x, b.y]);
      }
    }
    const tacks: Pt[] = [];
    let g = 0;
    while (tacks.length < sh.tacks && g++ < 300) {
      const x = Math.round(20 + rng() * (W - 40));
      const y = Math.round(ball[1] + 60 + rng() * (H - ball[1] - 90));
      if (path.some(([qx, qy]) => Math.hypot(qx - x, qy - y) < TACK_R + BALL_R + 30)) continue;
      if (plan.some(([qx, qy]) => Math.hypot(qx - x, qy - y) < 30)) continue;
      if (x > pail.x - 24 && x < pail.x + pail.w + 24 && y > pail.y - 30) continue;
      // the first tack sits under the marble, where a marble with no line falls
      tacks.push([x, y]);
    }
    if (tacks.length < sh.tacks) continue;
    const st: ChalkStage = { stage, ball, pail, walls, tacks, ink: Math.min(900, Math.round(par * 2.4 + 80)), plan, par };
    const planned = pilot(st);
    if (!planned.won || starsFor(planned) < 3) continue;
    if (HUMAN_DRAWERS.filter((o) => pilot(st, o).won).length < 7) continue;
    if (Array.from({ length: 30 }, (_, k) => k + 1).filter((seed) => pilot(st, { mode: "random", seed }).won).length > (stage < 6 ? 2 : 1)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`chalk-roll stage ${stage + 1}: no fair board`);
}

/** The 30 boards, built once by scripts/build-chalk-roll-stages.ts (searching lines takes a while, too slow for a page). */
export { CHALK_STAGES } from "./chalk-roll-stages";
