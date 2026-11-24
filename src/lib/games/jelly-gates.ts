/**
 * Jelly Gates (젤리 탈출) — an OIYO original slide-out colour puzzle (2026-11-25).
 *
 * Wobbly jelly blocks crowd a tray. Flick a block and it slides that way until something stops it — another block or
 * the rim. If it slides into a gate in the rim that is its own colour and wide enough, it pops out. Clear the tray
 * within the moves.
 *
 * Pure and deterministic: every stage's tray is seeded per stage, and the fewest-moves answer is found by search.
 */

export const JELLY_SLUG = "jelly-gates";
export const STAGE_COUNT = 30;
export const COLORS = 4;

export type Dir = 0 | 1 | 2 | 3; // up, right, down, left
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export interface Block { x: number; y: number; w: number; h: number; color: number }
/** A gate on one side of the rim: side (a Dir), first square along that side, how many squares wide, colour. */
export interface Gate { side: Dir; from: number; len: number; color: number }

export interface JellyStage {
  stage: number;
  cols: number;
  rows: number;
  blocks: Block[];
  gates: Gate[];
  plan: Move[]; // the fewest-moves answer
  par: number;
  limit: number;
}

/** Slide block `b` in direction `d` by `dist` squares (dist = -1: out through a gate). */
export interface Move { b: number; d: Dir; dist: number }

export interface Tray {
  stage: JellyStage;
  pos: Array<[number, number] | null>; // null once popped out
  moves: number;
  over: boolean;
  won: boolean;
}

export function newTray(stage: JellyStage): Tray {
  return { stage, pos: stage.blocks.map((b) => [b.x, b.y]), moves: 0, over: false, won: false };
}

function occupied(st: JellyStage, pos: Array<[number, number] | null>, skip: number): Uint8Array {
  const g = new Uint8Array(st.cols * st.rows);
  pos.forEach((p, k) => {
    if (!p || k === skip) return;
    const b = st.blocks[k];
    for (let y = p[1]; y < p[1] + b.h; y++) for (let x = p[0]; x < p[0] + b.w; x++) g[y * st.cols + x] = 1;
  });
  return g;
}

/** Whether block k, sitting at (x, y), fits through a gate of its colour on side d. */
function fitsGate(st: JellyStage, k: number, x: number, y: number, d: Dir): boolean {
  const b = st.blocks[k];
  return st.gates.some((g) => {
    if (g.side !== d || g.color !== b.color) return false;
    if (d === 0 || d === 2) {
      if ((d === 0 && y !== 0) || (d === 2 && y + b.h !== st.rows)) return false;
      return x >= g.from && x + b.w <= g.from + g.len;
    }
    if ((d === 3 && x !== 0) || (d === 1 && x + b.w !== st.cols)) return false;
    return y >= g.from && y + b.h <= g.from + g.len;
  });
}

/** Where block k can go in direction d: each stop as [dist, x, y], and whether it can carry on out through a gate. */
export function reach(st: JellyStage, pos: Array<[number, number] | null>, k: number, d: Dir): { stops: Array<[number, number, number]>; out: boolean } {
  const p = pos[k];
  const stops: Array<[number, number, number]> = [];
  if (!p) return { stops, out: false };
  const b = st.blocks[k];
  const occ = occupied(st, pos, k);
  let [x, y] = p;
  for (let dist = 1; ; dist++) {
    const nx = x + DX[d];
    const ny = y + DY[d];
    if (nx < 0 || ny < 0 || nx + b.w > st.cols || ny + b.h > st.rows) return { stops, out: fitsGate(st, k, x, y, d) };
    let free = true;
    for (let yy = ny; yy < ny + b.h && free; yy++) for (let xx = nx; xx < nx + b.w && free; xx++) if (occ[yy * st.cols + xx]) free = false;
    if (!free) return { stops, out: false };
    x = nx;
    y = ny;
    stops.push([dist, x, y]);
  }
}

/** Applies a move. Returns false if it isn't possible. */
export function slide(t: Tray, m: Move): boolean {
  if (t.over || !t.pos[m.b]) return false;
  const r = reach(t.stage, t.pos, m.b, m.d);
  if (m.dist < 0) {
    if (!r.out) return false;
    t.pos[m.b] = null;
  } else {
    const s = r.stops.find((q) => q[0] === m.dist);
    if (!s) return false;
    t.pos[m.b] = [s[1], s[2]];
  }
  t.moves++;
  if (t.pos.every((p) => p === null)) {
    t.over = true;
    t.won = true;
  } else if (t.moves >= t.stage.limit) t.over = true;
  return true;
}

/** The move a flick of block k toward d makes: out through a gate if it can, else all the way to where it stops. */
export function flick(st: JellyStage, pos: Array<[number, number] | null>, k: number, d: Dir): Move | null {
  if (!pos[k]) return null;
  const r = reach(st, pos, k, d);
  if (r.out) return { b: k, d, dist: -1 };
  if (!r.stops.length) return null;
  return { b: k, d, dist: r.stops[r.stops.length - 1][0] };
}

export function starsFor(t: Tray): number {
  if (!t.won) return 0;
  if (t.moves <= t.stage.par) return 3;
  if (t.moves <= t.stage.par + 2) return 2;
  return 1;
}

const key = (pos: Array<[number, number] | null>) => pos.map((p) => (p ? p[0] * 16 + p[1] : 255)).join(",");

/** Every move possible from a position: one flick per block and direction. */
export function movesFrom(st: JellyStage, pos: Array<[number, number] | null>): Move[] {
  const out: Move[] = [];
  pos.forEach((p, k) => {
    if (!p) return;
    for (const d of [0, 1, 2, 3] as Dir[]) {
      const m = flick(st, pos, k, d);
      if (m) out.push(m);
    }
  });
  return out;
}

function apply(st: JellyStage, pos: Array<[number, number] | null>, m: Move): Array<[number, number] | null> {
  const next = pos.slice();
  if (m.dist < 0) next[m.b] = null;
  else {
    const p = pos[m.b] as [number, number];
    next[m.b] = [p[0] + DX[m.d] * m.dist, p[1] + DY[m.d] * m.dist];
  }
  return next;
}

/** Fewest moves to clear the tray from `pos` (breadth-first), or null past the caps. */
export function solve(st: JellyStage, pos: Array<[number, number] | null>, maxDepth = 16, maxStates = 120000): Move[] | null {
  const start = key(pos);
  const prev = new Map<string, { from: string; m: Move } | null>([[start, null]]);
  let frontier: Array<Array<[number, number] | null>> = [pos];
  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next: Array<Array<[number, number] | null>> = [];
    for (const p of frontier) {
      const pk = key(p);
      for (const m of movesFrom(st, p)) {
        const q = apply(st, p, m);
        const qk = key(q);
        if (prev.has(qk)) continue;
        prev.set(qk, { from: pk, m });
        if (q.every((x) => x === null)) {
          const path: Move[] = [];
          let k: string = qk;
          for (;;) {
            const e = prev.get(k);
            if (!e) break;
            path.unshift(e.m);
            k = e.from;
          }
          return path;
        }
        next.push(q);
        if (prev.size > maxStates) return null;
      }
    }
    frontier = next;
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

export interface SliderOpts {
  /** chance a move is some other legal move instead of the next step of an answer */
  slip?: number;
  seed?: number;
  mode?: "plan" | "think" | "random";
}

/**
 * plan: follows the stage's answer. think: before each move works out an answer from where things are (a player who
 * thinks it through), now and then slipping. random: any legal move.
 */
export function pilotMoves(st: JellyStage, opts: SliderOpts = {}): { tray: Tray; moves: Move[] } {
  const { slip = 0, seed = 1, mode = "think" } = opts;
  const rng = mulberry(seed * 3121 + 31);
  const t = newTray(st);
  let k = 0;
  let route: Move[] = [];
  const made: Move[] = [];
  while (!t.over) {
    let m: Move | undefined;
    if (mode === "plan") m = st.plan[k++];
    else if (mode === "random" || (slip > 0 && rng() < slip)) {
      const all = movesFrom(st, t.pos);
      m = all[Math.floor(rng() * all.length)];
      route = [];
    } else {
      if (!route.length) route = solve(st, t.pos, 16, 60000) ?? [];
      m = route.shift();
      if (!m) {
        const all = movesFrom(st, t.pos);
        m = all[Math.floor(rng() * all.length)];
      }
    }
    if (!m || !slide(t, m)) break;
    made.push(m);
  }
  if (!t.over) t.over = true;
  return { tray: t, moves: made };
}

export const pilot = (st: JellyStage, opts: SliderOpts = {}): Tray => pilotMoves(st, opts).tray;

function shape(stage: number) {
  return {
    cols: stage < 8 ? 5 : 6,
    rows: stage < 8 ? 6 : 7,
    blocks: Math.min(6, 3 + Math.floor(stage / 6)), // 3 up to 6
    colors: Math.min(4, 2 + Math.floor(stage / 8)),
    slack: 1,
    minMoves: Math.min(9, 3 + Math.floor(stage / 4)),
  };
}

const SHAPES: Array<[number, number]> = [[1, 1], [1, 2], [2, 1], [2, 2]];

/** Human-like sliders: think each move through, but one move in eight is something else. */
export const HUMAN_SLIDERS: SliderOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ slip: 0.125, seed }));

/**
 * Builds a tray backwards from an empty one, so it is always solvable: blocks come in through their gates and are
 * pulled back from where a flick would stop them. Played forwards, those steps clear the tray.
 */
function construct(stage: number, attempt: number): JellyStage | null {
  const sh = shape(stage);
  const rng = mulberry(581000 + stage * 383 + attempt * 7919);
  const { cols, rows } = sh;
  const sides = ([0, 1, 2, 3] as Dir[]).map((d) => ({ d, r: rng() })).sort((p, q) => p.r - q.r).map((o) => o.d);
  const sizes = Array.from({ length: sh.blocks }, () => SHAPES[Math.floor(rng() * (stage < 6 ? 3 : SHAPES.length))]);
  const blocks: Block[] = sizes.map(([w, h], k) => ({ x: 0, y: 0, w, h, color: k % sh.colors }));
  const gates: Gate[] = [];
  for (let c = 0; c < sh.colors; c++) {
    const mine = blocks.filter((b) => b.color === c);
    const side = sides[c];
    const along = side === 0 || side === 2 ? cols : rows;
    const need = Math.max(...mine.map((b) => (side === 0 || side === 2 ? b.w : b.h)));
    const len = Math.min(along, need + sh.slack + Math.floor(rng() * 2));
    const from = Math.floor(rng() * (along - len + 1));
    gates.push({ side, from, len, color: c });
  }
  const st: JellyStage = { stage, cols, rows, blocks, gates, plan: [], par: 0, limit: 999 };
  const pos: Array<[number, number] | null> = blocks.map(() => null);
  const forward: Move[] = []; // built back to front
  const fits = (k: number, x: number, y: number, skip: number) => {
    const b = blocks[k];
    if (x < 0 || y < 0 || x + b.w > cols || y + b.h > rows) return false;
    const occ = occupied(st, pos, skip);
    for (let yy = y; yy < y + b.h; yy++) for (let xx = x; xx < x + b.w; xx++) if (occ[yy * cols + xx]) return false;
    return true;
  };
  let next = 0;
  for (let step = 0; step < sh.blocks * 6 + 6; step++) {
    const live = pos.flatMap((p, k) => (p ? [k] : []));
    if (next < blocks.length && (live.length === 0 || rng() < 0.35)) {
      // a block comes in through its gate (played forwards: it leaves through it)
      const k = next;
      const b = blocks[k];
      const g = gates[b.color];
      const spots: Array<[number, number]> = [];
      if (g.side === 0 || g.side === 2) {
        const y = g.side === 0 ? 0 : rows - b.h;
        for (let x = g.from; x + b.w <= g.from + g.len; x++) if (fits(k, x, y, -1)) spots.push([x, y]);
      } else {
        const x = g.side === 3 ? 0 : cols - b.w;
        for (let y = g.from; y + b.h <= g.from + g.len; y++) if (fits(k, x, y, -1)) spots.push([x, y]);
      }
      if (!spots.length) continue;
      pos[k] = spots[Math.floor(rng() * spots.length)];
      forward.unshift({ b: k, d: g.side, dist: -1 });
      next++;
      continue;
    }
    if (!live.length) continue;
    // pull a block back from where a flick toward d would stop it (played forwards: the flick)
    const k = live[Math.floor(rng() * live.length)];
    const d = Math.floor(rng() * 4) as Dir;
    const [qx, qy] = pos[k] as [number, number];
    if (fits(k, qx + DX[d], qy + DY[d], k)) continue; // a flick toward d would not stop here
    const back: Array<[number, number, number]> = [];
    for (let dist = 1; ; dist++) {
      const px = qx - DX[d] * dist;
      const py = qy - DY[d] * dist;
      if (!fits(k, px, py, k)) break;
      back.push([dist, px, py]);
    }
    if (!back.length) continue;
    const [dist, px, py] = back[Math.floor(rng() * back.length)];
    pos[k] = [px, py];
    forward.unshift({ b: k, d, dist });
  }
  if (next < blocks.length) return null;
  pos.forEach((p, k) => {
    blocks[k].x = (p as [number, number])[0];
    blocks[k].y = (p as [number, number])[1];
  });
  // the backwards run is an answer; check it, then look for a shorter one
  st.plan = forward;
  st.par = forward.length;
  const check = pilot(st, { mode: "plan" });
  if (!check.won) return null;
  const best = solve(st, blocks.map((b) => [b.x, b.y]), Math.min(16, forward.length), 150000);
  if (best && best.length < st.plan.length) st.plan = best;
  st.par = st.plan.length;
  return st;
}

export function buildStage(stage: number): JellyStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 400; attempt++) {
    const st = construct(stage, attempt);
    if (!st || st.par < sh.minMoves) continue;
    // a player who thinks every move through may find a shorter way than the built one: that becomes the plan
    st.limit = 999;
    const careful = pilotMoves(st, { mode: "think" });
    if (careful.tray.won && careful.moves.length < st.par) {
      st.plan = careful.moves;
      st.par = careful.moves.length;
    }
    if (st.par < sh.minMoves) continue;
    const humans = HUMAN_SLIDERS.map((o) => pilot(st, o));
    if (humans.some((h) => !h.won)) continue;
    // generous, but not a sea of moves: trays where human-like play wanders far are left out
    const slowest = Math.max(...humans.map((h) => h.moves));
    if (slowest > st.par * 2 + 4) continue;
    st.limit = slowest + (stage < 5 ? 8 : 6);
    if (pilot(st, { mode: "plan" }).moves !== st.par) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`jelly-gates stage ${stage + 1}: no fair tray`);
}

/** The 30 trays, built once by scripts/build-jelly-gates-stages.ts (building takes minutes, too slow for a page). */
export { JELLY_STAGES } from "./jelly-gates-stages";
