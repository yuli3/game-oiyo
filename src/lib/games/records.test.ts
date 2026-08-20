import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAchievementEvents, getAllAchievementEvents, getAllBestAchievedAt, getAllBests, getAllConditionalBests, getAllDailyStreaks, getAllLastPlayed, getAllRecords, getAllStreaks, getBest, getBestForConditions, getDailyStreak, getRecord, getStreak, recordAchievementEvent, recordBest, recordBestForConditions, recordDailyWin, recordResult, recordStreak } from "./records";

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

describe("records: achievement events v1", () => {
  it("keeps opened separate from actual play", () => {
    recordAchievementEvent("snake", "opened");
    expect(getAchievementEvents("snake")).toEqual({ opened: 1, played: 0, cleared: 0, "personal-best": 0 });
    expect(getAllLastPlayed()).toEqual({});

    recordAchievementEvent("snake", "played");
    expect(getAchievementEvents("snake").played).toBe(1);
    expect(getAllLastPlayed().snake).toBeTruthy();
  });

  it("adds cleared when a legacy result is recorded without reshaping the old record", () => {
    expect(recordResult("chess", "w")).toEqual({ w: 1, l: 0, d: 0 });
    expect(getAchievementEvents("chess")).toEqual({ opened: 0, played: 0, cleared: 1, "personal-best": 0 });
  });

  it("drops corrupt event entries without losing valid games", () => {
    localStorage.setItem("oiyo:game-achievement-events:v1", JSON.stringify({
      chess: { opened: 1, played: 2, cleared: 1, "personal-best": 1 },
      bad: { opened: -1, played: "many", cleared: 0, "personal-best": 0 },
    }));
    expect(getAllAchievementEvents()).toEqual({
      chess: { opened: 1, played: 2, cleared: 1, "personal-best": 1 },
    });
  });
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

describe("records: condition-matched personal bests", () => {
  const base = { seed: "daily-2026-07-18", difficulty: "intermediate", assist: "none" as const };

  it("compares only inside the exact seed, difficulty, and assist cohort", () => {
    recordBestForConditions("minesweeper", 80, "seconds", base);
    recordBestForConditions("minesweeper", 60, "seconds", { ...base, seed: "daily-2026-07-19" });
    recordBestForConditions("minesweeper", 50, "seconds", { ...base, difficulty: "expert" });
    recordBestForConditions("minesweeper", 40, "seconds", { ...base, assist: "hint" });
    expect(getBestForConditions("minesweeper", base)?.value).toBe(80);
    expect(getBestForConditions("minesweeper", { ...base, seed: "daily-2026-07-19" })?.value).toBe(60);
  });

  it("keeps the faster time only within the same cohort", () => {
    recordBestForConditions("sudoku", 100, "seconds", base);
    recordBestForConditions("sudoku", 130, "seconds", base);
    expect(recordBestForConditions("sudoku", 70, "seconds", base).value).toBe(70);
  });

  it("keeps undo-assisted Solitaire times outside the unassisted cohort", () => {
    const solitaire = { seed: "daily-2026-08-01", difficulty: "draw-1", assist: "none" as const };
    recordBestForConditions("solitaire", 180, "seconds", solitaire);
    recordBestForConditions("solitaire", 120, "seconds", { ...solitaire, assist: "undo" });
    expect(getBestForConditions("solitaire", solitaire)?.value).toBe(180);
    expect(getBestForConditions("solitaire", { ...solitaire, assist: "undo" })?.value).toBe(120);
  });

  it("rejects incomplete or control-character conditions", () => {
    expect(() => recordBestForConditions("sudoku", 10, "seconds", { ...base, seed: "" })).toThrow(/exact seed/);
    expect(getBestForConditions("sudoku", { ...base, difficulty: "bad\nvalue" })).toBeNull();
  });

  it("exposes validated cohort records to the cross-game records view", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T13:00:00.000Z"));
    recordBestForConditions("minesweeper-intermediate", 80, "seconds", base);
    expect(getAllConditionalBests()).toEqual([{
      key: JSON.stringify(["minesweeper-intermediate", base.seed, base.difficulty, base.assist]),
      game: "minesweeper-intermediate",
      record: { value: 80, unit: "seconds", conditions: base },
      achievedAt: "2026-07-18T13:00:00.000Z",
    }]);
    vi.useRealTimers();
  });

  it("rejects a record whose editable storage key disagrees with its embedded conditions", () => {
    const key = JSON.stringify(["sudoku", base.seed, base.difficulty, base.assist]);
    localStorage.setItem("oiyo:game-condition-bests:v1", JSON.stringify({
      [key]: { value: 20, unit: "seconds", conditions: { ...base, difficulty: "expert" } },
    }));
    expect(getAllConditionalBests()).toEqual([]);
    expect(getBestForConditions("sudoku", base)).toBeNull();
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

describe("records: DailyStreak (calendar-day solves)", () => {
  it("defaults to an empty calendar streak", () => {
    expect(getDailyStreak("kurodoko")).toEqual({
      played: 0,
      currentStreak: 0,
      maxStreak: 0,
      lastWinDate: null,
    });
  });

  it("counts consecutive calendar days and ignores duplicate solves", () => {
    expect(recordDailyWin("kurodoko", "2026-07-15", "2026-07-14")).toEqual({
      played: 1,
      currentStreak: 1,
      maxStreak: 1,
      lastWinDate: "2026-07-15",
    });
    expect(recordDailyWin("kurodoko", "2026-07-15", "2026-07-14")).toEqual({
      played: 1,
      currentStreak: 1,
      maxStreak: 1,
      lastWinDate: "2026-07-15",
    });
    expect(recordDailyWin("kurodoko", "2026-07-16", "2026-07-15")).toEqual({
      played: 2,
      currentStreak: 2,
      maxStreak: 2,
      lastWinDate: "2026-07-16",
    });
  });

  it("restarts after a skipped day while preserving the best streak", () => {
    recordDailyWin("tents-and-trees", "2026-07-14", "2026-07-13");
    recordDailyWin("tents-and-trees", "2026-07-15", "2026-07-14");
    expect(recordDailyWin("tents-and-trees", "2026-07-17", "2026-07-16")).toEqual({
      played: 3,
      currentStreak: 1,
      maxStreak: 2,
      lastWinDate: "2026-07-17",
    });
  });

  it("shows a zero current streak on a later visit after a missed day", () => {
    recordDailyWin("kurodoko", "2026-07-14", "2026-07-13");
    recordDailyWin("kurodoko", "2026-07-15", "2026-07-14");
    expect(getDailyStreak("kurodoko", "2026-07-17", "2026-07-16")).toEqual({
      played: 2,
      currentStreak: 0,
      maxStreak: 2,
      lastWinDate: "2026-07-15",
    });
  });

  it("keeps each daily game independent", () => {
    recordDailyWin("kurodoko", "2026-07-16", "2026-07-15");
    expect(getDailyStreak("tents-and-trees").played).toBe(0);
  });
});

describe("records: last-played and best-achieved timestamps (additive, no shape change)", () => {
  afterEach(() => vi.useRealTimers());

  it("stamps last-played on every recordResult call without touching the GameRecord shape", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T10:00:00.000Z"));
    recordResult("chess", "w");
    expect(getRecord("chess")).toEqual({ w: 1, l: 0, d: 0 }); // unchanged shape
    expect(getAllLastPlayed().chess).toBe("2026-07-18T10:00:00.000Z");
  });

  it("updates last-played on every subsequent call", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T10:00:00.000Z"));
    recordResult("chess", "w");
    vi.setSystemTime(new Date("2026-07-18T11:30:00.000Z"));
    recordResult("chess", "l");
    expect(getAllLastPlayed().chess).toBe("2026-07-18T11:30:00.000Z");
  });

  it("stamps best-achieved only when recordBest actually improves the value", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T09:00:00.000Z"));
    recordBest("game2048", 1000, "score");
    expect(getAllBestAchievedAt().game2048).toBe("2026-07-18T09:00:00.000Z");

    vi.setSystemTime(new Date("2026-07-18T09:30:00.000Z"));
    recordBest("game2048", 500, "score"); // worse — not a new best
    expect(getAllBestAchievedAt().game2048).toBe("2026-07-18T09:00:00.000Z"); // unchanged

    vi.setSystemTime(new Date("2026-07-18T10:00:00.000Z"));
    recordBest("game2048", 2000, "score"); // genuinely better
    expect(getAllBestAchievedAt().game2048).toBe("2026-07-18T10:00:00.000Z");
  });

  it("keeps timestamps independent per game", () => {
    recordResult("chess", "w");
    recordResult("gomoku", "l");
    const all = getAllLastPlayed();
    expect(Object.keys(all).sort()).toEqual(["chess", "gomoku"]);
  });

  it("tracks PB, calendar-daily and streak game completions as recently played", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T12:00:00.000Z"));
    recordBest("minesweeper", 30, "seconds");
    recordDailyWin("kurodoko", "2026-07-18", "2026-07-17");
    recordStreak("wordle", false);
    expect(getAllLastPlayed()).toEqual({
      minesweeper: "2026-07-18T12:00:00.000Z",
      kurodoko: "2026-07-18T12:00:00.000Z",
      wordle: "2026-07-18T12:00:00.000Z",
    });
  });

  it("does not mark imported legacy bests as a new play", () => {
    recordBest("game-2048", 2048, "score", undefined, { trackPlay: false });
    expect(getAllLastPlayed()).toEqual({});
  });
});

describe("records: storage schema guards", () => {
  it("treats null and array roots as empty stores", () => {
    localStorage.setItem("oiyo:game-records:v1", "null");
    localStorage.setItem("oiyo:game-bests:v1", "[]");
    expect(getAllRecords()).toEqual({});
    expect(getAllBests()).toEqual({});
  });

  it("keeps valid entries and drops malformed entries in every aggregate store", () => {
    localStorage.setItem("oiyo:game-records:v1", JSON.stringify({ chess: { w: 2, l: 1, d: 0 }, bad: { w: "2", l: 0, d: 0 } }));
    localStorage.setItem("oiyo:game-bests:v1", JSON.stringify({ sudoku: { value: 40, unit: "seconds" }, bad: { value: -1, unit: "seconds" } }));
    localStorage.setItem("oiyo:game-daily-streaks:v1", JSON.stringify({ kurodoko: { played: 2, currentStreak: 2, maxStreak: 2, lastWinDate: "2026-07-18" }, bad: { played: null } }));
    localStorage.setItem("oiyo:game-streaks:v1", JSON.stringify({ wordle: { played: 3, won: 2, currentStreak: 0, maxStreak: 2 }, bad: { played: -1, won: 0, currentStreak: 0, maxStreak: 0 } }));
    localStorage.setItem("oiyo:game-last-played:v1", JSON.stringify({ chess: "2026-07-18T00:00:00.000Z", bad: "not-a-date" }));

    expect(Object.keys(getAllRecords())).toEqual(["chess"]);
    expect(Object.keys(getAllBests())).toEqual(["sudoku"]);
    expect(Object.keys(getAllDailyStreaks())).toEqual(["kurodoko"]);
    expect(Object.keys(getAllStreaks())).toEqual(["wordle"]);
    expect(getAllLastPlayed()).toEqual({ chess: "2026-07-18T00:00:00.000Z" });
  });
});
