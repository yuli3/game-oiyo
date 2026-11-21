import { beforeEach, describe, expect, it, vi } from "vitest";
import { claimMatchPayout, MATCH_PAYOUT_WINDOW_MS } from "./arcade-pass";
import { payRunXp } from "./run-xp";

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

describe("run XP payout", () => {
  beforeEach(() => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage, dispatchEvent: () => true });
    vi.stubGlobal("CustomEvent", class { constructor(public type: string) {} });
  });

  it("pays +25 for a win and +10 for a play", () => {
    const t = new Date("2026-11-21T12:00:00Z");
    const win = payRunXp({ game: "whale-city", kind: "result", value: "w", won: true }, t);
    expect(win.matchXpGained).toBe(25);
    const play = payRunXp({ game: "maze", kind: "result", value: "l", won: false }, new Date(t.getTime() + 1000));
    expect(play.matchXpGained).toBe(10);
    expect(play.updatedProgress.xp).toBeGreaterThan(win.updatedProgress.xp);
  });

  it("does not pay the same game twice for one run", () => {
    const t = new Date("2026-11-21T12:00:00Z");
    expect(payRunXp({ game: "village", kind: "score", value: 90, won: true }, t).matchXpGained).toBe(25);
    expect(payRunXp({ game: "village", kind: "result", value: "w", won: true }, new Date(t.getTime() + 500)).totalXpGained).toBe(0);
    expect(payRunXp({ game: "village", kind: "result", value: "w", won: true }, new Date(t.getTime() + MATCH_PAYOUT_WINDOW_MS + 1)).matchXpGained).toBe(25);
  });

  it("claimMatchPayout keeps games separate", () => {
    expect(claimMatchPayout("a", 1000)).toBe(true);
    expect(claimMatchPayout("a", 2000)).toBe(false);
    expect(claimMatchPayout("b", 2100)).toBe(true);
  });
});
