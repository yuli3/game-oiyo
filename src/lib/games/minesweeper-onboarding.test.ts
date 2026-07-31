import { describe, expect, it } from "vitest";
import {
  MINESWEEPER_ONBOARDING_KEY,
  advanceMinesweeperOnboarding,
  freshMinesweeperOnboarding,
  loadMinesweeperOnboarding,
  nextMinesweeperOnboardingStep,
  parseMinesweeperOnboarding,
  serializeMinesweeperOnboarding,
  storeMinesweeperOnboarding,
  type MinesweeperOnboarding,
} from "./minesweeper-onboarding";

describe("minesweeper onboarding progression", () => {
  it("teaches reveal, then flag, then chord, then nothing", () => {
    let state = freshMinesweeperOnboarding();
    expect(nextMinesweeperOnboardingStep(state)).toBe("reveal");
    state = advanceMinesweeperOnboarding(state, "revealed");
    expect(nextMinesweeperOnboardingStep(state)).toBe("flag");
    state = advanceMinesweeperOnboarding(state, "flagged");
    expect(nextMinesweeperOnboardingStep(state)).toBe("chord");
    state = advanceMinesweeperOnboarding(state, "chorded");
    expect(nextMinesweeperOnboardingStep(state)).toBe(null);
  });

  it("always teaches the earliest missing action even when later ones happened first", () => {
    let state = freshMinesweeperOnboarding();
    state = advanceMinesweeperOnboarding(state, "chorded");
    state = advanceMinesweeperOnboarding(state, "flagged");
    expect(nextMinesweeperOnboardingStep(state)).toBe("reveal");
    state = advanceMinesweeperOnboarding(state, "revealed");
    expect(nextMinesweeperOnboardingStep(state)).toBe(null);
  });

  it("returns the same reference when a milestone is already reached", () => {
    const state = advanceMinesweeperOnboarding(freshMinesweeperOnboarding(), "revealed");
    expect(advanceMinesweeperOnboarding(state, "revealed")).toBe(state);
  });
});

describe("minesweeper onboarding persistence", () => {
  it("round-trips through serialize and parse", () => {
    const state: MinesweeperOnboarding = { version: 1, revealed: true, flagged: true, chorded: false };
    expect(parseMinesweeperOnboarding(serializeMinesweeperOnboarding(state))).toEqual(state);
  });

  it("fails closed to a fresh state on missing, corrupt, or foreign payloads", () => {
    expect(parseMinesweeperOnboarding(null)).toEqual(freshMinesweeperOnboarding());
    expect(parseMinesweeperOnboarding("not json {")).toEqual(freshMinesweeperOnboarding());
    expect(parseMinesweeperOnboarding(JSON.stringify({ version: 2, revealed: true, flagged: true, chorded: true }))).toEqual(freshMinesweeperOnboarding());
    expect(parseMinesweeperOnboarding(JSON.stringify({ version: 1, revealed: "yes", flagged: true, chorded: true }))).toEqual(freshMinesweeperOnboarding());
    expect(parseMinesweeperOnboarding(JSON.stringify([true, true, true]))).toEqual(freshMinesweeperOnboarding());
  });

  it("ignores unknown runtime fields instead of persisting them", () => {
    const parsed = parseMinesweeperOnboarding(JSON.stringify({ version: 1, revealed: true, flagged: false, chorded: false, injected: "x" }));
    expect(parsed).toEqual({ version: 1, revealed: true, flagged: false, chorded: false });
    expect(serializeMinesweeperOnboarding(parsed)).not.toContain("injected");
  });

  it("treats storage failures as best-effort", () => {
    const throwing = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(loadMinesweeperOnboarding(throwing)).toEqual(freshMinesweeperOnboarding());
    expect(() => storeMinesweeperOnboarding(freshMinesweeperOnboarding(), throwing)).not.toThrow();
    expect(loadMinesweeperOnboarding(undefined)).toEqual(freshMinesweeperOnboarding());
  });

  it("stores under the versioned key without touching other keys", () => {
    const written = new Map<string, string>();
    const storage = {
      getItem: (key: string) => written.get(key) ?? null,
      setItem: (key: string, value: string) => { written.set(key, value); },
      removeItem: (key: string) => { written.delete(key); },
    };
    const state = advanceMinesweeperOnboarding(freshMinesweeperOnboarding(), "revealed");
    storeMinesweeperOnboarding(state, storage);
    expect([...written.keys()]).toEqual([MINESWEEPER_ONBOARDING_KEY]);
    expect(loadMinesweeperOnboarding(storage)).toEqual(state);
  });
});
