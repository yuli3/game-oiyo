import { describe, expect, it } from "vitest";
import { createNumberGuessingGame, guessNumber } from "./number-guessing";
import { parseNumberGuessingSave } from "./number-guessing-save";

const NOW = 2_000_000;
describe("number guessing save", () => {
  it("round-trips a replayable active game", () => {
    const state = guessNumber(guessNumber(createNumberGuessingGame(72, "normal"), 50), 80);
    expect(parseNumberGuessingSave(JSON.stringify({ version: 1, state, elapsedMs: 1200, assisted: true, savedAtEpochMs: NOW }), NOW)).toEqual({ version: 1, state, elapsedMs: 1200, assisted: true, savedAtEpochMs: NOW });
  });
  it("rejects forged secrets, derived hints, terminal and stale saves", () => {
    const state = guessNumber(createNumberGuessingGame(72, "normal"), 50);
    const wrap = (candidate: unknown, savedAtEpochMs = NOW) => JSON.stringify({ version: 1, state: candidate, elapsedMs: 10, assisted: false, savedAtEpochMs });
    expect(parseNumberGuessingSave(wrap({ ...state, secret: 1 }), NOW)).toBeNull();
    expect(parseNumberGuessingSave(wrap({ ...state, attempts: [{ ...state.attempts[0], direction: "lower" }] }), NOW)).toBeNull();
    expect(parseNumberGuessingSave(wrap({ ...state, status: "won" }), NOW)).toBeNull();
    expect(parseNumberGuessingSave(wrap(state, NOW - 8 * 86_400_000), NOW)).toBeNull();
  });
});
