/**
 * 햇살 유리창 (Sunlit Glass) — an OIYO original colouring logic puzzle.
 * An arched stained-glass window is cut into panes (a clipped Voronoi diagram).
 * Paint every pane so that no two touching panes share a colour; a few panes come
 * pre-lit as clues, chosen so the finished window is the only answer.
 * When it is right, sunlight pours through and throws coloured light on the floor.
 */
import { mulberry32 } from "./daily";

export const GLASS_SLUG = "sunlit-glass";
export const WINDOW_COUNT = 30;
export const WIN_W = 300;
export const WIN_H = 420;
const ARCH_R = WIN_W / 2;

export type Pt = [number, number];

export interface Pane {
  poly: Pt[];
  cx: number;
  cy: number;
}

export interface GlassWindow {
  index: number;
  panes: Pane[];
  adj: number[][];
  colors: number; // 3 or 4
  palette: string[];
  solution: number[];
  clues: number[]; // pane indexes that start painted
}

export const PALETTES: readonly string[][] = [
  ["#e8590c", "#fcc419", "#1c7ed6", "#2f9e44"], // sunrise
  ["#0b7285", "#3bc9db", "#f783ac", "#fab005"], // sea
  ["#2b8a3e", "#94d82d", "#e67700", "#862e9c"], // forest
  ["#c2255c", "#f06595", "#ffd43b", "#5c7cfa"], // rose
  ["#364fc7", "#4dabf7", "#ffa94d", "#e03131"], // cathedral
  ["#5f3dc4", "#b197fc", "#20c997", "#ffe066"], // twilight
];

/** Windows 1-10 use three colours, 11-30 four; panes grow from 12 to 38. */
export function windowSpec(index: number): { panes: number; colors: number } {
  const i = Math.max(0, Math.min(WINDOW_COUNT - 1, index));
  if (i < 10) return { panes: 12 + i, colors: 3 };
  if (i < 20) return { panes: 20 + (i - 10), colors: 4 };
  return { panes: 30 + Math.round((i - 20) * 0.8), colors: 4 };
}

/* ------------------------------ geometry ------------------------------ */

export function archPolygon(): Pt[] {
  const pts: Pt[] = [[0, WIN_H], [WIN_W, WIN_H], [WIN_W, ARCH_R]];
  const steps = 28;
  for (let k = 1; k < steps; k++) {
    const a = (k / steps) * Math.PI;
    pts.push([ARCH_R + Math.cos(a) * ARCH_R, ARCH_R - Math.sin(a) * ARCH_R]);
  }
  pts.push([0, ARCH_R]);
  return pts;
}

export function insideArch(x: number, y: number): boolean {
  if (x < 0 || x > WIN_W || y > WIN_H) return false;
  if (y >= ARCH_R) return true;
  return Math.hypot(x - ARCH_R, y - ARCH_R) <= ARCH_R;
}

/** Keep the part of a convex polygon on the side of the line where f(p) <= 0. */
function clip(poly: Pt[], f: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const fa = f(a);
    const fb = f(b);
    if (fa <= 0) out.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

function area(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}

function centroid(poly: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of poly) { x += p[0]; y += p[1]; }
  return [x / poly.length, y / poly.length];
}

function seeds(n: number, rng: () => number): Pt[] {
  const out: Pt[] = [];
  const minD = Math.sqrt((WIN_W * WIN_H * 0.85) / n) * 0.62;
  for (let tries = 0; out.length < n && tries < 20000; tries++) {
    const x = rng() * WIN_W;
    const y = rng() * WIN_H;
    if (!insideArch(x, y)) continue;
    const d = tries > 8000 ? minD * 0.7 : minD;
    if (out.some((p) => Math.hypot(p[0] - x, p[1] - y) < d)) continue;
    out.push([x, y]);
  }
  return out;
}

function voronoi(points: Pt[]): Pane[] {
  const arch = archPolygon();
  return points.map((p, i) => {
    let poly = arch.slice();
    points.forEach((q, j) => {
      if (i === j) return;
      // keep points closer to p than to q
      const mx = (p[0] + q[0]) / 2;
      const my = (p[1] + q[1]) / 2;
      const nx = q[0] - p[0];
      const ny = q[1] - p[1];
      poly = clip(poly, (v) => (v[0] - mx) * nx + (v[1] - my) * ny);
    });
    const [cx, cy] = centroid(poly);
    return { poly, cx, cy };
  });
}

function adjacency(panes: Pane[]): number[][] {
  const key = (p: Pt) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;
  const owners = new Map<string, Set<number>>();
  panes.forEach((pane, i) => {
    for (const v of pane.poly) {
      // tolerate rounding by registering neighbouring keys too
      const k = key(v);
      if (!owners.has(k)) owners.set(k, new Set());
      owners.get(k)!.add(i);
    }
  });
  const shared = new Map<string, number>();
  for (const set of owners.values()) {
    const ids = [...set].sort((a, b) => a - b);
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
      const k = `${ids[a]}-${ids[b]}`;
      shared.set(k, (shared.get(k) ?? 0) + 1);
    }
  }
  const adj: number[][] = panes.map(() => []);
  for (const [k, n] of shared) {
    if (n < 2) continue;
    const [a, b] = k.split("-").map(Number);
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
}

/* ------------------------------- solving ------------------------------- */

/** Counts proper colourings that agree with `fixed` (-1 = free), stopping at `limit`. */
export function countSolutions(adj: number[][], colors: number, fixed: number[], limit = 2): number {
  const n = adj.length;
  const col = fixed.slice();
  for (let i = 0; i < n; i++) if (col[i] >= 0 && adj[i].some((j) => col[j] === col[i])) return 0;
  let count = 0;
  const pick = (): number => {
    let best = -1;
    let bestSat = -1;
    let bestDeg = -1;
    for (let i = 0; i < n; i++) {
      if (col[i] >= 0) continue;
      let mask = 0;
      for (const j of adj[i]) if (col[j] >= 0) mask |= 1 << col[j];
      let sat = 0;
      for (let m = mask; m; m &= m - 1) sat++;
      if (sat > bestSat || (sat === bestSat && adj[i].length > bestDeg)) { best = i; bestSat = sat; bestDeg = adj[i].length; }
    }
    return best;
  };
  const rec = (): void => {
    if (count >= limit) return;
    const i = pick();
    if (i < 0) { count++; return; }
    for (let c = 0; c < colors && count < limit; c++) {
      if (adj[i].some((j) => col[j] === c)) continue;
      col[i] = c;
      rec();
      col[i] = -1;
    }
  };
  rec();
  return count;
}

function randomColouring(adj: number[][], colors: number, rng: () => number): number[] | null {
  const n = adj.length;
  const col = Array(n).fill(-1);
  const order = [...Array(n).keys()].sort((a, b) => adj[b].length - adj[a].length || rng() - 0.5);
  let steps = 0;
  const rec = (k: number): boolean => {
    if (k === n) return true;
    if (++steps > 200000) return false;
    const i = order[k];
    const cs = [...Array(colors).keys()].sort(() => rng() - 0.5);
    for (const c of cs) {
      if (adj[i].some((j) => col[j] === c)) continue;
      col[i] = c;
      if (rec(k + 1)) return true;
      col[i] = -1;
    }
    return false;
  };
  return rec(0) ? col : null;
}

const cache = new Map<number, GlassWindow>();

/** Builds window `index` (deterministic). */
export function makeWindow(index: number): GlassWindow {
  const i = Math.max(0, Math.min(WINDOW_COUNT - 1, index));
  const hit = cache.get(i);
  if (hit) return hit;
  const spec = windowSpec(i);
  for (let salt = 0; ; salt++) {
    const rng = mulberry32(i * 4099 + salt * 131 + 77);
    const pts = seeds(spec.panes, rng);
    if (pts.length < spec.panes) continue;
    const panes = voronoi(pts);
    if (panes.some((p) => p.poly.length < 3 || area(p.poly) < 300)) continue;
    const adj = adjacency(panes);
    if (adj.some((a) => a.length === 0)) continue;
    const solution = randomColouring(adj, spec.colors, rng);
    if (!solution) continue;
    // start from every pane given, then take clues away while the answer stays unique
    const fixed = solution.slice();
    const order = [...Array(panes.length).keys()].sort(() => rng() - 0.5);
    for (const p of order) {
      const keep = fixed[p];
      fixed[p] = -1;
      if (countSolutions(adj, spec.colors, fixed) !== 1) fixed[p] = keep;
    }
    const clues = fixed.map((c, k) => (c >= 0 ? k : -1)).filter((k) => k >= 0);
    const w: GlassWindow = { index: i, panes, adj, colors: spec.colors, palette: PALETTES[i % PALETTES.length].slice(0, spec.colors), solution, clues };
    cache.set(i, w);
    return w;
  }
}

/* ------------------------------ play state ------------------------------ */

/** Colour per pane, -1 = clear glass. */
export type Paint = number[];

export function startPaint(w: GlassWindow): Paint {
  const p = Array(w.panes.length).fill(-1);
  for (const c of w.clues) p[c] = w.solution[c];
  return p;
}

export function paint(w: GlassWindow, p: Paint, pane: number, color: number): Paint {
  if (w.clues.includes(pane) || pane < 0 || pane >= p.length) return p;
  const n = p.slice();
  n[pane] = n[pane] === color ? -1 : color;
  return n;
}

/** Panes that touch a pane of the same colour. */
export function clashes(w: GlassWindow, p: Paint): Set<number> {
  const out = new Set<number>();
  p.forEach((c, i) => {
    if (c < 0) return;
    for (const j of w.adj[i]) if (p[j] === c) { out.add(i); out.add(j); }
  });
  return out;
}

export function isSolved(w: GlassWindow, p: Paint): boolean {
  return p.every((c) => c >= 0) && clashes(w, p).size === 0;
}

/** A pane to fix: a wrong pane first, then an empty one whose colour logic forces. */
export function hint(w: GlassWindow, p: Paint): { pane: number; color: number } | null {
  for (let i = 0; i < p.length; i++) if (p[i] >= 0 && p[i] !== w.solution[i]) return { pane: i, color: w.solution[i] };
  let best = -1;
  let bestOpts = Infinity;
  for (let i = 0; i < p.length; i++) {
    if (p[i] >= 0) continue;
    let mask = 0;
    for (const j of w.adj[i]) if (p[j] >= 0) mask |= 1 << p[j];
    let opts = 0;
    for (let c = 0; c < w.colors; c++) if (!(mask & (1 << c))) opts++;
    if (opts < bestOpts) { bestOpts = opts; best = i; }
  }
  return best >= 0 ? { pane: best, color: w.solution[best] } : null;
}

export function starsFor(hints: number, mistakes: number): number {
  if (hints === 0 && mistakes <= 1) return 3;
  if (hints <= 1 && mistakes <= 4) return 2;
  return 1;
}

export function pointInPoly(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function paneAt(w: GlassWindow, x: number, y: number): number {
  return w.panes.findIndex((pane) => pointInPoly(x, y, pane.poly));
}
