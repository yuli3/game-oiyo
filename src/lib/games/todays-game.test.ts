import { describe, expect, it } from "vitest";
import { dateKeyIndex, kstDateKey, kstPreviousDateKey, pickTodaysGame } from "./todays-game";

const SLUGS = ["chess", "sudoku", "wordle", "minesweeper", "snake-game", "game-2048", "solitaire"];

describe("todays-game: KST date key", () => {
  it("rolls over at KST midnight, not UTC or device midnight", () => {
    expect(kstDateKey(new Date("2026-10-18T14:59:59.000Z"))).toBe("2026-10-18");
    expect(kstDateKey(new Date("2026-10-18T15:00:00.000Z"))).toBe("2026-10-19");
  });

  it("gives the previous calendar day across month and year edges", () => {
    expect(kstPreviousDateKey("2026-10-01")).toBe("2026-09-30");
    expect(kstPreviousDateKey("2027-01-01")).toBe("2026-12-31");
  });

  it("indexes days from 2024-01-01 and rejects malformed keys", () => {
    expect(dateKeyIndex("2024-01-01")).toBe(0);
    expect(dateKeyIndex("2024-03-01")).toBe(60); // leap year
    expect(() => dateKeyIndex("2026-1-9")).toThrow();
  });
});

describe("todays-game: date → game pick", () => {
  it("is deterministic for a date", () => {
    expect(pickTodaysGame(SLUGS, "2026-10-19")).toBe(pickTodaysGame(SLUGS, "2026-10-19"));
  });

  it("always picks from the catalog", () => {
    for (let i = 0; i < 60; i++) {
      const d = new Date(Date.UTC(2026, 9, 19 + i));
      expect(SLUGS).toContain(pickTodaysGame(SLUGS, d.toISOString().slice(0, 10)));
    }
  });

  it("does not depend on catalog order", () => {
    const reversed = [...SLUGS].reverse();
    expect(pickTodaysGame(reversed, "2026-10-19")).toBe(pickTodaysGame(SLUGS, "2026-10-19"));
  });

  it("shows every game once per cycle before repeating", () => {
    const n = SLUGS.length;
    const start = n * Math.ceil(dateKeyIndex("2026-10-19") / n); // first day of a cycle
    const picks = Array.from({ length: n }, (_, i) => {
      const d = new Date(Date.UTC(2024, 0, 1 + start + i));
      return pickTodaysGame(SLUGS, d.toISOString().slice(0, 10));
    });
    expect(new Set(picks).size).toBe(n);
  });

  it("changes across consecutive days for a multi-game catalog", () => {
    const picks = new Set(
      Array.from({ length: 14 }, (_, i) => pickTodaysGame(SLUGS, new Date(Date.UTC(2026, 9, 19 + i)).toISOString().slice(0, 10))),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("handles a single-game catalog and rejects an empty one", () => {
    expect(pickTodaysGame(["chess"], "2026-10-19")).toBe("chess");
    expect(() => pickTodaysGame([], "2026-10-19")).toThrow();
  });
});
