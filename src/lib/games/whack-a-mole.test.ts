import { describe, expect, it } from "vitest";
import { advanceWhack, createWhackGame, hitWhack, replayWhack, whackAnalysis } from "./whack-a-mole";

describe("whack-a-mole engine", () => {
  it("replays a finished round from the same seed", () => {
    const finished = advanceWhack(createWhackGame(19), 30_000);
    expect(createWhackGame(19).seed).toBe(finished.seed);
    expect(replayWhack(finished.seed, [])).toEqual(createWhackGame(19));
  });

  it("replays the same seeded critter stream", () => {
    const first = advanceWhack(createWhackGame(77), 2_000);
    const second = advanceWhack(createWhackGame(77), 2_000);
    expect(first).toEqual(second);
    expect(replayWhack(77, first.history)).toEqual(first);
  });
  it("keeps mole +1 and bomb -2 scoring immutable", () => {
    let state = advanceWhack(createWhackGame(11), 0);
    const mole = state.cells.indexOf("mole");
    if (mole >= 0) expect(hitWhack(state, mole).score).toBe(1);
    state = { ...state, score: 1, cells: ["bomb", ...state.cells.slice(1)] };
    expect(hitWhack(state, 0).score).toBe(0);
  });
  it("rejects empty, out-of-range and terminal hits", () => {
    const state = createWhackGame(1);
    expect(hitWhack(state, 0)).toBe(state);
    expect(hitWhack(state, 9)).toBe(state);
    const over = advanceWhack(state, 30_000);
    expect(hitWhack(over, 0)).toBe(over);
  });
  it("ends exactly at 30 seconds and freezes", () => {
    const state = advanceWhack(createWhackGame(2), 30_000);
    expect(state.status).toBe("over");
    expect(state.cells.every(cell => cell === null)).toBe(true);
    expect(advanceWhack(state, 40_000)).toBe(state);
  });
  it("reports accuracy, hazards, escapes and combo", () => {
    const state = { ...createWhackGame(3), moleHits: 4, bombHits: 1, escaped: 3, maxCombo: 3 };
    expect(whackAnalysis(state)).toEqual({ accuracy: 50, hits: 4, bombs: 1, escaped: 3, maxCombo: 3 });
  });
});
