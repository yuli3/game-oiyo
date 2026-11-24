/**
 * Formula Lock (수식 자물쇠) — an OIYO original equation-guessing puzzle (2026-11-25).
 *
 * A safe opens to one true equation, like "12+35=47". Type any true equation of the same length and the dial lights
 * up each symbol: green if it is right and in the right place, yellow if it is in the equation somewhere else, grey if
 * it isn't there (as many times as you typed it). Crack the safe within six tries.
 *
 * Pure and deterministic: every safe's equation is seeded per stage. The equations use digits and + − × ÷ with the
 * usual order of operations, whole-number results, no leading zeros and nothing negative.
 */

export const LOCK_SLUG = "formula-lock";
export const STAGE_COUNT = 30;
export const TRIES = 6;
export const SYMBOLS = "0123456789+-*/=".split("");

export type Mark = 0 | 1 | 2; // 0 grey, 1 yellow, 2 green
export interface LockStage {
  stage: number;
  length: number;
  answer: string;
  par: number; // tries a careful solver needs
}

/** Evaluates a left-hand side with × ÷ before + −; null if it isn't whole and non-negative all the way. */
export function evaluate(expr: string): number | null {
  const toks = expr.match(/\d+|[-+*/]/g);
  if (!toks || toks.join("") !== expr) return null;
  // numbers and operators must alternate, starting and ending with a number, no leading zeros
  for (let i = 0; i < toks.length; i++) {
    const isNum = /^\d+$/.test(toks[i]);
    if (isNum !== (i % 2 === 0)) return null;
    if (isNum && toks[i].length > 1 && toks[i][0] === "0") return null;
  }
  if (toks.length % 2 === 0) return null;
  const terms: Array<number | string> = [];
  let cur = Number(toks[0]);
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i];
    const n = Number(toks[i + 1]);
    if (op === "*") cur *= n;
    else if (op === "/") {
      if (n === 0 || cur % n !== 0) return null;
      cur /= n;
    } else {
      terms.push(cur, op);
      cur = n;
    }
  }
  terms.push(cur);
  let v = terms[0] as number;
  for (let i = 1; i < terms.length; i += 2) {
    v = terms[i] === "+" ? v + (terms[i + 1] as number) : v - (terms[i + 1] as number);
    if (v < 0) return null;
  }
  return v;
}

/** Whether a string is a true equation of the form lhs=rhs (rhs a plain number). */
export function isTrue(eq: string): boolean {
  const parts = eq.split("=");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  if (!/^\d+$/.test(parts[1]) || (parts[1].length > 1 && parts[1][0] === "0")) return false;
  if (!/[-+*/]/.test(parts[0])) return false; // the left side must do some sum
  const v = evaluate(parts[0]);
  return v !== null && v === Number(parts[1]);
}

/** Green, yellow and grey for a guess against the answer (repeats are only lit as often as the answer has them). */
export function score(guess: string, answer: string): Mark[] {
  const marks: Mark[] = new Array(guess.length).fill(0);
  const left = new Map<string, number>();
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) marks[i] = 2;
    else left.set(answer[i], (left.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === 2) continue;
    const n = left.get(guess[i]) ?? 0;
    if (n > 0) {
      marks[i] = 1;
      left.set(guess[i], n - 1);
    }
  }
  return marks;
}

const listCache = new Map<number, string[]>();
/** Every true equation of a length (two or three numbers on the left). */
export function equations(length: number): string[] {
  const hit = listCache.get(length);
  if (hit) return hit;
  const out: string[] = [];
  const ops = ["+", "-", "*", "/"];
  const nums = (maxLen: number) => {
    const xs: string[] = [];
    for (let v = 0; v < Math.pow(10, maxLen); v++) xs.push(String(v));
    return xs;
  };
  const lhsMax = length - 2;
  const all = nums(Math.min(3, lhsMax - 2));
  for (const a of all)
    for (const op of ops)
      for (const b of all) {
        const lhs = a + op + b;
        if (lhs.length > lhsMax) continue;
        const v = evaluate(lhs);
        if (v === null) continue;
        const eq = `${lhs}=${v}`;
        if (eq.length === length) out.push(eq);
      }
  // three numbers on the left, one or two digits each
  if (lhsMax >= 5) {
    const small = nums(Math.min(2, lhsMax - 4));
    for (const a of small)
      for (const o1 of ops)
        for (const b of small)
          for (const o2 of ops)
            for (const c of small) {
              const lhs = a + o1 + b + o2 + c;
              if (lhs.length > lhsMax) continue;
              const v = evaluate(lhs);
              if (v === null) continue;
              const eq = `${lhs}=${v}`;
              if (eq.length === length) out.push(eq);
            }
  }
  const uniq = [...new Set(out)];
  listCache.set(length, uniq);
  return uniq;
}

export interface Safe {
  stage: LockStage;
  guesses: string[];
  marks: Mark[][];
  over: boolean;
  won: boolean;
}

export const newSafe = (stage: LockStage): Safe => ({ stage, guesses: [], marks: [], over: false, won: false });

export type GuessResult = "opened" | "marked" | "wrong length" | "not true" | null;

export function guess(s: Safe, eq: string): GuessResult {
  if (s.over) return null;
  if (eq.length !== s.stage.length) return "wrong length";
  if (!isTrue(eq)) return "not true";
  const m = score(eq, s.stage.answer);
  s.guesses.push(eq);
  s.marks.push(m);
  if (m.every((x) => x === 2)) {
    s.over = true;
    s.won = true;
    return "opened";
  }
  if (s.guesses.length >= TRIES) s.over = true;
  return "marked";
}

export function starsFor(s: Safe): number {
  if (!s.won) return 0;
  if (s.guesses.length <= s.stage.par) return 3;
  if (s.guesses.length <= s.stage.par + 1) return 2;
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

export interface CrackerOpts {
  /** chance per try of overlooking one clue (guessing from a looser list) */
  slip?: number;
  seed?: number;
  /** "deduce" keeps to equations that fit every clue; "random" types any true equation */
  mode?: "deduce" | "random";
}

const fits = (eq: string, past: string[], marks: Mark[][], skip = -1) => past.every((g, k) => k === skip || score(g, eq).every((m, i) => m === marks[k][i]));

/** The guesses a careful (or careless) cracker makes, one after another. */
export function pilot(st: LockStage, opts: CrackerOpts = {}): Safe {
  const { slip = 0, seed = 1, mode = "deduce" } = opts;
  const rng = mulberry(seed * 5113 + 41);
  const all = equations(st.length);
  const s = newSafe(st);
  while (!s.over) {
    let pool: string[];
    if (mode === "random") pool = all;
    else {
      const skip = s.guesses.length && rng() < slip ? Math.floor(rng() * s.guesses.length) : -1;
      pool = all.filter((e) => fits(e, s.guesses, s.marks, skip));
      if (!pool.length) pool = all.filter((e) => fits(e, s.guesses, s.marks));
    }
    guess(s, pool[Math.floor(rng() * pool.length)]);
  }
  return s;
}

function shape(stage: number) {
  return { length: stage < 8 ? 6 : stage < 18 ? 7 : 8 };
}

/** Human-like crackers: they keep to the clues but overlook one now and then. */
export const HUMAN_CRACKERS: CrackerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ slip: 0.15, seed }));

/** Picks safes that human-like crackers open within the tries (most of the time) and random typing does not. */
export function buildStage(stage: number): LockStage {
  const { length } = shape(stage);
  const all = equations(length);
  const rng = mulberry(391000 + stage * 251);
  const order = shuffle(all.map((_, i) => i), rng);
  for (const i of order.slice(0, 400)) {
    const answer = all[i];
    // plain-looking answers: no 0 on its own on the left, no ×1 or ÷1
    if (/(^|[-+*/])0([-+*/=])/.test(answer) || /[*/]1([-+*/=])/.test(answer)) continue;
    const st: LockStage = { stage, length, answer, par: 0 };
    const runs = HUMAN_CRACKERS.map((o) => pilot(st, o));
    if (runs.some((r) => !r.won)) continue;
    const careful = [1, 2, 3].map((seed) => pilot(st, { seed }).guesses.length);
    st.par = Math.max(...careful) + (stage < 8 ? 1 : 0);
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`formula-lock stage ${stage + 1}: no fair safe`);
}

/** The 30 safes, each worked out the first time it is asked for. */
export const LOCK_STAGES: LockStage[] = [];
const built: LockStage[] = [];
for (let i = 0; i < STAGE_COUNT; i++) Object.defineProperty(LOCK_STAGES, i, { enumerable: true, get: () => (built[i] ??= buildStage(i)) });
