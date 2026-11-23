/**
 * 온돌 구들 잇기 (Ondol Flue) — an OIYO original rotation puzzle for a cold Seollal night.
 * Under the floor of a hanok, stone channels carry the heat from the kitchen fire to the chimney.
 * Tap a floor stone to turn it. When every channel joins up with no open ends, the smoke leaves
 * by the chimney and the whole floor glows warm. Every puzzle is built from a real answer, and the
 * stars count your turns against the turns that answer needs.
 */

import { mulberry } from "./pixel-kit";

export const ONDOL_SLUG = "ondol-flue";
export const STAGE_COUNT = 30;

// channel openings as bits: north, east, south, west
export const N = 1;
export const E = 2;
export const S = 4;
export const Wb = 8;
const BITS = [N, E, S, Wb];
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

export interface OndolPuzzle {
  stage: number;
  w: number;
  h: number;
  /** channel shape in its solved turn; 0 = solid stone (no channel) */
  solved: number[];
  /** clockwise quarter turns each tile starts away from the answer */
  start: number[];
  fire: number; // cell over the kitchen fire (bottom row, never turns)
  chimney: number; // cell under the chimney (top row)
  sleepers: number[]; // cells where family members sleep
  par: number; // quarter turns the built answer needs
}

/** Turn a channel shape clockwise by `r` quarter turns. */
export function rotateMask(m: number, r: number): number {
  let out = m;
  for (let k = 0; k < ((r % 4) + 4) % 4; k++) out = ((out << 1) | (out >> 3)) & 15;
  return out;
}

/** How many distinct turns a shape has (straight = 2, cross = 1, others 4). */
export function period(m: number): number {
  if (m === 0 || m === 15) return 1;
  if (m === 5 || m === 10) return 2;
  return 4;
}

function sizeFor(stage: number): [number, number, number] {
  // [w, h, stones]
  if (stage < 3) return [3, 3, 0];
  if (stage < 8) return [4, 4, 0];
  if (stage < 14) return [5, 5, stage < 11 ? 0 : 1];
  if (stage < 19) return [5, 6, 1 + (stage % 2)];
  if (stage < 24) return [6, 6, 2];
  if (stage < 28) return [6, 7, 2 + (stage % 2)];
  return [7, 7, 3];
}

export function buildPuzzle(stage: number): OndolPuzzle {
  const [w, h, stones] = sizeFor(stage);
  for (let attempt = 0; ; attempt++) {
    const rng = mulberry(7300 + stage * 131 + attempt * 7919);
    const n = w * h;
    const fire = (h - 1) * w + Math.floor(rng() * w);
    const stone = new Array<boolean>(n).fill(false);
    for (let k = 0; k < stones; k++) {
      const i = Math.floor(rng() * n);
      if (i === fire || Math.floor(i / w) === 0) continue;
      stone[i] = true;
    }
    // random spanning tree over the open cells, grown from the fire with a mostly-depth-first walk
    const mask = new Array<number>(n).fill(0);
    const seen = new Array<boolean>(n).fill(false);
    seen[fire] = true;
    const stack = [fire];
    while (stack.length) {
      // usually extend the newest branch (long winding channels), sometimes an older one (forks)
      const pick = rng() < 0.75 ? stack.length - 1 : Math.floor(rng() * stack.length);
      const c = stack[pick];
      const x = c % w;
      const y = Math.floor(c / w);
      const opts: number[] = [];
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d];
        const ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (stone[ni] || seen[ni]) continue;
        opts.push(d);
      }
      if (!opts.length) {
        stack.splice(pick, 1);
        continue;
      }
      const d = opts[Math.floor(rng() * opts.length)];
      const ni = (y + DY[d]) * w + x + DX[d];
      mask[c] |= BITS[d];
      mask[ni] |= BITS[(d + 2) % 4];
      seen[ni] = true;
      stack.push(ni);
    }
    let open = 0;
    let ok = true;
    for (let i = 0; i < n; i++) {
      if (stone[i]) continue;
      open++;
      if (!seen[i]) ok = false;
    }
    if (!ok) continue;
    // the chimney sits over the top-row cell that is the longest way from the fire
    const dist = new Array<number>(n).fill(-1);
    dist[fire] = 0;
    const q = [fire];
    while (q.length) {
      const c = q.shift() as number;
      for (let d = 0; d < 4; d++) {
        if (!(mask[c] & BITS[d])) continue;
        const ni = c + DX[d] + DY[d] * w;
        if (dist[ni] < 0) {
          dist[ni] = dist[c] + 1;
          q.push(ni);
        }
      }
    }
    let chimney = -1;
    for (let x = 0; x < w; x++) if (!stone[x] && (chimney < 0 || dist[x] > dist[chimney])) chimney = x;
    // too many straight-through or dead-end tiles make it trivial; keep puzzles with real choices
    const turny = mask.filter((m) => period(m) === 4).length;
    if (turny < open * 0.45 && attempt < 60) continue;
    // scramble
    const start = new Array<number>(n).fill(0);
    let par = 0;
    for (let i = 0; i < n; i++) {
      if (!mask[i] || i === fire) continue;
      const p = period(mask[i]);
      if (p === 1) continue;
      const r = Math.floor(rng() * 4) % p;
      start[i] = r;
      par += (p - r) % p; // clockwise taps that bring it back to the answer
    }
    if (par < Math.max(3, open * 0.55)) continue;
    const sleepers: number[] = [];
    const want = Math.min(5, 1 + Math.floor(stage / 6));
    for (let guard = 0; sleepers.length < want && guard < 200; guard++) {
      const i = Math.floor(rng() * n);
      if (stone[i] || i === fire || i === chimney || sleepers.includes(i)) continue;
      sleepers.push(i);
    }
    return { stage, w, h, solved: mask, start, fire, chimney, sleepers, par };
  }
}

export const PUZZLES: OndolPuzzle[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildPuzzle(i));

export interface OndolBoard {
  puzzle: OndolPuzzle;
  /** current quarter-turn offset of each tile, clockwise, from the solved shape */
  turn: number[];
  taps: number;
  history: number[];
}

export function newBoard(p: OndolPuzzle): OndolBoard {
  return { puzzle: p, turn: p.start.slice(), taps: 0, history: [] };
}

export function shapeAt(b: OndolBoard, i: number): number {
  return rotateMask(b.puzzle.solved[i], b.turn[i]);
}

export function canTurn(p: OndolPuzzle, i: number): boolean {
  return p.solved[i] !== 0 && i !== p.fire && period(p.solved[i]) > 1;
}

/** Turn one tile clockwise. Returns false for stones, the fire tile and crosses. */
export function tap(b: OndolBoard, i: number): boolean {
  if (!canTurn(b.puzzle, i)) return false;
  b.history.push(i);
  b.turn[i] = (b.turn[i] + 1) % period(b.puzzle.solved[i]);
  b.taps++;
  return true;
}

export function undo(b: OndolBoard): boolean {
  const i = b.history.pop();
  if (i === undefined) return false;
  const p = period(b.puzzle.solved[i]);
  b.turn[i] = (b.turn[i] + p - 1) % p;
  b.taps = Math.max(0, b.taps - 1);
  return true;
}

export interface Heat {
  warm: boolean[]; // reached by heat from the fire
  leaks: Array<{ cell: number; dir: number }>; // open channel ends that let smoke into the room
  done: boolean;
}

export function heatOf(b: OndolBoard): Heat {
  const p = b.puzzle;
  const n = p.w * p.h;
  const shapes = Array.from({ length: n }, (_, i) => shapeAt(b, i));
  const warm = new Array<boolean>(n).fill(false);
  warm[p.fire] = true;
  const q = [p.fire];
  while (q.length) {
    const c = q.shift() as number;
    const x = c % p.w;
    const y = Math.floor(c / p.w);
    for (let d = 0; d < 4; d++) {
      if (!(shapes[c] & BITS[d])) continue;
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h) continue;
      const ni = ny * p.w + nx;
      if (!(shapes[ni] & BITS[(d + 2) % 4]) || warm[ni]) continue;
      warm[ni] = true;
      q.push(ni);
    }
  }
  const leaks: Heat["leaks"] = [];
  for (let c = 0; c < n; c++) {
    if (!shapes[c]) continue;
    const x = c % p.w;
    const y = Math.floor(c / p.w);
    for (let d = 0; d < 4; d++) {
      if (!(shapes[c] & BITS[d])) continue;
      const nx = x + DX[d];
      const ny = y + DY[d];
      const ni = ny * p.w + nx;
      if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h || !(shapes[ni] & BITS[(d + 2) % 4])) leaks.push({ cell: c, dir: d });
    }
  }
  let all = true;
  for (let c = 0; c < n; c++) if (p.solved[c] && !warm[c]) all = false;
  return { warm, leaks, done: all && leaks.length === 0 };
}

export function solved(b: OndolBoard): boolean {
  return heatOf(b).done;
}

export function starsFor(taps: number, p: OndolPuzzle): number {
  if (taps <= p.par + 2) return 3;
  if (taps <= Math.ceil(p.par * 1.5) + 2) return 2;
  return 1;
}
