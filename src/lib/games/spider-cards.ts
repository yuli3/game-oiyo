/**
 * 거미줄 카드 (Spider Cards) — spider solitaire with 30 numbered deals.
 * Deals 1-15 use one suit and 16-30 two suits, ordered roughly from easy to hard.
 * Every listed deal was picked because the search solver in spider-solver.ts wins it,
 * so each one can be cleared (re-checked in tests).
 */
import { mulberry32 } from "./daily";

export const SPIDER_SLUG = "spider-cards";

export type Suit = 0 | 1 | 2 | 3; // spades, hearts, diamonds, clubs
export interface Card {
  rank: number; // 1 (A) .. 13 (K)
  suit: Suit;
  up: boolean;
}

export interface SpiderState {
  cols: Card[][];
  stock: Card[]; // dealt 10 at a time from the end
  done: Suit[]; // suits of completed K→A runs, in order
  moves: number;
  suits: 1 | 2 | 4;
}

export type Move = { kind: "move"; from: number; index: number; to: number } | { kind: "deal" };

export function suitsForDeal(deal: number): 1 | 2 {
  return deal < 15 ? 1 : 2;
}

/** Seeds of the 30 deals (first 15 one-suit, last 15 two-suit), each won by `solveSpider`. */
export const DEAL_SEEDS: readonly number[] = [
  110, 116, 108, 117, 111, 107, 102, 113, 112, 115, 106, 104, 101, 105, 109,
  108, 144, 171, 139, 141, 180, 112, 168, 122, 169, 183, 143, 193, 145, 116,
];

export const DEAL_COUNT = 30;

export function deal(seed: number, suits: 1 | 2 | 4): SpiderState {
  const rng = mulberry32(seed);
  const cards: Card[] = [];
  const suitList: Suit[] = suits === 1 ? [0] : suits === 2 ? [0, 1] : [0, 1, 2, 3];
  const sets = 8 / suitList.length;
  for (const s of suitList) for (let k = 0; k < sets; k++) for (let r = 1; r <= 13; r++) cards.push({ rank: r, suit: s, up: false });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  const cols: Card[][] = Array.from({ length: 10 }, () => []);
  let n = 0;
  for (let c = 0; c < 10; c++) {
    const count = c < 4 ? 6 : 5;
    for (let k = 0; k < count; k++) cols[c].push({ ...cards[n++] });
    cols[c][cols[c].length - 1].up = true;
  }
  return { cols, stock: cards.slice(n).map((c) => ({ ...c })), done: [], moves: 0, suits };
}

export function dealFor(index: number): SpiderState {
  return deal(DEAL_SEEDS[index] ?? index + 1, suitsForDeal(index));
}

/** Index where the movable same-suit run at the bottom of a column starts. */
export function runStart(col: readonly Card[]): number {
  if (!col.length) return 0;
  let i = col.length - 1;
  while (i > 0 && col[i - 1].up && col[i - 1].suit === col[i].suit && col[i - 1].rank === col[i].rank + 1) i -= 1;
  return i;
}

export function canPick(col: readonly Card[], index: number): boolean {
  return index >= runStart(col) && index < col.length && col[index].up;
}

export function canDrop(s: SpiderState, from: number, index: number, to: number): boolean {
  if (from === to) return false;
  const src = s.cols[from];
  if (!canPick(src, index)) return false;
  const dst = s.cols[to];
  if (!dst.length) return true;
  return dst[dst.length - 1].rank === src[index].rank + 1;
}

export function canDeal(s: SpiderState): boolean {
  return s.stock.length >= 10 && s.cols.every((c) => c.length > 0);
}

function cloneState(s: SpiderState): SpiderState {
  return { ...s, cols: s.cols.map((c) => c.map((x) => ({ ...x }))), stock: s.stock.map((x) => ({ ...x })), done: s.done.slice() };
}

/** Removes completed K→A same-suit runs and turns up the new bottom cards. */
function settle(s: SpiderState, cols: number[]): void {
  for (const ci of cols) {
    const col = s.cols[ci];
    if (col.length >= 13) {
      const top = col.length - 13;
      const suit = col[col.length - 1].suit;
      let ok = col[top].rank === 13;
      for (let k = 0; k < 13 && ok; k++) {
        const c = col[top + k];
        if (!c.up || c.suit !== suit || c.rank !== 13 - k) ok = false;
      }
      if (ok) {
        col.splice(top, 13);
        s.done.push(suit);
      }
    }
    if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true;
  }
}

export function apply(s: SpiderState, m: Move): SpiderState {
  if (m.kind === "deal") {
    if (!canDeal(s)) return s;
    const n = cloneState(s);
    for (let c = 0; c < 10; c++) {
      const card = n.stock.pop()!;
      card.up = true;
      n.cols[c].push(card);
    }
    n.moves += 1;
    settle(n, [...Array(10).keys()]);
    return n;
  }
  if (!canDrop(s, m.from, m.index, m.to)) return s;
  const n = cloneState(s);
  const run = n.cols[m.from].splice(m.index);
  n.cols[m.to].push(...run);
  n.moves += 1;
  settle(n, [m.from, m.to]);
  return n;
}

export function isWon(s: SpiderState): boolean {
  return s.done.length === 8;
}

export function score(s: SpiderState): number {
  return Math.max(0, 500 - s.moves + s.done.length * 100);
}

/** All legal moves, skipping pointless ones (splitting a run that already sits in order, shuffling between empties). */
export function legalMoves(s: SpiderState): Move[] {
  const out: Move[] = [];
  for (let from = 0; from < 10; from++) {
    const col = s.cols[from];
    if (!col.length) continue;
    const start = runStart(col);
    for (let i = start; i < col.length; i++) {
      for (let to = 0; to < 10; to++) {
        if (!canDrop(s, from, i, to)) continue;
        const dst = s.cols[to];
        if (!dst.length && i === 0) continue; // whole column to an empty one
        out.push({ kind: "move", from, index: i, to });
      }
    }
  }
  if (canDeal(s)) out.push({ kind: "deal" });
  return out;
}

function key(s: SpiderState): string {
  return s.cols
    .map((c) => c.map((x) => (x.up ? "" : "_") + x.rank.toString(36) + x.suit).join(""))
    .sort()
    .join("|") + `#${s.stock.length}`;
}

function evaluate(s: SpiderState): number {
  let v = s.done.length * 1000;
  for (const col of s.cols) {
    if (!col.length) { v += 60; continue; }
    for (let i = 0; i < col.length; i++) {
      if (!col[i].up) v -= 25;
      else if (i > 0 && col[i - 1].up && col[i - 1].rank === col[i].rank + 1) v += col[i - 1].suit === col[i].suit ? 14 : 4;
    }
  }
  return v - s.stock.length * 2;
}

/**
 * Best-first search with a node budget. Returns the winning move list or null.
 * Used to pick winnable deals and by the hint button (small budget).
 */
export function solve(start: SpiderState, budget = 60000): Move[] | null {
  interface Node { s: SpiderState; path: Move[]; v: number }
  const seen = new Set<string>([key(start)]);
  let open: Node[] = [{ s: start, path: [], v: evaluate(start) }];
  let expanded = 0;
  while (open.length && expanded < budget) {
    // pop best
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].v > open[bi].v) bi = i;
    const node = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    expanded += 1;
    if (isWon(node.s)) return node.path;
    for (const m of legalMoves(node.s)) {
      const n = apply(node.s, m);
      const k = key(n);
      if (seen.has(k)) continue;
      seen.add(k);
      open.push({ s: n, path: [...node.path, m], v: evaluate(n) - node.path.length * 0.5 });
    }
    if (open.length > 40000) {
      open.sort((a, b) => b.v - a.v);
      open = open.slice(0, 20000);
    }
  }
  return null;
}

/** A quick, sensible next move for the hint button. */
export function hintMove(s: SpiderState): Move | null {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  let best: Move | null = null;
  let bestV = -Infinity;
  for (const m of moves) {
    const v = evaluate(apply(s, m)) - (m.kind === "deal" ? 200 : 0);
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}
