import { describe, expect, it } from "vitest";
import {
  compareHands,
  compareShowdown,
  evaluate5,
  evaluateBest,
  makeDeck,
  shuffleDeck,
  type Card,
  type Suit,
} from "./poker";

// Shorthand: "Ah" → Ace of hearts. T=10, J=11, Q=12, K=13, A=14.
const RMAP: Record<string, number> = { T: 10, J: 11, Q: 12, K: 13, A: 14 };
const SMAP: Record<string, Suit> = { h: "hearts", d: "diamonds", c: "clubs", s: "spades" };
function h(spec: string): Card[] {
  return spec.split(" ").map((t) => {
    const rp = t.slice(0, -1);
    return { rank: RMAP[rp] ?? Number(rp), suit: SMAP[t.slice(-1)] };
  });
}
const cat = (spec: string) => evaluate5(h(spec)).category;

describe("poker: evaluate5 categories", () => {
  it("classifies every category", () => {
    expect(cat("Ah Kh Qh Jh Th")).toBe("straight-flush"); // royal is a straight flush
    expect(cat("9s 8s 7s 6s 5s")).toBe("straight-flush");
    expect(cat("7h 7d 7c 7s 2h")).toBe("four-of-a-kind");
    expect(cat("Kh Kd Kc 4s 4h")).toBe("full-house");
    expect(cat("Ah 9h 6h 3h 2h")).toBe("flush");
    expect(cat("8h 7d 6c 5s 4h")).toBe("straight");
    expect(cat("Ah 2d 3c 4s 5h")).toBe("straight"); // the wheel
    expect(cat("Qh Qd Qc 7s 2h")).toBe("three-of-a-kind");
    expect(cat("Jh Jd 4c 4s 9h")).toBe("two-pair");
    expect(cat("Th Td 8c 5s 2h")).toBe("one-pair");
    expect(cat("Ah Kd 9c 5s 2h")).toBe("high-card");
  });
});

describe("poker: compareHands", () => {
  it("ranks categories high over low", () => {
    expect(compareHands(evaluate5(h("7h 7d 7c 7s 2h")), evaluate5(h("Kh Kd Kc 4s 4h")))).toBeGreaterThan(0);
    expect(compareHands(evaluate5(h("8h 7d 6c 5s 4h")), evaluate5(h("Qh Qd Qc 7s 2h")))).toBeGreaterThan(0);
  });

  it("breaks ties within a category by rank then kicker", () => {
    // higher pair wins
    expect(compareHands(evaluate5(h("Ah Ad 5c 3s 2h")), evaluate5(h("Kh Kd 5c 3s 2h")))).toBeGreaterThan(0);
    // same pair, kicker decides
    expect(compareHands(evaluate5(h("9h 9d Kc 3s 2h")), evaluate5(h("9c 9s Qc 3d 2d")))).toBeGreaterThan(0);
    // identical hands split
    expect(compareHands(evaluate5(h("9h 9d Kc 3s 2h")), evaluate5(h("9c 9s Kd 3d 2d")))).toBe(0);
  });

  it("scores the wheel as five-high (loses to a six-high straight)", () => {
    expect(compareHands(evaluate5(h("6h 5d 4c 3s 2h")), evaluate5(h("Ah 2d 3c 4s 5h")))).toBeGreaterThan(0);
  });
});

describe("poker: evaluateBest (5–7 cards)", () => {
  it("picks the best 5 of 7", () => {
    // 2 hole + 5 community → a flush is available
    const best = evaluateBest(h("Ah Kh Qh 2d 3c Jh Th"));
    expect(best.category).toBe("straight-flush"); // royal flush in hearts
  });

  it("rejects out-of-range card counts", () => {
    expect(() => evaluateBest(h("Ah Kh Qh Jh"))).toThrow();
  });
});

describe("poker: compareShowdown", () => {
  it("returns 1/-1/0 for win/lose/split", () => {
    const board = h("2h 7d 9c Ts 4d"); // no king, so pairs stay pairs
    expect(compareShowdown([...h("Ah As"), ...board], [...h("Kh Kc"), ...board])).toBe(1); // pair of aces > pair of kings
    expect(compareShowdown([...h("2c 2d"), ...board], [...h("Ah As"), ...board])).toBe(1); // trip 2s beat a pair of aces
    // same pair off the same board → split pot
    expect(compareShowdown([...h("Ah Ad"), ...board], [...h("Ac As"), ...board])).toBe(0);
  });
});

describe("poker: deck", () => {
  it("makes 52 unique cards", () => {
    const deck = makeDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });

  it("shuffles deterministically per seed", () => {
    const a = shuffleDeck(makeDeck(), 42).map((c) => `${c.rank}${c.suit}`);
    const b = shuffleDeck(makeDeck(), 42).map((c) => `${c.rank}${c.suit}`);
    const d = shuffleDeck(makeDeck(), 7).map((c) => `${c.rank}${c.suit}`);
    expect(a).toEqual(b);
    expect(a).not.toEqual(d);
    expect(a).toHaveLength(52);
  });
});
