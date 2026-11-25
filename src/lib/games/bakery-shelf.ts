/**
 * Bakery Shelf (빵집 진열대) — an OIYO original triple goods-sort puzzle (2026-11-25).
 *
 * A bakery's display shelves are a muddle. Each shelf shows three spots at the front, with more trays of bread waiting
 * behind. Move a bread from the front of one shelf to a free spot on another; when three of the same bread stand
 * together on one shelf they sell at once, and when a shelf's front is empty the next tray behind slides forward.
 * Sell every bread within the moves.
 *
 * Pure and deterministic: every stage is dealt from a seed per stage, and kept only when a search finds a way to sell
 * it all; the moves that search found are the stage's plan.
 */

export const SHELF_SLUG = "bakery-shelf";
export const STAGE_COUNT = 30;
export const SLOTS = 3;
export const EMPTY = -1;
export const KINDS = 8;

export interface ShelfStage {
  stage: number;
  /** per shelf, its trays from the front: shelves[s][0] is the front, then the trays behind, three spots each */
  shelves: number[][][];
  /** a way to sell everything: [from shelf, from spot, to shelf, to spot] */
  plan: Array<[number, number, number, number]>;
  par: number;
  limit: number;
}

export interface Bakery {
  stage: ShelfStage;
  front: number[][];
  back: number[][][];
  moves: number;
  sold: number;
  over: boolean;
  won: boolean;
}

export function newBakery(stage: ShelfStage): Bakery {
  const b: Bakery = {
    stage,
    front: stage.shelves.map((s) => s[0].slice()),
    back: stage.shelves.map((s) => s.slice(1).map((t) => t.slice())),
    moves: 0,
    sold: 0,
    over: false,
    won: false,
  };
  for (let s = 0; s < b.front.length; s++) settle(b, s);
  return b;
}

const isEmpty = (row: number[]) => row.every((v) => v === EMPTY);
const isTriple = (row: number[]) => row[0] !== EMPTY && row[0] === row[1] && row[1] === row[2];

/** Sells a full matching shelf and slides trays forward until the front holds bread (or nothing is left). */
function settle(b: Bakery, s: number): number {
  let sold = 0;
  for (;;) {
    if (isTriple(b.front[s])) {
      b.front[s] = [EMPTY, EMPTY, EMPTY];
      b.sold++;
      sold++;
      continue;
    }
    if (isEmpty(b.front[s]) && b.back[s].length > 0) {
      b.front[s] = b.back[s].shift() as number[];
      continue;
    }
    return sold;
  }
}

export function itemsLeft(b: Bakery): number {
  let n = 0;
  for (let s = 0; s < b.front.length; s++) {
    for (const v of b.front[s]) if (v !== EMPTY) n++;
    for (const t of b.back[s]) for (const v of t) if (v !== EMPTY) n++;
  }
  return n;
}

export function canMove(b: Bakery, fs: number, fi: number, ts: number, ti: number): boolean {
  if (b.over || fs === ts) return false;
  if (fs < 0 || ts < 0 || fs >= b.front.length || ts >= b.front.length) return false;
  if (fi < 0 || ti < 0 || fi >= SLOTS || ti >= SLOTS) return false;
  return b.front[fs][fi] !== EMPTY && b.front[ts][ti] === EMPTY;
}

/** The first free spot on shelf s (−1 if full). */
export const freeSpot = (b: Bakery, s: number) => b.front[s].indexOf(EMPTY);

/** Moves a bread; returns how many shelves sold (or −1 if the move isn't allowed). */
export function move(b: Bakery, fs: number, fi: number, ts: number, ti: number): number {
  if (!canMove(b, fs, fi, ts, ti)) return -1;
  b.front[ts][ti] = b.front[fs][fi];
  b.front[fs][fi] = EMPTY;
  b.moves++;
  const sold = settle(b, ts) + settle(b, fs);
  if (itemsLeft(b) === 0) {
    b.over = true;
    b.won = true;
  } else if (b.moves >= b.stage.limit || !anyMove(b)) b.over = true;
  return sold;
}

function anyMove(b: Bakery): boolean {
  let free = 0;
  let shelvesWithBread = 0;
  for (const row of b.front) {
    const f = row.filter((v) => v === EMPTY).length;
    free += f;
    if (f < SLOTS) shelvesWithBread++;
  }
  // a move needs a free spot on a shelf other than the bread's own
  if (free === 0) return false;
  return b.front.some((row, s) => row.some((v) => v !== EMPTY) && b.front.some((r2, t) => t !== s && r2.includes(EMPTY))) && shelvesWithBread > 0;
}

export function starsFor(b: Bakery): number {
  if (!b.won) return 0;
  const p = b.stage.par;
  if (b.moves <= p + Math.ceil(p * 0.15)) return 3;
  if (b.moves <= p + Math.ceil(p * 0.4)) return 2;
  return 1;
}

// ---------------- search, players and stages ----------------

type Move = [number, number, number, number];

function clone(b: Bakery): Bakery {
  return { ...b, front: b.front.map((r) => r.slice()), back: b.back.map((s) => s.map((t) => t.slice())) };
}

function keyOf(b: Bakery): string {
  // the order of spots on a shelf doesn't matter
  return b.front.map((r, s) => r.slice().sort((x, y) => x - y).join(",") + "/" + b.back[s].length).join("|");
}

/** All moves, into the first free spot of each other shelf. */
export function legalMoves(b: Bakery): Move[] {
  const out: Move[] = [];
  for (let fs = 0; fs < b.front.length; fs++) {
    for (let fi = 0; fi < SLOTS; fi++) {
      if (b.front[fs][fi] === EMPTY) continue;
      for (let ts = 0; ts < b.front.length; ts++) {
        if (ts === fs) continue;
        const ti = freeSpot(b, ts);
        if (ti >= 0) out.push([fs, fi, ts, ti]);
      }
    }
  }
  return out;
}

/** How promising a position looks: sold shelves, matching pairs, and trays still waiting. */
export function score(b: Bakery): number {
  let v = b.sold * 100;
  for (let s = 0; s < b.front.length; s++) {
    const row = b.front[s].filter((x) => x !== EMPTY);
    if (row.length === 2 && row[0] === row[1]) v += 22;
    else if (row.length === 3 && (row[0] === row[1] || row[1] === row[2] || row[0] === row[2])) v += 6;
    else if (row.length === 1) v += 3;
    if (row.length === 0 && b.back[s].length === 0) v += 4;
    v -= b.back[s].length * 9;
  }
  return v;
}

/** Beam search for a way to sell everything (null if none found). */
export function solve(stage: ShelfStage, width = 160, maxDepth = 160): Move[] | null {
  const root = newBakery({ ...stage, limit: 9999 });
  let beam: Array<{ b: Bakery; path: Move[] }> = [{ b: root, path: [] }];
  const seen = new Set<string>([keyOf(root)]);
  for (let depth = 0; depth < maxDepth && beam.length; depth++) {
    const next: Array<{ b: Bakery; path: Move[]; v: number }> = [];
    for (const { b, path } of beam) {
      for (const m of legalMoves(b)) {
        const c = clone(b);
        move(c, ...m);
        if (c.won) return [...path, m];
        if (c.over) continue;
        const k = keyOf(c);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ b: c, path: [...path, m], v: score(c) });
      }
    }
    next.sort((a, z) => z.v - a.v);
    beam = next.slice(0, width);
  }
  return null;
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

export interface ShopperOpts {
  /** chance of a move picked without thinking */
  slip?: number;
  seed?: number;
  mode?: "plan" | "think" | "random";
}

/**
 * Plays a stage: the plan, a shopper who looks one move ahead (and sometimes moves without thinking), or random moves.
 */
export function pilot(st: ShelfStage, opts: ShopperOpts = {}): Bakery {
  const { slip = 0, seed = 1, mode = "think" } = opts;
  const rng = mulberry(seed * 2207 + 17);
  const b = newBakery(st);
  if (mode === "plan") {
    for (const m of st.plan) if (!b.over) move(b, ...m);
    return b;
  }
  let guard = 0;
  const visited = new Set<string>([keyOf(b)]);
  while (!b.over && guard++ < 2000) {
    const ms = legalMoves(b);
    if (!ms.length) break;
    if (mode === "random" || rng() < slip) {
      move(b, ...ms[Math.floor(rng() * ms.length)]);
      visited.add(keyOf(b));
      continue;
    }
    let best = ms[0];
    let bestV = -Infinity;
    for (const m of ms) {
      const c = clone(b);
      move(c, ...m);
      // a shopper doesn't keep moving bread back to where it was
      const v = (c.won ? 1e6 : score(c)) - (visited.has(keyOf(c)) ? 60 : 0) + rng() * 4;
      if (v > bestV) {
        bestV = v;
        best = m;
      }
    }
    move(b, ...best);
    visited.add(keyOf(b));
  }
  if (!b.over) b.over = true;
  return b;
}

/** Human-like shoppers: look one move ahead, and one move in eight without thinking. */
export const HUMAN_SHOPPERS: ShopperOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ slip: 0.125, seed }));

export function shape(stage: number) {
  return {
    shelves: Math.min(9, 4 + Math.floor(stage / 4)),
    trays: stage < 1 ? 0 : stage < 6 ? 1 : stage < 14 ? 2 : stage < 22 ? 3 : 4, // trays behind the front
    kinds: Math.min(KINDS, 3 + Math.floor(stage / 3)),
    free: stage < 3 ? 4 : 3, // free spots at the front
  };
}

/** Deals a stage's shelves (no plan yet). */
export function deal(stage: number, attempt: number): number[][][] | null {
  const sh = shape(stage);
  const rng = mulberry(671000 + stage * 443 + attempt * 7919);
  // spots: every shelf's front and trays; some trays one short, the front with a few free spots
  const spots: Array<[number, number, number]> = [];
  const shelves: number[][][] = [];
  for (let s = 0; s < sh.shelves; s++) {
    const trays = sh.trays === 0 ? 0 : Math.max(1, sh.trays - (rng() < 0.3 ? 1 : 0));
    shelves.push(Array.from({ length: 1 + trays }, () => [EMPTY, EMPTY, EMPTY]));
    for (let t = 0; t <= trays; t++) {
      const gap = t > 0 && rng() < 0.2 ? Math.floor(rng() * 3) : -1;
      for (let i = 0; i < SLOTS; i++) if (i !== gap) spots.push([s, t, i]);
    }
  }
  // free spots at the front
  const fronts = spots.filter(([, t]) => t === 0);
  for (let k = 0; k < sh.free; k++) {
    const pick = fronts.splice(Math.floor(rng() * fronts.length), 1)[0];
    spots.splice(spots.indexOf(pick), 1);
  }
  // a whole number of threes
  while (spots.length % 3 !== 0) {
    const backs = spots.filter(([, t]) => t > 0);
    const pick = backs.length ? backs[Math.floor(rng() * backs.length)] : spots[spots.length - 1];
    spots.splice(spots.indexOf(pick), 1);
  }
  const items: number[] = [];
  for (let k = 0; k < spots.length / 3; k++) items.push(k % sh.kinds, k % sh.kinds, k % sh.kinds);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  spots.forEach(([s, t, i], k) => (shelves[s][t][i] = items[k]));
  // no tray (or front) that already holds a matching three, and no empty tray
  for (const s of shelves) {
    for (let t = 0; t < s.length; t++) {
      if (isTriple(s[t])) return null;
      if (t > 0 && isEmpty(s[t])) return null;
    }
  }
  return shelves;
}

/** Builds a stage: deal, search, and check that human-like shoppers sell out while random moves don't. */
export function buildStage(stage: number): ShelfStage {
  for (let attempt = 0; attempt < 60; attempt++) {
    const shelves = deal(stage, attempt);
    if (!shelves) continue;
    const base: ShelfStage = { stage, shelves, plan: [], par: 0, limit: 9999 };
    const plan = solve(base);
    if (!plan) continue;
    base.plan = plan;
    base.par = plan.length;
    const humans = HUMAN_SHOPPERS.map((o) => pilot(base, o));
    if (humans.filter((h) => h.won).length < 7) continue;
    // room for all but the slowest human-like shopper
    const took = humans.filter((h) => h.won).map((h) => h.moves).sort((a, z) => a - z);
    base.limit = Math.max(Math.ceil(base.par * 1.5), took[6]) + 6;
    if (HUMAN_SHOPPERS.filter((o) => pilot(base, o).won).length < 7) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(base, { mode: "random", seed }).won)) continue;
    return base;
  }
  throw new Error(`bakery-shelf stage ${stage + 1}: no fair deal`);
}

/** The 30 deals, built once by scripts/build-bakery-shelf-stages.ts (searching takes a while, too slow for a page). */
export { SHELF_STAGES } from "./bakery-shelf-stages";
