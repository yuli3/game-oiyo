// Yahtzee scoring engine — ported from ahoxy-legacy with fixes:
// upper-section scoring was unreachable in the original (guard returned early
// for the whole section), and the yahtzee-bonus branch was wrong. State is
// treated immutably (the original mutated nested objects shared across states).

export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export type UpperCategory = 'aces' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes';
export type LowerCategory =
  | 'threeOfAKind' | 'fourOfAKind' | 'fullHouse'
  | 'smallStraight' | 'largeStraight' | 'yahtzee' | 'chance';
export type Category = UpperCategory | LowerCategory;

export interface CategoryScore {
  score: number | null;
  used: boolean;
  possibleScore?: number;
}

export interface Scorecard {
  upper: Record<UpperCategory, CategoryScore>;
  lower: Record<LowerCategory, CategoryScore>;
  upperBonus: number;       // 35 once upper sum ≥ 63
  yahtzeeBonusCount: number; // ×100 each
  totalScore: number;
}

export interface GameState {
  diceValues: DiceValue[];
  heldDice: boolean[];
  rollsLeft: number;
  round: number;      // 1..13
  isGameOver: boolean;
  scorecard: Scorecard;
}

export const UPPER_CATEGORIES: UpperCategory[] = ['aces', 'twos', 'threes', 'fours', 'fives', 'sixes'];
export const LOWER_CATEGORIES: LowerCategory[] = ['threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'];

const emptyCategory = (): CategoryScore => ({ score: null, used: false });
const randomDie = (): DiceValue => (Math.floor(Math.random() * 6) + 1) as DiceValue;

export function initializeGame(): GameState {
  return {
    diceValues: Array.from({ length: 5 }, randomDie),
    heldDice: [false, false, false, false, false],
    rollsLeft: 3,
    round: 1,
    isGameOver: false,
    scorecard: {
      upper: { aces: emptyCategory(), twos: emptyCategory(), threes: emptyCategory(), fours: emptyCategory(), fives: emptyCategory(), sixes: emptyCategory() },
      lower: { threeOfAKind: emptyCategory(), fourOfAKind: emptyCategory(), fullHouse: emptyCategory(), smallStraight: emptyCategory(), largeStraight: emptyCategory(), yahtzee: emptyCategory(), chance: emptyCategory() },
      upperBonus: 0,
      yahtzeeBonusCount: 0,
      totalScore: 0,
    },
  };
}

// ── scoring helpers ───────────────────────────────────────────────────────────
const sum = (dice: DiceValue[]) => dice.reduce((a, b) => a + b, 0);

function counts(dice: DiceValue[]): number[] {
  const c = Array(7).fill(0);
  for (const d of dice) c[d]++;
  return c;
}

function isNOfAKind(dice: DiceValue[], n: number): boolean {
  return counts(dice).some((c) => c >= n);
}

function isFullHouse(dice: DiceValue[]): boolean {
  const c = counts(dice).filter((x) => x > 0).sort();
  return c.length === 2 && c[0] === 2 && c[1] === 3;
}

function straightLength(dice: DiceValue[]): number {
  const uniq = [...new Set(dice)].sort((a, b) => a - b);
  let best = 1, run = 1;
  for (let i = 1; i < uniq.length; i++) {
    run = uniq[i] === uniq[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export function categoryScore(category: Category, dice: DiceValue[]): number {
  switch (category) {
    case 'aces': return dice.filter((d) => d === 1).length * 1;
    case 'twos': return dice.filter((d) => d === 2).length * 2;
    case 'threes': return dice.filter((d) => d === 3).length * 3;
    case 'fours': return dice.filter((d) => d === 4).length * 4;
    case 'fives': return dice.filter((d) => d === 5).length * 5;
    case 'sixes': return dice.filter((d) => d === 6).length * 6;
    case 'threeOfAKind': return isNOfAKind(dice, 3) ? sum(dice) : 0;
    case 'fourOfAKind': return isNOfAKind(dice, 4) ? sum(dice) : 0;
    case 'fullHouse': return isFullHouse(dice) ? 25 : 0;
    case 'smallStraight': return straightLength(dice) >= 4 ? 30 : 0;
    case 'largeStraight': return straightLength(dice) >= 5 ? 40 : 0;
    case 'yahtzee': return isNOfAKind(dice, 5) ? 50 : 0;
    case 'chance': return sum(dice);
  }
}

function withPossibleScores(state: GameState): GameState {
  const upper = { ...state.scorecard.upper };
  const lower = { ...state.scorecard.lower };
  for (const c of UPPER_CATEGORIES) {
    if (!upper[c].used) upper[c] = { ...upper[c], possibleScore: categoryScore(c, state.diceValues) };
  }
  for (const c of LOWER_CATEGORIES) {
    if (!lower[c].used) lower[c] = { ...lower[c], possibleScore: categoryScore(c, state.diceValues) };
  }
  return { ...state, scorecard: { ...state.scorecard, upper, lower } };
}

// ── actions ───────────────────────────────────────────────────────────────────
export function rollDice(state: GameState): GameState {
  if (state.rollsLeft <= 0 || state.isGameOver) return state;
  const diceValues = state.diceValues.map((v, i) => (state.heldDice[i] ? v : randomDie()));
  return withPossibleScores({ ...state, diceValues, rollsLeft: state.rollsLeft - 1 });
}

export function toggleHoldDie(state: GameState, index: number): GameState {
  // can't hold before the first roll or after the last
  if (state.rollsLeft === 3 || state.rollsLeft <= 0 || state.isGameOver) return state;
  const heldDice = [...state.heldDice];
  heldDice[index] = !heldDice[index];
  return { ...state, heldDice };
}

export function scoreCategory(state: GameState, category: Category): GameState {
  if (state.isGameOver || state.rollsLeft === 3) return state; // must roll first
  const isUpper = (UPPER_CATEGORIES as Category[]).includes(category);
  const existing = isUpper
    ? state.scorecard.upper[category as UpperCategory]
    : state.scorecard.lower[category as LowerCategory];
  if (existing.used) return state;

  const gained = categoryScore(category, state.diceValues);
  const upper = { ...state.scorecard.upper };
  const lower = { ...state.scorecard.lower };
  if (isUpper) upper[category as UpperCategory] = { score: gained, used: true };
  else lower[category as LowerCategory] = { score: gained, used: true };

  // Yahtzee bonus: rolled five-of-a-kind while yahtzee already scored at 50
  let yahtzeeBonusCount = state.scorecard.yahtzeeBonusCount;
  if (
    category !== 'yahtzee' &&
    isNOfAKind(state.diceValues, 5) &&
    lower.yahtzee.used && lower.yahtzee.score === 50
  ) {
    yahtzeeBonusCount += 1;
  }

  const upperSum = UPPER_CATEGORIES.reduce((a, c) => a + (upper[c].score ?? 0), 0);
  const upperBonus = upperSum >= 63 ? 35 : 0;
  const lowerSum = LOWER_CATEGORIES.reduce((a, c) => a + (lower[c].score ?? 0), 0);
  const totalScore = upperSum + upperBonus + lowerSum + yahtzeeBonusCount * 100;

  const round = state.round + 1;
  return {
    ...state,
    scorecard: { upper, lower, upperBonus, yahtzeeBonusCount, totalScore },
    rollsLeft: 3,
    heldDice: [false, false, false, false, false],
    round,
    isGameOver: round > 13,
  };
}
