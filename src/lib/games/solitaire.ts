export type SolitaireSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type SolitaireCard = {
  id: string;
  suit: SolitaireSuit;
  value: string;
  power: number;
  isRed: boolean;
  isFaceUp: boolean;
};

export type SolitaireState = {
  stock: SolitaireCard[];
  waste: SolitaireCard[];
  tableau: SolitaireCard[][];
  foundations: Record<SolitaireSuit, SolitaireCard[]>;
};

export type SolitaireMove =
  | { type: 'draw' }
  | { type: 'recycle' }
  | { type: 'flip'; column: number }
  | { type: 'tableau-to-tableau'; from: number; cardIndex: number; to: number }
  | { type: 'waste-to-tableau'; to: number }
  | { type: 'foundation-to-tableau'; suit: SolitaireSuit; to: number }
  | { type: 'tableau-to-foundation'; from: number }
  | { type: 'waste-to-foundation' };

export const SOLITAIRE_SUITS: SolitaireSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function face(card: SolitaireCard, isFaceUp: boolean): SolitaireCard {
  return { ...card, isFaceUp };
}

export function createSolitaireDeck(random: () => number = Math.random): SolitaireCard[] {
  const deck = SOLITAIRE_SUITS.flatMap((suit) => VALUES.map((value, index) => ({
    id: `${suit}-${index + 1}`,
    suit,
    value,
    power: index + 1,
    isRed: suit === 'hearts' || suit === 'diamonds',
    isFaceUp: false,
  })));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  return deck;
}

export function dealSolitaire(random: () => number = Math.random): SolitaireState {
  const deck = createSolitaireDeck(random);
  const tableau: SolitaireCard[][] = [];
  let cursor = 0;
  for (let column = 0; column < 7; column += 1) {
    const pile = deck.slice(cursor, cursor + column + 1);
    pile[pile.length - 1] = face(pile[pile.length - 1], true);
    tableau.push(pile);
    cursor += column + 1;
  }
  return {
    stock: deck.slice(cursor),
    waste: [],
    tableau,
    foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
  };
}

export function isValidTableauRun(cards: SolitaireCard[]): boolean {
  if (cards.length === 0 || cards.some((card) => !card.isFaceUp)) return false;
  return cards.every((card, index) => index === cards.length - 1 || (
    card.power === cards[index + 1].power + 1 && card.isRed !== cards[index + 1].isRed
  ));
}

export function canPlaceOnTableau(card: SolitaireCard, target: SolitaireCard[]): boolean {
  const top = target[target.length - 1];
  return top ? top.isFaceUp && top.power === card.power + 1 && top.isRed !== card.isRed : card.power === 13;
}

export function canPlaceOnFoundation(card: SolitaireCard, foundation: SolitaireCard[]): boolean {
  const top = foundation[foundation.length - 1];
  return card.isFaceUp && card.suit === (top?.suit ?? card.suit) && (top ? card.power === top.power + 1 : card.power === 1);
}

function revealExposed(pile: SolitaireCard[]): SolitaireCard[] {
  if (pile.length === 0 || pile[pile.length - 1].isFaceUp) return pile;
  return [...pile.slice(0, -1), face(pile[pile.length - 1], true)];
}

export function applySolitaireMove(state: SolitaireState, move: SolitaireMove): SolitaireState | null {
  if (move.type === 'draw') {
    if (state.stock.length === 0) return null;
    const card = face(state.stock[state.stock.length - 1], true);
    return { ...state, stock: state.stock.slice(0, -1), waste: [...state.waste, card] };
  }
  if (move.type === 'recycle') {
    if (state.stock.length > 0 || state.waste.length === 0) return null;
    return { ...state, stock: state.waste.slice().reverse().map((card) => face(card, false)), waste: [] };
  }
  if (move.type === 'flip') {
    const pile = state.tableau[move.column];
    if (!pile?.length || pile[pile.length - 1].isFaceUp) return null;
    const tableau = state.tableau.map((cards, index) => index === move.column ? revealExposed(cards) : cards);
    return { ...state, tableau };
  }

  if (move.type === 'tableau-to-tableau') {
    if (move.from === move.to) return null;
    const source = state.tableau[move.from];
    const target = state.tableau[move.to];
    if (!source || !target || move.cardIndex < 0 || move.cardIndex >= source.length) return null;
    const run = source.slice(move.cardIndex);
    if (!isValidTableauRun(run) || !canPlaceOnTableau(run[0], target)) return null;
    const tableau = state.tableau.map((cards, index) => {
      if (index === move.from) return revealExposed(cards.slice(0, move.cardIndex));
      if (index === move.to) return [...cards, ...run];
      return cards;
    });
    return { ...state, tableau };
  }

  if (move.type === 'waste-to-tableau' || move.type === 'foundation-to-tableau') {
    const card = move.type === 'waste-to-tableau'
      ? state.waste[state.waste.length - 1]
      : state.foundations[move.suit][state.foundations[move.suit].length - 1];
    const target = state.tableau[move.to];
    if (!card || !target || !canPlaceOnTableau(card, target)) return null;
    const tableau = state.tableau.map((cards, index) => index === move.to ? [...cards, card] : cards);
    if (move.type === 'waste-to-tableau') return { ...state, waste: state.waste.slice(0, -1), tableau };
    return {
      ...state,
      foundations: { ...state.foundations, [move.suit]: state.foundations[move.suit].slice(0, -1) },
      tableau,
    };
  }

  const card = move.type === 'waste-to-foundation'
    ? state.waste[state.waste.length - 1]
    : state.tableau[move.from]?.[state.tableau[move.from].length - 1];
  if (!card || !canPlaceOnFoundation(card, state.foundations[card.suit])) return null;
  const foundations = { ...state.foundations, [card.suit]: [...state.foundations[card.suit], card] };
  if (move.type === 'waste-to-foundation') return { ...state, waste: state.waste.slice(0, -1), foundations };
  const tableau = state.tableau.map((cards, index) => index === move.from ? revealExposed(cards.slice(0, -1)) : cards);
  return { ...state, tableau, foundations };
}

export type SolitaireMoveFailure = 'empty-source' | 'same-column' | 'hidden-card' | 'broken-run' | 'empty-needs-king' | 'needs-alternating-next-rank' | 'foundation-needs-ace' | 'foundation-needs-next-suit' | 'stock-empty' | 'waste-empty';
export function explainSolitaireMove(state:SolitaireState,move:SolitaireMove):SolitaireMoveFailure|null{
  if(applySolitaireMove(state,move))return null;
  if(move.type==='draw')return'stock-empty';
  if(move.type==='recycle')return'waste-empty';
  if(move.type==='flip')return'hidden-card';
  if(move.type==='tableau-to-tableau'){
    if(move.from===move.to)return'same-column';const source=state.tableau[move.from],target=state.tableau[move.to],run=source?.slice(move.cardIndex)??[];
    if(!run.length)return'empty-source';if(run.some(card=>!card.isFaceUp))return'hidden-card';if(!isValidTableauRun(run))return'broken-run';
    return target?.length?'needs-alternating-next-rank':'empty-needs-king';
  }
  const card=move.type==='waste-to-tableau'||move.type==='waste-to-foundation'?state.waste.at(-1):move.type==='foundation-to-tableau'?state.foundations[move.suit].at(-1):state.tableau[move.from]?.at(-1);
  if(!card)return'empty-source';
  if(move.type==='waste-to-tableau'||move.type==='foundation-to-tableau')return state.tableau[move.to]?.length?'needs-alternating-next-rank':'empty-needs-king';
  return state.foundations[card.suit].length===0?'foundation-needs-ace':'foundation-needs-next-suit';
}

export function listSolitaireMoves(state: SolitaireState): SolitaireMove[] {
  const moves: SolitaireMove[] = [];
  if (state.stock.length > 0) moves.push({ type: 'draw' });
  else if (state.waste.length > 0) moves.push({ type: 'recycle' });

  state.tableau.forEach((pile, from) => {
    const top = pile[pile.length - 1];
    if (top && !top.isFaceUp) moves.push({ type: 'flip', column: from });
    if (top && canPlaceOnFoundation(top, state.foundations[top.suit])) moves.push({ type: 'tableau-to-foundation', from });
    pile.forEach((_, cardIndex) => {
      const run = pile.slice(cardIndex);
      if (!isValidTableauRun(run)) return;
      state.tableau.forEach((target, to) => {
        if (to !== from && canPlaceOnTableau(run[0], target)) moves.push({ type: 'tableau-to-tableau', from, cardIndex, to });
      });
    });
  });

  const waste = state.waste[state.waste.length - 1];
  if (waste) {
    if (canPlaceOnFoundation(waste, state.foundations[waste.suit])) moves.push({ type: 'waste-to-foundation' });
    state.tableau.forEach((target, to) => {
      if (canPlaceOnTableau(waste, target)) moves.push({ type: 'waste-to-tableau', to });
    });
  }
  SOLITAIRE_SUITS.forEach((suit) => {
    const card = state.foundations[suit][state.foundations[suit].length - 1];
    if (!card) return;
    state.tableau.forEach((target, to) => {
      if (canPlaceOnTableau(card, target)) moves.push({ type: 'foundation-to-tableau', suit, to });
    });
  });
  return moves;
}

export function isSolitaireWon(state: SolitaireState): boolean {
  return SOLITAIRE_SUITS.every((suit) => state.foundations[suit].length === 13);
}

export type SolitaireHint = {
  move: SolitaireMove;
  description: string;
  sourceColumn?: number;
  targetColumn?: number;
  suit?: SolitaireSuit;
};

export function findSolitaireHint(state: SolitaireState): SolitaireHint | null {
  // 1. Foundation move from tableau
  for (let from = 0; from < state.tableau.length; from += 1) {
    const pile = state.tableau[from];
    const top = pile[pile.length - 1];
    if (top && top.isFaceUp && canPlaceOnFoundation(top, state.foundations[top.suit])) {
      return {
        move: { type: 'tableau-to-foundation', from },
        description: `${top.value} ${top.suit} 카드를 파운데이션으로 올릴 수 있습니다.`,
        sourceColumn: from,
        suit: top.suit,
      };
    }
  }

  // 2. Foundation move from waste
  const wasteCard = state.waste[state.waste.length - 1];
  if (wasteCard && canPlaceOnFoundation(wasteCard, state.foundations[wasteCard.suit])) {
    return {
      move: { type: 'waste-to-foundation' },
      description: `덱에서 뽑은 ${wasteCard.value} ${wasteCard.suit} 카드를 파운데이션으로 올립니다.`,
      suit: wasteCard.suit,
    };
  }

  // 3. Flip face-down card
  for (let col = 0; col < state.tableau.length; col += 1) {
    const pile = state.tableau[col];
    const top = pile[pile.length - 1];
    if (top && !top.isFaceUp) {
      return {
        move: { type: 'flip', column: col },
        description: `${col + 1}번 열의 뒷면 카드를 뒤집을 수 있습니다.`,
        sourceColumn: col,
      };
    }
  }

  // 4. Tableau to tableau that uncovers face-down card
  for (let from = 0; from < state.tableau.length; from += 1) {
    const pile = state.tableau[from];
    if (!pile.some((c) => !c.isFaceUp)) continue;

    for (let cardIndex = 0; cardIndex < pile.length; cardIndex += 1) {
      if (!pile[cardIndex].isFaceUp || cardIndex === 0) continue;
      const run = pile.slice(cardIndex);
      if (!isValidTableauRun(run)) continue;
      for (let to = 0; to < state.tableau.length; to += 1) {
        if (to === from) continue;
        if (canPlaceOnTableau(run[0], state.tableau[to])) {
          return {
            move: { type: 'tableau-to-tableau', from, cardIndex, to },
            description: `${pile[cardIndex].value} 카드를 ${to + 1}번 열로 옮겨 뒷면 카드를 엽니다.`,
            sourceColumn: from,
            targetColumn: to,
          };
        }
      }
    }
  }

  // 5. Waste to tableau
  if (wasteCard) {
    for (let to = 0; to < state.tableau.length; to += 1) {
      if (canPlaceOnTableau(wasteCard, state.tableau[to])) {
        return {
          move: { type: 'waste-to-tableau', to },
          description: `덱의 ${wasteCard.value} ${wasteCard.suit} 카드를 ${to + 1}번 열로 배치합니다.`,
          targetColumn: to,
        };
      }
    }
  }

  // 6. Tableau to tableau reorganizing
  for (let from = 0; from < state.tableau.length; from += 1) {
    const pile = state.tableau[from];
    for (let cardIndex = 0; cardIndex < pile.length; cardIndex += 1) {
      if (!pile[cardIndex].isFaceUp) continue;
      if (cardIndex === 0 && pile[cardIndex].power === 13) continue;
      const run = pile.slice(cardIndex);
      if (!isValidTableauRun(run)) continue;
      for (let to = 0; to < state.tableau.length; to += 1) {
        if (to === from) continue;
        if (canPlaceOnTableau(run[0], state.tableau[to])) {
          return {
            move: { type: 'tableau-to-tableau', from, cardIndex, to },
            description: `${pile[cardIndex].value} 카드를 ${to + 1}번 열로 연결합니다.`,
            sourceColumn: from,
            targetColumn: to,
          };
        }
      }
    }
  }

  // 7. Stock draw or recycle
  if (state.stock.length > 0) {
    return {
      move: { type: 'draw' },
      description: '덱에서 새 카드를 뽑습니다.',
    };
  }
  if (state.waste.length > 0) {
    return {
      move: { type: 'recycle' },
      description: '카드를 다시 뒤집어 덱을 순환합니다.',
    };
  }

  return null;
}

export function autoCollectToFoundations(state: SolitaireState): { nextState: SolitaireState; count: number } {
  let current = state;
  let count = 0;
  let movedInLoop = true;

  while (movedInLoop) {
    movedInLoop = false;
    const waste = current.waste[current.waste.length - 1];
    if (waste && canPlaceOnFoundation(waste, current.foundations[waste.suit])) {
      const next = applySolitaireMove(current, { type: 'waste-to-foundation' });
      if (next) {
        current = next;
        count += 1;
        movedInLoop = true;
        continue;
      }
    }

    for (let col = 0; col < current.tableau.length; col += 1) {
      const pile = current.tableau[col];
      const top = pile[pile.length - 1];
      if (top && top.isFaceUp && canPlaceOnFoundation(top, current.foundations[top.suit])) {
        const next = applySolitaireMove(current, { type: 'tableau-to-foundation', from: col });
        if (next) {
          current = next;
          count += 1;
          movedInLoop = true;
          break;
        }
      }
    }
  }

  return { nextState: current, count };
}

// Deterministic deal for the shared daily board and replayable free games.
// Local mulberry32 keeps this chunk independent of other game engines.
export function createSeededSolitaireDeal(seed: number): SolitaireState {
  let a = seed | 0;
  const random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return dealSolitaire(random);
}
