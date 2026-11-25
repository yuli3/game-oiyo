/**
 * Garden Pipes (정원 물길) — an OIYO original pipe-turning puzzle (2026-11-25).
 *
 * A garden of pipe tiles, a tap at the edge and thirsty flowers at the ends of the pipes. Tap a tile to turn it a
 * quarter turn clockwise. When every pipe joins up — no open ends, all of it fed from the tap — every flower drinks.
 * Join them up within the taps.
 *
 * Pure and deterministic: every stage's garden is a random spanning tree of the grid, seeded per stage, so it always
 * has an answer; the tiles start turned at random.
 */

export const PIPES_SLUG = "garden-pipes";
export const STAGE_COUNT = 30;

// openings: up 1, right 2, down 4, left 8
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export interface PipeStage {
  stage: number;
  cols: number;
  rows: number;
  source: number; // the tile the tap feeds
  solved: number[]; // each tile's openings in the answer
  start: number[]; // quarter turns each tile starts away from the answer (0..3)
  par: number;
  limit: number;
}

export interface Garden {
  stage: PipeStage;
  tiles: number[]; // current openings
  taps: number;
  over: boolean;
  won: boolean;
}

/** A tile's openings turned a quarter turn clockwise. */
export const turn = (m: number): number => ((m << 1) | (m >> 3)) & 15;
export const turnBy = (m: number, k: number): number => {
  let v = m;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) v = turn(v);
  return v;
};

export function newGarden(stage: PipeStage): Garden {
  return { stage, tiles: stage.solved.map((m, i) => turnBy(m, 4 - stage.start[i])), taps: 0, over: false, won: false };
}

/** Tiles fed with water from the tap, following openings that meet. */
export function wet(st: PipeStage, tiles: number[]): boolean[] {
  const w = new Array(tiles.length).fill(false);
  const stack = [st.source];
  w[st.source] = true;
  while (stack.length) {
    const i = stack.pop() as number;
    const x = i % st.cols;
    const y = Math.floor(i / st.cols);
    const m = tiles[i];
    const go = (ok: boolean, j: number, mine: number, theirs: number) => {
      if (ok && m & mine && tiles[j] & theirs && !w[j]) {
        w[j] = true;
        stack.push(j);
      }
    };
    go(y > 0, i - st.cols, N, S);
    go(x < st.cols - 1, i + 1, E, W);
    go(y < st.rows - 1, i + st.cols, S, N);
    go(x > 0, i - 1, W, E);
  }
  return w;
}

/** Joined up: every tile wet and no opening left facing nothing. */
export function joined(st: PipeStage, tiles: number[]): boolean {
  for (let i = 0; i < tiles.length; i++) {
    const x = i % st.cols;
    const y = Math.floor(i / st.cols);
    const m = tiles[i];
    if (m & N && (y === 0 || !(tiles[i - st.cols] & S))) return false;
    if (m & E && (x === st.cols - 1 || !(tiles[i + 1] & W))) return false;
    if (m & S && (y === st.rows - 1 || !(tiles[i + st.cols] & N))) return false;
    if (m & W && (x === 0 || !(tiles[i - 1] & E))) return false;
  }
  return wet(st, tiles).every(Boolean);
}

/** Taps tile i: a quarter turn clockwise. */
export function tap(g: Garden, i: number): boolean {
  if (g.over || i < 0 || i >= g.tiles.length) return false;
  g.tiles[i] = turn(g.tiles[i]);
  g.taps++;
  if (joined(g.stage, g.tiles)) {
    g.over = true;
    g.won = true;
  } else if (g.taps >= g.stage.limit) g.over = true;
  return true;
}

export function starsFor(g: Garden): number {
  if (!g.won) return 0;
  if (g.taps <= g.stage.par) return 3;
  if (g.taps <= g.stage.par + 4) return 2;
  return 1;
}

/** Fewest clockwise quarter turns to bring openings `from` to `to` (none if they never match). */
export function turnsTo(from: number, to: number): number {
  for (let k = 0; k < 4; k++) if (turnBy(from, k) === to) return k;
  return -1;
}

/** The taps that turn every tile to the answer, tile by tile in reading order. */
export function planFor(st: PipeStage, tiles: number[]): number[] {
  const out: number[] = [];
  tiles.forEach((m, i) => {
    const k = turnsTo(m, st.solved[i]);
    for (let n = 0; n < k; n++) out.push(i);
  });
  return out;
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

export interface GardenerOpts {
  /** chance a tap goes to the wrong tile, or a tile is turned one time too many */
  slip?: number;
  seed?: number;
  mode?: "plan" | "work" | "random";
}

/**
 * plan: the answer's taps. work: works out from the tap — each tile turned until it fits the ones already joined —
 * with slips. random: any tile.
 */
export function pilot(st: PipeStage, opts: GardenerOpts = {}): Garden {
  const { slip = 0, seed = 1, mode = "work" } = opts;
  const rng = mulberry(seed * 3001 + 71);
  const g = newGarden(st);
  const plan = planFor(st, g.tiles);
  let k = 0;
  let guard = 0;
  while (!g.over && guard++ < 5000) {
    if (mode === "plan") {
      if (k >= plan.length) break;
      tap(g, plan[k++]);
      continue;
    }
    if (mode === "random") {
      tap(g, Math.floor(rng() * g.tiles.length));
      continue;
    }
    // the next tile out from the tap that is not yet right
    const order = bfsOrder(st);
    const next = order.find((i) => g.tiles[i] !== st.solved[i] && turnsTo(g.tiles[i], st.solved[i]) !== 0);
    if (next === undefined) break;
    if (slip > 0 && rng() < slip) tap(g, rng() < 0.5 ? next : Math.floor(rng() * g.tiles.length));
    else tap(g, next);
  }
  if (!g.over) g.over = true;
  return g;
}

/** Tiles in order out from the tap, along the answer's pipes. */
function bfsOrder(st: PipeStage): number[] {
  const seen = new Set([st.source]);
  const out = [st.source];
  for (let h = 0; h < out.length; h++) {
    const i = out[h];
    const m = st.solved[i];
    const x = i % st.cols;
    for (const [bit, j] of [[N, i - st.cols], [E, x < st.cols - 1 ? i + 1 : -1], [S, i + st.cols], [W, x > 0 ? i - 1 : -1]] as Array<[number, number]>) {
      if (m & bit && j >= 0 && j < st.solved.length && !seen.has(j)) {
        seen.add(j);
        out.push(j);
      }
    }
  }
  return out;
}

function shape(stage: number) {
  const size = stage < 4 ? [3, 4] : stage < 10 ? [4, 5] : stage < 18 ? [5, 6] : stage < 25 ? [6, 7] : [6, 8];
  return { cols: size[0], rows: size[1] };
}

/** Human-like gardeners: work out from the tap, but one tap in eight goes astray. */
export const HUMAN_GARDENERS: GardenerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ slip: 0.125, seed }));

export function buildStage(stage: number): PipeStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = mulberry(611000 + stage * 401 + attempt * 7919);
    const { cols, rows } = sh;
    const n = cols * rows;
    // the tap sits on the top edge; a random spanning tree grows from it
    const source = Math.floor(rng() * cols);
    const solved = new Array(n).fill(0);
    const seen = new Array(n).fill(false);
    const stack = [source];
    seen[source] = true;
    while (stack.length) {
      const i = stack[stack.length - 1];
      const x = i % cols;
      const y = Math.floor(i / cols);
      const opts: Array<[number, number, number]> = [];
      if (y > 0 && !seen[i - cols]) opts.push([i - cols, N, S]);
      if (x < cols - 1 && !seen[i + 1]) opts.push([i + 1, E, W]);
      if (y < rows - 1 && !seen[i + cols]) opts.push([i + cols, S, N]);
      if (x > 0 && !seen[i - 1]) opts.push([i - 1, W, E]);
      // only branch a tile up to three ways, so there are no four-way crosses
      if (!opts.length || [N, E, S, W].filter((b) => solved[i] & b).length >= 3) {
        stack.pop();
        continue;
      }
      const [j, mine, theirs] = opts[Math.floor(rng() * opts.length)];
      solved[i] |= mine;
      solved[j] |= theirs;
      seen[j] = true;
      stack.push(j);
    }
    if (!seen.every(Boolean)) continue;
    const start = solved.map((m) => {
      // a turn that changes something (straights look the same half a turn round)
      const choices = [1, 2, 3].filter((k) => turnBy(m, 4 - k) !== m);
      return rng() < 0.15 ? 0 : choices[Math.floor(rng() * choices.length)];
    });
    const st: PipeStage = { stage, cols, rows, source, solved, start, par: 0, limit: 9999 };
    const g = newGarden(st);
    if (joined(st, g.tiles)) continue;
    st.par = planFor(st, g.tiles).length;
    const humans = HUMAN_GARDENERS.map((o) => pilot(st, o));
    if (humans.some((h) => !h.won)) continue;
    st.limit = Math.max(...humans.map((h) => h.taps)) + 8 + Math.floor(st.par / 3);
    const planned = pilot(st, { mode: "plan" });
    if (!planned.won || planned.taps > st.par) continue;
    st.par = planned.taps;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`garden-pipes stage ${stage + 1}: no fair garden`);
}

export const PIPES_STAGES: PipeStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
