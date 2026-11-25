/**
 * Sunny Pots (햇살 화분) — an OIYO original cozy push-block puzzle (2026-11-25).
 *
 * A little gardener tidies a sunroom. Walk around and push the flower pots onto the patches of sunlight; a pot can
 * only be pushed, never pulled, and only one at a time. When every pot sits in the sun, the flowers bloom. Got a pot
 * stuck in a corner? Undo as far back as you like: only the moves you keep count toward the stars.
 *
 * Pure and deterministic: every room is made by starting from the solved room and pulling the pots away from the
 * sun with a seeded walk, so it can always be solved; a breadth-first search then finds its fewest moves (par).
 */

export const POTS_SLUG = "sunny-pots";
export const STAGE_COUNT = 30;
export const WALL = 1;
export const FLOOR = 0;

/** 0 up, 1 right, 2 down, 3 left */
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export interface PotStage {
  stage: number;
  w: number;
  h: number;
  /** WALL or FLOOR per cell, row by row */
  cells: number[];
  /** the patches of sun (cell indices) */
  marks: number[];
  /** where the pots start */
  pots: number[];
  player: number;
  /** a shortest solution, as directions */
  plan: number[];
  par: number;
}

export interface Room {
  stage: PotStage;
  pots: number[];
  player: number;
  /** what each kept move did, for undo: [player before, pot index pushed or −1] */
  history: Array<[number, number]>;
  pushes: number;
  won: boolean;
}

export function newRoom(stage: PotStage): Room {
  return { stage, pots: stage.pots.slice(), player: stage.player, history: [], pushes: 0, won: false };
}

export const moves = (r: Room) => r.history.length;

const step = (st: PotStage, i: number, d: number): number => {
  const x = (i % st.w) + DX[d];
  const y = Math.floor(i / st.w) + DY[d];
  if (x < 0 || y < 0 || x >= st.w || y >= st.h) return -1;
  return y * st.w + x;
};

const open = (st: PotStage, i: number) => i >= 0 && st.cells[i] === FLOOR;

export function solved(st: PotStage, pots: number[]): boolean {
  return pots.every((p) => st.marks.includes(p));
}

/** Walks one cell, pushing a pot in the way if the cell beyond it is free. */
export function walk(r: Room, d: number): boolean {
  if (r.won) return false;
  const st = r.stage;
  const to = step(st, r.player, d);
  if (!open(st, to)) return false;
  const k = r.pots.indexOf(to);
  if (k >= 0) {
    const beyond = step(st, to, d);
    if (!open(st, beyond) || r.pots.includes(beyond)) return false;
    r.pots[k] = beyond;
    r.pushes++;
  }
  r.history.push([r.player, k]);
  r.player = to;
  if (solved(st, r.pots)) r.won = true;
  return true;
}

/** Takes back the last move. */
export function undo(r: Room): boolean {
  const last = r.history.pop();
  if (!last) return false;
  const [from, k] = last;
  if (k >= 0) {
    // the pot went one cell on from where the player now stands: it comes back to that cell
    r.pots[k] = r.player;
    r.pushes--;
  }
  r.player = from;
  r.won = solved(r.stage, r.pots);
  return true;
}

export function starsFor(r: Room): number {
  if (!r.won) return 0;
  const p = r.stage.par;
  const m = moves(r);
  if (m <= Math.ceil(p * 1.25) + 2) return 3;
  if (m <= Math.ceil(p * 1.7) + 6) return 2;
  return 1;
}

/** A pot in a corner off the sun can never move again. */
function deadCorner(st: PotStage, i: number): boolean {
  if (st.marks.includes(i)) return false;
  const wall = (d: number) => !open(st, step(st, i, d));
  return (wall(0) || wall(2)) && (wall(1) || wall(3));
}

/** Breadth-first search for the fewest moves from (player, pots) to solved; null if none within the cap. */
export function solve(st: PotStage, player: number, pots: number[], cap = 400000): number[] | null {
  if (solved(st, pots)) return [];
  const key = (p: number, ps: number[]) => p + ":" + ps.slice().sort((a, b) => a - b).join(",");
  const start = { p: player, ps: pots.slice() };
  const prev = new Map<string, [string, number]>();
  const k0 = key(start.p, start.ps);
  prev.set(k0, ["", -1]);
  let frontier = [start];
  while (frontier.length && prev.size < cap) {
    const next: Array<{ p: number; ps: number[] }> = [];
    for (const s of frontier) {
      const ks = key(s.p, s.ps);
      for (let d = 0; d < 4; d++) {
        const to = step(st, s.p, d);
        if (!open(st, to)) continue;
        const ps = s.ps.slice();
        const k = ps.indexOf(to);
        if (k >= 0) {
          const beyond = step(st, to, d);
          if (!open(st, beyond) || ps.includes(beyond) || deadCorner(st, beyond)) continue;
          ps[k] = beyond;
        }
        const kn = key(to, ps);
        if (prev.has(kn)) continue;
        prev.set(kn, [ks, d]);
        if (solved(st, ps)) {
          const path: number[] = [];
          let cur = kn;
          while (cur !== k0) {
            const [pk, dd] = prev.get(cur) as [string, number];
            path.push(dd);
            cur = pk;
          }
          return path.reverse();
        }
        next.push({ p: to, ps });
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

export interface GardenerOpts {
  /** chance of a careless step off the plan (then it works the room out again, undoing if a pot got stuck) */
  slip?: number;
  seed?: number;
  mode?: "plan" | "think" | "random";
}

/** Plays a room: its plan, a gardener who slips now and then (and undoes dead ends), or random steps. */
export function pilot(st: PotStage, opts: GardenerOpts = {}): Room {
  const { slip = 0, seed = 1, mode = "think" } = opts;
  const rng = mulberry(seed * 2081 + 71);
  const r = newRoom(st);
  if (mode === "plan") {
    for (const d of st.plan) walk(r, d);
    return r;
  }
  if (mode === "random") {
    for (let n = 0; n < 400 && !r.won; n++) walk(r, Math.floor(rng() * 4));
    return r;
  }
  let plan = st.plan.slice();
  let guard = 0;
  while (!r.won && guard++ < 600) {
    if (rng() < slip) {
      // a careless step, then think again from here
      if (!walk(r, Math.floor(rng() * 4))) continue;
      const again = solve(st, r.player, r.pots, 60000);
      if (!again) {
        undo(r);
        continue;
      }
      plan = again;
      continue;
    }
    const d = plan.shift();
    if (d === undefined) break;
    walk(r, d);
  }
  return r;
}

/** Human-like gardeners: one step in eight a careless one. */
export const HUMAN_GARDENERS: GardenerOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ slip: 0.125, seed }));

function shape(stage: number) {
  return {
    w: stage < 3 ? 6 : stage < 10 ? 7 : stage < 20 ? 8 : 9,
    h: stage < 3 ? 6 : stage < 10 ? 7 : stage < 20 ? 8 : 8,
    pots: stage < 3 ? 1 : stage < 12 ? 2 : stage < 23 ? 3 : 4,
    blocks: stage < 3 ? 1 : stage < 10 ? 3 : 5, // stray wall cells inside the room
    minPush: stage < 3 ? 3 : stage < 12 ? 6 : 10,
    minPar: stage < 3 ? 4 : stage < 12 ? 12 : stage < 23 ? 18 : 24,
    maxPar: stage < 3 ? 22 : stage < 10 ? 45 : stage < 20 ? 70 : 95,
  };
}

/** Builds a room by pulling the pots away from the sun, then searching for its fewest moves. */
export function buildStage(stage: number): PotStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 2000; attempt++) {
    const rng = mulberry(701000 + stage * 461 + attempt * 7919);
    const { w, h } = sh;
    const cells = new Array(w * h).fill(FLOOR);
    for (let x = 0; x < w; x++) {
      cells[x] = WALL;
      cells[(h - 1) * w + x] = WALL;
    }
    for (let y = 0; y < h; y++) {
      cells[y * w] = WALL;
      cells[y * w + w - 1] = WALL;
    }
    for (let k = 0; k < sh.blocks; k++) cells[(1 + Math.floor(rng() * (h - 2))) * w + 1 + Math.floor(rng() * (w - 2))] = WALL;
    const floor = cells.map((v, i) => (v === FLOOR ? i : -1)).filter((i) => i >= 0);
    const st: PotStage = { stage, w, h, cells, marks: [], pots: [], player: 0, plan: [], par: 0 };
    // every floor cell reachable from every other
    const seen = new Set([floor[0]]);
    const q = [floor[0]];
    while (q.length) {
      const i = q.pop() as number;
      for (let d = 0; d < 4; d++) {
        const j = step(st, i, d);
        if (open(st, j) && !seen.has(j)) {
          seen.add(j);
          q.push(j);
        }
      }
    }
    if (seen.size !== floor.length) continue;
    // sun patches away from dead corners
    const spots = floor.filter((i) => !deadCorner({ ...st, marks: [] }, i));
    if (spots.length < sh.pots + 4) continue;
    const marks: number[] = [];
    while (marks.length < sh.pots) {
      const m = spots[Math.floor(rng() * spots.length)];
      if (!marks.includes(m)) marks.push(m);
    }
    st.marks = marks;
    // pull the pots away: a walk that drags a pot behind it whenever it can
    const pots = marks.slice();
    let player = floor[Math.floor(rng() * floor.length)];
    let g = 0;
    while (pots.includes(player) && g++ < 50) player = floor[Math.floor(rng() * floor.length)];
    if (pots.includes(player)) continue;
    for (let n = 0; n < 60 + sh.pots * 40; n++) {
      const d = Math.floor(rng() * 4);
      const to = step(st, player, d);
      if (!open(st, to) || pots.includes(to)) continue;
      const behind = step(st, player, (d + 2) % 4);
      const k = pots.indexOf(behind);
      if (k >= 0 && rng() < 0.75) pots[k] = player; // pull it along
      player = to;
    }
    if (pots.filter((p) => marks.includes(p)).length > (sh.pots > 3 ? 2 : sh.pots > 2 ? 1 : 0)) continue;
    st.pots = pots;
    st.player = player;
    const plan = solve(st, player, pots);
    if (!plan) continue;
    const r = newRoom(st);
    for (const d of plan) walk(r, d);
    if (!r.won || r.pushes < sh.minPush || plan.length < sh.minPar || plan.length > sh.maxPar) continue;
    st.plan = plan;
    st.par = plan.length;
    if (HUMAN_GARDENERS.filter((o) => pilot(st, o).won).length < 8) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`sunny-pots stage ${stage + 1}: no fair room`);
}

/** The 30 rooms, built once by scripts/build-sunny-pots-stages.ts (searching takes a while, too slow for a page). */
export { POTS_STAGES } from "./sunny-pots-stages";
