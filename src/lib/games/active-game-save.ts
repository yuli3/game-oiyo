import { isFreeCellWon, type FreeCellCard, type FreeCellState } from "./freecell";
import { isSolitaireWon, type SolitaireCard, type SolitaireState } from "./solitaire";
import type { AiLevel, GameMode } from "./ai/types";

type BoardCell = 0 | 1 | 2;
type ConnectFourSave = { version: 1; board: BoardCell[][]; currentPlayer: 1 | 2; mode: GameMode; level: AiLevel };
type GomokuSave = { version: 1; board: (1 | 2 | null)[]; isBlackTurn: boolean; mode: GameMode; level: AiLevel };
type SolitaireSave = { version: 1; state: SolitaireState };
type FreeCellSave = { version: 1; state: FreeCellState };

export const ACTIVE_GAME_KEYS = {
  solitaire: "oiyo:solitaire-state:v1",
  freecell: "oiyo:freecell-state:v1",
  connectFour: "oiyo:connect-four-state:v1",
  gomoku: "oiyo:gomoku-state:v1",
} as const;

function read(key: string): unknown {
  if (typeof localStorage === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
}

function write(key: string, value: unknown) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is best-effort */ }
}

function remove(key: string) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.removeItem(key); } catch { /* storage is best-effort */ }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMode(value: unknown): value is GameMode { return value === "local" || value === "ai"; }
function isLevel(value: unknown): value is AiLevel { return value === 1 || value === 2 || value === 3; }

function hasLine(board: readonly (1 | 2 | null)[], size: number, needed: number): boolean {
  for (let index = 0; index < board.length; index += 1) {
    const player = board[index];
    if (player === null) continue;
    const row = Math.floor(index / size), col = index % size;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      let count = 1;
      for (let step = 1; step < needed; step += 1) {
        const r = row + dr * step, c = col + dc * step;
        if (r < 0 || r >= size || c < 0 || c >= size || board[r * size + c] !== player) break;
        count += 1;
      }
      if (count === needed) return true;
    }
  }
  return false;
}

export function parseConnectFourSave(value: unknown): ConnectFourSave | null {
  if (!isRecord(value) || value.version !== 1 || !isMode(value.mode) || !isLevel(value.level) || (value.currentPlayer !== 1 && value.currentPlayer !== 2)) return null;
  if (!Array.isArray(value.board) || value.board.length !== 6 || value.board.some((row) => !Array.isArray(row) || row.length !== 7 || row.some((cell) => cell !== 0 && cell !== 1 && cell !== 2))) return null;
  const board = (value.board as BoardCell[][]).map((row) => [...row]);
  for (let col = 0; col < 7; col += 1) {
    let emptySeen = false;
    for (let row = 5; row >= 0; row -= 1) {
      if (board[row][col] === 0) emptySeen = true;
      else if (emptySeen) return null;
    }
  }
  const flat = board.flat();
  const ones = flat.filter((cell) => cell === 1).length, twos = flat.filter((cell) => cell === 2).length;
  if (ones + twos === 0 || ones < twos || ones > twos + 1 || value.currentPlayer !== (ones === twos ? 1 : 2) || hasLine(flat.map((cell) => cell || null), 7, 4) || ones + twos === 42) return null;
  return { version: 1, board, currentPlayer: value.currentPlayer, mode: value.mode, level: value.level };
}

export function loadConnectFourSave(): ConnectFourSave | null { return parseConnectFourSave(read(ACTIVE_GAME_KEYS.connectFour)); }
export function storeConnectFourSave(value: Omit<ConnectFourSave, "version">) { const parsed = parseConnectFourSave({ version: 1, ...value }); if (parsed) write(ACTIVE_GAME_KEYS.connectFour, parsed); }
export function clearConnectFourSave() { remove(ACTIVE_GAME_KEYS.connectFour); }

export function parseGomokuSave(value: unknown): GomokuSave | null {
  if (!isRecord(value) || value.version !== 1 || !isMode(value.mode) || !isLevel(value.level) || typeof value.isBlackTurn !== "boolean") return null;
  if (!Array.isArray(value.board) || value.board.length !== 225 || value.board.some((cell) => cell !== null && cell !== 1 && cell !== 2)) return null;
  const board = [...value.board] as (1 | 2 | null)[];
  const ones = board.filter((cell) => cell === 1).length, twos = board.filter((cell) => cell === 2).length;
  if (ones + twos === 0 || ones < twos || ones > twos + 1 || value.isBlackTurn !== (ones === twos) || hasLine(board, 15, 5) || ones + twos === 225) return null;
  return { version: 1, board, isBlackTurn: value.isBlackTurn, mode: value.mode, level: value.level };
}

export function loadGomokuSave(): GomokuSave | null { return parseGomokuSave(read(ACTIVE_GAME_KEYS.gomoku)); }
export function storeGomokuSave(value: Omit<GomokuSave, "version">) { const parsed = parseGomokuSave({ version: 1, ...value }); if (parsed) write(ACTIVE_GAME_KEYS.gomoku, parsed); }
export function clearGomokuSave() { remove(ACTIVE_GAME_KEYS.gomoku); }

const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
const CARD_VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
function parseCard(value: unknown, faceUp: boolean): SolitaireCard | FreeCellCard | null {
  if (!isRecord(value) || !SUITS.includes(value.suit as typeof SUITS[number]) || typeof value.value !== "string" || !Number.isInteger(value.power) || (value.power as number) < 1 || (value.power as number) > 13 || typeof value.id !== "string" || typeof value.isRed !== "boolean") return null;
  const expectedRed = value.suit === "hearts" || value.suit === "diamonds";
  const expectedValue = CARD_VALUES[(value.power as number) - 1];
  const expectedId = faceUp ? `${value.suit}-${value.power}` : `${value.suit}-${expectedValue}`;
  if (value.isRed !== expectedRed || value.value !== expectedValue || value.id !== expectedId || (faceUp && typeof value.isFaceUp !== "boolean")) return null;
  const card = { id: value.id, suit: value.suit, value: value.value, power: value.power, isRed: value.isRed } as FreeCellCard;
  return faceUp ? { ...card, isFaceUp: value.isFaceUp as boolean } : card;
}

function uniqueDeck(cards: readonly (SolitaireCard | FreeCellCard)[]): boolean {
  return cards.length === 52 && new Set(cards.map((card) => card.id)).size === 52 && new Set(cards.map((card) => `${card.suit}-${card.power}`)).size === 52;
}

function parseCardArray(value: unknown, faceUp: boolean): (SolitaireCard | FreeCellCard)[] | null {
  if (!Array.isArray(value)) return null;
  const cards = value.map((card) => parseCard(card, faceUp));
  return cards.some((card) => card === null) ? null : cards as (SolitaireCard | FreeCellCard)[];
}

export function parseSolitaireSave(value: unknown): SolitaireSave | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.state)) return null;
  const candidate = value.state;
  const stock = parseCardArray(candidate.stock, true) as SolitaireCard[] | null;
  const waste = parseCardArray(candidate.waste, true) as SolitaireCard[] | null;
  if (!stock || !waste || !Array.isArray(candidate.tableau) || candidate.tableau.length !== 7 || !isRecord(candidate.foundations)) return null;
  const tableau = candidate.tableau.map((pile) => parseCardArray(pile, true) as SolitaireCard[] | null);
  const foundationCandidate = candidate.foundations;
  const foundations = Object.fromEntries(SUITS.map((suit) => [suit, parseCardArray(foundationCandidate[suit], true)])) as Record<typeof SUITS[number], SolitaireCard[] | null>;
  if (tableau.some((pile) => !pile) || SUITS.some((suit) => !foundations[suit])) return null;
  const state: SolitaireState = { stock, waste, tableau: tableau as SolitaireCard[][], foundations: foundations as SolitaireState["foundations"] };
  const cards = [...stock, ...waste, ...state.tableau.flat(), ...SUITS.flatMap((suit) => state.foundations[suit])];
  if (!uniqueDeck(cards) || isSolitaireWon(state)) return null;
  return { version: 1, state };
}

export function loadSolitaireSave(): SolitaireSave | null { return parseSolitaireSave(read(ACTIVE_GAME_KEYS.solitaire)); }
export function storeSolitaireSave(state: SolitaireState) { const parsed = parseSolitaireSave({ version: 1, state }); if (parsed) write(ACTIVE_GAME_KEYS.solitaire, parsed); }
export function clearSolitaireSave() { remove(ACTIVE_GAME_KEYS.solitaire); }

export function parseFreeCellSave(value: unknown): FreeCellSave | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.state) || !Array.isArray(value.state.tableau) || value.state.tableau.length !== 8 || !Array.isArray(value.state.freeCells) || value.state.freeCells.length !== 4 || !Array.isArray(value.state.foundation) || value.state.foundation.length !== 4) return null;
  const tableau = value.state.tableau.map((pile) => parseCardArray(pile, false) as FreeCellCard[] | null);
  const freeCells = value.state.freeCells.map((card) => card === null ? null : parseCard(card, false) as FreeCellCard | null);
  const foundation = value.state.foundation.map((pile) => parseCardArray(pile, false) as FreeCellCard[] | null);
  if (tableau.some((pile) => !pile) || foundation.some((pile) => !pile) || value.state.freeCells.some((card, index) => card !== null && freeCells[index] === null)) return null;
  const state: FreeCellState = { tableau: tableau as FreeCellCard[][], freeCells, foundation: foundation as FreeCellCard[][] };
  const cards = [...state.tableau.flat(), ...state.freeCells.filter((card): card is FreeCellCard => card !== null), ...state.foundation.flat()];
  if (!uniqueDeck(cards) || isFreeCellWon(state)) return null;
  return { version: 1, state };
}

export function loadFreeCellSave(): FreeCellSave | null { return parseFreeCellSave(read(ACTIVE_GAME_KEYS.freecell)); }
export function storeFreeCellSave(state: FreeCellState) { const parsed = parseFreeCellSave({ version: 1, state }); if (parsed) write(ACTIVE_GAME_KEYS.freecell, parsed); }
export function clearFreeCellSave() { remove(ACTIVE_GAME_KEYS.freecell); }
