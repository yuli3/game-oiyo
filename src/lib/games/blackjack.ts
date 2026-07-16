export type BlackjackSuit = "hearts" | "diamonds" | "clubs" | "spades";

export type BlackjackCard = {
  suit: BlackjackSuit;
  value: string;
  power: number;
};

export type BlackjackOutcome = "win" | "lost" | "push";

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
