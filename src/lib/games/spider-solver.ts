/**
 * Fast best-first solver for spider-cards, on a compact number encoding.
 * Used to pick winnable deals and re-check them in tests; the page never runs it.
 * Card code: (rank - 1) * 4 + suit; face-down cards add 100.
 */
import type { SpiderState } from "./spider-cards";

type Cols = number[][];
interface Node { cols: Cols; stock: number[]; done: number; path: string[]; v: number; depth: number }

const rank = (c: number) => ((c % 100) >> 2) + 1;
const suit = (c: number) => (c % 100) & 3;
const up = (c: number) => c < 100;

export function encode(s: SpiderState): { cols: Cols; stock: number[]; done: number } {
  return {
    cols: s.cols.map((col) => col.map((x) => (x.rank - 1) * 4 + x.suit + (x.up ? 0 : 100))),
    stock: s.stock.map((x) => (x.rank - 1) * 4 + x.suit),
    done: s.done.length,
  };
}

function runStart(col: number[]): number {
  let i = col.length - 1;
  while (i > 0 && up(col[i - 1]) && suit(col[i - 1]) === suit(col[i]) && rank(col[i - 1]) === rank(col[i]) + 1) i -= 1;
  return i;
}

function settle(cols: Cols, which: number[]): number {
  let done = 0;
  for (const ci of which) {
    const col = cols[ci];
    if (col.length >= 13) {
      const top = col.length - 13;
      const s = suit(col[col.length - 1]);
      let ok = true;
      for (let k = 0; k < 13 && ok; k++) {
        const c = col[top + k];
        if (!up(c) || suit(c) !== s || rank(c) !== 13 - k) ok = false;
      }
      if (ok) { col.splice(top, 13); done += 1; }
    }
    if (col.length && !up(col[col.length - 1])) col[col.length - 1] -= 100;
  }
  return done;
}

function evaluate(cols: Cols, stock: number[], done: number): number {
  let v = done * 1000 - stock.length * 1.5;
  for (const col of cols) {
    if (!col.length) { v += 45; continue; }
    for (let i = 0; i < col.length; i++) {
      const c = col[i];
      if (!up(c)) { v -= 22; continue; }
      if (i > 0 && up(col[i - 1]) && rank(col[i - 1]) === rank(c) + 1) v += suit(col[i - 1]) === suit(c) ? 12 : 3;
    }
  }
  return v;
}

function keyOf(cols: Cols, stockLen: number): string {
  return cols.map((c) => c.join(",")).sort().join("|") + "#" + stockLen;
}

class Heap {
  a: Node[] = [];
  push(n: Node) {
    const a = this.a;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].v >= a[i].v) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): Node | undefined {
    const a = this.a;
    if (!a.length) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].v > a[m].v) m = l;
        if (r < a.length && a[r].v > a[m].v) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

/**
 * Returns a winning line as move strings ("f:i>t" or "deal") or null within the node budget.
 */
export function solveSpider(s: SpiderState, budget = 200000): string[] | null {
  const e = encode(s);
  const seen = new Set<string>([keyOf(e.cols, e.stock.length)]);
  const heap = new Heap();
  heap.push({ cols: e.cols, stock: e.stock, done: e.done, path: [], v: evaluate(e.cols, e.stock, e.done), depth: 0 });
  let expanded = 0;
  while (heap.size && expanded < budget) {
    const n = heap.pop()!;
    expanded += 1;
    if (n.done === 8) return n.path;
    const children: Node[] = [];
    const add = (cols: Cols, stock: number[], done: number, mv: string) => {
      const k = keyOf(cols, stock.length);
      if (seen.has(k)) return;
      seen.add(k);
      children.push({ cols, stock, done, path: n.path.concat(mv), v: evaluate(cols, stock, done) - (n.depth + 1) * 0.4, depth: n.depth + 1 });
    };
    for (let from = 0; from < 10; from++) {
      const col = n.cols[from];
      if (!col.length) continue;
      const start = runStart(col);
      for (let i = start; i < col.length; i++) {
        const mover = col[i];
        const parent = i > 0 ? col[i - 1] : -1;
        const parentNatural = parent >= 0 && up(parent) && rank(parent) === rank(mover) + 1;
        let emptyTried = false;
        for (let to = 0; to < 10; to++) {
          if (to === from) continue;
          const dst = n.cols[to];
          let ok: boolean;
          if (!dst.length) {
            if (i === 0 || emptyTried) continue;
            ok = true;
            emptyTried = true;
          } else {
            const top = dst[dst.length - 1];
            ok = rank(top) === rank(mover) + 1;
            if (ok && parentNatural) ok = suit(top) === suit(mover) && suit(parent) !== suit(mover);
            if (ok && i > start) ok = suit(top) === suit(mover);
          }
          if (!ok) continue;
          const cols = n.cols.slice();
          cols[from] = col.slice(0, i);
          cols[to] = dst.concat(col.slice(i));
          const done = n.done + settle(cols, [from, to]);
          add(cols, n.stock, done, `${from}:${i}>${to}`);
        }
      }
    }
    if (n.stock.length >= 10 && n.cols.every((c) => c.length > 0)) {
      const cols = n.cols.map((c) => c.slice());
      const stock = n.stock.slice(0, n.stock.length - 10);
      const dealt = n.stock.slice(n.stock.length - 10).reverse();
      for (let c = 0; c < 10; c++) cols[c].push(dealt[c]);
      const done = n.done + settle(cols, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      add(cols, stock, done, "deal");
    }
    for (const ch of children) heap.push(ch);
  }
  return null;
}
