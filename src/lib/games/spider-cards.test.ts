import { describe, expect, it } from "vitest";
import { DEAL_COUNT, DEAL_SEEDS, apply, canDeal, canDrop, deal, dealFor, hintMove, isWon, legalMoves, runStart, suitsForDeal, type Move, type SpiderState } from "./spider-cards";
import { solveSpider } from "./spider-solver";

function card(rank: number, suit: 0 | 1 = 0, up = true) {
  return { rank, suit, up } as const;
}

function emptyState(): SpiderState {
  return { cols: Array.from({ length: 10 }, () => []), stock: [], done: [], moves: 0, suits: 1 };
}

function toMove(m: string): Move {
  if (m === "deal") return { kind: "deal" };
  const [from, rest] = m.split(":");
  const [index, to] = rest.split(">");
  return { kind: "move", from: Number(from), index: Number(index), to: Number(to) };
}

describe("spider-cards", () => {
  it("deals 54 cards to the table and keeps 50 in stock", () => {
    const s = deal(7, 2);
    expect(s.cols.map((c) => c.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    expect(s.stock).toHaveLength(50);
    expect(s.cols.every((c) => c[c.length - 1].up && c.slice(0, -1).every((x) => !x.up))).toBe(true);
    const all = [...s.cols.flat(), ...s.stock];
    expect(all.filter((x) => x.suit === 1)).toHaveLength(52);
  });

  it("has 30 deals: 15 one-suit then 15 two-suit", () => {
    expect(DEAL_SEEDS).toHaveLength(DEAL_COUNT);
    expect(suitsForDeal(0)).toBe(1);
    expect(suitsForDeal(14)).toBe(1);
    expect(suitsForDeal(15)).toBe(2);
    expect(dealFor(20).suits).toBe(2);
  });

  it("moves same-suit runs and blocks mixed ones", () => {
    const s = emptyState();
    s.cols[0] = [card(9, 1), card(8, 0), card(7, 0)];
    s.cols[1] = [card(9, 0)];
    s.cols[2] = [card(8, 1)];
    expect(runStart(s.cols[0])).toBe(1);
    expect(canDrop(s, 0, 1, 1)).toBe(true);
    expect(canDrop(s, 0, 0, 1)).toBe(false);
    expect(canDrop(s, 0, 2, 2)).toBe(true);
    const n = apply(s, { kind: "move", from: 0, index: 1, to: 1 });
    expect(n.cols[1].map((x) => x.rank)).toEqual([9, 8, 7]);
    expect(n.moves).toBe(1);
    expect(s.cols[0]).toHaveLength(3);
  });

  it("clears a finished King-to-Ace run and turns the card under it", () => {
    const s = emptyState();
    s.cols[0] = [card(5, 1, false), ...Array.from({ length: 12 }, (_, k) => card(13 - k))];
    s.cols[1] = [card(1)];
    const n = apply(s, { kind: "move", from: 1, index: 0, to: 0 });
    expect(n.done).toEqual([0]);
    expect(n.cols[0]).toEqual([card(5, 1, true)]);
  });

  it("cannot deal onto an empty column", () => {
    const s = deal(3, 1);
    expect(canDeal(s)).toBe(true);
    s.cols[4] = [];
    expect(canDeal(s)).toBe(false);
    expect(legalMoves(s).some((m) => m.kind === "deal")).toBe(false);
  });

  it("offers a legal hint on a fresh deal", () => {
    const s = dealFor(0);
    const m = hintMove(s);
    expect(m).not.toBeNull();
    expect(apply(s, m!)).not.toBe(s);
  });

  it("every listed deal is won by the solver, and the line replays in the game rules", () => {
    for (let i = 0; i < DEAL_COUNT; i++) {
      const start = dealFor(i);
      const line = solveSpider(start, 150000);
      expect(line, `deal ${i + 1}`).not.toBeNull();
      let s = start;
      for (const m of line!) {
        const n = apply(s, toMove(m));
        expect(n, `deal ${i + 1} move ${m}`).not.toBe(s);
        s = n;
      }
      expect(isWon(s), `deal ${i + 1}`).toBe(true);
    }
  }, 240000);
});
