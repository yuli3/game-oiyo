export type MemoryGridSize = "4x4" | "6x4" | "6x6";
export type MemoryStatus = "playing" | "won";
export interface MemoryCard { id: number; symbolId: number; isFlipped: boolean; isMatched: boolean }
export interface MemoryState { seed: number; rngState: number; gridSize: MemoryGridSize; cards: MemoryCard[]; flipped: number[]; matchedPairs: number; flips: number; status: MemoryStatus }
export const MEMORY_GRID_CONFIG: Record<MemoryGridSize, { cols: number; rows: number }> = { "4x4": { cols: 4, rows: 4 }, "6x4": { cols: 6, rows: 4 }, "6x6": { cols: 6, rows: 6 } };

function nextRandom(state: number): number { let value = state >>> 0 || 0x9e3779b9; value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return value >>> 0; }

export function createMemoryGame(seed: number, gridSize: MemoryGridSize): MemoryState {
  const { cols, rows } = MEMORY_GRID_CONFIG[gridSize]; const pairCount = cols * rows / 2;
  const symbols = Array.from({ length: pairCount * 2 }, (_, index) => index % pairCount);
  let rngState = seed >>> 0;
  for (let index = symbols.length - 1; index > 0; index -= 1) { rngState = nextRandom(rngState); const swap = rngState % (index + 1); [symbols[index], symbols[swap]] = [symbols[swap], symbols[index]]; }
  return { seed: seed >>> 0, rngState, gridSize, cards: symbols.map((symbolId, id) => ({ id, symbolId, isFlipped: false, isMatched: false })), flipped: [], matchedPairs: 0, flips: 0, status: "playing" };
}

export function flipMemoryCard(state: MemoryState, cardId: number): MemoryState {
  if (state.status !== "playing" || state.flipped.length >= 2 || !Number.isInteger(cardId)) return state;
  const card = state.cards[cardId]; if (!card || card.id !== cardId || card.isFlipped || card.isMatched) return state;
  return { ...state, cards: state.cards.map((item) => item.id === cardId ? { ...item, isFlipped: true } : item), flipped: [...state.flipped, cardId], flips: state.flips + 1 };
}

export function resolveMemoryPair(state: MemoryState): MemoryState {
  if (state.status !== "playing" || state.flipped.length !== 2) return state;
  const [firstId, secondId] = state.flipped; const matched = state.cards[firstId].symbolId === state.cards[secondId].symbolId;
  const cards = state.cards.map((card) => firstId === card.id || secondId === card.id ? matched ? { ...card, isMatched: true } : { ...card, isFlipped: false } : card);
  const matchedPairs = state.matchedPairs + (matched ? 1 : 0); const totalPairs = cards.length / 2;
  return { ...state, cards, flipped: [], matchedPairs, status: matchedPairs === totalPairs ? "won" : "playing" };
}

export function memoryPairCount(state: MemoryState): number { return state.cards.length / 2; }
