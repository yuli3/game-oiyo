// 꼬맨틀 (Korean semantic-similarity guessing) — pure scoring engine.
//
// The engine never fetches. It scores a guess against an already-built table so
// the same logic runs in tests and in the UI.
//
// 2026-09-29: one JSON per secret does not scale. About 20k puzzles at ~108KB
// would be ~2GB. Play loads one L2-normalized matrix (vocab.txt + vectors.bin)
// and builds today's table in memory. A word that is not in that table is
// `known: false`. The engine does not invent a similarity it does not have.

/** Korea Standard Time is a fixed UTC+9. No daylight saving since 1988. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * Civil calendar date in Korea.
 * 2026-09-29: 꼬맨틀의 하루는 기기 자정이 아니라 한국 자정에 바뀐다.
 * 다른 일일 게임의 `dayIndex`는 기기 로컬 그대로 둔다.
 */
export function kstCivilDate(now: Date): { y: number; m: number; d: number } {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

/** Days since 2024-01-01 at Korea midnight. */
export function kstDayIndex(now: Date = new Date()): number {
  const { y, m, d } = kstCivilDate(now);
  const epochOrdinal = Date.UTC(2024, 0, 1);
  const todayOrdinal = Date.UTC(y, m, d);
  return Math.floor((todayOrdinal - epochOrdinal) / 86_400_000);
}

/** Whole minutes until the next Korea midnight. At least 1, matching the local countdown. */
export function minutesUntilNextKstMidnight(now: Date = new Date()): number {
  const { y, m, d } = kstCivilDate(now);
  const nextMidnightUtc = Date.UTC(y, m, d + 1) - KST_OFFSET_MS;
  return Math.max(1, Math.ceil((nextMidnightUtc - now.getTime()) / 60_000));
}

/** fastText crawl Korean vectors are 300-d. The shipped pool does not change that. */
export const SEMANTLE_VECTOR_DIM = 300;

/**
 * How many frequency-ranked Hangul words the play pool aims for.
 * 2026-09-29: 세운 — 검수 30개가 아니라 약 2만. 잘린 결과가 더 짧으면 그 수가 풀이다.
 */
export const SEMANTLE_POOL_TARGET = 20_000;

export const FASTTEXT_KO_LICENSE =
  "Derived from fastText Korean vectors (Facebook AI Research), CC BY-SA 3.0";

/**
 * Index of today's secret inside the shared pool.
 * Same Korea-midnight day → same index. Not a per-device shuffle.
 */
export function dailySecretIndex(poolSize: number, now: Date = new Date()): number {
  if (!Number.isInteger(poolSize) || poolSize <= 0) throw new Error("empty pool");
  const index = kstDayIndex(now);
  return ((index % poolSize) + poolSize) % poolSize;
}

/** Save key for the day. The secret word stays out of localStorage. */
export function poolPuzzleId(now: Date = new Date()): string {
  return `kst:${kstDayIndex(now)}`;
}

/** One word per line. Blank lines and a leading BOM are ignored. */
export function wordsFromVocabText(text: string): string[] {
  const words: string[] = [];
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const word = line.trim();
    if (word) words.push(word);
  }
  return words;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * Build the in-memory table `scoreGuess` already understands.
 * `matrix` is row-major, one L2-normalized vector per word, little-endian float32.
 * The secret's own similarity is forced to 1 so a float32 self-dot under 1
 * cannot lose rank 1 (2026-09-29).
 * Percentile indexes match `build_similarity_table.py`: descending sims, then
 * `floor(n * (100 - p) / 100)`.
 */
export function similarityTableFromVectors(
  words: readonly string[],
  matrix: Float32Array,
  dim: number,
  secretIndex: number,
  generatedAt = "fasttext-cc-ko-300",
): SimilarityTable {
  if (!Number.isInteger(dim) || dim <= 0) throw new Error("bad dim");
  if (words.length === 0) throw new Error("empty pool");
  if (!Number.isInteger(secretIndex) || secretIndex < 0 || secretIndex >= words.length) {
    throw new Error("secret out of range");
  }
  if (matrix.length !== words.length * dim) throw new Error("vector length mismatch");

  const secret = words[secretIndex];
  const sims = new Float64Array(words.length);
  const secretOff = secretIndex * dim;
  for (let i = 0; i < words.length; i++) {
    let dot = 0;
    const off = i * dim;
    for (let d = 0; d < dim; d++) dot += matrix[off + d] * matrix[secretOff + d];
    sims[i] = dot;
  }
  sims[secretIndex] = 1;

  const order = Array.from({ length: words.length }, (_, i) => i);
  order.sort((a, b) => {
    const diff = sims[b] - sims[a];
    if (diff !== 0) return diff;
    if (a === secretIndex) return -1;
    if (b === secretIndex) return 1;
    return a - b;
  });

  const top: [string, number][] = [];
  const rank: Record<string, number> = {};
  for (let r = 0; r < order.length; r++) {
    const i = order[r];
    const word = words[i];
    top.push([word, i === secretIndex ? 1 : round4(sims[i])]);
    if (rank[word] === undefined) rank[word] = r + 1;
  }

  const sortedDesc = Array.from(sims).sort((a, b) => b - a);
  const at = (p: number) => round4(sortedDesc[Math.floor(sortedDesc.length * (100 - p) / 100)] ?? 0);

  return {
    meta: {
      secret,
      vocab: words.length,
      generatedAt,
      license: FASTTEXT_KO_LICENSE,
      source: "fastText",
    },
    top,
    percentile: { p99: at(99), p95: at(95), p90: at(90), p75: at(75), p50: at(50) },
    rank,
  };
}

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
// 2026-09-29: the play table lists the whole pool (~20k). Rebuilding this map
// on every guess walked that list again.
const similarityCache = new WeakMap<SimilarityTable, Map<string, number>>();

function similarityLookup(table: SimilarityTable): Map<string, number> {
  const cached = similarityCache.get(table);
  if (cached) return cached;
  const map = new Map<string, number>();
  for (const [word, sim] of table.top) map.set(word, sim);
  similarityCache.set(table, map);
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

export type KoreanSemantleHint =
  | { kind: "length"; value: number; unlockAt: 5 }
  | { kind: "initial"; value: string; unlockAt: 12 }
  | { kind: "neighbor"; value: string; rank: number; unlockAt: 20 };

const CHOSEONG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
function firstChoseong(word: string): string {
  const code = word.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 ? CHOSEONG[Math.floor(code / 588)] : "";
}

/** Same unlock thresholds and clue values for everyone on the same puzzle. */
export function koreanSemantleHints(table: SimilarityTable, guessCount: number): KoreanSemantleHint[] {
  const count = Number.isFinite(guessCount) ? Math.max(0, Math.floor(guessCount)) : 0;
  const hints: KoreanSemantleHint[] = [];
  if (count >= 5) hints.push({ kind: "length", value: table.meta.secret.length, unlockAt: 5 });
  if (count >= 12) hints.push({ kind: "initial", value: firstChoseong(table.meta.secret), unlockAt: 12 });
  if (count >= 20 && table.top.length > 1) {
    const index = Math.min(table.top.length - 1, Math.max(1, Math.floor(table.top.length * 0.25)));
    const word = table.top[index][0];
    hints.push({ kind: "neighbor", value: word, rank: table.rank[word] ?? index + 1, unlockAt: 20 });
  }
  return hints;
}

/**
 * Which puzzle is today's. The day rolls at Korea midnight (UTC+9), so two
 * devices on the same KST date share a puzzle even when their local dates differ.
 */
export function dailyPuzzleId(puzzleIds: readonly string[], now: Date = new Date()): string {
  if (puzzleIds.length === 0) throw new Error("no puzzles available");
  const index = kstDayIndex(now);
  const idx = ((index % puzzleIds.length) + puzzleIds.length) % puzzleIds.length;
  return puzzleIds[idx];
}

export type KoreanSemantleSave = { v: 1; puzzleId: string; words: string[]; savedAt: number };

export function serializeKoreanSemantle(puzzleId: string, guesses: readonly Guess[], savedAt = Date.now()): string {
  return JSON.stringify({ v: 1, puzzleId, words: guesses.map((guess) => guess.word), savedAt });
}

export function parseKoreanSemantle(raw: string | null, puzzleId: string, table: SimilarityTable, now = Date.now()): Guess[] | null {
  try {
    const value = JSON.parse(raw ?? "") as KoreanSemantleSave;
    if (value?.v !== 1 || value.puzzleId !== puzzleId || !Array.isArray(value.words) || value.words.length > 500 || !Number.isFinite(value.savedAt) || value.savedAt > now + 60_000 || now - value.savedAt > 36 * 60 * 60 * 1000) return null;
    const guesses: Guess[] = [];
    for (const word of value.words) {
      if (typeof word !== "string") return null;
      const result = scoreGuess(table, word, guesses.map((guess) => guess.word));
      if (!result.ok || result.solved) return null;
      guesses.push(result.guess);
    }
    return guesses;
  } catch { return null; }
}
