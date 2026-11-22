import { describe, expect, it } from "vitest";
import { createWordle } from "./wordle";
import {
  WORDLE_STAGE_COUNT,
  isWordleStageIndex,
  wordleStageGuessLimit,
  wordleStagePassed,
  wordleStageSeed,
} from "./wordle-stages";

describe("wordle stages", () => {
  it("gives 30 stages distinct words from the shipped 736-word list", () => {
    const words = new Set<number>();
    for (let i = 0; i < WORDLE_STAGE_COUNT; i += 1) words.add(createWordle(wordleStageSeed(i), 736, "random", null).targetIndex);
    expect(words.size).toBe(WORDLE_STAGE_COUNT);
    expect(wordleStageSeed(3)).toBe(wordleStageSeed(3));
  });

  it("never gives more guesses to a later stage", () => {
    for (let i = 1; i < WORDLE_STAGE_COUNT; i += 1) expect(wordleStageGuessLimit(i)).toBeLessThanOrEqual(wordleStageGuessLimit(i - 1));
    expect(wordleStageGuessLimit(0)).toBe(6);
    expect(wordleStageGuessLimit(29)).toBe(4);
  });

  it("passes only a win inside the stage's guess limit", () => {
    const five = ["A", "B", "C", "D", "E"];
    expect(wordleStagePassed(0, { status: "won", guesses: [...five, "F"] })).toBe(true);
    expect(wordleStagePassed(25, { status: "won", guesses: five })).toBe(false);
    expect(wordleStagePassed(25, { status: "won", guesses: five.slice(0, 4) })).toBe(true);
    expect(wordleStagePassed(0, { status: "lost", guesses: five })).toBe(false);
    expect(isWordleStageIndex(30)).toBe(false);
    expect(isWordleStageIndex(0)).toBe(true);
  });
});
