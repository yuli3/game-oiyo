/**
 * Palm Village (손바닥 마을) — an OIYO original cozy diorama builder with no way to fail (2026-11-24).
 *
 * A little island fits in the palm of your hand. The boat brings the village's pieces one at a time — houses,
 * trees, a well, fields and lanterns — and you set each one down wherever you like. Nothing can go wrong: every
 * village is a village. But the villagers are happier when things sit well together: houses like trees beside them
 * and a well close by, fields like houses next door, trees like the water's edge, lanterns light the houses they
 * touch and a well serves the houses round it. Make the village as cosy as you can and keep a picture of it.
 *
 * Pure and deterministic: every island and its boatload of pieces are seeded per stage.
 */

export const VILLAGE_SLUG = "palm-village";
export const STAGE_COUNT = 30;

export const PIECES = ["house", "tree", "well", "field", "lantern"] as const;
export type Piece = (typeof PIECES)[number];
export type Ground = "land" | "water" | "rock";

export interface VillageStage {
  stage: number;
  cols: number;
  rows: number;
  ground: Ground[];
  pieces: Piece[]; // in the order the boat brings them
  good: number; // cosy points for two stars
  great: number; // cosy points for three stars
}

export interface Village {
  stage: VillageStage;
  placed: Array<Piece | null>;
  next: number;
  history: number[]; // cells placed, in order (for undo)
  over: boolean;
}

export const N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const N8 = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];

export function newVillage(stage: VillageStage): Village {
  return { stage, placed: new Array(stage.cols * stage.rows).fill(null), next: 0, history: [], over: false };
}

export const canPlace = (v: Village, cell: number) => !v.over && cell >= 0 && cell < v.placed.length && v.stage.ground[cell] === "land" && !v.placed[cell];

function around(st: VillageStage, cell: number, ns: number[][]): number[] {
  const c = cell % st.cols;
  const r = Math.floor(cell / st.cols);
  const out: number[] = [];
  for (const [dx, dy] of ns) {
    const x = c + dx;
    const y = r + dy;
    if (x >= 0 && y >= 0 && x < st.cols && y < st.rows) out.push(y * st.cols + x);
  }
  return out;
}

/** How cosy one placed piece is, given everything around it. */
export function pieceScore(st: VillageStage, placed: Array<Piece | null>, cell: number): number {
  const p = placed[cell];
  if (!p) return 0;
  const near4 = around(st, cell, N4);
  const near8 = around(st, cell, N8);
  const count = (cells: number[], k: Piece) => cells.filter((i) => placed[i] === k).length;
  if (p === "house") return Math.min(2, count(near4, "tree")) + (count(near8, "well") > 0 ? 2 : 0) + (count(near4, "lantern") > 0 ? 1 : 0);
  if (p === "field") return Math.min(3, count(near4, "house"));
  if (p === "tree") return near4.some((i) => st.ground[i] === "water") || near4.length < 4 ? 1 : 0;
  if (p === "well") return Math.min(4, count(near8, "house"));
  return Math.min(2, count(near4, "house")); // lantern
}

export function cosiness(st: VillageStage, placed: Array<Piece | null>): number {
  let s = 0;
  for (let i = 0; i < placed.length; i++) s += pieceScore(st, placed, i);
  return s;
}

export const score = (v: Village) => cosiness(v.stage, v.placed);
export const piece = (v: Village): Piece | null => v.stage.pieces[v.next] ?? null;

/** Sets the next piece down on a cell. The village is finished once every piece is down. */
export function place(v: Village, cell: number): boolean {
  if (!canPlace(v, cell) || v.next >= v.stage.pieces.length) return false;
  v.placed[cell] = v.stage.pieces[v.next];
  v.next++;
  v.history.push(cell);
  if (v.next >= v.stage.pieces.length) v.over = true;
  return true;
}

/** Picks the last piece back up (until the village is finished). */
export function undo(v: Village): boolean {
  if (v.over || !v.history.length) return false;
  const cell = v.history.pop()!;
  v.placed[cell] = null;
  v.next--;
  return true;
}

/** No village fails: one star for any finished village, more for a cosier one. */
export function starsFor(v: Village): number {
  if (!v.over) return 0;
  const s = score(v);
  if (s >= v.stage.great) return 3;
  if (s >= v.stage.good) return 2;
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

/** Fisher–Yates, the only shuffle used here. */
function shuffle<T>(xs: T[], rng: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** How much a cell is worth for a piece right now, plus a little for what it leaves room for. */
function gain(v: Village, cell: number, p: Piece): number {
  const st = v.stage;
  const before = cosiness(st, v.placed);
  v.placed[cell] = p;
  const after = cosiness(st, v.placed);
  v.placed[cell] = null;
  // room to grow: houses want free land around them for trees and fields to come
  const free = around(st, cell, N4).filter((i) => st.ground[i] === "land" && !v.placed[i]).length;
  const room = p === "house" ? free * 0.35 : p === "well" ? around(st, cell, N8).filter((i) => st.ground[i] === "land" && !v.placed[i]).length * 0.12 : 0;
  return after - before + room;
}

export interface BuilderOpts {
  /** how many of the best spots a builder chooses among (1 = always the best) */
  spread?: number;
  /** a beam search width for the careful planner (0 = greedy) */
  beam?: number;
  seed?: number;
  /** "plan" builds for cosiness; "random" sets pieces down anywhere */
  mode?: "plan" | "random";
}

function greedy(v: Village, rng: () => number, spread: number): void {
  while (!v.over) {
    const p = piece(v)!;
    const spots = v.placed.map((_, i) => i).filter((i) => canPlace(v, i)).map((i) => ({ i, g: gain(v, i, p) + rng() * 0.01 }));
    spots.sort((a, b) => b.g - a.g);
    const k = Math.min(spots.length - 1, Math.floor(rng() * spread));
    place(v, spots[k].i);
  }
}

export function pilot(stage: VillageStage, opts: BuilderOpts = {}): Village {
  const { spread = 1, beam = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 2851 + 7);
  const v = newVillage(stage);
  if (mode === "random") {
    while (!v.over) {
      const free = v.placed.map((_, i) => i).filter((i) => canPlace(v, i));
      place(v, shuffle(free, rng)[0]);
    }
    return v;
  }
  if (beam <= 0) {
    greedy(v, rng, spread);
    return v;
  }
  // beam search over placements, keeping the cosiest partial villages (ties broken by room left to grow)
  let frontier: Village[] = [v];
  for (let step = 0; step < stage.pieces.length; step++) {
    const kids: Array<{ v: Village; s: number }> = [];
    for (const fv of frontier) {
      const p = piece(fv)!;
      const spots = fv.placed.map((_, i) => i).filter((i) => canPlace(fv, i)).map((i) => ({ i, g: gain(fv, i, p) })).sort((a, b) => b.g - a.g).slice(0, beam);
      for (const sp of spots) {
        const kid: Village = { ...fv, placed: fv.placed.slice(), history: fv.history.slice() };
        place(kid, sp.i);
        kids.push({ v: kid, s: score(kid) + sp.g * 0.01 });
      }
    }
    kids.sort((a, b) => b.s - a.s);
    frontier = kids.slice(0, beam).map((k) => k.v);
  }
  return frontier[0];
}

function shape(stage: number) {
  return {
    size: stage < 8 ? 5 : stage < 18 ? 6 : 7,
    water: Math.min(0.32, 0.18 + stage * 0.005),
    rocks: Math.floor(stage / 5),
    pieces: 10 + Math.floor(stage * 0.8),
  };
}

/** Human-like builders used to set two stars: they go for good spots but not always the best one. */
export const HUMAN_BUILDERS: BuilderOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ spread: 3, seed }));

export function buildStage(stage: number): VillageStage {
  const sh = shape(stage);
  const rng = mulberry(221000 + stage * 151);
  const cols = sh.size;
  const rows = sh.size;
  // an island: water creeping in from the edges, a few rocks
  const ground: Ground[] = new Array(cols * rows).fill("land");
  for (let i = 0; i < ground.length; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const edge = Math.min(c, r, cols - 1 - c, rows - 1 - r);
    if (edge === 0 && rng() < sh.water * 2.2) ground[i] = "water";
  }
  const land = ground.map((g, i) => (g === "land" ? i : -1)).filter((i) => i >= 0);
  for (const i of shuffle(land, rng).slice(0, sh.rocks)) ground[i] = "rock";
  const free = ground.filter((g) => g === "land").length;
  const n = Math.min(sh.pieces, free - 2);
  const mix: Piece[] = [];
  for (let k = 0; k < n; k++) {
    const u = rng();
    mix.push(u < 0.34 ? "house" : u < 0.6 ? "tree" : u < 0.7 ? "well" : u < 0.86 ? "field" : "lantern");
  }
  const st: VillageStage = { stage, cols, rows, ground, pieces: mix, good: 0, great: 0 };
  const best = score(pilot(st, { beam: 6 }));
  const human = HUMAN_BUILDERS.map((o) => score(pilot(st, o))).sort((a, b) => a - b);
  st.great = best;
  st.good = Math.min(best - 1, human[1]);
  return st;
}

export const VILLAGE_STAGES: VillageStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
