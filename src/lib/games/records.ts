// Per-game vs-AI records in localStorage (new key, no collision with oiyo:* profile keys).
export type GameRecord = { w: number; l: number; d: number };

const KEY = "oiyo:game-records:v1";

type Validator<T> = (value: unknown) => value is T;

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;
const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const isIsoTimestamp = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

/**
 * localStorage is user-editable and can also contain values written by older
 * builds. Keep only entries that match the current store schema instead of
 * letting one corrupt value crash every cross-game aggregate view.
 */
function readValidatedStore<T>(key: string, validates: Validator<T>): Record<string, T> {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || "{}");
    if (!isObject(parsed)) return {};
    const valid: Record<string, T> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (id.length > 0 && validates(value)) valid[id] = value;
    }
    return valid;
  } catch {
    return {};
  }
}

const isGameRecord: Validator<GameRecord> = (value): value is GameRecord =>
  isObject(value) && isCount(value.w) && isCount(value.l) && isCount(value.d);

function readAll(): Record<string, GameRecord> {
  return readValidatedStore(KEY, isGameRecord);
}

export function getRecord(game: string): GameRecord {
  const r = readAll()[game];
  return r && typeof r.w === "number" ? r : { w: 0, l: 0, d: 0 };
}

/** Every game's win/loss/draw record, keyed by game id — read-only aggregate for cross-game views (e.g. achievements). */
export function getAllRecords(): Record<string, GameRecord> {
  return readAll();
}

export function recordResult(game: string, result: "w" | "l" | "d"): GameRecord {
  const all = readAll();
  const r = all[game] ?? { w: 0, l: 0, d: 0 };
  r[result] += 1;
  all[game] = r;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* quota/private mode — records are best-effort */
  }
  stampLastPlayed(game);
  return r;
}

// ─── Last-played timestamps — separate store, purely additive ───────────────────────────
// Kept apart from GameRecord so its shape (and every existing exact-equality test on it)
// never changes; this store exists only to answer "what did I play recently".
const LAST_PLAYED_KEY = "oiyo:game-last-played:v1";

function readAllLastPlayed(): Record<string, string> {
  return readValidatedStore(LAST_PLAYED_KEY, isIsoTimestamp);
}

function stampLastPlayed(game: string): void {
  try {
    const all = readAllLastPlayed();
    all[game] = new Date().toISOString();
    localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(all));
  } catch {
    /* quota/private mode — best-effort */
  }
}

/** Every game's last-played timestamp (ISO), keyed by game id — read-only aggregate for cross-game views. */
export function getAllLastPlayed(): Record<string, string> {
  return readAllLastPlayed();
}

// ─── Personal bests (score / time) — separate store, no overlap with GameRecord above ────
// Score-based games (higher wins, e.g. 2048/Snake) and time-based games (lower wins, e.g.
// Minesweeper/Sudoku/Puzzle15) share this shape; `unit` tells callers how to compare/format.
// `extra` carries freeform context shown next to the number (e.g. move count, difficulty).
export type BestRecord = { value: number; unit: "score" | "seconds"; extra?: string };
export type BestConditions = {
  seed: string;
  difficulty: string;
  assist: "none" | "hint" | "solver" | "undo";
};
export type ConditionalBestRecord = BestRecord & { conditions: BestConditions };
export type ConditionalBestEntry = {
  key: string;
  game: string;
  record: ConditionalBestRecord;
  achievedAt: string | null;
};

const BEST_KEY = "oiyo:game-bests:v1";
const isBestRecord: Validator<BestRecord> = (value): value is BestRecord =>
  isObject(value) &&
  isFiniteNonNegative(value.value) &&
  (value.unit === "score" || value.unit === "seconds") &&
  (value.extra === undefined || typeof value.extra === "string");

function readAllBests(): Record<string, BestRecord> {
  return readValidatedStore(BEST_KEY, isBestRecord);
}

export function getBest(game: string): BestRecord | null {
  return readAllBests()[game] ?? null;
}

/** Every game's personal-best record, keyed by game id — read-only aggregate for cross-game views. */
export function getAllBests(): Record<string, BestRecord> {
  return readAllBests();
}

const CONDITIONAL_BEST_KEY = "oiyo:game-condition-bests:v1";
const CONDITIONAL_BEST_TS_KEY = "oiyo:game-condition-bests-achieved-at:v1";
const isConditionValue = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 128 && !/[\u0000-\u001f]/.test(value);
const isBestConditions: Validator<BestConditions> = (value): value is BestConditions =>
  isObject(value) && isConditionValue(value.seed) && isConditionValue(value.difficulty) &&
  (value.assist === "none" || value.assist === "hint" || value.assist === "solver" || value.assist === "undo");
const isConditionalBest: Validator<ConditionalBestRecord> = (value): value is ConditionalBestRecord =>
  isObject(value) && isBestRecord(value) && isBestConditions((value as Record<string, unknown>).conditions);
const conditionKey = (game: string, conditions: BestConditions) =>
  JSON.stringify([game, conditions.seed, conditions.difficulty, conditions.assist]);
function parseConditionKey(key: string): { game: string; conditions: BestConditions } | null {
  try {
    const value: unknown = JSON.parse(key);
    if (!Array.isArray(value) || value.length !== 4) return null;
    const [game, seed, difficulty, assist] = value;
    const conditions = { seed, difficulty, assist };
    return isConditionValue(game) && isBestConditions(conditions) ? { game, conditions } : null;
  } catch {
    return null;
  }
}

function readConditionalBests(): Record<string, ConditionalBestRecord> {
  const raw = readValidatedStore(CONDITIONAL_BEST_KEY, isConditionalBest);
  const valid: Record<string, ConditionalBestRecord> = {};
  for (const [key, record] of Object.entries(raw)) {
    const parsed = parseConditionKey(key);
    if (parsed && conditionKey(parsed.game, record.conditions) === key) valid[key] = record;
  }
  return valid;
}

function readConditionalBestAchievedAt(): Record<string, string> {
  return readValidatedStore(CONDITIONAL_BEST_TS_KEY, isIsoTimestamp);
}

/** Every exact-board/difficulty/assist PB, with its validated cohort identity. */
export function getAllConditionalBests(): ConditionalBestEntry[] {
  const timestamps = readConditionalBestAchievedAt();
  return Object.entries(readConditionalBests()).flatMap(([key, record]) => {
    const parsed = parseConditionKey(key);
    return parsed ? [{ key, game: parsed.game, record, achievedAt: timestamps[key] ?? null }] : [];
  });
}

/** A time/score is comparable only inside the exact seed+difficulty+assist cohort. */
export function getBestForConditions(game: string, conditions: BestConditions): ConditionalBestRecord | null {
  if (!isConditionValue(game) || !isBestConditions(conditions)) return null;
  return readConditionalBests()[conditionKey(game, conditions)] ?? null;
}

export function recordBestForConditions(
  game: string,
  value: number,
  unit: "score" | "seconds",
  conditions: BestConditions,
  extra?: string,
): ConditionalBestRecord {
  if (!isConditionValue(game) || !isFiniteNonNegative(value) || !isBestConditions(conditions)) {
    throw new TypeError("Conditional best requires finite value and exact seed/difficulty/assist conditions");
  }
  const all = readConditionalBests();
  const key = conditionKey(game, conditions);
  const current = all[key];
  const isBetter = !current || current.unit !== unit || (unit === "score" ? value > current.value : value < current.value);
  const next = isBetter ? { value, unit, conditions: { ...conditions }, ...(extra === undefined ? {} : { extra }) } : current;
  all[key] = next;
  try { localStorage.setItem(CONDITIONAL_BEST_KEY, JSON.stringify(all)); } catch { /* best-effort */ }
  if (isBetter) {
    try {
      const timestamps = readConditionalBestAchievedAt();
      timestamps[key] = new Date().toISOString();
      localStorage.setItem(CONDITIONAL_BEST_TS_KEY, JSON.stringify(timestamps));
    } catch { /* best-effort */ }
  }
  stampLastPlayed(game);
  return next;
}

// Saves `value` as the new best if it beats the stored one (higher for "score", lower for "seconds").
export function recordBest(
  game: string,
  value: number,
  unit: "score" | "seconds",
  extra?: string,
  options: { trackPlay?: boolean } = {},
): BestRecord {
  const all = readAllBests();
  const cur = all[game];
  const isBetter = !cur || cur.unit !== unit || (unit === "score" ? value > cur.value : value < cur.value);
  const next: BestRecord = isBetter ? { value, unit, extra } : cur;
  all[game] = next;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(all));
  } catch {
    /* quota/private mode — records are best-effort */
  }
  if (isBetter) stampBestAchievedAt(game);
  if (options.trackPlay !== false) stampLastPlayed(game);
  return next;
}

// ─── Best-achieved timestamps — separate store, purely additive ────────────────────────
// Stamped only when recordBest() actually improves the stored value, so this answers
// "when was this personal best set" without changing BestRecord's shape or its tests.
const BEST_TS_KEY = "oiyo:game-bests-achieved-at:v1";

function readAllBestAchievedAt(): Record<string, string> {
  return readValidatedStore(BEST_TS_KEY, isIsoTimestamp);
}

function stampBestAchievedAt(game: string): void {
  try {
    const all = readAllBestAchievedAt();
    all[game] = new Date().toISOString();
    localStorage.setItem(BEST_TS_KEY, JSON.stringify(all));
  } catch {
    /* quota/private mode — best-effort */
  }
}

/** Every game's personal-best timestamp (ISO), keyed by game id — read-only aggregate for cross-game views. */
export function getAllBestAchievedAt(): Record<string, string> {
  return readAllBestAchievedAt();
}

// ─── Calendar-day streaks (daily puzzle modes) — separate store, date-aware ──────────────
// Unlike StreakStats below (which counts consecutive *wins*), this counts consecutive
// *calendar days* with a solve: skipping a day restarts the run, and solving the same
// day twice is a no-op. `dateKey` is a local "YYYY-MM-DD" (see lib/games/daily.ts).
export type DailyStreak = { played: number; currentStreak: number; maxStreak: number; lastWinDate: string | null };

const DAILY_KEY = "oiyo:game-daily-streaks:v1";
const isDailyStreak: Validator<DailyStreak> = (value): value is DailyStreak =>
  isObject(value) &&
  isCount(value.played) &&
  isCount(value.currentStreak) &&
  isCount(value.maxStreak) &&
  (value.lastWinDate === null || (typeof value.lastWinDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.lastWinDate)));

function readAllDailies(): Record<string, DailyStreak> {
  return readValidatedStore(DAILY_KEY, isDailyStreak);
}

export function getDailyStreak(game: string, dateKey?: string, previousDateKey?: string): DailyStreak {
  const stored = readAllDailies()[game] ?? { played: 0, currentStreak: 0, maxStreak: 0, lastWinDate: null };
  if (
    dateKey &&
    previousDateKey &&
    stored.lastWinDate !== dateKey &&
    stored.lastWinDate !== previousDateKey
  ) {
    return { ...stored, currentStreak: 0 };
  }
  return stored;
}

/** Every game's daily-puzzle streak, keyed by game id — read-only aggregate for cross-game views. */
export function getAllDailyStreaks(): Record<string, DailyStreak> {
  return readAllDailies();
}

export function recordDailyWin(game: string, dateKey: string, previousDateKey: string): DailyStreak {
  const all = readAllDailies();
  const cur = all[game] ?? { played: 0, currentStreak: 0, maxStreak: 0, lastWinDate: null };
  if (cur.lastWinDate === dateKey) return cur; // already counted today
  const nextStreak = cur.lastWinDate === previousDateKey ? cur.currentStreak + 1 : 1;
  const next: DailyStreak = {
    played: cur.played + 1,
    currentStreak: nextStreak,
    maxStreak: Math.max(cur.maxStreak, nextStreak),
    lastWinDate: dateKey,
  };
  all[game] = next;
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(all));
  } catch {
    /* quota/private mode — records are best-effort */
  }
  stampLastPlayed(game);
  return next;
}

// ─── Streak stats (Wordle-style daily puzzles) — separate store, no score/time involved ──
export type StreakStats = { played: number; won: number; currentStreak: number; maxStreak: number };

const STREAK_KEY = "oiyo:game-streaks:v1";
const isStreakStats: Validator<StreakStats> = (value): value is StreakStats =>
  isObject(value) &&
  isCount(value.played) &&
  isCount(value.won) &&
  isCount(value.currentStreak) &&
  isCount(value.maxStreak);

function readAllStreaks(): Record<string, StreakStats> {
  return readValidatedStore(STREAK_KEY, isStreakStats);
}

export function getStreak(game: string): StreakStats {
  return readAllStreaks()[game] ?? { played: 0, won: 0, currentStreak: 0, maxStreak: 0 };
}

/** Every game's win-streak stats, keyed by game id — read-only aggregate for cross-game views. */
export function getAllStreaks(): Record<string, StreakStats> {
  return readAllStreaks();
}

export function recordStreak(game: string, won: boolean): StreakStats {
  const all = readAllStreaks();
  const cur = all[game] ?? { played: 0, won: 0, currentStreak: 0, maxStreak: 0 };
  const nextStreak = won ? cur.currentStreak + 1 : 0;
  const next: StreakStats = {
    played: cur.played + 1,
    won: cur.won + (won ? 1 : 0),
    currentStreak: nextStreak,
    maxStreak: Math.max(cur.maxStreak, nextStreak),
  };
  all[game] = next;
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(all));
  } catch {
    /* quota/private mode — records are best-effort */
  }
  stampLastPlayed(game);
  return next;
}

const OPENED_KEY = "oiyo:game-opened:v1";
const isOpenedStamp: Validator<string> = (value): value is string => typeof value === "string" && value.length > 0;

function readOpened(): Record<string, string> {
  return readValidatedStore(OPENED_KEY, isOpenedStamp);
}

export function recordOpened(game: string): void {
  if (!game) return;
  const all = readOpened();
  if (all[game]) return;
  all[game] = "1";
  try {
    localStorage.setItem(OPENED_KEY, JSON.stringify(all));
  } catch {
    /* best-effort */
  }
}

export function getAllOpened(): Record<string, string> {
  return readOpened();
}
