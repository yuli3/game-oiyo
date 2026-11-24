/**
 * Trio Tray (간식 트레이) — an OIYO original triple-tile matching puzzle (2026-11-25).
 *
 * Snack tiles lie in layers on a picnic blanket. Tap a tile nobody is lying on and it moves to the seven-slot tray;
 * three of the same snack in the tray pop away. Clear the blanket before the tray fills up.
 *
 * Pure and deterministic: every blanket is seeded per stage. Snacks are dealt so the blanket can always be cleared
 * three at a time (the tray never needs more than three), so a careful eye is rewarded; grabbing at random fills it.
 */

export const TRAY_SLUG = "trio-tray";
export const STAGE_COUNT = 30;
export const TRAY_SIZE = 7;
export const KINDS = 12; // snack pictures

/** A tile sits on a grid of half-tiles: it covers x..x+2, y..y+2 on its layer. */
export interface Tile { x: number; y: number; z: number; kind: number }
export interface TrayStage {
  stage: number;
  tiles: Tile[];
  cols: number; // in half-tiles
  rows: number;
  par: number; // the fullest the tray gets for a careful player (three stars at or under it)
}

export interface Picnic {
  stage: TrayStage;
  gone: boolean[]; // tiles taken off the blanket
  tray: number[]; // kinds in the tray, grouped
  picks: number;
  peak: number;
  over: boolean;
  won: boolean;
}

export const newPicnic = (stage: TrayStage): Picnic => ({ stage, gone: stage.tiles.map(() => false), tray: [], picks: 0, peak: 0, over: false, won: false });

const overlaps = (a: Tile, b: Tile) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;

/** Whether a tile is on the blanket with nothing lying on it. */
export function isFree(p: Picnic, i: number): boolean {
  if (p.gone[i]) return false;
  const t = p.stage.tiles[i];
  return !p.stage.tiles.some((o, j) => j !== i && !p.gone[j] && o.z > t.z && overlaps(o, t));
}

export const freeTiles = (p: Picnic) => p.stage.tiles.map((_, i) => i).filter((i) => isFree(p, i));

export type PickResult = "matched" | "placed" | "blocked" | null;

/** Moves a free tile to the tray; a third of a kind pops all three. */
export function pick(p: Picnic, i: number): PickResult {
  if (p.over || !isFree(p, i)) return p.over ? null : "blocked";
  const kind = p.stage.tiles[i].kind;
  p.gone[i] = true;
  p.picks++;
  // the new tile goes after the last one of its kind, so kinds stay together
  const at = p.tray.lastIndexOf(kind);
  if (at >= 0) p.tray.splice(at + 1, 0, kind);
  else p.tray.push(kind);
  p.peak = Math.max(p.peak, p.tray.length);
  let res: PickResult = "placed";
  if (p.tray.filter((k) => k === kind).length >= 3) {
    p.tray = p.tray.filter((k) => k !== kind);
    res = "matched";
  }
  if (p.gone.every(Boolean) && !p.tray.length) {
    p.over = true;
    p.won = true;
  } else if (p.tray.length >= TRAY_SIZE) p.over = true;
  return res;
}

export function starsFor(p: Picnic): number {
  if (!p.won) return 0;
  if (p.peak <= p.stage.par) return 3;
  if (p.peak <= p.stage.par + 1) return 2;
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

export interface PickerOpts {
  /** chance per pick of grabbing a free tile without thinking */
  slip?: number;
  seed?: number;
  /** "match" plays to the tray; "random" grabs any free tile */
  mode?: "match" | "random";
}

/** The tile a sensible player takes next. */
export function nextPick(p: Picnic, rng: () => number, slip = 0): number {
  const free = freeTiles(p);
  if (!free.length) return -1;
  if (rng() < slip) return free[Math.floor(rng() * free.length)];
  const count = (k: number) => p.tray.filter((x) => x === k).length;
  const kindOf = (i: number) => p.stage.tiles[i].kind;
  // finish a pair, then build on a single
  for (const want of [2, 1]) {
    const hit = free.find((i) => count(kindOf(i)) === want);
    if (hit !== undefined) return hit;
  }
  // a kind with several free copies, or else the tile that uncovers the most
  const covers = (i: number) => p.stage.tiles.filter((o, j) => !p.gone[j] && o.z < p.stage.tiles[i].z && overlaps(o, p.stage.tiles[i])).length;
  const freeOf = (k: number) => free.filter((i) => kindOf(i) === k).length;
  return free.slice().sort((a, b) => freeOf(kindOf(b)) - freeOf(kindOf(a)) || covers(b) - covers(a) || a - b)[0];
}

export function pilot(st: TrayStage, opts: PickerOpts = {}): Picnic {
  const { slip = 0, seed = 1, mode = "match" } = opts;
  const rng = mulberry(seed * 7307 + 53);
  const p = newPicnic(st);
  while (!p.over) {
    const i = mode === "random" ? (() => { const f = freeTiles(p); return f[Math.floor(rng() * f.length)]; })() : nextPick(p, rng, slip);
    if (i < 0 || i === undefined) break;
    pick(p, i);
  }
  return p;
}

function shape(stage: number) {
  return {
    triples: 6 + Math.floor(stage * 0.6), // 18 tiles up to 69
    kinds: Math.min(10, 4 + Math.floor(stage / 3)),
    layers: Math.min(4, 2 + Math.floor(stage / 8)),
    cols: 14, // half-tiles: seven tiles across
    rows: Math.min(16, 10 + Math.floor(stage / 5)),
  };
}

/** Lays tiles in layers (upper ones shifted by half a tile), then deals snacks three at a time off the top. */
export function layout(stage: number, attempt: number): TrayStage | null {
  const sh = shape(stage);
  const rng = mulberry(421000 + stage * 271 + attempt * 7919);
  const n = sh.triples * 3;
  const tiles: Tile[] = [];
  // spots on each layer; higher layers sit within a smaller box
  const spots: Array<{ x: number; y: number; z: number }> = [];
  for (let z = 0; z < sh.layers; z++) {
    const off = z % 2;
    const inset = Math.floor(z / 2) * 2;
    for (let y = inset + off; y + 2 <= sh.rows - inset; y += 2)
      for (let x = inset + off; x + 2 <= sh.cols - inset; x += 2) spots.push({ x, y, z });
  }
  // fill the bottom first, then upward, each upper tile resting on something below
  const byLayer = Array.from({ length: sh.layers }, (_, z) => shuffle(spots.filter((s) => s.z === z), rng));
  const perLayer = Array.from({ length: sh.layers }, () => 0);
  let left = n;
  for (let z = 0; z < sh.layers && left > 0; z++) {
    const share = z === sh.layers - 1 ? left : Math.min(byLayer[z].length, Math.ceil(left * (z === 0 ? 0.42 : 0.5)));
    perLayer[z] = Math.min(share, left);
    left -= perLayer[z];
  }
  if (left > 0) return null;
  for (let z = 0; z < sh.layers; z++) {
    let placed = 0;
    for (const s of byLayer[z]) {
      if (placed >= perLayer[z]) break;
      if (z > 0 && !tiles.some((t) => t.z === z - 1 && overlaps(t as Tile, s as Tile))) continue;
      tiles.push({ ...s, kind: -1 });
      placed++;
    }
    if (placed < perLayer[z]) return null;
  }
  // deal kinds: take three free tiles at a time from the top, all of one kind
  const st: TrayStage = { stage, tiles, cols: sh.cols, rows: sh.rows, par: 0 };
  const p = newPicnic(st);
  const kinds = shuffle(Array.from({ length: KINDS }, (_, k) => k), rng).slice(0, sh.kinds);
  for (let k = 0; k < sh.triples; k++) {
    const free = shuffle(freeTiles(p), rng);
    if (free.length < 3) return null;
    // prefer the highest tiles so the deal reaches down evenly
    const three = free.sort((a, b) => tiles[b].z - tiles[a].z).slice(0, 3);
    const kind = kinds[Math.floor(rng() * kinds.length)];
    for (const i of three) {
      tiles[i].kind = kind;
      p.gone[i] = true;
    }
  }
  return st;
}

/** Human-like players: they play to the tray but grab without thinking about one pick in eight. */
export const HUMAN_PICKERS: PickerOpts[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => ({ slip: 0.12, seed }));

export function buildStage(stage: number): TrayStage {
  for (let attempt = 0; attempt < 400; attempt++) {
    const st = layout(stage, attempt);
    if (!st) continue;
    const runs = HUMAN_PICKERS.map((o) => pilot(st, o));
    if (runs.some((r) => !r.won)) continue;
    const careful = [1, 2, 3].map((seed) => pilot(st, { seed }));
    if (careful.some((r) => !r.won)) continue;
    st.par = Math.max(...careful.map((r) => r.peak)) + (stage < 6 ? 1 : 0);
    if (stage >= 2 && [1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`trio-tray stage ${stage + 1}: no fair blanket`);
}

/** The 30 blankets, each worked out the first time it is asked for. */
export const TRAY_STAGES: TrayStage[] = [];
const built: TrayStage[] = [];
for (let i = 0; i < STAGE_COUNT; i++) Object.defineProperty(TRAY_STAGES, i, { enumerable: true, get: () => (built[i] ??= buildStage(i)) });
