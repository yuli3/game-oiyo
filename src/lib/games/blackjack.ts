export type BlackjackSuit = "hearts" | "diamonds" | "clubs" | "spades";

export type BlackjackCard = {
  suit: BlackjackSuit;
  value: string;
  power: number;
};

export type BlackjackOutcome = "win" | "lost" | "push";
export type BlackjackAction = "hit" | "stand";
export type BlackjackStatus = "playing" | "result";
export interface BlackjackState { seed: number; deck: BlackjackCard[]; player: BlackjackCard[]; dealer: BlackjackCard[]; status: BlackjackStatus; outcome: BlackjackOutcome | null; actions: BlackjackAction[] }

/** Unbiased Fisher–Yates shuffle. Injecting RNG keeps simulations reproducible. */
export function shuffleBlackjackDeck(
  deck: BlackjackCard[],
  rng: () => number = Math.random,
): BlackjackCard[] {
  const shuffled = [...deck];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function evaluateBlackjackHand(hand: BlackjackCard[]): { total: number; soft: boolean } {
  let total = hand.reduce((sum, card) => sum + card.power, 0);
  let highAces = hand.filter((card) => card.value === "A").length;

  while (total > 21 && highAces > 0) {
    total -= 10;
    highAces--;
  }

  return { total, soft: highAces > 0 };
}

export function isNaturalBlackjack(hand: BlackjackCard[]): boolean {
  return hand.length === 2 && evaluateBlackjackHand(hand).total === 21;
}

export type BlackjackAdviceReason = "low-total" | "dealer-weak" | "dealer-strong" | "soft-flex" | "safe-total";
export type BlackjackAdvice = { action: BlackjackAction; reason: BlackjackAdviceReason };

/** Hit/stand-only basic guidance for the current S17 ruleset. No betting advice. */
export function blackjackAdvice(player: BlackjackCard[], dealerUp: BlackjackCard): BlackjackAdvice {
  const { total, soft } = evaluateBlackjackHand(player);
  const dealer = Math.min(10, dealerUp.power);
  if (soft) {
    if (total <= 17) return { action: "hit", reason: "soft-flex" };
    if (total === 18 && ![2, 7, 8].includes(dealer)) return { action: "hit", reason: "dealer-strong" };
    return { action: "stand", reason: "safe-total" };
  }
  if (total <= 11) return { action: "hit", reason: "low-total" };
  if (total === 12) return [4, 5, 6].includes(dealer)
    ? { action: "stand", reason: "dealer-weak" }
    : { action: "hit", reason: "dealer-strong" };
  if (total <= 16) return dealer >= 2 && dealer <= 6
    ? { action: "stand", reason: "dealer-weak" }
    : { action: "hit", reason: "dealer-strong" };
  return { action: "stand", reason: "safe-total" };
}

export type BlackjackResultReason = "natural" | "player-bust" | "dealer-bust" | "higher" | "lower" | "equal";
export function blackjackResultReason(state: BlackjackState): BlackjackResultReason | null {
  if (state.status !== "result" || !state.outcome) return null;
  if (isNaturalBlackjack(state.player) || isNaturalBlackjack(state.dealer)) return "natural";
  const player = evaluateBlackjackHand(state.player).total;
  const dealer = evaluateBlackjackHand(state.dealer).total;
  if (player > 21) return "player-bust";
  if (dealer > 21) return "dealer-bust";
  if (player === dealer) return "equal";
  return player > dealer ? "higher" : "lower";
}

/** Standard S17 dealer policy: hit below 17, including soft 16; stand on every 17. */
export function dealerShouldHit(hand: BlackjackCard[]): boolean {
  return evaluateBlackjackHand(hand).total < 17;
}

export function settleBlackjack(
  playerHand: BlackjackCard[],
  dealerHand: BlackjackCard[],
): BlackjackOutcome {
  const playerNatural = isNaturalBlackjack(playerHand);
  const dealerNatural = isNaturalBlackjack(dealerHand);
  if (playerNatural || dealerNatural) {
    if (playerNatural && dealerNatural) return "push";
    return playerNatural ? "win" : "lost";
  }

  const playerTotal = evaluateBlackjackHand(playerHand).total;
  const dealerTotal = evaluateBlackjackHand(dealerHand).total;
  if (playerTotal > 21) return "lost";
  if (dealerTotal > 21 || playerTotal > dealerTotal) return "win";
  if (playerTotal < dealerTotal) return "lost";
  return "push";
}

const nextRandom = (rng: number) => { const state = (Math.imul(rng, 1_664_525) + 1_013_904_223) >>> 0; return { state, value: state / 0x1_0000_0000 }; };
export function createBlackjackDeck(): BlackjackCard[] {
  const suits: BlackjackSuit[] = ["hearts", "diamonds", "clubs", "spades"];
  const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  return suits.flatMap(suit => values.map((value, index) => ({ suit, value, power: index === 0 ? 11 : index >= 9 ? 10 : index + 1 })));
}
export function createBlackjackGame(seed: number): BlackjackState {
  let rng = seed >>> 0;
  const deck = shuffleBlackjackDeck(createBlackjackDeck(), () => { const roll = nextRandom(rng); rng = roll.state; return roll.value; });
  const player = [deck[0], deck[1]], dealer = [deck[2], deck[3]];
  const natural = isNaturalBlackjack(player) || isNaturalBlackjack(dealer);
  return { seed: seed >>> 0, deck: deck.slice(4), player, dealer, status: natural ? "result" : "playing", outcome: natural ? settleBlackjack(player, dealer) : null, actions: [] };
}
export function hitBlackjack(state: BlackjackState): BlackjackState {
  if (state.status !== "playing" || !state.deck.length) return state;
  const player = [...state.player, state.deck[0]], bust = evaluateBlackjackHand(player).total > 21;
  return { ...state, deck: state.deck.slice(1), player, status: bust ? "result" : "playing", outcome: bust ? "lost" : null, actions: [...state.actions, "hit"] };
}
export function standBlackjack(state: BlackjackState): BlackjackState {
  if (state.status !== "playing") return state;
  const deck = [...state.deck], dealer = [...state.dealer];
  while (dealerShouldHit(dealer) && deck.length) dealer.push(deck.shift()!);
  return { ...state, deck, dealer, status: "result", outcome: settleBlackjack(state.player, dealer), actions: [...state.actions, "stand"] };
}
export function replayBlackjack(seed: number, actions: readonly BlackjackAction[]): BlackjackState | null {
  let state = createBlackjackGame(seed);
  for (const action of actions) {
    const before = state.actions.length;
    state = action === "hit" ? hitBlackjack(state) : standBlackjack(state);
    if (state.actions.length !== before + 1) return null;
  }
  return state;
}
