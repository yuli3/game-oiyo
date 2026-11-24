/**
 * Duck Parade (오리 행렬) — an OIYO original crowd-gate runner (2026-11-25).
 *
 * A mother duck leads her ducklings down a two-lane park path. Every so often the path passes a pair of gates — "+8",
 * "×2", "−5", "÷2" — and the whole parade goes through whichever one you steer into, so the ducklings multiply or
 * scatter. A fox waits on some stretches and snaps up a third of the parade if you walk past it. At the end a stream must be crossed
 * on stepping stones, and it takes at least so many ducklings to make the chain. Switch lanes in time; read the gates.
 *
 * Pure and deterministic: every path is seeded per stage.
 */

export const DUCK_SLUG = "duck-parade";
export const STAGE_COUNT = 30;
export const START = 5;
export const SPEED = 60; // px per second the parade walks
export const ROW_GAP = 150; // px between rows
export const VIEW = 330; // px of path ahead the player can see

export type Op = "+" | "-" | "x" | "/";
export interface Gate { op: Op; n: number }
/** A row is a pair of gates (left, right), or a fox sitting in one lane that snaps up bite% of the parade. */
export type Row = { kind: "gates"; gates: [Gate, Gate] } | { kind: "fox"; lane: 0 | 1; bite: number };

export interface DuckStage {
  stage: number;
  rows: Row[];
  need: number; // ducklings it takes to cross the stream
  best: number; // the most ducklings the path allows
}

export interface Parade {
  stage: DuckStage;
  lane: 0 | 1;
  dist: number; // px walked
  passed: number; // rows passed
  count: number;
  over: boolean;
  won: boolean;
  log: number[]; // count after each row
}

export const newParade = (stage: DuckStage): Parade => ({ stage, lane: 0, dist: 0, passed: 0, count: START, over: false, won: false, log: [] });

export function apply(g: Gate, count: number): number {
  switch (g.op) {
    case "+":
      return count + g.n;
    case "-":
      return Math.max(0, count - g.n);
    case "x":
      return count * g.n;
    default:
      return Math.floor(count / g.n);
  }
}

export const rowAt = (i: number) => ROW_GAP * (i + 1); // distance at which row i is passed
export const finishAt = (st: DuckStage) => rowAt(st.rows.length) + ROW_GAP / 2;

export function steer(p: Parade, lane: 0 | 1): void {
  if (!p.over) p.lane = lane;
}

/** Walks the parade on; returns the rows passed this step. */
export function step(p: Parade, dt: number): number[] {
  if (p.over) return [];
  const st = p.stage;
  p.dist += SPEED * dt;
  const passed: number[] = [];
  while (p.passed < st.rows.length && p.dist >= rowAt(p.passed)) {
    const row = st.rows[p.passed];
    if (row.kind === "gates") p.count = apply(row.gates[p.lane], p.count);
    else if (row.lane === p.lane) p.count = Math.max(0, p.count - Math.ceil((p.count * row.bite) / 100));
    p.log.push(p.count);
    passed.push(p.passed);
    p.passed++;
    if (p.count <= 0) {
      p.over = true;
      return passed;
    }
  }
  if (p.dist >= finishAt(st)) {
    p.over = true;
    p.won = p.count >= st.need;
  }
  return passed;
}

/** The most ducklings the path allows: every gate keeps order (more in, more out), so the better gate each time wins. */
export function bestCount(rows: Row[]): number {
  let c = START;
  for (const r of rows) {
    if (r.kind === "gates") c = Math.max(apply(r.gates[0], c), apply(r.gates[1], c));
    // the fox can always be dodged
  }
  return c;
}

export function starsFor(p: Parade): number {
  if (!p.won) return 0;
  if (p.count >= p.stage.best * 0.8) return 3;
  if (p.count >= p.stage.need * 1.5) return 2;
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

export interface WalkerOpts {
  /** seconds to read a row once it comes into view and decide */
  react?: number;
  /** chance of misjudging which gate is better */
  slip?: number;
  seed?: number;
  /** "read" picks the better gate and dodges foxes; "random" flips lanes at random */
  mode?: "read" | "random";
}

export function pilot(st: DuckStage, opts: WalkerOpts = {}): Parade {
  const { react = 1, slip = 0, seed = 1, mode = "read" } = opts;
  const rng = mulberry(seed * 3301 + 23);
  const p = newParade(st);
  const dt = 1 / 20;
  // the time each row's decision is made: once it is in view, after reading it
  const decided = new Array(st.rows.length).fill(false);
  const plan = new Array(st.rows.length).fill(-1);
  let nextFlip = 1;
  while (!p.over) {
    if (mode === "random") {
      if (p.dist / SPEED >= nextFlip) {
        steer(p, rng() < 0.5 ? 0 : 1);
        nextFlip += 0.8 + rng() * 1.6;
      }
    } else {
      for (let i = p.passed; i < st.rows.length; i++) {
        const seenAt = (rowAt(i) - VIEW) / SPEED;
        if (decided[i] || p.dist / SPEED < seenAt + react * (0.8 + rng() * 0.4)) break;
        decided[i] = true;
        const row = st.rows[i];
        let lane: 0 | 1;
        if (row.kind === "fox") lane = row.lane === 0 ? 1 : 0;
        else {
          // judge with the count expected by then
          const c = p.count;
          const a = apply(row.gates[0], c);
          const b = apply(row.gates[1], c);
          lane = a >= b ? 0 : 1;
          if (rng() < slip) lane = lane === 0 ? 1 : 0;
        }
        plan[i] = lane;
      }
      // steer for the next row once it has been decided
      if (p.passed < st.rows.length && plan[p.passed] >= 0) steer(p, plan[p.passed] as 0 | 1);
    }
    step(p, dt);
  }
  return p;
}

function shape(stage: number) {
  return {
    rows: 10 + Math.floor(stage / 2),
    foxes: Math.min(6, 2 + Math.floor(stage / 6)),
    trap: 0.5, // chance a gate pair looks tempting but is worse
    share: stage < 5 ? 0.25 : stage < 15 ? 0.3 : 0.35, // how much of the best the stream needs
  };
}

/** Human-like walkers: about a second to read a row, the wrong gate one time in ten. */
export const HUMAN_WALKERS: WalkerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ react: 1, slip: 0.1, seed }));

function gatePair(rng: () => number, count: number, trap: number): [Gate, Gate] {
  // a good gate and a weaker one; sometimes the weaker one looks bigger (a big + against a ×2 on a large count).
  // Sums grow with the parade, and multiplying stops once it is large, so the numbers stay readable.
  const scale = Math.max(10, Math.round(count * 0.3));
  const plus = (): Gate => ({ op: "+", n: 3 + Math.floor(rng() * scale) });
  const minus = (): Gate => ({ op: "-", n: 2 + Math.floor(rng() * Math.max(4, scale * 0.6)) });
  const times = (): Gate => ({ op: "x", n: count < 60 && rng() < 0.3 ? 3 : 2 });
  const div = (): Gate => ({ op: "/", n: 2 });
  const big = count > 400;
  const r = rng();
  let kinds: Gate[];
  if (!big && r < trap) kinds = [plus(), times()];
  else if (big || r < trap + 0.35 || count > 40) kinds = [plus(), minus()];
  else kinds = [times(), div()];
  return shuffle(kinds, rng) as [Gate, Gate];
}

function layout(stage: number, attempt: number): DuckStage {
  const sh = shape(stage);
  const rng = mulberry(361000 + stage * 233 + attempt * 7919);
  const rows: Row[] = [];
  const foxAt = new Set(shuffle(Array.from({ length: sh.rows - 2 }, (_, i) => i + 1), rng).slice(0, sh.foxes));
  let c = START;
  for (let i = 0; i < sh.rows; i++) {
    if (foxAt.has(i)) {
      rows.push({ kind: "fox", lane: rng() < 0.5 ? 0 : 1, bite: 30 + Math.floor(rng() * 4) * 5 });
      continue;
    }
    const gates = gatePair(rng, c, sh.trap);
    rows.push({ kind: "gates", gates });
    c = Math.max(apply(gates[0], c), apply(gates[1], c));
  }
  const best = bestCount(rows);
  return { stage, rows, need: Math.max(START + 3, Math.round(best * sh.share)), best };
}

/** Lays paths out until human-like walkers make the crossing every time and lane-flipping at random does not. */
export function buildStage(stage: number): DuckStage {
  for (let attempt = 0; attempt < 500; attempt++) {
    const st = layout(stage, attempt);
    if (st.best > 5000) continue; // keep the numbers readable
    if (HUMAN_WALKERS.filter((o) => pilot(st, o).won).length < 6) continue;
    if (starsFor(pilot(st, { react: 0.6, slip: 0, seed: 1 })) < 3) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`duck-parade stage ${stage + 1}: no fair path`);
}

export const DUCK_STAGES: DuckStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
