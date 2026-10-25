import { describe, it, expect } from "vitest";
import {
  createDeck,
  evaluatePlayedHand,
  scoreHand,
  BASE_HAND_LEVELS,
  JOKER_CATALOG,
  initGame,
  toggleCardSelection,
  discardCards,
  playCards,
  openShop,
  buyJoker,
  sellJoker,
  advanceToNextBlind,
  type SurgeCard,
  type HandLevel,
  type HandType,
} from "./card-surge";

describe("Card Surge Engine", () => {
  const dummyHandLevels = Object.fromEntries(
    Object.entries(BASE_HAND_LEVELS).map(([k, v]) => [
      k,
      { level: 1, chips: v.chips, mult: v.mult, name: v.name },
    ])
  ) as Record<HandType, HandLevel>;

  it("creates a standard 52-card deck with correct suits and ranks", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const spades = deck.filter((c) => c.suit === "spades");
    const hearts = deck.filter((c) => c.suit === "hearts");
    const clubs = deck.filter((c) => c.suit === "clubs");
    const diamonds = deck.filter((c) => c.suit === "diamonds");
    expect(spades).toHaveLength(13);
    expect(hearts).toHaveLength(13);
    expect(clubs).toHaveLength(13);
    expect(diamonds).toHaveLength(13);
  });

  describe("evaluatePlayedHand", () => {
    it("evaluates High Card correctly", () => {
      const cards: SurgeCard[] = [
        { id: "1", suit: "spades", rank: 14 },
        { id: "2", suit: "hearts", rank: 7 },
      ];
      const res = evaluatePlayedHand(cards);
      expect(res.handType).toBe("high-card");
      expect(res.scoringCards).toHaveLength(1);
      expect(res.scoringCards[0].rank).toBe(14);
    });

    it("evaluates One Pair correctly", () => {
      const cards: SurgeCard[] = [
        { id: "1", suit: "spades", rank: 10 },
        { id: "2", suit: "hearts", rank: 10 },
        { id: "3", suit: "clubs", rank: 4 },
      ];
      const res = evaluatePlayedHand(cards);
      expect(res.handType).toBe("one-pair");
      expect(res.scoringCards).toHaveLength(2);
      expect(res.scoringCards[0].rank).toBe(10);
      expect(res.scoringCards[1].rank).toBe(10);
    });

    it("evaluates Two Pair correctly", () => {
      const cards: SurgeCard[] = [
        { id: "1", suit: "spades", rank: 8 },
        { id: "2", suit: "hearts", rank: 8 },
        { id: "3", suit: "clubs", rank: 5 },
        { id: "4", suit: "diamonds", rank: 5 },
        { id: "5", suit: "spades", rank: 2 },
      ];
      const res = evaluatePlayedHand(cards);
      expect(res.handType).toBe("two-pair");
      expect(res.scoringCards).toHaveLength(4);
    });

    it("evaluates Three of a Kind correctly", () => {
      const cards: SurgeCard[] = [
        { id: "1", suit: "spades", rank: 9 },
        { id: "2", suit: "hearts", rank: 9 },
        { id: "3", suit: "clubs", rank: 9 },
      ];
      const res = evaluatePlayedHand(cards);
      expect(res.handType).toBe("three-of-a-kind");
      expect(res.scoringCards).toHaveLength(3);
    });

    it("evaluates Straight and Ace-low wheel correctly", () => {
      // 5-6-7-8-9
      const straight: SurgeCard[] = [
        { id: "1", suit: "spades", rank: 5 },
        { id: "2", suit: "hearts", rank: 6 },
        { id: "3", suit: "clubs", rank: 7 },
        { id: "4", suit: "diamonds", rank: 8 },
        { id: "5", suit: "spades", rank: 9 },
      ];
      expect(evaluatePlayedHand(straight).handType).toBe("straight");

      // A-2-3-4-5 wheel
      const wheel: SurgeCard[] = [
        { id: "1", suit: "spades", rank: 14 },
        { id: "2", suit: "hearts", rank: 2 },
        { id: "3", suit: "clubs", rank: 3 },
        { id: "4", suit: "diamonds", rank: 4 },
        { id: "5", suit: "spades", rank: 5 },
      ];
      expect(evaluatePlayedHand(wheel).handType).toBe("straight");
    });

    it("evaluates Flush correctly", () => {
      const cards: SurgeCard[] = [
        { id: "1", suit: "hearts", rank: 2 },
        { id: "2", suit: "hearts", rank: 5 },
        { id: "3", suit: "hearts", rank: 8 },
        { id: "4", suit: "hearts", rank: 11 },
        { id: "5", suit: "hearts", rank: 14 },
      ];
      const res = evaluatePlayedHand(cards);
      expect(res.handType).toBe("flush");
      expect(res.scoringCards).toHaveLength(5);
    });

    it("evaluates Full House correctly", () => {
      const cards: SurgeCard[] = [
        { id: "1", suit: "spades", rank: 12 },
        { id: "2", suit: "hearts", rank: 12 },
        { id: "3", suit: "clubs", rank: 12 },
        { id: "4", suit: "diamonds", rank: 7 },
        { id: "5", suit: "spades", rank: 7 },
      ];
      const res = evaluatePlayedHand(cards);
      expect(res.handType).toBe("full-house");
      expect(res.scoringCards).toHaveLength(5);
    });

    it("evaluates Four of a Kind correctly", () => {
      const cards: SurgeCard[] = [
        { id: "1", suit: "spades", rank: 6 },
        { id: "2", suit: "hearts", rank: 6 },
        { id: "3", suit: "clubs", rank: 6 },
        { id: "4", suit: "diamonds", rank: 6 },
        { id: "5", suit: "spades", rank: 14 },
      ];
      const res = evaluatePlayedHand(cards);
      expect(res.handType).toBe("four-of-a-kind");
      expect(res.scoringCards).toHaveLength(4);
    });

    it("evaluates Straight Flush correctly", () => {
      const cards: SurgeCard[] = [
        { id: "1", suit: "spades", rank: 10 },
        { id: "2", suit: "spades", rank: 11 },
        { id: "3", suit: "spades", rank: 12 },
        { id: "4", suit: "spades", rank: 13 },
        { id: "5", suit: "spades", rank: 14 },
      ];
      const res = evaluatePlayedHand(cards);
      expect(res.handType).toBe("straight-flush");
      expect(res.scoringCards).toHaveLength(5);
    });
  });

  describe("scoreHand and Jokers", () => {
    it("calculates basic One Pair score without jokers", () => {
      // Pair of 10s: base One Pair is 10 chips x 2 mult.
      // Card chips: 10 + 10 = 20 chips.
      // Total chips: 10 + 20 = 30 chips. Total mult: 2.
      // Total score: 30 * 2 = 60.
      const pair10: SurgeCard[] = [
        { id: "1", suit: "spades", rank: 10 },
        { id: "2", suit: "hearts", rank: 10 },
      ];
      const breakdown = scoreHand(pair10, [], [], dummyHandLevels, {
        discardsRemaining: 2,
        money: 4,
        playedHandsHistory: [],
      });

      expect(breakdown.handType).toBe("one-pair");
      expect(breakdown.finalChips).toBe(30);
      expect(breakdown.finalMult).toBe(2);
      expect(breakdown.totalScore).toBe(60);
    });

    it("applies +Mult and X-Mult jokers correctly", () => {
      // Pair of Aces: base 10 chips x 2 mult.
      // Ace rank is 14 -> 11 chips each: 11 + 11 = 22 chips.
      // Base chips: 10 + 22 = 32.
      // Joker 1: Basic Joker (+4 mult) -> mult becomes 2 + 4 = 6.
      // Joker 2: The Duo (x2 mult on Pair) -> mult becomes 6 * 2 = 12.
      // Total score: 32 chips * 12 mult = 384.
      const pairAces: SurgeCard[] = [
        { id: "1", suit: "clubs", rank: 14 },
        { id: "2", suit: "diamonds", rank: 14 },
      ];
      const basicJoker = JOKER_CATALOG.find((j) => j.slug === "joker-basic")!;
      const duoJoker = JOKER_CATALOG.find((j) => j.slug === "the-duo")!;

      const breakdown = scoreHand(pairAces, [], [basicJoker, duoJoker], dummyHandLevels, {
        discardsRemaining: 2,
        money: 5,
        playedHandsHistory: [],
      });

      expect(breakdown.finalChips).toBe(32);
      expect(breakdown.finalMult).toBe(12);
      expect(breakdown.totalScore).toBe(384);
    });

    it("handles Blueprint copying adjacent joker", () => {
      const highCard: SurgeCard[] = [{ id: "1", suit: "spades", rank: 7 }];
      const blueprint = JOKER_CATALOG.find((j) => j.slug === "blueprint")!;
      const basicJoker = JOKER_CATALOG.find((j) => j.slug === "joker-basic")!; // +4 mult

      // Blueprint is to the left of Basic Joker, so it also gives +4 mult!
      // Total mult = base 1 + 4 (blueprint) + 4 (basic) = 9.
      const breakdown = scoreHand(highCard, [], [blueprint, basicJoker], dummyHandLevels, {
        discardsRemaining: 2,
        money: 0,
        playedHandsHistory: [],
      });

      expect(breakdown.finalMult).toBe(9);
    });
  });

  describe("Game Loop & Economy", () => {
    it("initializes game state with 8 cards in hand and Ante 1", () => {
      const state = initGame(12345);
      expect(state.ante).toBe(1);
      expect(state.blindType).toBe("small");
      expect(state.hand).toHaveLength(8);
      expect(state.handsRemaining).toBe(4);
      expect(state.discardsRemaining).toBe(3);
      expect(state.money).toBe(4);
      expect(state.phase).toBe("play");
    });

    it("selects and discards cards, redrawing up to 8", () => {
      let state = initGame(12345);
      const cardToDiscard = state.hand[0].id;

      state = toggleCardSelection(state, cardToDiscard);
      expect(state.selectedCardIds).toEqual([cardToDiscard]);

      state = discardCards(state);
      expect(state.selectedCardIds).toHaveLength(0);
      expect(state.hand).toHaveLength(8);
      expect(state.discardsRemaining).toBe(2);
      expect(state.discardPile).toHaveLength(1);
    });

    it("plays cards and accumulates score", () => {
      let state = initGame(12345);
      const playIds = state.hand.slice(0, 3).map((c) => c.id);
      for (const id of playIds) {
        state = toggleCardSelection(state, id);
      }

      const { nextState, breakdown } = playCards(state);
      expect(breakdown.totalScore).toBeGreaterThan(0);
      expect(nextState.currentRoundScore).toBe(breakdown.totalScore);
      expect(nextState.handsRemaining).toBe(3);
      expect(nextState.hand).toHaveLength(8);
    });

    it("opens shop after clearing round, allows buying and selling jokers", () => {
      let state = initGame(12345);
      state.phase = "round-cleared";
      state.currentRoundScore = 500;
      state.targetScore = 300;

      state = openShop(state);
      expect(state.phase).toBe("shop");
      expect(state.shopOffers.length).toBeGreaterThan(0);

      // Buy a joker
      state.money = 20; // Give enough money
      const offerId = state.shopOffers[0].id;
      state = buyJoker(state, offerId);
      expect(state.jokers).toHaveLength(1);

      // Sell joker
      const moneyBefore = state.money;
      state = sellJoker(state, 0);
      expect(state.jokers).toHaveLength(0);
      expect(state.money).toBeGreaterThan(moneyBefore);
    });

    it("advances to big blind from small blind", () => {
      let state = initGame(12345);
      state.phase = "shop";
      state.blindType = "small";

      state = advanceToNextBlind(state);
      expect(state.phase).toBe("play");
      expect(state.blindType).toBe("big");
      expect(state.hand).toHaveLength(8);
      expect(state.handsRemaining).toBe(4);
    });
  });
});
