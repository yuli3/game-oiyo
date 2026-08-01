import { describe, expect, it } from "vitest";

import { categoryScore, initializeGame, legalCategories, recommendYahtzeeCategory, rollDice, scoreCategory, scoreForState, toggleHoldDie, type DiceValue, type GameState } from "./yahtzee";

describe("yahtzee: categoryScore (pure scoring)", () => {
  it("scores upper-section categories as count × face value", () => {
    const dice: DiceValue[] = [3, 3, 3, 5, 6];
    expect(categoryScore("threes", dice)).toBe(9); // 3 threes × 3
    expect(categoryScore("fives", dice)).toBe(5);
    expect(categoryScore("sixes", dice)).toBe(6);
    expect(categoryScore("aces", dice)).toBe(0);
  });

  it("scores three-of-a-kind and four-of-a-kind as the sum of all dice", () => {
    const threeKind: DiceValue[] = [4, 4, 4, 2, 1];
    expect(categoryScore("threeOfAKind", threeKind)).toBe(15);
    expect(categoryScore("fourOfAKind", threeKind)).toBe(0); // only 3-of-a-kind here

    const fourKind: DiceValue[] = [5, 5, 5, 5, 1];
    expect(categoryScore("fourOfAKind", fourKind)).toBe(21);
  });

  it("scores full house as flat 25, or 0 without a 2+3 split", () => {
    expect(categoryScore("fullHouse", [2, 2, 3, 3, 3])).toBe(25);
    expect(categoryScore("fullHouse", [2, 2, 2, 2, 3])).toBe(0); // four-of-a-kind, not a full house
    expect(categoryScore("fullHouse", [1, 2, 3, 4, 5])).toBe(0);
  });

  it("scores straights based on the longest run of unique values", () => {
    expect(categoryScore("smallStraight", [1, 2, 3, 4, 6])).toBe(30);
    expect(categoryScore("smallStraight", [1, 2, 3, 5, 6])).toBe(0); // longest run is only 3
    expect(categoryScore("largeStraight", [2, 3, 4, 5, 6])).toBe(40);
    expect(categoryScore("largeStraight", [1, 2, 3, 4, 6])).toBe(0); // only a 4-run
  });

  it("scores yahtzee as 50 for five-of-a-kind, else 0", () => {
    expect(categoryScore("yahtzee", [6, 6, 6, 6, 6])).toBe(50);
    expect(categoryScore("yahtzee", [6, 6, 6, 6, 5])).toBe(0);
  });

  it("scores chance as the sum of all dice regardless of pattern", () => {
    expect(categoryScore("chance", [1, 2, 3, 4, 5])).toBe(15);
  });
});

describe("yahtzee: initializeGame", () => {
  it("deals 5 dice, 3 rolls left, round 1, and an empty scorecard", () => {
    const state = initializeGame();
    expect(state.diceValues).toHaveLength(5);
    expect(state.rollsLeft).toBe(3);
    expect(state.round).toBe(1);
    expect(state.isGameOver).toBe(false);
    expect(state.scorecard.totalScore).toBe(0);
    expect(state.scorecard.upper.aces.used).toBe(false);
  });

  it("is deterministic when the same rng stream is injected", () => {
    const stream = (values: number[]) => { let index = 0; return () => values[index++ % values.length]; };
    const values = [0, 0.2, 0.4, 0.6, 0.99];
    const left = rollDice(initializeGame(stream(values)), stream(values));
    const right = rollDice(initializeGame(stream(values)), stream(values));
    expect(left).toEqual(right);
    expect(left.diceValues).toEqual([1, 2, 3, 4, 6]);
  });
});

describe("yahtzee: scoreCategory (state transitions)", () => {
  function stateWithDice(dice: DiceValue[]): GameState {
    const s = initializeGame();
    return { ...s, diceValues: dice, rollsLeft: 2 }; // simulate having rolled once
  }

  it("locks in a category, advances the round, and cannot be scored twice", () => {
    const state = stateWithDice([3, 3, 3, 3, 3]);
    const next = scoreCategory(state, "threes");
    expect(next.scorecard.upper.threes).toEqual({ score: 15, used: true });
    expect(next.round).toBe(2);
    expect(next.rollsLeft).toBe(3); // reset for the next round
    expect(next.heldDice).toEqual([false, false, false, false, false]);

    // Already used — scoring again is a no-op.
    const again = scoreCategory(next, "threes");
    expect(again).toBe(next);
  });

  it("refuses to score before the first roll (rollsLeft === 3)", () => {
    const state = initializeGame(); // rollsLeft starts at 3
    const next = scoreCategory(state, "chance");
    expect(next).toBe(state);
  });

  it("applies the +35 upper bonus once the upper sum reaches 63", () => {
    let state = stateWithDice([6, 6, 6, 6, 6]);
    state = scoreCategory(state, "sixes"); // 30
    state = { ...state, diceValues: [5, 5, 5, 5, 5], rollsLeft: 2 };
    state = scoreCategory(state, "fives"); // 25 → upper sum 55, no bonus yet
    expect(state.scorecard.upperBonus).toBe(0);

    state = { ...state, diceValues: [4, 4, 2, 1, 1], rollsLeft: 2 };
    state = scoreCategory(state, "fours"); // +8 → upper sum 63 → bonus
    expect(state.scorecard.upperBonus).toBe(35);
  });

  it("flips isGameOver exactly after all 13 categories are scored (round > 13)", () => {
    const order = [
      "aces", "twos", "threes", "fours", "fives", "sixes",
      "threeOfAKind", "fourOfAKind", "fullHouse", "smallStraight", "largeStraight", "yahtzee", "chance",
    ] as const;
    let state = initializeGame();
    for (const category of order) {
      state = { ...state, diceValues: [1, 2, 3, 4, 5], rollsLeft: 2 };
      expect(state.isGameOver).toBe(false);
      state = scoreCategory(state, category);
    }
    expect(state.round).toBe(14);
    expect(state.isGameOver).toBe(true);
  });

  it("forces an extra Yahtzee into the matching open upper box", () => {
    let state = stateWithDice([6, 6, 6, 6, 6]);
    state = scoreCategory(state, "yahtzee");
    state = { ...state, diceValues: [6, 6, 6, 6, 6], rollsLeft: 2 };
    expect(legalCategories(state)).toEqual(["sixes"]);
    expect(scoreCategory(state, "chance")).toBe(state);
    const scored = scoreCategory(state, "sixes");
    expect(scored.scorecard.upper.sixes.score).toBe(30);
    expect(scored.scorecard.yahtzeeBonusCount).toBe(1);
  });

  it("applies fixed Joker scores after the matching upper box is used", () => {
    let state = stateWithDice([4, 4, 4, 4, 4]);
    state = scoreCategory(state, "yahtzee");
    state = { ...state, diceValues: [4, 4, 4, 4, 4], rollsLeft: 2 };
    state = scoreCategory(state, "fours");
    state = { ...state, diceValues: [4, 4, 4, 4, 4], rollsLeft: 2 };
    expect(legalCategories(state)).toContain("largeStraight");
    expect(scoreForState(state, "fullHouse")).toBe(25);
    expect(scoreForState(state, "smallStraight")).toBe(30);
    expect(scoreForState(state, "largeStraight")).toBe(40);
    const scored = scoreCategory(state, "largeStraight");
    expect(scored.scorecard.lower.largeStraight.score).toBe(40);
    expect(scored.scorecard.yahtzeeBonusCount).toBe(2);
  });

  it("recommends only legal categories and explains forced Joker choices", () => {
    let state = stateWithDice([5, 5, 5, 5, 5]);
    state = scoreCategory(state, "yahtzee");
    state = { ...state, diceValues: [5, 5, 5, 5, 5], rollsLeft: 2 };
    expect(recommendYahtzeeCategory(state)).toEqual({ category: "fives", score: 25, reason: "joker" });
  });

  it("uses a stable highest-score recommendation without mutating state", () => {
    const state = stateWithDice([6, 6, 6, 6, 5]);
    const snapshot = structuredClone(state);
    expect(recommendYahtzeeCategory(state)).toMatchObject({ category: "threeOfAKind", score: 29 });
    expect(state).toEqual(snapshot);
  });

  it("rejects out-of-range hold indexes without mutating state", () => {
    const state = { ...initializeGame(), rollsLeft: 2 };
    expect(toggleHoldDie(state, -1)).toBe(state);
    expect(toggleHoldDie(state, 5)).toBe(state);
  });
});
