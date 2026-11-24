/**
 * Ipchun Brush (입춘 붓글씨) — practise the eight brush strokes and write spring onto the gate.
 *
 * At Ipchun, the first solar term of spring (around 4 February), many households paste a sheet on the gate
 * reading 立春大吉 "great luck as spring begins". Calligraphy is learned through the eight strokes of the
 * character 永 (永字八法): the dot, the horizontal, the vertical, the hook, the rising stroke, the long and short
 * left-falling strokes and the right-falling one. A brush makes a thick line when it moves slowly and a thin one
 * when it moves fast. Drag along each stroke's guide, slowing where it swells and speeding up where it tapers,
 * and keep to the line. Write each stage's strokes well enough to paste up your sheet.
 *
 * Pure and deterministic: every stroke is judged from the points of the drag.
 */

export const IPCHUN_SLUG = "ipchun-brush";
export const STAGE_COUNT = 30;
export const BOX_X = 30; // the 300 px writing box on the 360 px field
export const BOX_Y = 140;
export const BOX = 300;
export const W_STILL = 24; // px: a brush held still lays this wide a line
export const W_MIN = 4;
export const W_PER_SPEED = 0.06; // px of width lost per px/s of speed
export const INK_SETTLE = 0.08; // s the line's width takes to follow the brush's speed
export const SAMPLES = 25;

export type StrokeKind = "dot" | "horizontal" | "vertical" | "hook" | "rising" | "longLeft" | "shortLeft" | "rightFall";
export const STROKES: StrokeKind[] = ["dot", "horizontal", "vertical", "hook", "rising", "longLeft", "shortLeft", "rightFall"];

/** Guide points (in the 300 px box) and the line width wanted along it (evenly spaced from start to end). */
export const SHAPES: Record<StrokeKind, { pts: [number, number][]; width: number[] }> = {
  dot: { pts: [[120, 60], [145, 85], [160, 112]], width: [6, 14, 20] },
  horizontal: { pts: [[50, 150], [150, 146], [250, 140]], width: [22, 9, 9, 20] },
  vertical: { pts: [[150, 40], [150, 150], [150, 262]], width: [20, 10, 10, 18] },
  hook: { pts: [[150, 40], [150, 200], [150, 250], [118, 226]], width: [20, 11, 12, 18, 5] },
  rising: { pts: [[70, 222], [140, 180], [205, 140]], width: [18, 11, 5] },
  longLeft: { pts: [[222, 58], [184, 140], [124, 210], [50, 262]], width: [16, 13, 9, 4] },
  shortLeft: { pts: [[204, 90], [164, 128], [120, 160]], width: [16, 9, 5] },
  rightFall: { pts: [[80, 68], [150, 150], [220, 220], [272, 240]], width: [6, 14, 22, 6] },
};

export interface Stroke { kind: StrokeKind; path: { x: number; y: number }[]; len: number }
export interface IpchunStage {
  stage: number;
  strokes: StrokeKind[];
  tol: number; // px off the line still counted
  wTol: number; // px of width off still counted
  mark: number; // average share of good samples needed (0..1)
}

export interface TracePoint { x: number; y: number; t: number }

/** The stroke's guide in field px, densely sampled, with its length. */
export function strokePath(kind: StrokeKind): Stroke {
  const pts = SHAPES[kind].pts.map(([x, y]) => ({ x: BOX_X + x, y: BOX_Y + y }));
  // a gentle curve through the guide points (Catmull–Rom), 20 samples per span
  const path: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 20; k++) {
      const u = k / 20;
      const u2 = u * u;
      const u3 = u2 * u;
      path.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
      });
    }
  }
  path.push(pts[pts.length - 1]);
  let len = 0;
  for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return { kind, path, len };
}

/** The point at share s (0..1) of the way along a stroke. */
export function pointAt(st: Stroke, s: number): { x: number; y: number } {
  let left = Math.max(0, Math.min(1, s)) * st.len;
  for (let i = 1; i < st.path.length; i++) {
    const d = Math.hypot(st.path[i].x - st.path[i - 1].x, st.path[i].y - st.path[i - 1].y);
    if (left <= d || i === st.path.length - 1) {
      const f = d === 0 ? 0 : Math.min(1, left / d);
      return { x: st.path[i - 1].x + (st.path[i].x - st.path[i - 1].x) * f, y: st.path[i - 1].y + (st.path[i].y - st.path[i - 1].y) * f };
    }
    left -= d;
  }
  return st.path[st.path.length - 1];
}

/** The width wanted at share s along a stroke. */
export function widthAt(kind: StrokeKind, s: number): number {
  const w = SHAPES[kind].width;
  const f = Math.max(0, Math.min(1, s)) * (w.length - 1);
  const i = Math.min(w.length - 2, Math.floor(f));
  return w[i] + (w[i + 1] - w[i]) * (f - i);
}

/** The line a drag lays down: each point with the width the brush made there. */
export function inked(points: TracePoint[]): Array<{ x: number; y: number; w: number }> {
  const out: Array<{ x: number; y: number; w: number }> = [];
  let w = W_STILL;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      const dt = Math.max(1e-3, points[i].t - points[i - 1].t);
      const speed = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) / dt;
      const target = Math.max(W_MIN, Math.min(W_STILL, W_STILL - W_PER_SPEED * speed));
      w += (target - w) * Math.min(1, dt / INK_SETTLE);
    }
    out.push({ x: points[i].x, y: points[i].y, w });
  }
  return out;
}

export interface StrokeJudgement { score: number; good: boolean[] }

/** How well a drag wrote the stroke: the share of the stroke's samples it passed near, at the right width. */
export function judgeStroke(st: Stroke, points: TracePoint[], tol: number, wTol: number): StrokeJudgement {
  const ink = inked(points);
  const good: boolean[] = [];
  for (let k = 0; k < SAMPLES; k++) {
    const s = k / (SAMPLES - 1);
    const p = pointAt(st, s);
    let best = Infinity;
    let w = 0;
    for (const q of ink) {
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < best) {
        best = d;
        w = q.w;
      }
    }
    good.push(best <= tol && Math.abs(w - widthAt(st.kind, s)) <= wTol);
  }
  return { score: good.filter(Boolean).length / SAMPLES, good };
}

export interface Sheet {
  stage: IpchunStage;
  idx: number;
  scores: number[];
  over: boolean;
  won: boolean;
}

export function newSheet(stage: IpchunStage): Sheet {
  return { stage, idx: 0, scores: [], over: false, won: false };
}

export const average = (sh: Sheet) => (sh.scores.length ? sh.scores.reduce((a, b) => a + b, 0) / sh.scores.length : 0);

/** Hands in one drag for the current stroke. */
export function write(sh: Sheet, points: TracePoint[]): StrokeJudgement | null {
  if (sh.over) return null;
  const kind = sh.stage.strokes[sh.idx];
  const j = judgeStroke(strokePath(kind), points, sh.stage.tol, sh.stage.wTol);
  sh.scores.push(j.score);
  sh.idx++;
  if (sh.idx >= sh.stage.strokes.length) {
    sh.over = true;
    sh.won = average(sh) >= sh.stage.mark;
  }
  return j;
}

export function starsFor(sh: Sheet): number {
  if (!sh.won) return 0;
  const a = average(sh);
  if (a >= 0.92) return 3;
  if (a >= (sh.stage.mark + 0.92) / 2) return 2;
  return 1;
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

export interface HandOpts {
  /** px the hand wanders off the line (a slow drift) */
  wobble?: number;
  /** share by which the hand misjudges the speed it means */
  speedErr?: number;
  /** s the hand takes to change speed */
  ease?: number;
  seed?: number;
  /** "brush" varies speed with the stroke; "steady" moves at one even speed */
  mode?: "brush" | "steady";
}

/** A drag along a stroke made by a hand with the given habits. */
export function hand(kind: StrokeKind, opts: HandOpts = {}): TracePoint[] {
  const { wobble = 0, speedErr = 0, ease = 0.02, seed = 1, mode = "brush" } = opts;
  const rng = mulberry(seed * 7919 + STROKES.indexOf(kind) * 131);
  const st = strokePath(kind);
  const dt = 1 / 60;
  const pts: TracePoint[] = [];
  let s = 0;
  let t = 0;
  let speed = 0;
  let drift = 0;
  let driftV = 0;
  const bias = 1 + (rng() * 2 - 1) * speedErr;
  while (s < 1 && t < 10) {
    const p = pointAt(st, s);
    const q = pointAt(st, Math.min(1, s + 0.01));
    const nx = -(q.y - p.y);
    const ny = q.x - p.x;
    const nl = Math.hypot(nx, ny) || 1;
    pts.push({ x: p.x + (nx / nl) * drift, y: p.y + (ny / nl) * drift, t });
    // the speed that lays the width wanted a little ahead
    const want = mode === "steady" ? 170 : ((W_STILL - widthAt(kind, Math.min(1, s + 0.04))) / W_PER_SPEED) * bias;
    speed += (Math.max(15, want) - speed) * Math.min(1, dt / Math.max(dt, ease));
    s += (speed * dt) / st.len;
    t += dt;
    driftV += (rng() * 2 - 1) * wobble * 0.6 - drift * 0.08;
    drift = Math.max(-wobble * 1.6, Math.min(wobble * 1.6, drift + driftV * dt * 6));
  }
  const end = pointAt(st, 1);
  pts.push({ x: end.x, y: end.y, t });
  return pts;
}

export function pilot(stage: IpchunStage, opts: HandOpts = {}): Sheet {
  const sh = newSheet(stage);
  stage.strokes.forEach((kind, i) => write(sh, hand(kind, { ...opts, seed: (opts.seed ?? 1) * 31 + i })));
  return sh;
}

function shape(stage: number) {
  return {
    count: 2 + Math.floor(stage / 6),
    tol: Math.max(11, 22 - stage * 0.4),
    wTol: Math.max(3, 5 - stage * 0.07),
  };
}

/** Human-like writers used to set the mark: a hand that wanders a few px and misjudges speed by a fifth. */
export const HUMAN_WRITERS: HandOpts[] = [1, 2, 3, 4].map((seed) => ({ wobble: 4, speedErr: 0.2, ease: 0.15, seed }));

export function buildStage(stage: number): IpchunStage {
  const sh = shape(stage);
  // the eight strokes in their order, coming round again, each stage starting a little further on
  const strokes = Array.from({ length: sh.count }, (_, i) => STROKES[(stage + i) % STROKES.length]);
  const st: IpchunStage = { stage, strokes, tol: sh.tol, wTol: sh.wTol, mark: 0 };
  const human = HUMAN_WRITERS.map((o) => average(pilot(st, o))).sort((a, b) => a - b);
  st.mark = Math.max(0.5, Math.floor((human[1] - 0.06) * 100) / 100);
  return st;
}

export const IPCHUN_STAGES: IpchunStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
