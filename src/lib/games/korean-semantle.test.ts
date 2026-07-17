import { describe, expect, it } from "vitest";

import {
  bandFor,
  dailyPuzzleId,
  normalizeGuess,
  orderGuesses,
  scoreGuess,
  type Guess,
  type SimilarityTable,
} from "./korean-semantle";

// Synthetic fixture — small, hand-made cosine values purely to exercise the
// engine's contract (not fastText-derived, not shipped as a puzzle).
const TABLE: SimilarityTable = {
  meta: {
    secret: "바다",
    vocab: 6,
    generatedAt: "2026-07-18T00:00:00Z",
    license: "test-fixture",
    source: "handcrafted-demo",
  },
  top: [
    ["바다", 1.0],
    ["바닷가", 0.72],
    ["바닷물", 0.61],
    ["강", 0.44],
    ["산", 0.28],
    ["연필", 0.05],
  ],
  percentile: { p99: 0.7, p95: 0.6, p90: 0.4, p75: 0.25, p50: 0.1 },
  rank: { "바다": 1, "바닷가": 2, "바닷물": 3, "강": 4, "산": 5, "연필": 6 },
};

describe("korean-semantle: normalizeGuess", () => {
  it("trims and strips internal whitespace", () => {
    expect(normalizeGuess("  바다 ")).toBe("바다");
    expect(normalizeGuess("바 다")).toBe("바다");
  });
});

describe("korean-semantle: bandFor", () => {
  it("maps similarity onto the puzzle's own percentile baselines", () => {
    const p = TABLE.percentile;
    expect(bandFor(1, p, true)).toBe("secret");
    expect(bandFor(0.72, p)).toBe("burning"); // >= p99
    expect(bandFor(0.61, p)).toBe("hot"); // >= p95
    expect(bandFor(0.44, p)).toBe("warm"); // >= p90
    expect(bandFor(0.28, p)).toBe("tepid"); // >= p75
    expect(bandFor(0.12, p)).toBe("cold"); // >= p50
    expect(bandFor(0.05, p)).toBe("freezing"); // below p50
  });
});

describe("korean-semantle: scoreGuess", () => {
  it("solves when the guess is the secret and ranks it first", () => {
    const r = scoreGuess(TABLE, "바다");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.solved).toBe(true);
    expect(r.guess.rank).toBe(1);
    expect(r.guess.band).toBe("secret");
    expect(r.guess.known).toBe(true);
  });

  it("scores a known near word with rank, similarity, and band", () => {
    const r = scoreGuess(TABLE, "바닷가");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.solved).toBe(false);
    expect(r.guess.rank).toBe(2);
    expect(r.guess.similarity).toBe(0.72);
    expect(r.guess.band).toBe("burning");
  });

  it("reports words outside the served ranking as unknown, never faking a score", () => {
    const r = scoreGuess(TABLE, "우주");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.guess.known).toBe(false);
    expect(r.guess.similarity).toBeNull();
    expect(r.guess.rank).toBeNull();
    expect(r.solved).toBe(false);
  });

  it("rejects empty, non-Hangul, and duplicate guesses", () => {
    expect(scoreGuess(TABLE, "   ")).toEqual({ ok: false, reason: "empty" });
    expect(scoreGuess(TABLE, "sea")).toEqual({ ok: false, reason: "not-hangul" });
    expect(scoreGuess(TABLE, "바다123")).toEqual({ ok: false, reason: "not-hangul" });
    expect(scoreGuess(TABLE, "ㅂㅏㄷㅏ")).toEqual({ ok: false, reason: "not-hangul" });
    expect(scoreGuess(TABLE, "바닷가", ["바닷가"])).toEqual({ ok: false, reason: "duplicate" });
    expect(scoreGuess(TABLE, " 바닷가 ", ["바닷가"])).toEqual({ ok: false, reason: "duplicate" });
  });
});

describe("korean-semantle: orderGuesses", () => {
  it("sorts closest-first with unknown words pushed to the bottom, stably", () => {
    const guesses: Guess[] = [
      { word: "산", similarity: 0.28, rank: 5, band: "tepid", known: true },
      { word: "우주", similarity: null, rank: null, band: "freezing", known: false },
      { word: "바닷가", similarity: 0.72, rank: 2, band: "burning", known: true },
      { word: "안개", similarity: null, rank: null, band: "freezing", known: false },
    ];
    expect(orderGuesses(guesses).map((g) => g.word)).toEqual(["바닷가", "산", "우주", "안개"]);
  });
});

describe("korean-semantle: dailyPuzzleId", () => {
  it("rotates deterministically through available puzzles by calendar day", () => {
    const ids = ["a", "b", "c"];
    // dayIndex(2024-01-01) === 0 → ids[0]; +1 day → ids[1]; wraps at length.
    expect(dailyPuzzleId(ids, new Date(2024, 0, 1, 12))).toBe("a");
    expect(dailyPuzzleId(ids, new Date(2024, 0, 2, 12))).toBe("b");
    expect(dailyPuzzleId(ids, new Date(2024, 0, 4, 12))).toBe("a"); // wrap
  });

  it("throws when no puzzles are available", () => {
    expect(() => dailyPuzzleId([])).toThrow();
  });
});
