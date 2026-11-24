/**
 * Pip Merge (주사위 합치기) — an OIYO original dice-merge puzzle (2026-11-25).
 *
 * Dice come one at a time; put each on an empty square of a 5 × 5 tray. When three or more dice showing the same face
 * touch (up, down, left, right), they merge into one die, one pip higher, on the square you just used — and that can
 * set off another merge. Three sixes don't make a seven: they burst, clearing the square and every die around it.
 * Score the stage's goal before the dice run out or the tray fills up.
 *
 * Pure and deterministic: every stage's dice and stones are seeded per stage. All arithmetic is integer.
 */

export const PIP_SLUG = "pip-merge";
export const STAGE_COUNT = 30;
export const SIZE = 5;
export const CELLS = SIZE * SIZE;
export const ROCK = -1;
export const BURST_BONUS = 60;

export interface PipStage {
  stage: number;
  rocks: number[]; // squares holding a stone
  dice: number[]; // the faces, in the order they come
  need: number;
  par: number;
}

export interface Tray {
  stage: PipStage;
  cells: number[]; // 0 empty, ROCK, or a face 1..6
  next: number; // index of the next die
  score: number;
  best: number; // longest chain in one move
  over: boolean;
  won: boolean;
}

export interface PlaceEvent {
  cleared: number[]; // squares emptied by merges or a burst
  chain: number; // merges set off
  gained: number;
  burst: boolean;
  face: number; // what the placed square shows afterwards (0 after a burst)
}

export function newTray(stage: PipStage): Tray {
  const cells = new Array(CELLS).fill(0);
  for (const r of stage.rocks) cells[r] = ROCK;
  return { stage, cells, next: 0, score: 0, best: 0, over: false, won: false };
}

export const neighbours = (i: number): number[] => {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out: number[] = [];
  if (r > 0) out.push(i - SIZE);
  if (r < SIZE - 1) out.push(i + SIZE);
  if (c > 0) out.push(i - 1);
  if (c < SIZE - 1) out.push(i + 1);
  return out;
};

/** Squares connected to i showing face v (i included). */
export function group(cells: number[], i: number, v: number): number[] {
  const seen = new Set([i]);
  const stack = [i];
  while (stack.length) {
    const k = stack.pop() as number;
    for (const n of neighbours(k)) {
      if (!seen.has(n) && cells[n] === v) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return [...seen].sort((a, b) => a - b);
}

/** Drops face v on square i of cells (changed in place) and resolves the merges. */
export function settle(cells: number[], i: number, v: number): PlaceEvent {
  const ev: PlaceEvent = { cleared: [], chain: 0, gained: 0, burst: false, face: v };
  cells[i] = v;
  for (;;) {
    const g = group(cells, i, v);
    if (g.length < 3) break;
    ev.chain++;
    ev.gained += v * v * g.length * (1 << (ev.chain - 1));
    for (const k of g) {
      if (k !== i) {
        cells[k] = 0;
        ev.cleared.push(k);
      }
    }
    if (v === 6) {
      // a burst: the square and the dice round it (stones stay)
      ev.burst = true;
      cells[i] = 0;
      ev.cleared.push(i);
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) continue;
          const k = rr * SIZE + cc;
          if (cells[k] > 0) {
            ev.gained += cells[k] * 2;
            cells[k] = 0;
            ev.cleared.push(k);
          }
        }
      }
      ev.gained += BURST_BONUS;
      ev.face = 0;
      break;
    }
    v++;
    cells[i] = v;
    ev.face = v;
  }
  return ev;
}

export const empties = (cells: number[]): number[] => cells.flatMap((v, i) => (v === 0 ? [i] : []));

/** Puts the next die on square i. Null if the square is taken or the game is over. */
export function place(t: Tray, i: number): PlaceEvent | null {
  if (t.over || t.cells[i] !== 0) return null;
  const v = t.stage.dice[t.next++];
  const ev = settle(t.cells, i, v);
  t.score += ev.gained;
  t.best = Math.max(t.best, ev.chain);
  if (t.next >= t.stage.dice.length || empties(t.cells).length === 0) {
    t.over = true;
    t.won = t.score >= t.stage.need;
  }
  return ev;
}

export function starsFor(t: Tray): number {
  if (!t.won) return 0;
  if (t.score >= t.stage.par) return 3;
  if (t.score >= Math.ceil((t.stage.need + t.stage.par) / 2)) return 2;
  return 1;
}

/** How promising a tray looks: equal faces side by side, and room to move. */
export function shapeValue(cells: number[]): number {
  let v = 0;
  for (let i = 0; i < CELLS; i++) {
    const a = cells[i];
    if (a === 0) v += 3;
    if (a <= 0) continue;
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    if (c < SIZE - 1 && cells[i + 1] === a) v += a * 2;
    if (r < SIZE - 1 && cells[i + SIZE] === a) v += a * 2;
  }
  return v;
}

/** Every empty square ranked for the next die (best first), looking one die further ahead when `deep`. */
export function rankMoves(t: Tray, deep: boolean): Array<{ i: number; value: number }> {
  const v = t.stage.dice[t.next];
  const after = t.stage.dice[t.next + 1];
  const out: Array<{ i: number; value: number }> = [];
  for (const i of empties(t.cells)) {
    const a = t.cells.slice();
    const ea = settle(a, i, v);
    let value = ea.gained * 10 + shapeValue(a);
    if (deep && after !== undefined) {
      let bestB = -1;
      for (const j of empties(a)) {
        const b = a.slice();
        const eb = settle(b, j, after);
        const vb = eb.gained * 9 + shapeValue(b);
        if (vb > bestB) bestB = vb;
      }
      if (bestB < 0) bestB = -500; // the tray would be full
      value = ea.gained * 10 + bestB;
    }
    out.push({ i, value });
  }
  out.sort((x, y) => y.value - x.value || x.i - y.i);
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

export interface StackerOpts {
  /** look one die ahead */
  deep?: boolean;
  /** chance of not taking the best square, but one of the next few */
  slip?: number;
  seed?: number;
  mode?: "plan" | "random";
}

export function pilot(st: PipStage, opts: StackerOpts = {}): Tray {
  const { deep = true, slip = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 4099 + 211);
  const t = newTray(st);
  while (!t.over) {
    if (mode === "random") {
      const e = empties(t.cells);
      place(t, e[Math.floor(rng() * e.length)]);
      continue;
    }
    const ranked = rankMoves(t, deep);
    let k = 0;
    if (slip > 0 && rng() < slip) k = Math.min(ranked.length - 1, 1 + Math.floor(rng() * 3));
    place(t, ranked[k].i);
  }
  return t;
}

function shape(stage: number) {
  return {
    dice: 36 + stage, // 36 up to 65
    top: 5, // the faces that come are 1 to 5; sixes are only made
    rocks: stage < 3 ? 0 : Math.min(4, 1 + Math.floor((stage - 3) / 7)),
  };
}

/** Human-like players: look at the next die too, but now and then take the second- to fourth-best square. */
export const HUMAN_STACKERS: StackerOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ deep: true, slip: 0.12, seed }));

export function buildStage(stage: number): PipStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry(541000 + stage * 359 + attempt * 7919);
    const rocks: number[] = [];
    while (rocks.length < sh.rocks) {
      const r = Math.floor(rng() * CELLS);
      if (r !== 12 && !rocks.includes(r)) rocks.push(r);
    }
    rocks.sort((a, b) => a - b);
    const dice: number[] = [];
    for (let k = 0; k < sh.dice; k++) {
      // low faces come more often
      const u = rng();
      dice.push(1 + Math.floor(u * u * sh.top));
    }
    const st: PipStage = { stage, rocks, dice, need: 0, par: 0 };
    // the goal sits under the weakest human-like run; three stars a little under the careful player
    const humans = HUMAN_STACKERS.map((o) => pilot(st, o).score);
    const careful = pilot(st).score;
    st.need = Math.max(50, Math.floor((Math.min(...humans) * 0.85) / 10) * 10);
    st.par = Math.max(st.need + 10, Math.floor((careful * 0.9) / 10) * 10);
    if (careful < st.par) continue;
    if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].some((seed) => pilot(st, { mode: "random", seed }).score >= st.need)) continue;
    return st;
  }
  throw new Error(`pip-merge stage ${stage + 1}: no fair tray`);
}

export const PIP_STAGES: PipStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
