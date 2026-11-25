/**
 * Bee Lines (꿀벌 길잇기) — an OIYO original connect-the-pairs puzzle (2026-11-25).
 *
 * A meadow is dotted with pairs of flowers, one pair of each colour. Draw a bee's trail from each flower to its twin,
 * square by square; trails can't cross, and a new trail drawn through an old one cuts it. Join every pair and fill every
 * square of the meadow with trails. The fewer strokes it takes, the more stars.
 *
 * Pure and deterministic: every meadow is a random path through every square (seeded per stage), cut into pieces whose
 * ends are the flowers, so it can always be filled.
 */

export const BEE_SLUG = "bee-lines";
export const STAGE_COUNT = 30;
export const EMPTY = -1;

export interface BeeStage {
  stage: number;
  n: number;
  /** the flower pairs: [a, b] cell indices, colour = position in the list */
  pairs: Array<[number, number]>;
  /** one way to fill it: each colour's trail, from its first flower to its second */
  plan: number[][];
}

export interface Meadow {
  stage: BeeStage;
  /** each colour's trail so far (from one of its flowers) */
  trails: number[][];
  /** the colour on each square (flowers included), or EMPTY */
  owner: number[];
  strokes: number;
  drawing: number; // the colour being drawn, or −1
  won: boolean;
}

export function flowerAt(st: BeeStage, i: number): number {
  return st.pairs.findIndex(([a, b]) => a === i || b === i);
}

export function newMeadow(stage: BeeStage): Meadow {
  const m: Meadow = { stage, trails: stage.pairs.map(() => []), owner: new Array(stage.n * stage.n).fill(EMPTY), strokes: 0, drawing: -1, won: false };
  stage.pairs.forEach(([a, b], k) => {
    m.owner[a] = k;
    m.owner[b] = k;
  });
  return m;
}

const near = (n: number, a: number, b: number) => Math.abs((a % n) - (b % n)) + Math.abs(Math.floor(a / n) - Math.floor(b / n)) === 1;

/** Whether a colour's trail joins its two flowers. */
export function joined(m: Meadow, k: number): boolean {
  const t = m.trails[k];
  const [a, b] = m.stage.pairs[k];
  return t.length >= 2 && ((t[0] === a && t[t.length - 1] === b) || (t[0] === b && t[t.length - 1] === a));
}

function clearTrail(m: Meadow, k: number, keep = 0): void {
  const t = m.trails[k];
  for (const i of t.slice(keep)) if (flowerAt(m.stage, i) !== k) m.owner[i] = EMPTY;
  m.trails[k] = t.slice(0, keep);
}

/** Starts a stroke on square i: a flower starts its colour afresh; a square on a trail carries on from there. */
export function begin(m: Meadow, i: number): boolean {
  if (m.won) return false;
  const f = flowerAt(m.stage, i);
  if (f >= 0) {
    clearTrail(m, f);
    m.trails[f] = [i];
    m.drawing = f;
    m.strokes++;
    return true;
  }
  const k = m.owner[i];
  if (k < 0) return false;
  const at = m.trails[k].indexOf(i);
  if (at < 0) return false;
  clearTrail(m, k, at + 1);
  m.drawing = k;
  m.strokes++;
  return true;
}

/** Extends the stroke onto neighbouring square i (backing up over its own trail, cutting through others). */
export function extend(m: Meadow, i: number): boolean {
  const k = m.drawing;
  if (m.won || k < 0) return false;
  const t = m.trails[k];
  const last = t[t.length - 1];
  if (i === last || !near(m.stage.n, last, i)) return false;
  const back = t.indexOf(i);
  if (back >= 0) {
    clearTrail(m, k, back + 1);
    return true;
  }
  if (joined(m, k)) return false; // already reached its twin
  const f = flowerAt(m.stage, i);
  if (f >= 0 && f !== k) return false; // another colour's flower
  const other = m.owner[i];
  if (other >= 0 && other !== k) {
    // cut the other trail just before this square
    const at = m.trails[other].indexOf(i);
    clearTrail(m, other, Math.max(1, at));
    if (m.trails[other].length === 1 && flowerAt(m.stage, m.trails[other][0]) !== other) m.trails[other] = [];
  }
  t.push(i);
  m.owner[i] = k;
  return true;
}

/** Ends the stroke; checks for a full, joined meadow. */
export function end(m: Meadow): void {
  m.drawing = -1;
  if (m.stage.pairs.every((_, k) => joined(m, k)) && m.owner.every((v) => v !== EMPTY)) m.won = true;
}

/** Draws a whole trail in one stroke (as a finger does). */
export function stroke(m: Meadow, cells: number[]): void {
  if (!cells.length || !begin(m, cells[0])) return;
  for (const i of cells.slice(1)) extend(m, i);
  end(m);
}

export function starsFor(m: Meadow): number {
  if (!m.won) return 0;
  const k = m.stage.pairs.length;
  if (m.strokes <= k + Math.ceil(k / 2)) return 3;
  if (m.strokes <= k * 2 + 2) return 2;
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

/** A random path through every square: a back-and-forth snake, shuffled by many "backbite" moves. */
export function hamiltonian(n: number, rng: () => number, moves = 4000): number[] {
  let path: number[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) path.push(y * n + (y % 2 ? n - 1 - x : x));
  const nbrs = (i: number) => {
    const x = i % n;
    const y = Math.floor(i / n);
    return [x > 0 ? i - 1 : -1, x < n - 1 ? i + 1 : -1, y > 0 ? i - n : -1, y < n - 1 ? i + n : -1].filter((j) => j >= 0);
  };
  for (let k = 0; k < moves; k++) {
    if (rng() < 0.5) path.reverse();
    const end = path[path.length - 1];
    const cand = nbrs(end).filter((j) => j !== path[path.length - 2]);
    const j = cand[Math.floor(rng() * cand.length)];
    const at = path.indexOf(j);
    // join the end to j, and reverse the stretch after j: still a path through every square
    path = [...path.slice(0, at + 1), ...path.slice(at + 1).reverse()];
  }
  return path;
}

/**
 * Searches for any way to fill the meadow without looking at the plan: pairs in order (closest first), every simple
 * trail between the flowers, backing up when the meadow can't be filled. Null if none within the cap.
 */
export function solve(st: BeeStage, cap = 5000000): number[][] | null {
  const n = st.n;
  const owner = new Array(n * n).fill(EMPTY);
  st.pairs.forEach(([a, b], k) => {
    owner[a] = k;
    owner[b] = k;
  });
  const nbrs = (i: number) => {
    const x = i % n;
    const y = Math.floor(i / n);
    return [x > 0 ? i - 1 : -1, x < n - 1 ? i + 1 : -1, y > 0 ? i - n : -1, y < n - 1 ? i + n : -1].filter((j) => j >= 0);
  };
  const order = st.pairs.map((_, k) => k).sort((p, q) => {
    const d = (k: number) => Math.abs((st.pairs[k][0] % n) - (st.pairs[k][1] % n)) + Math.abs(Math.floor(st.pairs[k][0] / n) - Math.floor(st.pairs[k][1] / n));
    return d(p) - d(q);
  });
  const trails: number[][] = st.pairs.map(() => []);
  let nodes = 0;
  const go = (oi: number): boolean => {
    if (oi === order.length) return owner.every((v) => v !== EMPTY);
    const k = order[oi];
    const [a, b] = st.pairs[k];
    const path = [a];
    const walk = (cur: number): boolean => {
      if (++nodes > cap) return false;
      for (const j of nbrs(cur)) {
        if (j === b) {
          path.push(b);
          trails[k] = path.slice();
          if (go(oi + 1)) return true;
          path.pop();
          continue;
        }
        if (owner[j] !== EMPTY) continue;
        owner[j] = k;
        path.push(j);
        if (walk(j)) return true;
        path.pop();
        owner[j] = EMPTY;
      }
      return false;
    };
    return walk(a);
  };
  return go(0) ? trails : null;
}

export interface BeeOpts {
  /** chance of a wrong first try at a trail (drawn somewhere wrong, then redrawn) */
  slip?: number;
  seed?: number;
  mode?: "plan" | "human" | "random";
}

/** Plays a meadow: its plan, a player who sometimes draws a trail wrong first, or random strokes. */
export function pilot(st: BeeStage, opts: BeeOpts = {}): Meadow {
  const { slip = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 2153 + 7);
  const m = newMeadow(st);
  const n = st.n;
  if (mode === "random") {
    for (let s = 0; s < 40 && !m.won; s++) {
      const [a] = st.pairs[Math.floor(rng() * st.pairs.length)];
      const cells = [a];
      for (let k = 0; k < 2 + Math.floor(rng() * n * 2); k++) {
        const last = cells[cells.length - 1];
        const x = last % n;
        const y = Math.floor(last / n);
        const opts2 = [x > 0 ? last - 1 : -1, x < n - 1 ? last + 1 : -1, y > 0 ? last - n : -1, y < n - 1 ? last + n : -1].filter((j) => j >= 0);
        cells.push(opts2[Math.floor(rng() * opts2.length)]);
      }
      stroke(m, cells);
    }
    return m;
  }
  const order = st.plan.map((_, k) => k);
  if (mode === "human") for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const k of order) {
    if (mode === "human" && rng() < slip) {
      // a wrong first try: half the trail, then a wander; it gets redrawn right afterwards
      const half = st.plan[k].slice(0, Math.max(2, Math.floor(st.plan[k].length / 2)));
      stroke(m, half);
    }
    stroke(m, st.plan[k]);
  }
  // a careful player checks the meadow and redraws any trail that got cut
  if (mode === "human") for (let pass = 0; pass < 2 && !m.won; pass++) for (const k of order) if (!joined(m, k)) stroke(m, st.plan[k]);
  return m;
}

/** Human-like players: every trail in their own order, and one in four drawn wrong first. */
export const HUMAN_BEES: BeeOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ mode: "human", slip: 0.25, seed }));

function shape(stage: number) {
  return {
    n: stage < 3 ? 5 : stage < 8 ? 6 : stage < 15 ? 7 : stage < 23 ? 8 : 9,
    minLen: stage < 3 ? 3 : 4,
  };
}

export function buildStage(stage: number): BeeStage {
  const sh = shape(stage);
  const n = sh.n;
  for (let attempt = 0; attempt < 400; attempt++) {
    const rng = mulberry(731000 + stage * 487 + attempt * 7919);
    const path = hamiltonian(n, rng);
    // cut it into pieces of a few squares each; the ends become flowers
    const pieces: number[][] = [];
    let at = 0;
    while (at < path.length) {
      const left = path.length - at;
      let len = sh.minLen + Math.floor(rng() * (n + 1));
      if (left - len < sh.minLen) len = left;
      pieces.push(path.slice(at, at + len));
      at += len;
    }
    const k = pieces.length;
    if (k < Math.max(3, n - 2) || k > n + 2) continue;
    // a trail that runs back beside itself makes an easy shortcut: keep the pieces that turn honestly
    const st: BeeStage = { stage, n, pairs: pieces.map((p) => [p[0], p[p.length - 1]] as [number, number]), plan: pieces };
    const planned = pilot(st);
    if (!planned.won || starsFor(planned) < 3) continue;
    if (HUMAN_BEES.some((o) => !pilot(st, o).won)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`bee-lines stage ${stage + 1}: no fair meadow`);
}

export const BEE_STAGES: BeeStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
