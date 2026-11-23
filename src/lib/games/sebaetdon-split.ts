/**
 * 세뱃돈 봉투 (Sebaetdon Split) — an OIYO original Seollal money puzzle.
 * Grandma has a stack of new bills and a row of New Year envelopes, one for each grandchild who
 * bowed. Drag every bill into an envelope so each one holds exactly what its tag asks. Later tags
 * only say "the same as Minji" or "5,000 more than Jun" or "twice Seo-yeon", coins join the bills,
 * and every last won must be given out. Every puzzle is built from a real split.
 */

import { mulberry } from "./pixel-kit";

export const SEBAE_SLUG = "sebaetdon-split";
export const STAGE_COUNT = 30;

export type Clue =
  | { kind: "amount"; value: number }
  | { kind: "same"; of: number }
  | { kind: "more"; of: number; by: number }
  | { kind: "twice"; of: number };

export interface Envelope { id: number; name: number; clue: Clue }
export interface Bill { id: number; value: number }

export interface SebaePuzzle {
  stage: number;
  envelopes: Envelope[];
  bills: Bill[];
  targets: number[]; // what each envelope must hold (derived from the clues)
  answer: Record<number, number>; // bill id -> envelope id
}

export const NAMES = 8; // name slots; the component maps them to names per language

function denoms(stage: number): number[] {
  if (stage < 6) return [1000, 5000, 10000];
  if (stage < 14) return [1000, 5000, 10000, 50000];
  return [100, 500, 1000, 5000, 10000, 50000];
}

function shape(stage: number): { envelopes: number; bills: number; relative: number } {
  return {
    envelopes: Math.min(5, 2 + Math.floor(stage / 7)),
    bills: Math.min(13, 4 + Math.floor(stage / 3)),
    relative: stage < 10 ? 0 : stage < 20 ? 1 : 2,
  };
}

/** Resolve clue targets; relative clues point only at envelopes with an amount. */
export function resolveTargets(envelopes: Envelope[]): number[] {
  const out: number[] = envelopes.map(() => NaN);
  for (let pass = 0; pass < envelopes.length; pass++) {
    for (const e of envelopes) {
      const c = e.clue;
      if (c.kind === "amount") out[e.id] = c.value;
      else if (!Number.isNaN(out[c.of])) out[e.id] = c.kind === "same" ? out[c.of] : c.kind === "more" ? out[c.of] + c.by : out[c.of] * 2;
    }
  }
  return out;
}

/** Fisher–Yates with the seeded rng, so the same puzzle comes out in every JS engine. */
function shuffle<T>(a: T[], rng: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildPuzzle(stage: number): SebaePuzzle {
  const sh = shape(stage);
  const ds = denoms(stage);
  const rng = mulberry(6100 + stage * 71);
  for (let attempt = 0; attempt < 20000; attempt++) {
    // deal the bills into envelopes, then read the targets off that real split
    const bills: Bill[] = Array.from({ length: sh.bills }, (_, id) => ({ id, value: ds[Math.floor(rng() * ds.length)] }));
    const answer: Record<number, number> = {};
    const order = shuffle(bills.map((b) => b.id), rng);
    order.forEach((id, i) => (answer[id] = i < sh.envelopes ? i : Math.floor(rng() * sh.envelopes)));
    const sums = Array.from({ length: sh.envelopes }, () => 0);
    for (const b of bills) sums[answer[b.id]] += b.value;
    if (new Set(sums).size < Math.min(sums.length, 2)) continue;
    // a dull split gives every envelope a single bill
    if (sh.bills <= sh.envelopes) continue;
    // relative clues: the last envelopes describe themselves against an earlier one
    const envelopes: Envelope[] = sums.map((v, id) => ({ id, name: 0, clue: { kind: "amount", value: v } as Clue }));
    let rel = 0;
    for (let id = sh.envelopes - 1; id > 0 && rel < sh.relative; id--) {
      const candidates: Clue[] = [];
      for (let of = 0; of < id; of++) {
        if (envelopes[of].clue.kind !== "amount") continue;
        if (sums[id] === sums[of]) candidates.push({ kind: "same", of });
        else if (sums[id] === sums[of] * 2) candidates.push({ kind: "twice", of });
        else if (sums[id] > sums[of] && sums[id] - sums[of] <= 20000) candidates.push({ kind: "more", of, by: sums[id] - sums[of] });
      }
      if (!candidates.length) continue;
      envelopes[id].clue = candidates[Math.floor(rng() * candidates.length)];
      rel++;
    }
    if (rel < sh.relative) continue;
    // names: a different grandchild for each envelope
    const names = shuffle(Array.from({ length: NAMES }, (_, i) => i), rng);
    envelopes.forEach((e, i) => (e.name = names[i]));
    // shuffle the bill order in the wallet
    const shuffled = shuffle(bills.slice(), rng).map((b, i) => ({ id: i, value: b.value, old: b.id }));
    const ans: Record<number, number> = {};
    for (const b of shuffled) ans[b.id] = answer[b.old];
    return { stage, envelopes, bills: shuffled.map(({ id, value }) => ({ id, value })), targets: resolveTargets(envelopes), answer: ans };
  }
  throw new Error(`no sebaetdon puzzle for stage ${stage}`);
}

export const PUZZLES: SebaePuzzle[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildPuzzle(i));

export interface SebaeBoard {
  puzzle: SebaePuzzle;
  place: Record<number, number | null>; // bill id -> envelope id (null = still in the wallet)
  moves: number;
}

export function newBoard(p: SebaePuzzle): SebaeBoard {
  const place: Record<number, number | null> = {};
  for (const b of p.bills) place[b.id] = null;
  return { puzzle: p, place, moves: 0 };
}

export function sums(b: SebaeBoard): number[] {
  const out = b.puzzle.envelopes.map(() => 0);
  for (const bill of b.puzzle.bills) {
    const e = b.place[bill.id];
    if (e !== null && e !== undefined) out[e] += bill.value;
  }
  return out;
}

/** Put bill `id` in envelope `env` (null = back to the wallet). */
export function put(b: SebaeBoard, id: number, env: number | null): boolean {
  if (b.place[id] === env) return false;
  if (env !== null && (env < 0 || env >= b.puzzle.envelopes.length)) return false;
  b.place[id] = env;
  b.moves++;
  return true;
}

export function solved(b: SebaeBoard): boolean {
  if (b.puzzle.bills.some((bill) => b.place[bill.id] === null)) return false;
  const s = sums(b);
  return b.puzzle.targets.every((t, i) => s[i] === t);
}

export function par(p: SebaePuzzle): number {
  return p.bills.length;
}

export function starsFor(moves: number, p: SebaePuzzle): number {
  const n = par(p);
  if (moves <= n + 2) return 3;
  if (moves <= Math.ceil(n * 1.6) + 3) return 2;
  return 1;
}

/** Count the ways to split the bills (used by the tests to make sure a split exists). */
export function countSplits(p: SebaePuzzle, cap = 50): number {
  const t = p.targets.slice();
  const vals = p.bills.map((b) => b.value).sort((a, b) => b - a);
  let n = 0;
  const left = t.slice();
  const go = (i: number): void => {
    if (n >= cap) return;
    if (i === vals.length) {
      if (left.every((x) => x === 0)) n++;
      return;
    }
    const seen = new Set<number>();
    for (let e = 0; e < left.length; e++) {
      if (left[e] < vals[i] || seen.has(left[e])) continue;
      seen.add(left[e]);
      left[e] -= vals[i];
      go(i + 1);
      left[e] += vals[i];
    }
  };
  go(0);
  return n;
}
