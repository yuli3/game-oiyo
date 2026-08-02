import { describe, expect, it } from "vitest";
import { createNumberGuessingGame, guessNumber, suggestedGuess } from "./number-guessing";

describe("number guessing engine", () => {
  it("creates deterministic secrets inside each difficulty range", () => {
    expect(createNumberGuessingGame(99, "normal")).toEqual(createNumberGuessingGame(99, "normal"));
    expect(createNumberGuessingGame(99, "normal").secret).toBe(100);
    expect(createNumberGuessingGame(999, "hard").secret).toBe(1000);
  });

  it("narrows an honest interval and supplies a binary-search suggestion", () => {
    let state = createNumberGuessingGame(72, "normal");
    state = guessNumber(state, 50);
    expect(state.attempts[0]).toMatchObject({ direction: "higher", temperature: "cold", distance: 23 });
    expect([state.lowerBound, state.upperBound, suggestedGuess(state)]).toEqual([51, 100, 75]);
    state = guessNumber(state, 80);
    expect([state.lowerBound, state.upperBound, suggestedGuess(state)]).toEqual([51, 79, 65]);
  });

  it("treats invalid and duplicate guesses as immutable no-ops", () => {
    const state = createNumberGuessingGame(20, "easy");
    expect(guessNumber(state, 0)).toBe(state);
    const next = guessNumber(state, 10);
    expect(guessNumber(next, 10)).toBe(next);
    expect(guessNumber(next, 10.5)).toBe(next);
  });

  it("wins exactly and stops after the limited attempt budget", () => {
    const win = guessNumber(createNumberGuessingGame(41, "normal"), 42);
    expect(win.status).toBe("won");
    let loss = createNumberGuessingGame(499, "hard");
    for (const guess of [1, 2, 3, 4, 5, 6, 7]) loss = guessNumber(loss, guess);
    expect(loss.status).toBe("lost");
    expect(guessNumber(loss, 500)).toBe(loss);
  });
});
