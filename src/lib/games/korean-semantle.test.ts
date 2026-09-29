import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  bandFor,
  dailyPuzzleId,
  dailySecretIndex,
  kstDayIndex,
  minutesUntilNextKstMidnight,
  koreanSemantleHints,
  normalizeGuess,
  orderGuesses,
  poolPuzzleId,
  scoreGuess,
  SEMANTLE_POOL_TARGET,
  SEMANTLE_VECTOR_DIM,
  parseKoreanSemantle,
  serializeKoreanSemantle,
  similarityTableFromVectors,
  wordsFromVocabText,
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

describe("korean-semantle: active save", () => {
  it("replays an active puzzle and rejects terminal or mismatched payloads", () => {
    const guess = scoreGuess(TABLE, "바닷가");
    if (!guess.ok) throw new Error("fixture");
    const raw = serializeKoreanSemantle("daily-a", [guess.guess], 1000);
    expect(parseKoreanSemantle(raw, "daily-a", TABLE, 2000)?.[0].rank).toBe(2);
    expect(parseKoreanSemantle(raw, "daily-b", TABLE, 2000)).toBeNull();
    const solved = scoreGuess(TABLE, "바다");
    if (!solved.ok) throw new Error("fixture");
    expect(parseKoreanSemantle(serializeKoreanSemantle("daily-a", [solved.guess], 1000), "daily-a", TABLE, 2000)).toBeNull();
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

describe("korean-semantle: fair hints", () => {
  it("unlocks the same deterministic clues only at fixed guess counts", () => {
    expect(koreanSemantleHints(TABLE, 4)).toEqual([]);
    expect(koreanSemantleHints(TABLE, 5)).toEqual([{ kind: "length", value: 2, unlockAt: 5 }]);
    expect(koreanSemantleHints(TABLE, 12).at(-1)).toEqual({ kind: "initial", value: "ㅂ", unlockAt: 12 });
    expect(koreanSemantleHints(TABLE, 20).at(-1)).toEqual({ kind: "neighbor", value: "바닷가", rank: 2, unlockAt: 20 });
    expect(koreanSemantleHints(TABLE, 20)).toEqual(koreanSemantleHints(TABLE, 20));
  });

  it("does not unlock hints from invalid counts", () => {
    expect(koreanSemantleHints(TABLE, Number.NaN)).toEqual([]);
    expect(koreanSemantleHints(TABLE, -100)).toEqual([]);
  });
});

/** UTC instant whose clock in Korea (UTC+9) is the given civil time. */
function atKst(y: number, month: number, d: number, hh = 0, mm = 0): Date {
  return new Date(Date.UTC(y, month - 1, d, hh, mm) - 9 * 60 * 60 * 1000);
}

describe("korean-semantle: dailyPuzzleId", () => {
  it("rotates at Korea midnight, not the device's local midnight", () => {
    const ids = ["a", "b", "c"];
    expect(kstDayIndex(atKst(2024, 1, 1, 12))).toBe(0);
    expect(dailyPuzzleId(ids, atKst(2024, 1, 1, 12))).toBe("a");
    expect(dailyPuzzleId(ids, atKst(2024, 1, 1, 23, 59))).toBe("a");
    expect(dailyPuzzleId(ids, atKst(2024, 1, 2, 0, 1))).toBe("b");
    expect(dailyPuzzleId(ids, atKst(2024, 1, 4, 12))).toBe("a");
    // 2024-01-01 15:00 UTC is already 2024-01-02 in Korea.
    expect(dailyPuzzleId(ids, new Date("2024-01-01T14:59:00Z"))).toBe("a");
    expect(dailyPuzzleId(ids, new Date("2024-01-01T15:00:00Z"))).toBe("b");
  });

  it("counts the wait until the next Korea midnight", () => {
    expect(minutesUntilNextKstMidnight(atKst(2024, 1, 1, 23, 0))).toBe(60);
    expect(minutesUntilNextKstMidnight(atKst(2024, 1, 1, 23, 59))).toBe(1);
    expect(minutesUntilNextKstMidnight(atKst(2024, 1, 2, 0, 0))).toBe(24 * 60);
  });

  it("throws when no puzzles are available", () => {
    expect(() => dailyPuzzleId([])).toThrow();
  });
});

describe("korean-semantle: shared pool", () => {
  const words = ["바다", "호수", "연필"];
  // Rows are already L2-normalized. 호수 is nearer 바다 than 연필 is.
  const matrix = new Float32Array([
    1, 0,
    0.8, 0.6,
    0, 1,
  ]);

  it("picks the same secret for one Korea date and the next word on the next date", () => {
    expect(dailySecretIndex(words.length, atKst(2024, 1, 1, 12))).toBe(0);
    expect(dailySecretIndex(words.length, atKst(2024, 1, 1, 23, 59))).toBe(0);
    expect(dailySecretIndex(words.length, atKst(2024, 1, 2, 0, 1))).toBe(1);
    expect(poolPuzzleId(atKst(2024, 1, 1, 8))).toBe(poolPuzzleId(atKst(2024, 1, 1, 23)));
    expect(poolPuzzleId(atKst(2024, 1, 2, 0, 1))).not.toBe(poolPuzzleId(atKst(2024, 1, 1, 23)));
    expect(() => dailySecretIndex(0)).toThrow();
  });

  it("scores every pool word and refuses a word outside the pool", () => {
    const table = similarityTableFromVectors(words, matrix, 2, 0);
    expect(table.meta.secret).toBe("바다");
    expect(table.meta.source).toBe("fastText");
    expect(table.meta.vocab).toBe(3);
    expect(table.top.map(([word]) => word)).toEqual(["바다", "호수", "연필"]);
    expect(table.top[0][1]).toBe(1);
    expect(table.top[1][1]).toBe(0.8);
    expect(table.percentile.p50).toBe(0.8);
    expect(table.percentile.p99).toBe(1);

    const near = scoreGuess(table, "호수");
    expect(near.ok && near.guess.known && near.guess.rank).toBe(2);
    const outside = scoreGuess(table, "우주선");
    expect(outside.ok).toBe(true);
    if (outside.ok) expect(outside.guess.known).toBe(false);
    if (outside.ok) {
      expect(outside.guess.similarity).toBeNull();
      expect(outside.solved).toBe(false);
    }

    const otherDay = similarityTableFromVectors(words, matrix, 2, 1);
    expect(otherDay.meta.secret).toBe("호수");
    expect(otherDay.rank["호수"]).toBe(1);
  });

  it("reads vocab text without a blank trailing line becoming a word", () => {
    expect(wordsFromVocabText("\uFEFF바다\n호수\n\n")).toEqual(["바다", "호수"]);
  });

  it("rejects a matrix that does not match the word list", () => {
    expect(() => similarityTableFromVectors(words, new Float32Array(2), 2, 0)).toThrow();
  });
});

describe("korean-semantle: shipped pool files", () => {
  const poolDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../public/data/korean-semantle");

  it("locks the frequency slice size and scores the whole list", () => {
    const meta = JSON.parse(readFileSync(resolve(poolDir, "pool.json"), "utf8")) as {
      count: number;
      dim: number;
      target: number;
    };
    const words = wordsFromVocabText(readFileSync(resolve(poolDir, "vocab.txt"), "utf8"));
    const bytes = readFileSync(resolve(poolDir, "vectors.bin"));
    const matrix = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);

    expect(meta.target).toBe(SEMANTLE_POOL_TARGET);
    expect(meta.dim).toBe(SEMANTLE_VECTOR_DIM);
    expect(meta.count).toBe(words.length);
    expect(words.length).toBeGreaterThan(0);
    expect(words.length).toBeLessThanOrEqual(SEMANTLE_POOL_TARGET);
    expect(new Set(words).size).toBe(words.length);
    expect(words.every((word) => /^[가-힣]{1,4}$/.test(word))).toBe(true);
    expect(matrix.length).toBe(words.length * SEMANTLE_VECTOR_DIM);

    let finite = true;
    for (let i = 0; i < matrix.length; i++) {
      if (!Number.isFinite(matrix[i])) {
        finite = false;
        break;
      }
    }
    expect(finite).toBe(true);

    const normOf = (row: number) => {
      let sum = 0;
      const off = row * SEMANTLE_VECTOR_DIM;
      for (let d = 0; d < SEMANTLE_VECTOR_DIM; d++) sum += matrix[off + d] * matrix[off + d];
      return Math.sqrt(sum);
    };
    expect(Math.abs(normOf(0) - 1)).toBeLessThan(1e-3);
    expect(Math.abs(normOf(words.length - 1) - 1)).toBeLessThan(1e-3);

    const day = atKst(2026, 9, 29, 12);
    const secretIndex = dailySecretIndex(words.length, day);
    expect(dailySecretIndex(words.length, atKst(2026, 9, 29, 23, 59))).toBe(secretIndex);
    expect(dailySecretIndex(words.length, atKst(2026, 9, 30, 0, 1))).not.toBe(secretIndex);

    const table = similarityTableFromVectors(words, matrix, SEMANTLE_VECTOR_DIM, secretIndex);
    expect(table.meta.secret).toBe(words[secretIndex]);
    expect(table.top).toHaveLength(words.length);
    expect(table.top[0][0]).toBe(words[secretIndex]);
    expect(table.top[0][1]).toBe(1);
    expect(table.rank[words[secretIndex]]).toBe(1);
    const outside = scoreGuess(table, "가나다라마바");
    expect(outside.ok).toBe(true);
    if (outside.ok) expect(outside.guess.known).toBe(false);
    const inPool = scoreGuess(table, words[secretIndex === 0 ? 1 : 0]);
    expect(inPool.ok && inPool.guess.known).toBe(true);
    expect(table.top[1][1]).toBeGreaterThan(0.35);

    const seaAt = words.indexOf("바다");
    expect(seaAt).toBeGreaterThan(0);
    const sea = similarityTableFromVectors(words, matrix, SEMANTLE_VECTOR_DIM, seaAt);
    const seaNear = sea.top.slice(1, 9).map(([word]) => word);
    expect(seaNear).toContain("바닷가");
    expect(seaNear).toContain("동해");
    expect(sea.top[1][1]).toBeGreaterThan(0.45);
  });
});
