/**
 * Crown Regions (영토 왕관) — an OIYO original daily logic puzzle (2026-11-24).
 *
 * The board is split into coloured lands. Crown each land once: every row, every column and every land holds
 * exactly one crown, and no two crowns may touch, not even at a corner. Tap a square once to mark it as "no crown
 * here", twice to crown it, a third time to clear it. Every board has exactly one answer, reached by reasoning
 * alone. There is also a board of the day, the same for everyone, to race a friend on.
 *
 * Pure and deterministic: every board is seeded per stage (or per day).
 */

export const CROWN_SLUG = "crown-regions";
export const STAGE_COUNT = 30;

export interface CrownStage {
  stage: number;
  n: number; // board is n × n with n lands
  region: number[]; // land index per square
  answer: number[]; // crowned column per row
  par: number; // seconds a quick solver takes
}

export type Mark = 0 | 1 | 2; // empty, marked "no", crown

export interface Board {
  stage: CrownStage;
  marks: Mark[];
  t: number;
  moves: number;
  over: boolean;
  won: boolean;
}

export const newBoard = (stage: CrownStage): Board => ({ stage, marks: new Array(stage.n * stage.n).fill(0), t: 0, moves: 0, over: false, won: false });

/** Crowns that break a rule: sharing a row, column or land, or touching. */
export function clashes(st: CrownStage, marks: Mark[]): Set<number> {
  const n = st.n;
  const crowns = marks.map((m, i) => (m === 2 ? i : -1)).filter((i) => i >= 0);
  const bad = new Set<number>();
  for (let a = 0; a < crowns.length; a++)
    for (let b = a + 1; b < crowns.length; b++) {
      const i = crowns[a];
      const j = crowns[b];
      const ri = Math.floor(i / n), ci = i % n, rj = Math.floor(j / n), cj = j % n;
      if (ri === rj || ci === cj || st.region[i] === st.region[j] || (Math.abs(ri - rj) <= 1 && Math.abs(ci - cj) <= 1)) {
        bad.add(i);
        bad.add(j);
      }
    }
  return bad;
}

export function solved(st: CrownStage, marks: Mark[]): boolean {
  const crowns = marks.filter((m) => m === 2).length;
  return crowns === st.n && clashes(st, marks).size === 0;
}

/** Taps a square: empty → no → crown → empty. Solving the board finishes it. */
export function tap(b: Board, cell: number): Mark | null {
  if (b.over || cell < 0 || cell >= b.marks.length) return null;
  b.marks[cell] = ((b.marks[cell] + 1) % 3) as Mark;
  b.moves++;
  if (solved(b.stage, b.marks)) {
    b.over = true;
    b.won = true;
  }
  return b.marks[cell];
}

export function tick(b: Board, dt: number): void {
  if (!b.over) b.t += dt;
}

export function starsFor(b: Board): number {
  if (!b.won) return 0;
  if (b.t <= b.stage.par) return 3;
  if (b.t <= b.stage.par * 2) return 2;
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

/** Counts solutions (up to `limit`) by placing a crown row by row. */
export function countSolutions(n: number, region: number[], limit = 2): number {
  return findSolutions(n, region, limit).length;
}

/** Finds solutions (up to `limit`), each as the crowned column per row. */
export function findSolutions(n: number, region: number[], limit = 2): number[][] {
  const found: number[][] = [];
  let count = 0;
  const colUsed = new Array(n).fill(false);
  const regUsed = new Array(n).fill(false);
  const cols: number[] = [];
  const go = (r: number) => {
    if (count >= limit) return;
    if (r === n) {
      count++;
      found.push(cols.slice());
      return;
    }
    for (let c = 0; c < n; c++) {
      const reg = region[r * n + c];
      if (colUsed[c] || regUsed[reg]) continue;
      if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
      colUsed[c] = regUsed[reg] = true;
      cols.push(c);
      go(r + 1);
      cols.pop();
      colUsed[c] = regUsed[reg] = false;
    }
  };
  go(0);
  return found;
}

/** Whether a land stays in one piece without a square. */
function connectedWithout(n: number, region: number[], cell: number): boolean {
  const g = region[cell];
  const cells = region.map((x, i) => (x === g && i !== cell ? i : -1)).filter((i) => i >= 0);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]);
  const q = [cells[0]];
  while (q.length) {
    const i = q.pop()!;
    const r = Math.floor(i / n), c = i % n;
    for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const rr = r + dr, cc = c + dc;
      const j = rr * n + cc;
      if (rr >= 0 && cc >= 0 && rr < n && cc < n && j !== cell && region[j] === g && !seen.has(j)) {
        seen.add(j);
        q.push(j);
      }
    }
  }
  return seen.size === cells.length;
}

/** Reshapes the lands until the planted answer is the only one: a square crowned by another answer joins a neighbour's land. */
export function makeUnique(n: number, region: number[], answer: number[], rng: () => number): boolean {
  for (let round = 0; round < 80; round++) {
    const sols = findSolutions(n, region, 2);
    const other = sols.find((s) => s.some((c, r) => c !== answer[r]));
    if (!other) return sols.length === 1;
    const cands = other.map((c, r) => r * n + c).filter((i) => answer[Math.floor(i / n)] !== i % n);
    let moved = false;
    for (const cell of shuffle(cands, rng)) {
      const r = Math.floor(cell / n), c = cell % n;
      const neigh = [[0, 1], [1, 0], [0, -1], [-1, 0]]
        .map(([dr, dc]) => [r + dr, c + dc])
        .filter(([rr, cc]) => rr >= 0 && cc >= 0 && rr < n && cc < n)
        .map(([rr, cc]) => region[rr * n + cc])
        .filter((g) => g !== region[cell]);
      if (!neigh.length || !connectedWithout(n, region, cell)) continue;
      region[cell] = neigh[Math.floor(rng() * neigh.length)];
      moved = true;
      break;
    }
    if (!moved) return false;
  }
  return false;
}

/**
 * A human-style solver: repeatedly applies simple deductions (a land, row or column with one place left gets the
 * crown; squares around and in line with a crown are ruled out; a land squeezed into one row or column rules out
 * the rest of that row or column). Returns the number of reasoning steps, or Infinity if it gets stuck.
 */
export function reasoningSteps(st: CrownStage): number {
  const n = st.n;
  const N = n * n;
  const no = new Array(N).fill(false);
  const crown = new Array(N).fill(false);
  let steps = 0;
  const place = (i: number) => {
    crown[i] = true;
    const r = Math.floor(i / n), c = i % n;
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const rj = Math.floor(j / n), cj = j % n;
      if (rj === r || cj === c || st.region[j] === st.region[i] || (Math.abs(rj - r) <= 1 && Math.abs(cj - c) <= 1)) no[j] = true;
    }
  };
  const open = (i: number) => !no[i] && !crown[i];
  for (let guard = 0; guard < 500; guard++) {
    if (crown.filter(Boolean).length === n) return steps;
    let progress = false;
    // singles: a row, column or land with exactly one open square and no crown yet
    const groups: number[][] = [];
    for (let r = 0; r < n; r++) groups.push(Array.from({ length: n }, (_, c) => r * n + c));
    for (let c = 0; c < n; c++) groups.push(Array.from({ length: n }, (_, r) => r * n + c));
    for (let g = 0; g < n; g++) groups.push(Array.from({ length: N }, (_, i) => i).filter((i) => st.region[i] === g));
    for (const grp of groups) {
      if (grp.some((i) => crown[i])) continue;
      const o = grp.filter(open);
      if (o.length === 1) {
        place(o[0]);
        steps++;
        progress = true;
        break;
      }
    }
    if (progress) continue;
    // a land whose open squares all lie in one row (or column) claims that row (or column)
    for (let g = 0; g < n && !progress; g++) {
      const cells = Array.from({ length: N }, (_, i) => i).filter((i) => st.region[i] === g);
      if (cells.some((i) => crown[i])) continue;
      const o = cells.filter(open);
      const rows = new Set(o.map((i) => Math.floor(i / n)));
      const colsS = new Set(o.map((i) => i % n));
      if (rows.size === 1) {
        const r = [...rows][0];
        for (let c = 0; c < n; c++) {
          const j = r * n + c;
          if (st.region[j] !== g && open(j)) {
            no[j] = true;
            progress = true;
          }
        }
      }
      if (colsS.size === 1) {
        const c = [...colsS][0];
        for (let r = 0; r < n; r++) {
          const j = r * n + c;
          if (st.region[j] !== g && open(j)) {
            no[j] = true;
            progress = true;
          }
        }
      }
      if (progress) steps++;
    }
    if (progress) continue;
    // a square whose crown would leave some row, column or land with nowhere to go is ruled out
    for (let i = 0; i < N && !progress; i++) {
      if (!open(i)) continue;
      const r = Math.floor(i / n), c = i % n;
      const blocked = (j: number) => j === i || Math.floor(j / n) === r || j % n === c || st.region[j] === st.region[i] || (Math.abs(Math.floor(j / n) - r) <= 1 && Math.abs((j % n) - c) <= 1);
      for (const grp of groups) {
        if (grp.includes(i) || grp.some((j) => crown[j])) continue;
        if (grp.filter((j) => open(j) && !blocked(j)).length === 0) {
          no[i] = true;
          steps += 2;
          progress = true;
          break;
        }
      }
    }
    if (!progress) return Infinity;
  }
  return Infinity;
}

function shape(stage: number) {
  return { n: stage < 6 ? 5 : stage < 14 ? 6 : stage < 22 ? 7 : stage < 27 ? 8 : 9 };
}

/** Seconds a human-style solver takes: a moment to read the board and a few seconds per reasoning step. */
export const solveSeconds = (st: CrownStage, steps: number) => 6 + st.n * 1.5 + steps * 3.2;

export function layout(n: number, seed: number): CrownStage | null {
  const rng = mulberry(seed);
  // crowns: one per row and column, never touching
  let answer: number[] | null = null;
  for (let tries = 0; tries < 200 && !answer; tries++) {
    const perm = shuffle(Array.from({ length: n }, (_, i) => i), rng);
    if (perm.every((c, r) => r === 0 || Math.abs(c - perm[r - 1]) > 1)) answer = perm;
  }
  if (!answer) return null;
  // lands grow out from each crown, a square at a time, in random order
  const region = new Array(n * n).fill(-1);
  answer.forEach((c, r) => (region[r * n + c] = r));
  let left = n * n - n;
  while (left > 0) {
    const frontier: Array<[number, number]> = [];
    for (let i = 0; i < n * n; i++) {
      if (region[i] >= 0) continue;
      const r = Math.floor(i / n), c = i % n;
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < n && cc < n && region[rr * n + cc] >= 0) frontier.push([i, region[rr * n + cc]]);
      }
    }
    const [cell, reg] = frontier[Math.floor(rng() * frontier.length)];
    if (region[cell] < 0) {
      region[cell] = reg;
      left--;
    }
  }
  return { stage: 0, n, region, answer, par: 0 };
}

/** Lays boards out until one has exactly one answer that simple reasoning alone reaches. */
export function buildStage(stage: number, seedBase = 231000): CrownStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 3000; attempt++) {
    const st = layout(sh.n, seedBase + stage * 157 + attempt * 7919);
    if (!st) continue;
    if (!makeUnique(st.n, st.region, st.answer, mulberry(seedBase + attempt))) continue;
    const steps = reasoningSteps(st);
    if (!Number.isFinite(steps)) continue;
    st.stage = stage;
    st.par = Math.ceil(solveSeconds(st, steps));
    return st;
  }
  throw new Error(`crown-regions stage ${stage + 1}: no board`);
}

/** Today's board: everyone playing on the same date gets the same 7 × 7 board. */
export function dailyStage(dayKey: string): CrownStage {
  let h = 2166136261;
  for (const ch of dayKey) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return { ...buildStage(16, h % 1000003), stage: 16 };
}

export interface SolverOpts {
  /** seconds per reasoning step */
  step?: number;
  /** "reason" solves by deduction; "random" crowns random squares */
  mode?: "reason" | "random";
  seed?: number;
}

/** Plays a board: a reasoner taps in the answer at its pace; a random tapper crowns squares at random. */
export function pilot(st: CrownStage, opts: SolverOpts = {}): Board {
  const { step = 3.2, mode = "reason", seed = 1 } = opts;
  const b = newBoard(st);
  if (mode === "random") {
    const rng = mulberry(seed * 977);
    for (let k = 0; k < st.n * 3 && !b.over; k++) {
      const cell = Math.floor(rng() * st.n * st.n);
      tap(b, cell);
      tap(b, cell);
      tick(b, 1);
    }
    b.over = true;
    return b;
  }
  const steps = reasoningSteps(st);
  tick(b, 6 + st.n * 1.5 + steps * step);
  st.answer.forEach((c, r) => {
    tap(b, r * st.n + c);
    tap(b, r * st.n + c);
  });
  return b;
}

export const CROWN_STAGES: CrownStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
