/**
 * Sun & Moon (해달 타일) — an OIYO original binary logic puzzle (2026-11-25).
 *
 * Fill the grid with suns and moons. Every row and every column holds as many suns as moons; no three of a kind sit in
 * a row, across or down; and where a little = sits between two squares they match, where a × sits they differ. Tap
 * a square to cycle it: sun, moon, empty.
 *
 * Pure and deterministic: every stage's grid is a random valid filling, seeded per stage, with clues kept only while
 * the grid can still be worked out square by square, so it always has exactly one answer.
 */

export const SUNMOON_SLUG = "sun-moon";
export const STAGE_COUNT = 30;
export const SUN = 1;
export const MOON = 2;

/** A clue between square a and the square to its right (dir 0) or below it (dir 1). */
export interface Clue { a: number; dir: 0 | 1; same: boolean }

export interface MoonStage {
  stage: number;
  n: number;
  answer: number[];
  given: number[]; // squares shown from the start
  clues: Clue[];
  par: number; // taps for three stars
  limit: number;
}

export interface Board {
  stage: MoonStage;
  cells: number[]; // 0 empty, SUN, MOON
  fixed: boolean[];
  taps: number;
  over: boolean;
  won: boolean;
}

export function newBoard(stage: MoonStage): Board {
  const cells = new Array(stage.n * stage.n).fill(0);
  const fixed = new Array(stage.n * stage.n).fill(false);
  for (const i of stage.given) {
    cells[i] = stage.answer[i];
    fixed[i] = true;
  }
  return { stage, cells, fixed, taps: 0, over: false, won: false };
}

/** Whether a full grid keeps every rule. */
export function valid(n: number, cells: number[], clues: Clue[]): boolean {
  if (cells.some((v) => v === 0)) return false;
  for (let k = 0; k < n; k++) {
    let rs = 0;
    let cs = 0;
    for (let j = 0; j < n; j++) {
      if (cells[k * n + j] === SUN) rs++;
      if (cells[j * n + k] === SUN) cs++;
      if (j >= 2) {
        if (cells[k * n + j] === cells[k * n + j - 1] && cells[k * n + j] === cells[k * n + j - 2]) return false;
        if (cells[j * n + k] === cells[(j - 1) * n + k] && cells[j * n + k] === cells[(j - 2) * n + k]) return false;
      }
    }
    if (rs * 2 !== n || cs * 2 !== n) return false;
  }
  for (const c of clues) {
    const b = c.dir === 0 ? c.a + 1 : c.a + n;
    if ((cells[c.a] === cells[b]) !== c.same) return false;
  }
  return true;
}

/** Taps a square: empty → sun → moon → empty. */
export function tap(b: Board, i: number): boolean {
  if (b.over || i < 0 || i >= b.cells.length || b.fixed[i]) return false;
  b.cells[i] = (b.cells[i] + 1) % 3;
  b.taps++;
  if (valid(b.stage.n, b.cells, b.stage.clues)) {
    b.over = true;
    b.won = true;
  } else if (b.taps >= b.stage.limit) b.over = true;
  return true;
}

export function starsFor(b: Board): number {
  if (!b.won) return 0;
  if (b.taps <= b.stage.par) return 3;
  if (b.taps <= b.stage.par + 6) return 2;
  return 1;
}

/** Taps from empty to v. */
export const tapsTo = (v: number) => (v === SUN ? 1 : v === MOON ? 2 : 0);

/**
 * One square that the rules settle from what is filled in (or −1): two alike in a row force the next ones,
 * alike either side of a gap forces the gap, a full half settles the rest, and the = and × clues pass a value along.
 */
export function deduce(n: number, cells: number[], clues: Clue[]): { i: number; v: number } | null {
  const other = (v: number) => (v === SUN ? MOON : SUN);
  const lines: number[][] = [];
  for (let k = 0; k < n; k++) {
    lines.push(Array.from({ length: n }, (_, j) => k * n + j));
    lines.push(Array.from({ length: n }, (_, j) => j * n + k));
  }
  for (const line of lines) {
    for (let j = 0; j < n; j++) {
      const i = line[j];
      if (cells[i] !== 0) continue;
      const at = (d: number) => (j + d >= 0 && j + d < n ? cells[line[j + d]] : -1);
      // two alike beside it
      if (at(1) > 0 && at(1) === at(2)) return { i, v: other(at(1)) };
      if (at(-1) > 0 && at(-1) === at(-2)) return { i, v: other(at(-1)) };
      // alike either side
      if (at(-1) > 0 && at(-1) === at(1)) return { i, v: other(at(1)) };
    }
    const suns = line.filter((i) => cells[i] === SUN).length;
    const moons = line.filter((i) => cells[i] === MOON).length;
    const gap = line.find((i) => cells[i] === 0);
    if (gap !== undefined) {
      if (suns * 2 === n) return { i: gap, v: MOON };
      if (moons * 2 === n) return { i: gap, v: SUN };
    }
  }
  for (const c of clues) {
    const b = c.dir === 0 ? c.a + 1 : c.a + n;
    if (cells[c.a] > 0 && cells[b] === 0) return { i: b, v: c.same ? cells[c.a] : other(cells[c.a]) };
    if (cells[b] > 0 && cells[c.a] === 0) return { i: c.a, v: c.same ? cells[b] : other(cells[b]) };
  }
  return null;
}

/** Fills the grid by deduction alone; returns the order squares were settled in, or null if it gets stuck. */
export function solveOrder(n: number, start: number[], clues: Clue[]): number[] | null {
  const cells = start.slice();
  const order: number[] = [];
  for (;;) {
    if (cells.every((v) => v !== 0)) return valid(n, cells, clues) ? order : null;
    const d = deduce(n, cells, clues);
    if (!d) return null;
    cells[d.i] = d.v;
    order.push(d.i);
  }
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

export interface SolverOpts {
  /** chance a square is first filled with the wrong one (and put right straight after) */
  slip?: number;
  seed?: number;
  mode?: "plan" | "think" | "random";
}

/** The taps the answer takes, in the order deduction settles the squares. */
export function planTaps(st: MoonStage): number[] {
  const start = new Array(st.n * st.n).fill(0);
  for (const i of st.given) start[i] = st.answer[i];
  const order = solveOrder(st.n, start, st.clues) ?? [];
  const out: number[] = [];
  for (const i of order) for (let k = 0; k < tapsTo(st.answer[i]); k++) out.push(i);
  return out;
}

export function pilot(st: MoonStage, opts: SolverOpts = {}): Board {
  const { slip = 0, seed = 1, mode = "think" } = opts;
  const rng = mulberry(seed * 2393 + 61);
  const b = newBoard(st);
  if (mode === "plan") {
    for (const i of planTaps(st)) if (!b.over) tap(b, i);
    return b;
  }
  let guard = 0;
  while (!b.over && guard++ < 4000) {
    if (mode === "random") {
      tap(b, Math.floor(rng() * b.cells.length));
      continue;
    }
    // work out the next square from what is on the board; a slip fills the wrong one first, then fixes it
    const d = deduce(st.n, b.cells, st.clues);
    if (!d) break;
    if (slip > 0 && rng() < slip) {
      const wrong = d.v === SUN ? MOON : SUN;
      while (b.cells[d.i] !== wrong && !b.over) tap(b, d.i);
    }
    while (b.cells[d.i] !== d.v && !b.over) tap(b, d.i);
  }
  if (!b.over) b.over = true;
  return b;
}

function shape(stage: number) {
  return {
    n: stage < 6 ? 4 : stage < 18 ? 6 : 8,
    clues: stage < 6 ? 2 : stage < 18 ? 4 : 6, // = and × clues kept
    keep: stage < 3 ? 0.45 : stage < 6 ? 0.3 : stage < 12 ? 0.3 : stage < 18 ? 0.22 : stage < 24 ? 0.25 : 0.18, // share of squares shown
  };
}

/** Human-like solvers: work each square out, but get one in ten wrong at first. */
export const HUMAN_SOLVERS: SolverOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ slip: 0.1, seed }));

function randomFill(n: number, rng: () => number): number[] | null {
  const cells = new Array(n * n).fill(0);
  const ok = (i: number) => {
    const r = Math.floor(i / n);
    const c = i % n;
    const v = cells[i];
    if (c >= 2 && cells[i - 1] === v && cells[i - 2] === v) return false;
    if (r >= 2 && cells[i - n] === v && cells[i - 2 * n] === v) return false;
    let rs = 0;
    let rm = 0;
    for (let j = 0; j <= c; j++) (cells[r * n + j] === SUN ? rs++ : rm++);
    let cs = 0;
    let cm = 0;
    for (let j = 0; j <= r; j++) (cells[j * n + c] === SUN ? cs++ : cm++);
    return rs * 2 <= n && rm * 2 <= n && cs * 2 <= n && cm * 2 <= n;
  };
  let steps = 0;
  const go = (i: number): boolean => {
    if (i === n * n) return true;
    if (steps++ > 20000) return false;
    const first = rng() < 0.5 ? SUN : MOON;
    for (const v of [first, first === SUN ? MOON : SUN]) {
      cells[i] = v;
      if (ok(i) && go(i + 1)) return true;
    }
    cells[i] = 0;
    return false;
  };
  return go(0) ? cells : null;
}

export function buildStage(stage: number): MoonStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = mulberry(641000 + stage * 431 + attempt * 7919);
    const { n } = sh;
    const answer = randomFill(n, rng);
    if (!answer) continue;
    // clues between random neighbours
    const clues: Clue[] = [];
    let guard = 0;
    while (clues.length < sh.clues && guard++ < 200) {
      const a = Math.floor(rng() * n * n);
      const dir = (rng() < 0.5 ? 0 : 1) as 0 | 1;
      if ((dir === 0 && a % n === n - 1) || (dir === 1 && a + n >= n * n)) continue;
      if (clues.some((c) => c.a === a && c.dir === dir)) continue;
      const b = dir === 0 ? a + 1 : a + n;
      clues.push({ a, dir, same: answer[a] === answer[b] });
    }
    // take squares away while deduction can still fill the grid
    const shown = new Set(Array.from({ length: n * n }, (_, i) => i));
    const order = Array.from({ length: n * n }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const target = Math.round(n * n * sh.keep);
    for (const i of order) {
      if (shown.size <= target) break;
      shown.delete(i);
      const start = answer.map((v, k) => (shown.has(k) ? v : 0));
      if (!solveOrder(n, start, clues)) shown.add(i);
    }
    const given = [...shown].sort((a, b) => a - b);
    const st: MoonStage = { stage, n, answer, given, clues, par: 0, limit: 9999 };
    st.par = planTaps(st).length;
    const humans = HUMAN_SOLVERS.map((o) => pilot(st, o));
    if (humans.some((h) => !h.won)) continue;
    st.limit = Math.max(...humans.map((h) => h.taps)) + 10 + Math.floor(st.par / 4);
    const planned = pilot(st, { mode: "plan" });
    if (!planned.won || planned.taps !== st.par) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`sun-moon stage ${stage + 1}: no fair grid`);
}

export const SUNMOON_STAGES: MoonStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
