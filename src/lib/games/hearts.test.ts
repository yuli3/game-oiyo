import { describe, expect, it } from "vitest";
import {
  applyShootTheMoon,
  chooseHeartsCpuCard,
  chooseHeartsPassCards,
  createHeartsDeck,
  createHeartsGame,
  dealHearts,
  legalHeartsCards,
  passDirectionForRound,
  passHeartsCards,
  playHeartsCard,
  startNextHeartsRound,
  trickWinner,
  type HeartsCard,
  type HeartsState,
} from "./hearts";

const card = (suit: HeartsCard["suit"], value: HeartsCard["value"]): HeartsCard => ({
  id: `${suit}-${value}`,
  suit,
  value,
  power: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"].indexOf(value),
});

const stateWith = (hands: HeartsCard[][], patch: Partial<HeartsState> = {}): HeartsState => ({
  hands,
  trick: [],
  lastTrick: [],
  leader: 0,
  currentPlayer: 0,
  heartsBroken: false,
  trickNumber: 2,
  capturedPoints: [0, 0, 0, 0],
  finalScores: null,
  matchScores: [0, 0, 0, 0],
  roundNumber: 1,
  passDirection: "left",
  phase: "playing",
  ...patch,
});

const finishPassing = (state: HeartsState): HeartsState => passHeartsCards(
  state,
  state.hands.map((hand) => chooseHeartsPassCards(hand).map(({ id }) => id)),
);

describe("Hearts engine", () => {
  it("deals one unique 52-card deck into four 13-card hands", () => {
    const hands = dealHearts(createHeartsDeck());
    expect(hands.map((hand) => hand.length)).toEqual([13, 13, 13, 13]);
    expect(new Set(hands.flat().map(({ id }) => id)).size).toBe(52);
  });

  it("is deterministic with an injected random source and starts with two of clubs", () => {
    const first = finishPassing(createHeartsGame(() => 0.42));
    const second = finishPassing(createHeartsGame(() => 0.42));
    expect(first.hands).toEqual(second.hands);
    expect(legalHeartsCards(first, first.currentPlayer).map(({ id }) => id)).toEqual(["clubs-2"]);
  });

  it("requires follow-suit and prevents leading hearts until broken unless only hearts remain", () => {
    const follow = stateWith(
      [[card("clubs", "2"), card("hearts", "A")], [card("clubs", "K")], [], []],
      { currentPlayer: 0, trick: [{ player: 3, card: card("clubs", "5") }] },
    );
    expect(legalHeartsCards(follow, 0).map(({ id }) => id)).toEqual(["clubs-2"]);
    expect(legalHeartsCards(stateWith([[card("clubs", "2"), card("hearts", "A")], [], [], []]), 0).map(({ id }) => id)).toEqual(["clubs-2"]);
    expect(legalHeartsCards(stateWith([[card("hearts", "2"), card("hearts", "A")], [], [], []]), 0)).toHaveLength(2);
  });

  it("blocks first-trick penalties when a safe discard exists, with the all-penalty exception", () => {
    const base = { trickNumber: 1, currentPlayer: 0, trick: [{ player: 3, card: card("clubs", "2") }] };
    const mixed = stateWith([[card("hearts", "A"), card("spades", "Q"), card("diamonds", "3")], [], [], []], base);
    expect(legalHeartsCards(mixed, 0).map(({ id }) => id)).toEqual(["diamonds-3"]);
    const forced = stateWith([[card("hearts", "A"), card("spades", "Q")], [], [], []], base);
    expect(legalHeartsCards(forced, 0)).toHaveLength(2);
  });

  it("awards a trick to the highest card of the led suit, not another suit", () => {
    expect(trickWinner([
      { player: 2, card: card("diamonds", "8") },
      { player: 3, card: card("diamonds", "K") },
      { player: 0, card: card("spades", "A") },
      { player: 1, card: card("diamonds", "10") },
    ])).toBe(3);
  });

  it("tracks all 13 tricks and applies shoot-the-moon scoring", () => {
    expect(applyShootTheMoon([26, 0, 0, 0])).toEqual([0, 26, 26, 26]);
    expect(applyShootTheMoon([12, 4, 8, 2])).toEqual([12, 4, 8, 2]);

    let state = finishPassing(createHeartsGame(() => 0.17));
    while (!state.finalScores) {
      const current = state.currentPlayer;
      state = playHeartsCard(state, current, chooseHeartsCpuCard(state, current).id);
    }
    expect(state.hands.every((hand) => hand.length === 0)).toBe(true);
    expect(state.trickNumber).toBe(13);
    expect(state.capturedPoints.reduce((sum, score) => sum + score, 0)).toBe(26);
    expect(state.finalScores.reduce((sum, score) => sum + score, 0)).toBeGreaterThanOrEqual(26);
  });

  it("finishes 50 seeded CPU rounds without duplicates or illegal dead ends", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      let value = seed;
      const random = () => {
        value = (value * 1_664_525 + 1_013_904_223) >>> 0;
        return value / 4_294_967_296;
      };
      let state = finishPassing(createHeartsGame(random));
      expect(new Set(state.hands.flat().map(({ id }) => id)).size).toBe(52);
      let plays = 0;
      while (!state.finalScores) {
        const player = state.currentPlayer;
        const choice = chooseHeartsCpuCard(state, player);
        expect(legalHeartsCards(state, player).some(({ id }) => id === choice.id)).toBe(true);
        state = playHeartsCard(state, player, choice.id);
        plays += 1;
      }
      expect(plays).toBe(52);
      expect(state.capturedPoints.reduce((sum, score) => sum + score, 0)).toBe(26);
    }
  });

  it("makes deterministic CPU choices and always chooses a legal card", () => {
    const state = stateWith(
      [[card("spades", "Q"), card("hearts", "K"), card("diamonds", "4")], [], [], []],
      { currentPlayer: 0, trick: [{ player: 3, card: card("clubs", "7") }] },
    );
    expect(chooseHeartsCpuCard(state, 0).id).toBe("spades-Q");
    expect(legalHeartsCards(state, 0).some(({ id }) => id === chooseHeartsCpuCard(state, 0).id)).toBe(true);
  });

  it("cycles left, right, across, and hold passing directions", () => {
    expect([1, 2, 3, 4, 5].map(passDirectionForRound)).toEqual(["left", "right", "across", "hold", "left"]);
  });

  it("passes exactly three owned cards simultaneously and preserves all 52 cards", () => {
    const state = createHeartsGame(() => 0.31);
    const selections = state.hands.map((hand) => chooseHeartsPassCards(hand).map(({ id }) => id));
    const passed = passHeartsCards(state, selections);
    expect(passed.phase).toBe("playing");
    expect(passed.hands.every((hand) => hand.length === 13)).toBe(true);
    expect(new Set(passed.hands.flat().map(({ id }) => id)).size).toBe(52);
    selections.forEach((ids, player) => {
      const recipient = (player + 1) % 4;
      expect(ids.every((id) => passed.hands[recipient].some((card) => card.id === id))).toBe(true);
    });
    expect(() => passHeartsCards(state, [selections[0], selections[1], selections[2], ["not-owned", ...selections[3].slice(1)]])).toThrow();

    for (const [direction, offset] of [["right", 3], ["across", 2]] as const) {
      const directional = passHeartsCards({ ...state, passDirection: direction }, selections);
      selections.forEach((ids, player) => {
        const recipient = (player + offset) % 4;
        expect(ids.every((id) => directional.hands[recipient].some((passedCard) => passedCard.id === id))).toBe(true);
      });
    }
  });

  it("uses a deterministic legal CPU passing strategy", () => {
    const hand = [card("clubs", "A"), card("spades", "Q"), card("hearts", "A"), card("diamonds", "2")];
    expect(chooseHeartsPassCards(hand).map(({ id }) => id)).toEqual(["spades-Q", "hearts-A", "clubs-A"]);
    expect(chooseHeartsPassCards(hand)).toEqual(chooseHeartsPassCards(hand));
  });

  it("adds adjusted round points to match totals and ends at 100 with the lowest score winning", () => {
    const finalTrickState = stateWith(
      [[card("clubs", "2")], [card("clubs", "3")], [card("clubs", "4")], [card("clubs", "5")]],
      {
        currentPlayer: 0,
        leader: 0,
        trickNumber: 13,
        capturedPoints: [0, 10, 8, 8],
        matchScores: [95, 40, 55, 70],
      },
    );
    let state = playHeartsCard(finalTrickState, 0, "clubs-2");
    state = playHeartsCard(state, 1, "clubs-3");
    state = playHeartsCard(state, 2, "clubs-4");
    state = playHeartsCard(state, 3, "clubs-5");
    expect(state.finalScores).toEqual([0, 10, 8, 8]);
    expect(state.matchScores).toEqual([95, 50, 63, 78]);
    expect(state.phase).toBe("roundComplete");

    const next = startNextHeartsRound(state, () => 0.2);
    expect(next.roundNumber).toBe(2);
    expect(next.passDirection).toBe("right");
    expect(next.matchScores).toEqual(state.matchScores);
    const hold = startNextHeartsRound({ ...state, roundNumber: 3 }, () => 0.2);
    expect(hold.passDirection).toBe("hold");
    expect(hold.phase).toBe("playing");

    const threshold = { ...finalTrickState, matchScores: [99, 40, 55, 70] };
    let ended = playHeartsCard(threshold, 0, "clubs-2");
    ended = playHeartsCard(ended, 1, "clubs-3");
    ended = playHeartsCard(ended, 2, "clubs-4");
    ended = playHeartsCard(ended, 3, "clubs-5");
    expect(ended.phase).toBe("roundComplete");

    const overBase = { ...finalTrickState, capturedPoints: [1, 9, 8, 8], matchScores: [99, 40, 55, 70] };
    let over = playHeartsCard(overBase, 0, "clubs-2");
    over = playHeartsCard(over, 1, "clubs-3");
    over = playHeartsCard(over, 2, "clubs-4");
    over = playHeartsCard(over, 3, "clubs-5");
    expect(over.phase).toBe("gameOver");
    expect(Math.min(...over.matchScores)).toBe(over.matchScores[1]);
  });
});
