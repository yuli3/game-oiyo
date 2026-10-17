export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardColor = 'black' | 'red';

export interface Card {
  id: string;
  suit: Suit;
  rank: number; // 1 (Ace) to 13 (King)
  color: CardColor;
  faceUp: boolean;
}

export interface SolitaireState {
  stock: Card[];
  waste: Card[];
  foundations: [Card[], Card[], Card[], Card[]]; // 4 suits
  tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]]; // 7 columns
  score: number;
  moves: number;
  isWon: boolean;
  history: Array<{
    stock: Card[];
    waste: Card[];
    foundations: [Card[], Card[], Card[], Card[]];
    tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]];
    score: number;
  }>;
}

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    const color: CardColor = suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        color,
        faceUp: false,
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[], randomFn: () => number = Math.random): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createInitialSolitaireState(randomFn: () => number = Math.random): SolitaireState {
  const deck = shuffleDeck(createDeck(), randomFn);
  const tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]] = [
    [], [], [], [], [], [], []
  ];

  let cardIndex = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[cardIndex++] };
      card.faceUp = row === col;
      tableau[col].push(card);
    }
  }

  const stock: Card[] = deck.slice(cardIndex).map(c => ({ ...c, faceUp: false }));

  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    score: 0,
    moves: 0,
    isWon: false,
    history: [],
  };
}

export function drawFromStock(state: SolitaireState): SolitaireState {
  if (state.stock.length === 0) {
    if (state.waste.length === 0) return state;
    // Recycle waste back into stock (flipped face down)
    const newStock = [...state.waste].reverse().map(c => ({ ...c, faceUp: false }));
    return {
      ...state,
      stock: newStock,
      waste: [],
      moves: state.moves + 1,
      score: Math.max(0, state.score - 20),
    };
  }

  const newStock = [...state.stock];
  const drawn = newStock.pop()!;
  drawn.faceUp = true;

  return {
    ...state,
    stock: newStock,
    waste: [...state.waste, drawn],
    moves: state.moves + 1,
  };
}

export function canMoveToTableau(card: Card, targetCol: Card[]): boolean {
  if (targetCol.length === 0) {
    // Only Kings (rank 13) can move to empty tableau column
    return card.rank === 13;
  }
  const topCard = targetCol[targetCol.length - 1];
  if (!topCard.faceUp) return false;
  // Must alternate color and be exactly 1 rank lower
  return card.color !== topCard.color && card.rank === topCard.rank - 1;
}

export function canMoveToFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) {
    // Only Aces (rank 1) can start a foundation
    return card.rank === 1;
  }
  const topCard = foundation[foundation.length - 1];
  // Must match suit and be exactly 1 rank higher
  return card.suit === topCard.suit && card.rank === topCard.rank + 1;
}

export function moveWasteToTableau(state: SolitaireState, targetColIndex: number): SolitaireState | null {
  if (state.waste.length === 0) return null;
  const card = state.waste[state.waste.length - 1];
  const targetCol = state.tableau[targetColIndex];

  if (!canMoveToTableau(card, targetCol)) return null;

  const newWaste = state.waste.slice(0, -1);
  const newTableau = state.tableau.map((col, idx) =>
    idx === targetColIndex ? [...col, card] : [...col]
  ) as SolitaireState['tableau'];

  return {
    ...state,
    waste: newWaste,
    tableau: newTableau,
    moves: state.moves + 1,
    score: state.score + 5,
  };
}

export function moveWasteToFoundation(state: SolitaireState, targetFoundationIndex: number): SolitaireState | null {
  if (state.waste.length === 0) return null;
  const card = state.waste[state.waste.length - 1];
  const foundation = state.foundations[targetFoundationIndex];

  if (!canMoveToFoundation(card, foundation)) return null;

  const newWaste = state.waste.slice(0, -1);
  const newFoundations = state.foundations.map((f, idx) =>
    idx === targetFoundationIndex ? [...f, card] : [...f]
  ) as SolitaireState['foundations'];

  const isWon = checkVictory(newFoundations);

  return {
    ...state,
    waste: newWaste,
    foundations: newFoundations,
    moves: state.moves + 1,
    score: state.score + 10,
    isWon,
  };
}

export function moveTableauToFoundation(
  state: SolitaireState,
  fromColIndex: number,
  targetFoundationIndex: number
): SolitaireState | null {
  const fromCol = state.tableau[fromColIndex];
  if (fromCol.length === 0) return null;
  const card = fromCol[fromCol.length - 1];
  const foundation = state.foundations[targetFoundationIndex];

  if (!canMoveToFoundation(card, foundation)) return null;

  const newFromCol = fromCol.slice(0, -1);
  if (newFromCol.length > 0 && !newFromCol[newFromCol.length - 1].faceUp) {
    newFromCol[newFromCol.length - 1] = {
      ...newFromCol[newFromCol.length - 1],
      faceUp: true,
    };
  }

  const newTableau = state.tableau.map((col, idx) =>
    idx === fromColIndex ? newFromCol : [...col]
  ) as SolitaireState['tableau'];

  const newFoundations = state.foundations.map((f, idx) =>
    idx === targetFoundationIndex ? [...f, card] : [...f]
  ) as SolitaireState['foundations'];

  const isWon = checkVictory(newFoundations);

  return {
    ...state,
    tableau: newTableau,
    foundations: newFoundations,
    moves: state.moves + 1,
    score: state.score + 15,
    isWon,
  };
}

export function moveTableauToTableau(
  state: SolitaireState,
  fromColIndex: number,
  cardIndex: number,
  targetColIndex: number
): SolitaireState | null {
  if (fromColIndex === targetColIndex) return null;
  const fromCol = state.tableau[fromColIndex];
  const targetCol = state.tableau[targetColIndex];
  if (cardIndex < 0 || cardIndex >= fromCol.length) return null;

  const movingCard = fromCol[cardIndex];
  if (!movingCard.faceUp) return null;

  if (!canMoveToTableau(movingCard, targetCol)) return null;

  const cardsToMove = fromCol.slice(cardIndex);
  const newFromCol = fromCol.slice(0, cardIndex);

  if (newFromCol.length > 0 && !newFromCol[newFromCol.length - 1].faceUp) {
    newFromCol[newFromCol.length - 1] = {
      ...newFromCol[newFromCol.length - 1],
      faceUp: true,
    };
  }

  const newTableau = state.tableau.map((col, idx) => {
    if (idx === fromColIndex) return newFromCol;
    if (idx === targetColIndex) return [...col, ...cardsToMove];
    return [...col];
  }) as SolitaireState['tableau'];

  return {
    ...state,
    tableau: newTableau,
    moves: state.moves + 1,
    score: state.score + 5,
  };
}

export function autoMoveToFoundation(state: SolitaireState): SolitaireState | null {
  // Try waste first
  if (state.waste.length > 0) {
    for (let fIdx = 0; fIdx < 4; fIdx++) {
      const moved = moveWasteToFoundation(state, fIdx);
      if (moved) return moved;
    }
  }

  // Try tableau top cards
  for (let cIdx = 0; cIdx < 7; cIdx++) {
    for (let fIdx = 0; fIdx < 4; fIdx++) {
      const moved = moveTableauToFoundation(state, cIdx, fIdx);
      if (moved) return moved;
    }
  }

  return null;
}

export function checkVictory(foundations: [Card[], Card[], Card[], Card[]]): boolean {
  return foundations.every(f => f.length === 13);
}

export function getRankLabel(rank: number): string {
  switch (rank) {
    case 1: return 'A';
    case 11: return 'J';
    case 12: return 'Q';
    case 13: return 'K';
    default: return String(rank);
  }
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spades': return '♠';
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
  }
}
