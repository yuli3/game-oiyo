/**
 * Paint Flood (물감 번지기) — an OIYO original colour-flood puzzle (2026-11-25).
 *
 * A canvas of coloured squares. Your paint starts in the top-left corner; pick a colour and your whole patch turns
 * that colour, soaking up every square of it that touches the patch. Turn the whole canvas one colour within the
 * moves on the brush.
 *
 * Pure and deterministic: every canvas is seeded per stage.
 */

export const FLOOD_SLUG = "paint-flood";
export const STAGE_COUNT = 30;

export interface FloodStage {
  stage: number;
  size: number;
  colours: number;
  cells: number[]; // row-major colours
  limit: number; // moves on the brush
  par: number; // three stars at or under
}

export interface Canvas {
  stage: FloodStage;
  cells: number[];
  owned: boolean[]; // the patch grown from the top-left corner
  moves: number;
  over: boolean;
  won: boolean;
}

function grow(size: number, cells: number[], owned: boolean[]): number {
  // spread the patch over touching squares of its colour; returns how many it took
  const colour = cells[0];
  const stack: number[] = [];
  for (let i = 0; i < owned.length; i++) if (owned[i]) stack.push(i);
  let added = 0;
  while (stack.length) {
    const i = stack.pop() as number;
    const r = Math.floor(i / size);
    const c = i % size;
    const near = [r > 0 ? i - size : -1, r < size - 1 ? i + size : -1, c > 0 ? i - 1 : -1, c < size - 1 ? i + 1 : -1];
    for (const n of near) {
      if (n < 0 || owned[n] || cells[n] !== colour) continue;
      owned[n] = true;
      added++;
      stack.push(n);
    }
  }
  return added;
}

export function newCanvas(stage: FloodStage): Canvas {
  const cells = stage.cells.slice();
  const owned = cells.map((_, i) => i === 0);
  grow(stage.size, cells, owned);
  return { stage, cells, owned, moves: 0, over: false, won: false };
}

export const ownedCount = (c: Canvas) => c.owned.filter(Boolean).length;

/** Paints the patch a colour; returns how many squares it soaked up (or -1 if not allowed). */
export function paint(c: Canvas, colour: number): number {
  if (c.over || colour === c.cells[0] || colour < 0 || colour >= c.stage.colours) return -1;
  for (let i = 0; i < c.cells.length; i++) if (c.owned[i]) c.cells[i] = colour;
  const got = grow(c.stage.size, c.cells, c.owned);
  c.moves++;
  if (c.owned.every(Boolean)) {
    c.over = true;
    c.won = true;
  } else if (c.moves >= c.stage.limit) c.over = true;
  return got;
}

export function starsFor(c: Canvas): number {
  if (!c.won) return 0;
  if (c.moves <= c.stage.par) return 3;
  if (c.moves <= c.stage.par + 2) return 2;
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

/** How much the patch would hold after painting a colour (without changing the canvas). */
function after(c: Canvas, colour: number): { owned: boolean[]; cells: number[]; n: number } {
  const cells = c.cells.slice();
  const owned = c.owned.slice();
  for (let i = 0; i < cells.length; i++) if (owned[i]) cells[i] = colour;
  grow(c.stage.size, cells, owned);
  return { owned, cells, n: owned.filter(Boolean).length };
}

/** Colours still on the canvas outside the patch. */
const remaining = (cells: number[], owned: boolean[]) => new Set(cells.filter((_, i) => !owned[i])).size;

export interface PainterOpts {
  /** how many moves ahead the painter looks (1 or 2) */
  depth?: 1 | 2;
  /** chance per move of picking a colour that looks good without checking */
  slip?: number;
  seed?: number;
  mode?: "plan" | "random";
}

/** The colour a painter picks: the most squares soaked up, looking one or two moves ahead. */
export function nextColour(c: Canvas, depth: 1 | 2 = 2): number {
  const n = c.stage.colours;
  let best = -1;
  let bestScore = -Infinity;
  for (let a = 0; a < n; a++) {
    if (a === c.cells[0]) continue;
    const one = after(c, a);
    if (one.n === c.owned.length) return a; // finishes it
    let score = one.n - remaining(one.cells, one.owned) * 0.5;
    if (depth === 2) {
      let two = 0;
      const fake = { ...c, cells: one.cells, owned: one.owned } as Canvas;
      for (let b = 0; b < n; b++) if (b !== a) two = Math.max(two, after(fake, b).n);
      score = two + one.n * 0.1 - remaining(one.cells, one.owned) * 0.5;
    }
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

export function pilot(st: FloodStage, opts: PainterOpts = {}): Canvas {
  const { depth = 2, slip = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 5821 + 67);
  const c = newCanvas(st);
  while (!c.over) {
    let colour: number;
    if (mode === "random" || rng() < slip) {
      do colour = Math.floor(rng() * st.colours);
      while (colour === c.cells[0]);
    } else colour = nextColour(c, depth);
    paint(c, colour);
  }
  return c;
}

function shape(stage: number) {
  return {
    size: Math.min(14, 6 + Math.floor(stage / 4)),
    colours: stage < 4 ? 3 : Math.min(6, 4 + Math.floor((stage - 4) / 8)),
    slack: stage < 5 ? 3 : stage < 15 ? 2 : 1, // moves to spare over the slowest human-like painter
  };
}

/** Human-like painters: one move ahead, a careless pick about one move in eight. */
export const HUMAN_PAINTERS: PainterOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ depth: 1, slip: 0.12, seed }));

export function buildStage(stage: number): FloodStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry(451000 + stage * 283 + attempt * 7919);
    const cells: number[] = [];
    // small patches: each square copies a neighbour now and then
    for (let i = 0; i < sh.size * sh.size; i++) {
      const r = Math.floor(i / sh.size);
      const c = i % sh.size;
      const roll = rng();
      if (roll < 0.18 && c > 0) cells.push(cells[i - 1]);
      else if (roll < 0.3 && r > 0) cells.push(cells[i - sh.size]);
      else cells.push(Math.floor(rng() * sh.colours));
    }
    const st: FloodStage = { stage, size: sh.size, colours: sh.colours, cells, limit: 999, par: 0 };
    const runs = HUMAN_PAINTERS.map((o) => pilot(st, o));
    const slowest = Math.max(...runs.map((r) => r.moves));
    st.limit = slowest + sh.slack;
    const careful = pilot(st, { depth: 2 });
    st.par = Math.min(careful.moves, pilot(st, { depth: 1 }).moves) + (stage < 6 ? 1 : 0);
    if (stage >= 4 && [1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`paint-flood stage ${stage + 1}: no fair canvas`);
}

/** The 30 canvases, each worked out the first time it is asked for. */
export const FLOOD_STAGES: FloodStage[] = [];
const built: FloodStage[] = [];
for (let i = 0; i < STAGE_COUNT; i++) Object.defineProperty(FLOOD_STAGES, i, { enumerable: true, get: () => (built[i] ??= buildStage(i)) });
