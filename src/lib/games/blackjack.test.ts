import { describe, expect, it } from "vitest";
import {
  dealerShouldHit,
  evaluateBlackjackHand,
  isNaturalBlackjack,
  settleBlackjack,
  shuffleBlackjackDeck,
  type BlackjackCard,
  createBlackjackGame,
  hitBlackjack,
  replayBlackjack,
  standBlackjack,
} from "./blackjack";

const card = (value: string, power = Number(value)): BlackjackCard => ({
  suit: "spades",
  value,
  power: value === "A" ? 11 : value === "K" ? 10 : power,
});

describe("blackjack rules", () => {
  it("uses an injected Fisher–Yates RNG without changing the source deck", () => {
    const deck = [card("A"), card("2", 2), card("3", 3), card("4", 4)];
    const shuffled = shuffleBlackjackDeck(deck, () => 0);
    expect(deck.map((item) => item.value)).toEqual(["A", "2", "3", "4"]);
    expect(shuffled.map((item) => item.value)).toEqual(["2", "3", "4", "A"]);
    expect(new Set(shuffled.map((item) => item.value))).toEqual(new Set(deck.map((item) => item.value)));
  });

  it("downgrades as many aces as needed without losing a remaining soft ace", () => {
    expect(evaluateBlackjackHand([card("A"), card("A"), card("5")])).toEqual({ total: 17, soft: true });
    expect(evaluateBlackjackHand([card("A"), card("A"), card("9"), card("K")])).toEqual({ total: 21, soft: false });
  });

  it("recognizes only a two-card 21 as a natural blackjack", () => {
    expect(isNaturalBlackjack([card("A"), card("K")])).toBe(true);
    expect(isNaturalBlackjack([card("7"), card("7"), card("7")])).toBe(false);
  });

  it("uses S17: hits soft 16 but stands on soft and hard 17", () => {
    expect(dealerShouldHit([card("A"), card("5")])).toBe(true);
    expect(dealerShouldHit([card("A"), card("6")])).toBe(false);
    expect(dealerShouldHit([card("K"), card("7")])).toBe(false);
  });

  it("settles naturals before ordinary 21 totals", () => {
    expect(settleBlackjack([card("A"), card("K")], [card("7"), card("7"), card("7")])).toBe("win");
    expect(settleBlackjack([card("7"), card("7"), card("7")], [card("A"), card("K")])).toBe("lost");
    expect(settleBlackjack([card("A"), card("K")], [card("A"), card("K")])).toBe("push");
  });

  it("deals and replays the same seeded round", () => {
    let state = createBlackjackGame(77);
    if (state.status === "playing") state = hitBlackjack(state);
    if (state.status === "playing") state = standBlackjack(state);
    expect(replayBlackjack(77, state.actions)).toEqual(state);
    expect(createBlackjackGame(77)).toEqual(createBlackjackGame(77));
  });

  it("freezes terminal rounds and resolves the dealer with S17", () => {
    const initial = createBlackjackGame(19);
    if (initial.status !== "playing") return;
    const result = standBlackjack(initial);
    expect(result.status).toBe("result");
    expect(result.outcome).not.toBeNull();
    expect(dealerShouldHit(result.dealer)).toBe(false);
    expect(hitBlackjack(result)).toBe(result);
  });
});
