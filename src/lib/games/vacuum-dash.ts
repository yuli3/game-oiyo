/**
 * Vacuum Dash (로봇청소기 대시) — an OIYO original slide-until-you-stop cleaning puzzle (2026-11-25).
 *
 * A little robot vacuum sits in a room full of furniture. Swipe (or press an arrow) and it zooms that way until it
 * bumps into something, sucking up the dust on every square it passes. Clean the whole floor within the moves.
 *
 * Pure and deterministic: every stage's room is carved per stage by a run of legal slides, so it is always solvable,
 * and that run (the plan) is kept for the stars and for the automated play check.
 */

export const VACUUM_SLUG = "vacuum-dash";
export const STAGE_COUNT = 30;

export type Dir = 0 | 1 | 2 | 3; // up, right, down, left
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export interface VacuumStage {
  stage: number;
  cols: number;
  rows: number;
  floor: boolean[]; // true: floor (with dust at the start), false: furniture or wall
  start: number;
  plan: Dir[]; // a run that cleans everything
  par: number; // moves for three stars
  limit: number; // moves allowed
}

export interface Room {
  stage: VacuumStage;
  at: number;
  clean: boolean[];
  left: number; // dusty squares left
  moves: number;
  over: boolean;
  won: boolean;
}

export function newRoom(stage: VacuumStage): Room {
  const clean = stage.floor.map((f) => !f);
  clean[stage.start] = true;
  const left = clean.filter((c) => !c).length;
  return { stage, at: stage.start, clean, left, moves: 0, over: false, won: false };
}

/** The squares a slide from `at` in direction d passes over, ending where it stops. Empty if it can't move. */
export function slidePath(st: VacuumStage, at: number, d: Dir): number[] {
  const out: number[] = [];
  let x = at % st.cols;
  let y = Math.floor(at / st.cols);
  for (;;) {
    const nx = x + DX[d];
    const ny = y + DY[d];
    if (nx < 0 || ny < 0 || nx >= st.cols || ny >= st.rows || !st.floor[ny * st.cols + nx]) break;
    x = nx;
    y = ny;
    out.push(y * st.cols + x);
  }
  return out;
}

/** Slides the robot. Returns the squares it passed (empty if it was blocked: that costs no move). */
export function slide(r: Room, d: Dir): number[] {
  if (r.over) return [];
  const path = slidePath(r.stage, r.at, d);
  if (!path.length) return [];
  r.moves++;
  for (const k of path) {
    if (!r.clean[k]) {
      r.clean[k] = true;
      r.left--;
    }
  }
  r.at = path[path.length - 1];
  if (r.left === 0) {
    r.over = true;
    r.won = true;
  } else if (r.moves >= r.stage.limit) r.over = true;
  return path;
}

export function starsFor(r: Room): number {
  if (!r.won) return 0;
  if (r.moves <= r.stage.par) return 3;
  if (r.moves <= r.stage.par + 3) return 2;
  return 1;
}

/** Shortest run of slides (by position only) to a slide that passes a dusty square; that run's first move. */
export function nextToward(r: Room): Dir | null {
  const st = r.stage;
  const first = new Map<number, Dir>([[r.at, 0]]);
  let frontier = [r.at];
  let depth = 0;
  while (frontier.length && depth < 60) {
    const nextF: number[] = [];
    for (const p of frontier) {
      for (const d of [0, 1, 2, 3] as Dir[]) {
        const path = slidePath(st, p, d);
        if (!path.length) continue;
        const f = p === r.at ? d : (first.get(p) as Dir);
        if (path.some((k) => !r.clean[k])) return f;
        const end = path[path.length - 1];
        if (!first.has(end)) {
          first.set(end, f);
          nextF.push(end);
        }
      }
    }
    frontier = nextF;
    depth++;
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

export interface CleanerOpts {
  /** chance a move goes the wrong way */
  slip?: number;
  seed?: number;
  mode?: "seek" | "plan" | "random";
}

export function pilot(st: VacuumStage, opts: CleanerOpts = {}): Room {
  const { slip = 0, seed = 1, mode = "seek" } = opts;
  const rng = mulberry(seed * 3307 + 59);
  const r = newRoom(st);
  let k = 0;
  let guard = 0;
  while (!r.over && guard++ < 1000) {
    if (mode === "plan") {
      slide(r, st.plan[k++]);
      if (k >= st.plan.length && !r.over) break;
      continue;
    }
    let d: Dir | null = mode === "random" ? (Math.floor(rng() * 4) as Dir) : nextToward(r);
    if (d === null) break;
    if (mode === "seek" && slip > 0 && rng() < slip) d = Math.floor(rng() * 4) as Dir;
    slide(r, d);
  }
  return r;
}

function shape(stage: number) {
  return {
    cols: stage < 5 ? 6 : stage < 15 ? 7 : 8,
    rows: stage < 5 ? 8 : stage < 15 ? 9 : 11,
    steps: Math.min(22, 7 + Math.floor(stage * 0.5)), // slides in the carving run
    longest: stage < 5 ? 4 : 6,
  };
}

/** Human-like cleaners: head for the nearest dust, but one move in twelve goes the wrong way. */
export const HUMAN_CLEANERS: CleanerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ slip: 1 / 12, seed }));

/** Carves a room by moving the robot through solid furniture; every slide made is a legal one in the finished room. */
function carve(stage: number, attempt: number): VacuumStage | null {
  const sh = shape(stage);
  const rng = mulberry(551000 + stage * 367 + attempt * 7919);
  const { cols, rows } = sh;
  const floor = new Array(cols * rows).fill(false);
  const keep = new Array(cols * rows).fill(false); // must stay furniture: something stops a slide there
  const x0 = 1 + Math.floor(rng() * (cols - 2));
  const y0 = 1 + Math.floor(rng() * (rows - 2));
  const start = y0 * cols + x0;
  floor[start] = true;
  let at = start;
  let last = -1;
  const plan: Dir[] = [];
  let tries = 0;
  while (plan.length < sh.steps && tries++ < 400) {
    const d = Math.floor(rng() * 4) as Dir;
    if (d === last || (last >= 0 && d === (last + 2) % 4)) continue;
    const len = 2 + Math.floor(rng() * (sh.longest - 1));
    const x = at % cols;
    const y = Math.floor(at / cols);
    const cells: number[] = [];
    let ok = true;
    for (let k = 1; k <= len; k++) {
      const nx = x + DX[d] * k;
      const ny = y + DY[d] * k;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || keep[ny * cols + nx]) {
        ok = false;
        break;
      }
      cells.push(ny * cols + nx);
    }
    if (!ok) continue;
    // the slide has to stop at the end: the next square must be off the room or furniture that stays
    const ex = x + DX[d] * (len + 1);
    const ey = y + DY[d] * (len + 1);
    const inside = ex >= 0 && ey >= 0 && ex < cols && ey < rows;
    if (inside && floor[ey * cols + ex]) continue;
    // and an earlier slide may not now run on through a square that was meant to stop it — checked by keep[]
    for (const c of cells) floor[c] = true;
    if (inside) keep[ey * cols + ex] = true;
    at = cells[cells.length - 1];
    last = d;
    plan.push(d);
  }
  if (plan.length < sh.steps) return null;
  const st: VacuumStage = { stage, cols, rows, floor, start, plan, par: plan.length, limit: 0 };
  // the run has to clean everything in the finished room (carving later can't break it, but check)
  st.limit = 999;
  const run = pilot(st, { mode: "plan" });
  if (!run.won) return null;
  st.par = run.moves;
  return st;
}

export function buildStage(stage: number): VacuumStage {
  for (let attempt = 0; attempt < 400; attempt++) {
    const st = carve(stage, attempt);
    if (!st) continue;
    if (st.floor.filter(Boolean).length < st.plan.length * 2.2) continue;
    // the nearest-dust route, recorded: if it beats the carving run, it becomes the plan
    const seekRoom = newRoom(st);
    const seekRun: Dir[] = [];
    while (!seekRoom.over && seekRun.length < 200) {
      const d = nextToward(seekRoom);
      if (d === null) break;
      slide(seekRoom, d);
      seekRun.push(d);
    }
    if (!seekRoom.won) continue;
    if (seekRun.length < st.plan.length) st.plan = seekRun;
    st.par = st.plan.length;
    const humans = HUMAN_CLEANERS.map((o) => pilot(st, o));
    if (humans.some((h) => !h.won)) continue;
    // generous: room for the slowest human-like run and then some
    st.limit = Math.max(...humans.map((h) => h.moves), st.par) + (stage < 5 ? 3 : 4);
    const check = pilot(st, { mode: "plan" });
    if (!check.won || check.moves !== st.par) continue;
    // swiping at random almost never cleans up in time
    if (Array.from({ length: 40 }, (_, k) => k + 1).filter((seed) => pilot(st, { mode: "random", seed }).won).length > (stage < 5 ? 1 : 0)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`vacuum-dash stage ${stage + 1}: no fair room`);
}

export const VACUUM_STAGES: VacuumStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
