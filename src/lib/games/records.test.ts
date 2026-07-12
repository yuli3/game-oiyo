import { beforeEach, describe, expect, it } from "vitest";

import { getBest, getRecord, getStreak, recordBest, recordResult, recordStreak } from "./records";

// records.ts is localStorage-backed; provide a minimal in-memory Storage
// polyfill so persistence across calls can actually be exercised in node.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = createMemoryStorage();
});

describe("records: w/l/d", () => {
  it("defaults to all-zero when nothing recorded", () => {
    expect(getRecord("chess")).toEqual({ w: 0, l: 0, d: 0 });
  });

  it("accumulates results per game across calls", () => {
    recordResult("chess", "w");
    recordResult("chess", "w");
    recordResult("chess", "l");
    expect(getRecord("chess")).toEqual({ w: 2, l: 1, d: 0 });
  });

  it("keeps per-game records independent", () => {
    recordResult("chess", "w");
    recordResult("gomoku", "d");
    expect(getRecord("chess")).toEqual({ w: 1, l: 0, d: 0 });
    expect(getRecord("gomoku")).toEqual({ w: 0, l: 0, d: 1 });
  });
});

describe("records: BestRecord (personal bests)", () => {
  it("returns null when no best is stored", () => {
    expect(getBest("game2048")).toBeNull();
  });

  it("score unit: only overwrites when the new value is higher", () => {
    recordBest("game2048", 1000, "score");
    recordBest("game2048", 500, "score"); // worse, should not overwrite
    expect(getBest("game2048")).toEqual({ value: 1000, unit: "score" });

    recordBest("game2048", 2000, "score"); // better, should overwrite
    expect(getBest("game2048")).toEqual({ value: 2000, unit: "score" });
  });

  it("seconds unit: only overwrites when the new value is lower", () => {
    recordBest("minesweeper", 120, "seconds");
    recordBest("minesweeper", 200, "seconds"); // worse (slower), should not overwrite
    expect(getBest("minesweeper")).toEqual({ value: 120, unit: "seconds" });

    recordBest("minesweeper", 45, "seconds"); // better (faster), should overwrite
    expect(getBest("minesweeper")).toEqual({ value: 45, unit: "seconds" });
  });

  it("carries the optional extra field through", () => {
    recordBest("puzzle15", 60, "seconds", "42 moves");
    expect(getBest("puzzle15")).toEqual({ value: 60, unit: "seconds", extra: "42 moves" });
  });

  it("switching unit for the same game always overwrites (stale comparison guard)", () => {
    recordBest("hybrid", 10, "seconds");
    recordBest("hybrid", 5, "score"); // different unit — not comparable, treated as better
    expect(getBest("hybrid")).toEqual({ value: 5, unit: "score" });
  });
});

describe("records: StreakStats (daily puzzles)", () => {
  it("defaults to all-zero when nothing recorded", () => {
    expect(getStreak("wordle")).toEqual({ played: 0, won: 0, currentStreak: 0, maxStreak: 0 });
  });

  it("wins increment played/won/currentStreak and track maxStreak", () => {
    recordStreak("wordle", true);
    recordStreak("wordle", true);
    expect(getStreak("wordle")).toEqual({ played: 2, won: 2, currentStreak: 2, maxStreak: 2 });
  });

  it("a loss resets currentStreak but preserves maxStreak", () => {
    recordStreak("wordle", true);
    recordStreak("wordle", true);
    recordStreak("wordle", false);
    expect(getStreak("wordle")).toEqual({ played: 3, won: 2, currentStreak: 0, maxStreak: 2 });
  });

  it("maxStreak only grows, never shrinks below a prior peak", () => {
    recordStreak("wordle", true);
    recordStreak("wordle", true);
    recordStreak("wordle", false);
    recordStreak("wordle", true); // currentStreak back to 1, below the prior peak of 2
    expect(getStreak("wordle")).toEqual({ played: 4, won: 3, currentStreak: 1, maxStreak: 2 });
  });
});
