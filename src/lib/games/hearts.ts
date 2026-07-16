export const HEARTS_SUITS = ["clubs", "diamonds", "spades", "hearts"] as const;
export const HEARTS_VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

export type HeartsSuit = (typeof HEARTS_SUITS)[number];
export type HeartsValue = (typeof HEARTS_VALUES)[number];
export type HeartsPassDirection = "left" | "right" | "across" | "hold";
export type HeartsPhase = "passing" | "playing" | "roundComplete" | "gameOver";

export interface HeartsCard { id: string; suit: HeartsSuit; value: HeartsValue; power: number; }
export interface HeartsPlay { player: number; card: HeartsCard; }

export interface HeartsState {
  hands: HeartsCard[][];
  trick: HeartsPlay[];
  lastTrick: HeartsPlay[];
  leader: number;
  currentPlayer: number;
  heartsBroken: boolean;
  trickNumber: number;
  capturedPoints: number[];
  finalScores: number[] | null;
  matchScores: number[];
  roundNumber: number;
  passDirection: HeartsPassDirection;
  phase: HeartsPhase;
}

const TWO_OF_CLUBS = "clubs-2";
const MATCH_LIMIT = 100;

export function createHeartsDeck(): HeartsCard[] {
  return HEARTS_SUITS.flatMap((suit) => HEARTS_VALUES.map((value, power) => ({ id: `${suit}-${value}`, suit, value, power })));
}

export function shuffleHeartsDeck(deck: HeartsCard[], random: () => number = Math.random): HeartsCard[] {
  const shuffled = [...deck];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function sortHeartsHand(hand: HeartsCard[]): HeartsCard[] {
  return [...hand].sort((left, right) => HEARTS_SUITS.indexOf(left.suit) - HEARTS_SUITS.indexOf(right.suit) || left.power - right.power);
}

export function dealHearts(deck: HeartsCard[]): HeartsCard[][] {
  if (deck.length !== 52 || new Set(deck.map((card) => card.id)).size !== 52) throw new Error("Hearts requires one unique 52-card deck");
  const hands: HeartsCard[][] = [[], [], [], []];
  deck.forEach((card, index) => hands[index % 4].push(card));
  return hands.map(sortHeartsHand);
}

export function passDirectionForRound(roundNumber: number): HeartsPassDirection {
  return (["left", "right", "across", "hold"] as const)[(roundNumber - 1) % 4];
}

function createRound(roundNumber: number, matchScores: number[], random: () => number): HeartsState {
  const hands = dealHearts(shuffleHeartsDeck(createHeartsDeck(), random));
  const leader = hands.findIndex((hand) => hand.some((card) => card.id === TWO_OF_CLUBS));
  const passDirection = passDirectionForRound(roundNumber);
  return {
    hands, trick: [], lastTrick: [], leader, currentPlayer: leader, heartsBroken: false,
    trickNumber: 1, capturedPoints: [0, 0, 0, 0], finalScores: null,
    matchScores: [...matchScores], roundNumber, passDirection,
    phase: passDirection === "hold" ? "playing" : "passing",
  };
}

export function createHeartsGame(random: () => number = Math.random): HeartsState {
  return createRound(1, [0, 0, 0, 0], random);
}

export function startNextHeartsRound(state: HeartsState, random: () => number = Math.random): HeartsState {
  if (state.phase !== "roundComplete") throw new Error("The current Hearts round is not complete");
  return createRound(state.roundNumber + 1, state.matchScores, random);
}

export function chooseHeartsPassCards(hand: HeartsCard[]): HeartsCard[] {
  if (hand.length < 3) throw new Error("A Hearts hand needs at least three cards to pass");
  const danger = (card: HeartsCard): number => {
    if (card.id === "spades-Q") return 1_000;
    if (card.suit === "hearts") return 500 + card.power;
    if (card.suit === "spades") return 300 + card.power;
    return card.power;
  };
  return [...hand].sort((left, right) => danger(right) - danger(left) || left.id.localeCompare(right.id)).slice(0, 3);
}

function passRecipient(player: number, direction: Exclude<HeartsPassDirection, "hold">): number {
  return (player + (direction === "left" ? 1 : direction === "right" ? 3 : 2)) % 4;
}

export function passHeartsCards(state: HeartsState, selections: string[][]): HeartsState {
  if (state.phase !== "passing" || state.passDirection === "hold") throw new Error("Cards cannot be passed now");
  if (selections.length !== 4) throw new Error("All four Hearts players must pass");
  const selected = selections.map((ids, player) => {
    if (ids.length !== 3 || new Set(ids).size !== 3) throw new Error("Each Hearts player must pass three unique cards");
    const byId = new Map(state.hands[player].map((card) => [card.id, card]));
    return ids.map((id) => {
      const card = byId.get(id);
      if (!card) throw new Error("A player can only pass cards from their own hand");
      return card;
    });
  });
  const hands = state.hands.map((hand, player) => hand.filter((card) => !selections[player].includes(card.id)));
  selected.forEach((cards, player) => hands[passRecipient(player, state.passDirection as Exclude<HeartsPassDirection, "hold">)].push(...cards));
  const sortedHands = hands.map(sortHeartsHand);
  if (sortedHands.some((hand) => hand.length !== 13) || new Set(sortedHands.flat().map((card) => card.id)).size !== 52) throw new Error("Passing must preserve the deck");
  const leader = sortedHands.findIndex((hand) => hand.some((card) => card.id === TWO_OF_CLUBS));
  return { ...state, hands: sortedHands, leader, currentPlayer: leader, phase: "playing" };
}

export function isPenaltyCard(card: HeartsCard): boolean { return card.suit === "hearts" || card.id === "spades-Q"; }
export function trickPoints(trick: HeartsPlay[]): number { return trick.reduce((total, { card }) => total + (card.suit === "hearts" ? 1 : card.id === "spades-Q" ? 13 : 0), 0); }

export function legalHeartsCards(state: HeartsState, player: number): HeartsCard[] {
  const hand = state.hands[player] ?? [];
  if (state.phase !== "playing" || player !== state.currentPlayer) return [];
  if (state.trick.length === 0) {
    if (state.trickNumber === 1) return hand.filter((card) => card.id === TWO_OF_CLUBS);
    const nonHearts = hand.filter((card) => card.suit !== "hearts");
    return state.heartsBroken || nonHearts.length === 0 ? hand : nonHearts;
  }
  const ledSuit = state.trick[0].card.suit;
  const following = hand.filter((card) => card.suit === ledSuit);
  if (following.length > 0) return following;
  if (state.trickNumber === 1) {
    const safe = hand.filter((card) => !isPenaltyCard(card));
    if (safe.length > 0) return safe;
  }
  return hand;
}

export function trickWinner(trick: HeartsPlay[]): number {
  if (trick.length !== 4) throw new Error("A Hearts trick must contain four plays");
  const ledSuit = trick[0].card.suit;
  return trick.filter(({ card }) => card.suit === ledSuit).reduce((winner, play) => play.card.power > winner.card.power ? play : winner).player;
}

export function applyShootTheMoon(points: number[]): number[] {
  const shooter = points.findIndex((score) => score === 26);
  return shooter < 0 ? [...points] : points.map((_, player) => player === shooter ? 0 : 26);
}

export function playHeartsCard(state: HeartsState, player: number, cardId: string): HeartsState {
  const card = legalHeartsCards(state, player).find((candidate) => candidate.id === cardId);
  if (!card) throw new Error("Illegal Hearts play");
  const hands = state.hands.map((hand, index) => index === player ? hand.filter((candidate) => candidate.id !== cardId) : hand);
  const trick = [...state.trick, { player, card }];
  const heartsBroken = state.heartsBroken || card.suit === "hearts";
  if (trick.length < 4) return { ...state, hands, trick, heartsBroken, currentPlayer: (player + 1) % 4 };
  const winner = trickWinner(trick);
  const capturedPoints = [...state.capturedPoints];
  capturedPoints[winner] += trickPoints(trick);
  if (state.trickNumber === 13) {
    const finalScores = applyShootTheMoon(capturedPoints);
    const matchScores = state.matchScores.map((score, index) => score + finalScores[index]);
    const gameOver = matchScores.some((score) => score >= MATCH_LIMIT);
    return { ...state, hands, trick: [], lastTrick: trick, heartsBroken, currentPlayer: winner, capturedPoints, finalScores, matchScores, phase: gameOver ? "gameOver" : "roundComplete" };
  }
  return { ...state, hands, trick: [], lastTrick: trick, leader: winner, currentPlayer: winner, heartsBroken, trickNumber: state.trickNumber + 1, capturedPoints };
}

export function chooseHeartsCpuCard(state: HeartsState, player: number): HeartsCard {
  const legal = legalHeartsCards(state, player);
  if (legal.length === 0) throw new Error("CPU has no legal Hearts play");
  const byPower = [...legal].sort((left, right) => left.power - right.power);
  if (state.trick.length === 0) return byPower[0];
  const ledSuit = state.trick[0].card.suit;
  if (legal[0].suit !== ledSuit) return [...legal].sort((left, right) => {
    const danger = (card: HeartsCard) => card.id === "spades-Q" ? 100 : card.suit === "hearts" ? 50 + card.power : card.power;
    return danger(right) - danger(left);
  })[0];
  const currentHigh = Math.max(...state.trick.filter(({ card }) => card.suit === ledSuit).map(({ card }) => card.power));
  const losing = byPower.filter((card) => card.power < currentHigh);
  if (losing.length > 0) return losing[losing.length - 1];
  return trickPoints(state.trick) > 0 ? byPower[0] : byPower[byPower.length - 1];
}
