/**
 * 연줄 풀기 (Kite Tangle) — an OIYO original untangling puzzle for the first full moon of the year.
 * Kites tied together by strings have blown into a knot. Drag the kites around the sky until no two
 * strings cross. Every sky is built from a layout with zero crossings, so it can always be untangled,
 * and kites can go anywhere: there is no single answer, only a tidy sky.
 */

import { mulberry } from "./pixel-kit";

export const TANGLE_SLUG = "kite-tangle";

export interface Pt { x: number; y: number }
export interface Sky { index: number; nodes: number; edges: Array<[number, number]>; start: Pt[]; solved: Pt[] }

/** Proper crossing of segments ab and cd (touching at a shared kite does not count). */
export function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const orient = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = orient(c, d, a);
  const d2 = orient(c, d, b);
  const d3 = orient(a, b, c);
  const d4 = orient(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Pairs of edge indices whose strings cross. */
export function crossings(edges: ReadonlyArray<readonly [number, number]>, pos: readonly Pt[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < edges.length; i++) {
    const [a, b] = edges[i];
    for (let j = i + 1; j < edges.length; j++) {
      const [c, d] = edges[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (segmentsCross(pos[a], pos[b], pos[c], pos[d])) out.push([i, j]);
    }
  }
  return out;
}

export function isUntangled(sky: Pick<Sky, "edges">, pos: readonly Pt[]): boolean {
  return crossings(sky.edges, pos).length === 0;
}

export const SKY_COUNT = 30;

export function nodeCount(i: number): number {
  return 6 + Math.round((i * 16) / (SKY_COUNT - 1)); // 6 → 22
}

/** Edges per kite grows from ~1.3 (easy, loose web) to ~2.1 (dense, triangle-heavy). */
function edgeRatio(i: number): number {
  return 1.3 + (i / (SKY_COUNT - 1)) * 0.8;
}

export function buildSky(index: number): Sky {
  const n = nodeCount(index);
  const rand = mulberry(31337 + index * 7919);
  // jittered points in the unit square, kept apart
  const solved: Pt[] = [];
  let guard = 0;
  const minGap = 0.55 / Math.sqrt(n);
  while (solved.length < n && guard++ < 10000) {
    const p = { x: 0.08 + rand() * 0.84, y: 0.08 + rand() * 0.84 };
    if (solved.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minGap)) solved.push(p);
  }
  // greedy planar graph: shortest pairs first, skip any that would cross
  const pairs: Array<[number, number, number]> = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) pairs.push([a, b, Math.hypot(solved[a].x - solved[b].x, solved[a].y - solved[b].y)]);
  pairs.sort((p, q) => p[2] - q[2]);
  const want = Math.round(n * edgeRatio(index));
  const edges: Array<[number, number]> = [];
  const deg = new Array<number>(n).fill(0);
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  // first a spanning tree (so the sky is one piece), then extra strings up to the target
  for (const pass of [0, 1]) {
    for (const [a, b] of pairs) {
      if (edges.length >= want) break;
      if (pass === 0 && find(a) === find(b)) continue;
      if (edges.some(([c, d]) => (c === a && d === b) || (c === b && d === a))) continue;
      if (deg[a] >= 5 || deg[b] >= 5) continue;
      if (edges.some(([c, d]) => !(a === c || a === d || b === c || b === d) && segmentsCross(solved[a], solved[b], solved[c], solved[d]))) continue;
      // skip strings that pass too close to a third kite
      let near = false;
      for (let k = 0; k < n && !near; k++) {
        if (k === a || k === b) continue;
        const p = solved[k], u = solved[a], v = solved[b];
        const t = Math.max(0, Math.min(1, ((p.x - u.x) * (v.x - u.x) + (p.y - u.y) * (v.y - u.y)) / ((v.x - u.x) ** 2 + (v.y - u.y) ** 2)));
        if (Math.hypot(u.x + t * (v.x - u.x) - p.x, u.y + t * (v.y - u.y) - p.y) < minGap * 0.35) near = true;
      }
      if (near) continue;
      edges.push([a, b]);
      deg[a] += 1;
      deg[b] += 1;
      if (pass === 0) parent[find(a)] = find(b);
    }
  }
  // scramble onto a circle in a shuffled order, retrying until it is properly tangled
  let start: Pt[] = [];
  const minCross = Math.max(2, Math.round(n * 0.6));
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = Array.from({ length: n }, (_, i) => i).sort(() => rand() - 0.5);
    start = new Array<Pt>(n);
    order.forEach((node, k) => {
      const ang = (k / n) * Math.PI * 2 - Math.PI / 2;
      start[node] = { x: 0.5 + Math.cos(ang) * 0.4, y: 0.5 + Math.sin(ang) * 0.4 };
    });
    if (crossings(edges, start).length >= minCross) break;
  }
  return { index, nodes: n, edges, start, solved };
}

export const SKIES: readonly Sky[] = Array.from({ length: SKY_COUNT }, (_, i) => buildSky(i));

export function starsFor(moves: number, nodes: number): 1 | 2 | 3 {
  if (moves <= nodes) return 3;
  if (moves <= Math.ceil(nodes * 1.6)) return 2;
  return 1;
}

/** Kites that touch at least one crossing string (for the red glow and the hint). */
export function tangledKites(sky: Pick<Sky, "edges">, pos: readonly Pt[]): Set<number> {
  const out = new Set<number>();
  for (const [i, j] of crossings(sky.edges, pos)) {
    for (const k of [...sky.edges[i], ...sky.edges[j]]) out.add(k);
  }
  return out;
}

/** Hint: the kite that sits on the most crossings, and where it sits in the tidy layout. */
export function hint(sky: Sky, pos: readonly Pt[]): { kite: number; to: Pt } | null {
  const cr = crossings(sky.edges, pos);
  if (!cr.length) return null;
  const count = new Array<number>(sky.nodes).fill(0);
  for (const [i, j] of cr) for (const k of [...sky.edges[i], ...sky.edges[j]]) count[k] += 1;
  let best = 0;
  for (let k = 1; k < sky.nodes; k++) if (count[k] > count[best]) best = k;
  return { kite: best, to: sky.solved[best] };
}
