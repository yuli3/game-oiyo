/**
 * Summit Cards (봉우리 카드) — an OIYO original three-peak solitaire (2026-11-25).
 *
 * Twenty-eight cards make three mountain peaks. Play any uncovered card one rank above or below the card on the
 * camp pile (King and Ace join up) to move it there and carry on the chain; when stuck, turn a card from the stock.
 * Clear all three peaks before the stock runs out.
 *
 * Pure and deterministic: every deal is seeded per stage. Early stages deal every card face up.
 */

export const SUMMIT_SLUG = "summit-cards";
export const STAGE_COUNT = 30;
export const PEAK_CARDS = 28;

/** A card is 0..51: rank = c % 13 (0 = Ace … 12 = King), suit = floor(c / 13). */
export const rankOf = (c: number) => c % 13;
export const suitOf = (c: number) => Math.floor(c / 13);

/** The 28 peak slots, row by row: 3 tips, 6, 9, then a base of 10. Each slot lists the slots resting on it. */
export const ROWS = [3, 6, 9, 10];
function buildCover(): number[][] {
  const cover: number[][] = Array.from({ length: PEAK_CARDS }, () => []);
  // row 0 (3) → row 1 (6): tip k rests on slots 3+2k and 4+2k
  for (let k = 0; k < 3; k++) cover[3 + 2 * k].push(k), cover[4 + 2 * k].push(k);
  // row 1 (6) → row 2 (9): card j of peak p (p = floor(j/2), i = j%2) rests on 9 + 3p + i and 10 + 3p + i
  for (let j = 0; j < 6; j++) {
    const p = Math.floor(j / 2);
    const i = j % 2;
    cover[9 + 3 * p + i].push(3 + j);
    cover[10 + 3 * p + i].push(3 + j);
  }
  // row 2 (9) → row 3 (10): card m rests on 18 + m and 19 + m
  for (let m = 0; m < 9; m++) cover[18 + m].push(9 + m), cover[19 + m].push(9 + m);
  return cover;
}
/** COVERED_BY[slot] = the slots lying on top of it (it is free once they are all gone). */
export const COVERED_BY: number[][] = buildCover();

export interface SummitStage {
  stage: number;
  peaks: number[]; // 28 cards in slot order
  stock: number[]; // drawn from the end
  camp: number; // the first card on the camp pile
  faceDown: boolean; // covered cards hidden until freed
  par: number; // stock cards left by a careful player (three stars at or above)
}

export interface Climb {
  stage: SummitStage;
  gone: boolean[];
  stock: number[];
  camp: number;
  chain: number;
  best: number;
  over: boolean;
  won: boolean;
}

export const newClimb = (stage: SummitStage): Climb => ({ stage, gone: new Array(PEAK_CARDS).fill(false), stock: stage.stock.slice(), camp: stage.camp, chain: 0, best: 0, over: false, won: false });

export const isFree = (cl: Climb, slot: number) => !cl.gone[slot] && COVERED_BY[slot].every((s) => cl.gone[s]);
/** Ranks one apart, King and Ace joined. */
export const fits = (a: number, b: number) => {
  const d = Math.abs(rankOf(a) - rankOf(b));
  return d === 1 || d === 12;
};
export const playable = (cl: Climb) => Array.from({ length: PEAK_CARDS }, (_, s) => s).filter((s) => isFree(cl, s) && fits(cl.stage.peaks[s], cl.camp));

function settle(cl: Climb) {
  if (cl.gone.every(Boolean)) {
    cl.over = true;
    cl.won = true;
  } else if (!cl.stock.length && !playable(cl).length) cl.over = true;
}

export function play(cl: Climb, slot: number): boolean {
  if (cl.over || !isFree(cl, slot) || !fits(cl.stage.peaks[slot], cl.camp)) return false;
  cl.gone[slot] = true;
  cl.camp = cl.stage.peaks[slot];
  cl.chain++;
  cl.best = Math.max(cl.best, cl.chain);
  settle(cl);
  return true;
}

export function draw(cl: Climb): boolean {
  if (cl.over || !cl.stock.length) return false;
  cl.camp = cl.stock.pop() as number;
  cl.chain = 0;
  settle(cl);
  return true;
}

export function starsFor(cl: Climb): number {
  if (!cl.won) return 0;
  if (cl.stock.length >= cl.stage.par) return 3;
  if (cl.stock.length >= Math.floor(cl.stage.par / 2)) return 2;
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

export interface ClimberOpts {
  /** how many plays ahead the player looks along a chain (1 = greedy) */
  depth?: number;
  /** chance per move of playing any legal card without looking */
  slip?: number;
  seed?: number;
  mode?: "plan" | "random";
}

/** Longest chain (with how many cards it frees) a player can see from here, up to depth plays. With face-down deals
 *  the player only plans with cards already showing (known). */
function chainValue(cl: Climb, depth: number, known: Set<number> | null): number {
  if (depth <= 0) return 0;
  let best = 0;
  for (const s of playable(cl)) {
    if (known && !known.has(s)) continue;
    const c = { ...cl, gone: cl.gone.slice() };
    c.gone[s] = true;
    c.camp = cl.stage.peaks[s];
    // freeing a card from the bottom rows is worth a little extra (it opens the peaks)
    const freed = COVERED_BY.reduce((n, by, slot) => n + (!c.gone[slot] && by.includes(s) && by.every((x) => c.gone[x]) ? 1 : 0), 0);
    best = Math.max(best, 1 + freed * 0.3 + chainValue(c, depth - 1, known));
  }
  return best;
}

/** The slot a sensible player plays next, or -1 to turn the stock. */
export function nextMove(cl: Climb, depth: number, rng: () => number, slip = 0): number {
  const moves = playable(cl);
  if (!moves.length) return -1;
  if (rng() < slip) return moves[Math.floor(rng() * moves.length)];
  let best = moves[0];
  let bestScore = -Infinity;
  const known = cl.stage.faceDown ? new Set(Array.from({ length: PEAK_CARDS }, (_, s) => s).filter((s) => isFree(cl, s))) : null;
  for (const s of moves) {
    const c = { ...cl, gone: cl.gone.slice() };
    c.gone[s] = true;
    c.camp = cl.stage.peaks[s];
    const score = 1 + chainValue(c, depth - 1, known) + (s >= 18 ? 0 : (0.05 * (18 - s)) / 18);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

export function pilot(st: SummitStage, opts: ClimberOpts = {}): Climb {
  const { depth = 3, slip = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 4507 + 79);
  const cl = newClimb(st);
  while (!cl.over) {
    if (mode === "random") {
      const moves = playable(cl);
      // a random player turns the stock half the time even when a card would go
      if (moves.length && (rng() < 0.5 || !cl.stock.length)) play(cl, moves[Math.floor(rng() * moves.length)]);
      else draw(cl);
      continue;
    }
    const s = nextMove(cl, depth, rng, slip);
    if (s >= 0) play(cl, s);
    else draw(cl);
  }
  return cl;
}

function shape(stage: number) {
  return {
    stock: Math.max(17, 23 - Math.floor(stage / 5)), // cards in the stock (the deck has 24 left after the peaks: one is the first camp card)
    faceDown: stage >= 6,
  };
}

/** Human-like climbers: two plays ahead, a careless card about one move in eight. */
export const HUMAN_CLIMBERS: ClimberOpts[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => ({ depth: 2, slip: 0.12, seed }));

export function buildStage(stage: number): SummitStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = mulberry(481000 + stage * 311 + attempt * 7919);
    const deck = shuffle(Array.from({ length: 52 }, (_, c) => c), rng);
    const st: SummitStage = { stage, peaks: deck.slice(0, PEAK_CARDS), stock: deck.slice(PEAK_CARDS, PEAK_CARDS + sh.stock), camp: deck[PEAK_CARDS + sh.stock], faceDown: sh.faceDown, par: 0 };
    if (HUMAN_CLIMBERS.some((o) => !pilot(st, o).won)) continue;
    const careful = pilot(st, { depth: 3 });
    if (!careful.won) continue;
    st.par = Math.max(0, careful.stock.length - (stage < 6 ? 2 : 1));
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`summit-cards stage ${stage + 1}: no fair deal`);
}

/** The 30 deals, each worked out the first time it is asked for. */
export const SUMMIT_STAGES: SummitStage[] = [];
const built: SummitStage[] = [];
for (let i = 0; i < STAGE_COUNT; i++) Object.defineProperty(SUMMIT_STAGES, i, { enumerable: true, get: () => (built[i] ??= buildStage(i)) });
