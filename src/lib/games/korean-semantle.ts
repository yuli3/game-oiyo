// 꼬맨틀 (Korean semantic-similarity guessing) — pure scoring engine.
//
// A puzzle is one static file produced by scripts/korean-wordgames/
// build_similarity_table.py: a single secret word plus its cosine-similarity
// ranking against the vocabulary. The engine never fetches; it scores a guess
// against an already-loaded table so the same logic runs in tests and in the UI.
//
// Honest limit of the static-file design: the served table lists only the top-N
// nearest words (≈108KB/puzzle). A guess outside that ranking cannot be scored
// from this file, so it is reported as `known: false` rather than given a faked
// similarity — we never invent a number we don't have.

import { dayIndex } from "./daily";

export const KOREAN_SEMANTLE_SCHEMA = "oiyo.korean-semantle" as const;
export const KOREAN_SEMANTLE_SCHEMA_VERSION = 1 as const;

/** One puzzle's similarity table (contract mirrors build_similarity_table.py). */
export interface SimilarityTable {
  meta: {
    secret: string;
    vocab: number;
    generatedAt: string;
    license: string;
    /** Provenance: "fastText" for real puzzles, "handcrafted-demo" for the sample. */
    source?: string;
  };
  /** Ranked descending by similarity; top[0] is the secret itself. */
  top: [string, number][];
  percentile: { p99: number; p95: number; p90: number; p75: number; p50: number };
  /** word → 1-based rank, covering the served `top` listing. */
  rank: Record<string, number>;
}

/** Proximity tiers, coldest→hottest, derived from the puzzle's own percentiles. */
export type ProximityBand =
  | "secret"
  | "burning"
  | "hot"
  | "warm"
  | "tepid"
  | "cold"
  | "freezing";

export interface Guess {
  word: string;
  /** Cosine similarity, or null when the word is outside the served ranking. */
  similarity: number | null;
  /** 1-based rank among the vocabulary, or null when outside the served ranking. */
  rank: number | null;
  band: ProximityBand;
  /** True when the word was found in the served ranking. */
  known: boolean;
}

export type GuessResult =
  | { ok: true; guess: Guess; solved: boolean }
  | { ok: false; reason: "empty" | "not-hangul" | "duplicate" };

/** One or more complete Hangul syllables, nothing else. */
const HANGUL_WORD = /^[가-힣]+$/;

/** Trim and collapse internal whitespace; a guess is a single token. */
export function normalizeGuess(raw: string): string {
  return raw.trim().replace(/\s+/g, "");
}

/**
 * Band for a similarity value, using the puzzle's own percentile baselines so
 * "매우 가까움" means the same relative closeness regardless of the secret word.
 */
export function bandFor(
  similarity: number,
  percentile: SimilarityTable["percentile"],
  isSecret = false,
): ProximityBand {
  if (isSecret) return "secret";
  if (similarity >= percentile.p99) return "burning";
  if (similarity >= percentile.p95) return "hot";
  if (similarity >= percentile.p90) return "warm";
  if (similarity >= percentile.p75) return "tepid";
  if (similarity >= percentile.p50) return "cold";
  return "freezing";
}

/** word → similarity lookup for a table's served ranking. */
function similarityLookup(table: SimilarityTable): Map<string, number> {
  const map = new Map<string, number>();
  for (const [word, sim] of table.top) map.set(word, sim);
  return map;
}

/**
 * Score a guess against a puzzle. `previous` is the list of already-guessed
 * words (raw or normalized) used only for duplicate detection.
 */
export function scoreGuess(
  table: SimilarityTable,
  raw: string,
  previous: readonly string[] = [],
): GuessResult {
  const word = normalizeGuess(raw);
  if (!word) return { ok: false, reason: "empty" };
  if (!HANGUL_WORD.test(word)) return { ok: false, reason: "not-hangul" };
  if (previous.some((p) => normalizeGuess(p) === word)) {
    return { ok: false, reason: "duplicate" };
  }

  const isSecret = word === table.meta.secret;
  const sims = similarityLookup(table);

  if (!sims.has(word)) {
    // Outside the served ranking: we genuinely cannot score it from this file.
    return {
      ok: true,
      solved: false,
      guess: { word, similarity: null, rank: null, band: "freezing", known: false },
    };
  }

  const similarity = sims.get(word)!;
  const rank = table.rank[word] ?? null;
  return {
    ok: true,
    solved: isSecret,
    guess: {
      word,
      similarity,
      rank,
      band: bandFor(similarity, table.percentile, isSecret),
      known: true,
    },
  };
}

/**
 * Order guesses for display: closest (lowest rank) first, unknown words last,
 * ties broken by similarity then insertion order for a stable list.
 */
export function orderGuesses(guesses: readonly Guess[]): Guess[] {
  return guesses
    .map((g, i) => ({ g, i }))
    .sort((a, b) => {
      const ar = a.g.rank ?? Number.POSITIVE_INFINITY;
      const br = b.g.rank ?? Number.POSITIVE_INFINITY;
      if (ar !== br) return ar - br;
      const as = a.g.similarity ?? Number.NEGATIVE_INFINITY;
      const bs = b.g.similarity ?? Number.NEGATIVE_INFINITY;
      if (as !== bs) return bs - as;
      return a.i - b.i;
    })
    .map(({ g }) => g);
}

/**
 * Which curated puzzle is "today's", rotating deterministically through the
 * available puzzle ids so everyone on the same calendar day gets the same one.
 */
export function dailyPuzzleId(puzzleIds: readonly string[], now: Date = new Date()): string {
  if (puzzleIds.length === 0) throw new Error("no puzzles available");
  const idx = ((dayIndex(now) % puzzleIds.length) + puzzleIds.length) % puzzleIds.length;
  return puzzleIds[idx];
}
