import { describe, expect, it } from "vitest";
import { initializeGame, rollDice, scoreCategory } from "./yahtzee";
import { parseYahtzeeSave, restoredYahtzeeSeconds } from "./yahtzee-save";

function activePayload() {
  let state = initializeGame(() => 0.2);
  state = rollDice(state, () => 0.4);
  state = scoreCategory(state, "threes");
  return { version: 1, state, rngState: 42, seconds: 8, savedAtEpochMs: 1000 };
}

describe("Yahtzee active save", () => {
  it("restores a consistent nonterminal round and wall clock", () => {
    const save = parseYahtzeeSave(JSON.stringify(activePayload()), 1000);
    expect(save).not.toBeNull();
    expect(save?.state.round).toBe(2);
    expect(restoredYahtzeeSeconds(save!, 6000)).toBe(13);
  });

  it("rejects score, round, dice, future-time, and terminal tampering", () => {
    const payload = activePayload();
    expect(parseYahtzeeSave(JSON.stringify({ ...payload, state: { ...payload.state, round: 7 } }), 1000)).toBeNull();
    expect(parseYahtzeeSave(JSON.stringify({ ...payload, state: { ...payload.state, diceValues: [0, 2, 3, 4, 5] } }), 1000)).toBeNull();
    expect(parseYahtzeeSave(JSON.stringify({ ...payload, state: { ...payload.state, isGameOver: true } }), 1000)).toBeNull();
    expect(parseYahtzeeSave(JSON.stringify({ ...payload, state: { ...payload.state, scorecard: { ...payload.state.scorecard, totalScore: 999 } } }), 1000)).toBeNull();
    expect(parseYahtzeeSave(JSON.stringify({ ...payload, savedAtEpochMs: 400_001 }), 1000)).toBeNull();
  });

  it("recomputes previews instead of trusting saved possible scores", () => {
    const payload = activePayload();
    const state = rollDice(payload.state, () => 0.8);
    state.scorecard.lower.chance.possibleScore = 999;
    const save = parseYahtzeeSave(JSON.stringify({ ...payload, state }), 1000);
    expect(save?.state.scorecard.lower.chance.possibleScore).toBe(25);
  });
});
