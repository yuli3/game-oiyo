import { isFreeCellWon, type FreeCellCard, type FreeCellState } from "./freecell";
import { isSolitaireWon, type SolitaireCard, type SolitaireState } from "./solitaire";
import { isSudokuSolved, type SudokuValue } from "./logic-puzzles";
import { checkersMoves, type CheckersPiece } from "./ai/checkers";
import { isPuzzle15Solvable } from "./puzzle15";
import { reversiMoves } from "./ai/reversi";
import type { AiLevel, GameMode } from "./ai/types";

type BoardCell = 0 | 1 | 2;
type ConnectFourSave = { version: 1; board: BoardCell[][]; currentPlayer: 1 | 2; mode: GameMode; level: AiLevel };
type GomokuSave = { version: 1; board: (1 | 2 | null)[]; isBlackTurn: boolean; mode: GameMode; level: AiLevel };
type SolitaireSave = { version: 1; state: SolitaireState };
type FreeCellSave = { version: 1; state: FreeCellState };
export type SudokuSave = { version: 1; grid: SudokuValue[][]; seconds: number };
export type Puzzle15Size = 3 | 4 | 5;
export type Puzzle15Save = { version: 1; size: Puzzle15Size; board: number[]; puzzleSeed: string; moves: number; seconds: number };
export type CheckersSave = { version: 1; board: (CheckersPiece | null)[]; isRedTurn: boolean; forcedFrom: number | null; mode: GameMode; level: AiLevel };
export type ReversiSave = { version: 1; board: (1 | 2 | null)[]; isBlackTurn: boolean; mode: GameMode; level: AiLevel };
export type Game2048Save = { version: 1; board: (number | null)[]; score: number };

export const ACTIVE_GAME_KEYS = {
  solitaire: "oiyo:solitaire-state:v1",
  freecell: "oiyo:freecell-state:v1",
  connectFour: "oiyo:connect-four-state:v1",
  gomoku: "oiyo:gomoku-state:v1",
  sudoku: "oiyo:sudoku-state:v1",
  puzzle15: "oiyo:puzzle15-state:v1",
  checkers: "oiyo:checkers-state:v1",
  reversi: "oiyo:reversi-state:v1",
  game2048: "oiyo:game-2048-state:v1",
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

// Single fixed demo puzzle (see Sudoku.tsx). Restore validates entered cells
// against these givens so a tampered/foreign board is rejected, not silently accepted.
export const SUDOKU_DEMO_PUZZLE: SudokuValue[][] = [
  [5, 3, null, null, 7, null, null, null, null],
  [6, null, null, 1, 9, 5, null, null, null],
  [null, 9, 8, null, null, null, null, 6, null],
  [8, null, null, null, 6, null, null, null, 3],
  [4, null, null, 8, null, 3, null, null, 1],
  [7, null, null, null, 2, null, null, null, 6],
  [null, 6, null, null, null, null, 2, 8, null],
  [null, null, null, 4, 1, 9, null, null, 5],
  [null, null, null, null, 8, null, null, 7, 9],
];

export function parseSudokuSave(value: unknown): SudokuSave | null {
  if (!isRecord(value) || value.version !== 1 || !Number.isInteger(value.seconds) || (value.seconds as number) < 0) return null;
  if (!Array.isArray(value.grid) || value.grid.length !== 9 || value.grid.some((row) => !Array.isArray(row) || row.length !== 9)) return null;
  const grid = (value.grid as unknown[][]).map((row) => [...row]) as SudokuValue[][];
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const cell = grid[r][c];
      const given = SUDOKU_DEMO_PUZZLE[r][c];
      if (given !== null) { if (cell !== given) return null; continue; }
      if (cell !== null && (!Number.isInteger(cell) || cell < 1 || cell > 9)) return null;
    }
  }
  if (isSudokuSolved(grid)) return null;
  return { version: 1, grid, seconds: value.seconds as number };
}

export function loadSudokuSave(): SudokuSave | null { return parseSudokuSave(read(ACTIVE_GAME_KEYS.sudoku)); }
export function storeSudokuSave(grid: SudokuValue[][], seconds: number) { const parsed = parseSudokuSave({ version: 1, grid, seconds }); if (parsed) write(ACTIVE_GAME_KEYS.sudoku, parsed); }
export function clearSudokuSave() { remove(ACTIVE_GAME_KEYS.sudoku); }

function isPuzzle15Size(value: unknown): value is Puzzle15Size { return value === 3 || value === 4 || value === 5; }

export function parsePuzzle15Save(value: unknown): Puzzle15Save | null {
  if (!isRecord(value) || value.version !== 1 || !isPuzzle15Size(value.size) || typeof value.puzzleSeed !== "string" || value.puzzleSeed.length === 0) return null;
  if (!Number.isInteger(value.moves) || (value.moves as number) < 0 || !Number.isInteger(value.seconds) || (value.seconds as number) < 0) return null;
  const size = value.size;
  const cellCount = size * size;
  if (!Array.isArray(value.board) || value.board.length !== cellCount) return null;
  const board = [...value.board] as number[];
  if (!board.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < cellCount)) return null;
  if (new Set(board).size !== cellCount) return null;
  if (board.every((v, i) => v === (i + 1) % cellCount)) return null; // already solved: not resumable
  if (!isPuzzle15Solvable(board, size)) return null; // a tampered board could otherwise be permanently stuck
  return { version: 1, size, board, puzzleSeed: value.puzzleSeed, moves: value.moves as number, seconds: value.seconds as number };
}

export function loadPuzzle15Save(): Puzzle15Save | null { return parsePuzzle15Save(read(ACTIVE_GAME_KEYS.puzzle15)); }
export function storePuzzle15Save(value: Omit<Puzzle15Save, "version">) { const parsed = parsePuzzle15Save({ version: 1, ...value }); if (parsed) write(ACTIVE_GAME_KEYS.puzzle15, parsed); }
export function clearPuzzle15Save() { remove(ACTIVE_GAME_KEYS.puzzle15); }

function parseCheckersPiece(value: unknown): CheckersPiece | null {
  if (!isRecord(value) || Object.keys(value).length !== 2 || (value.player !== 1 && value.player !== 2) || typeof value.isKing !== "boolean") return null;
  return { player: value.player, isKing: value.isKing };
}

export function parseCheckersSave(value: unknown): CheckersSave | null {
  if (!isRecord(value) || value.version !== 1 || !isMode(value.mode) || !isLevel(value.level) || typeof value.isRedTurn !== "boolean") return null;
  if (!Array.isArray(value.board) || value.board.length !== 64) return null;
  const board: (CheckersPiece | null)[] = [];
  for (const cell of value.board) {
    if (cell === null) { board.push(null); continue; }
    const piece = parseCheckersPiece(cell);
    if (!piece) return null;
    board.push(piece);
  }
  const redCount = board.filter((piece) => piece?.player === 1).length;
  const blackCount = board.filter((piece) => piece?.player === 2).length;
  if (redCount > 12 || blackCount > 12) return null;
  if (value.forcedFrom !== null && (!Number.isInteger(value.forcedFrom) || (value.forcedFrom as number) < 0 || (value.forcedFrom as number) > 63)) return null;
  const forcedFrom = value.forcedFrom as number | null;
  const currentPlayer = value.isRedTurn ? 1 : 2;
  if (forcedFrom !== null) {
    if (board[forcedFrom]?.player !== currentPlayer) return null;
    if (checkersMoves(board, currentPlayer, forcedFrom).length === 0) return null;
  } else if (checkersMoves(board, currentPlayer).length === 0) {
    return null; // no legal move: game already decided, not resumable
  }
  return { version: 1, board, isRedTurn: value.isRedTurn, forcedFrom, mode: value.mode, level: value.level };
}

export function loadCheckersSave(): CheckersSave | null { return parseCheckersSave(read(ACTIVE_GAME_KEYS.checkers)); }
export function storeCheckersSave(value: Omit<CheckersSave, "version">) { const parsed = parseCheckersSave({ version: 1, ...value }); if (parsed) write(ACTIVE_GAME_KEYS.checkers, parsed); }
export function clearCheckersSave() { remove(ACTIVE_GAME_KEYS.checkers); }

export function parseReversiSave(value: unknown): ReversiSave | null {
  if (!isRecord(value) || value.version !== 1 || !isMode(value.mode) || !isLevel(value.level) || typeof value.isBlackTurn !== "boolean") return null;
  if (!Array.isArray(value.board) || value.board.length !== 64 || value.board.some((cell) => cell !== null && cell !== 1 && cell !== 2)) return null;
  const board = [...value.board] as (1 | 2 | null)[];
  const currentPlayer = value.isBlackTurn ? 1 : 2;
  if (reversiMoves(board, currentPlayer).length === 0) return null; // no legal move: game already decided, not resumable
  return { version: 1, board, isBlackTurn: value.isBlackTurn, mode: value.mode, level: value.level };
}

export function loadReversiSave(): ReversiSave | null { return parseReversiSave(read(ACTIVE_GAME_KEYS.reversi)); }
export function storeReversiSave(value: { board: (number | null)[]; isBlackTurn: boolean; mode: GameMode; level: AiLevel }) { const parsed = parseReversiSave({ version: 1, ...value }); if (parsed) write(ACTIVE_GAME_KEYS.reversi, parsed); }
export function clearReversiSave() { remove(ACTIVE_GAME_KEYS.reversi); }

// 2048 board: 16 row-major cells. The component treats reaching 2048 as a
// terminal win, so a resumable save may only hold tiles in [2, 1024].
function game2048HasMove(board: readonly (number | null)[]): boolean {
  for (let index = 0; index < 16; index += 1) {
    const value = board[index];
    if (value === null) return true;
    const row = Math.floor(index / 4), col = index % 4;
    if (col < 3 && board[index + 1] === value) return true;
    if (row < 3 && board[index + 4] === value) return true;
  }
  return false;
}

export function parseGame2048Save(value: unknown): Game2048Save | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.board) || value.board.length !== 16) return null;
  const board = [...value.board] as (number | null)[];
  const isTile = (cell: unknown): cell is number =>
    typeof cell === "number" && Number.isInteger(cell) && cell >= 2 && cell <= 1024 && (cell & (cell - 1)) === 0;
  if (!board.every((cell) => cell === null || isTile(cell))) return null;
  const tiles = board.filter((cell): cell is number => cell !== null);
  if (tiles.length < 2) return null; // a fresh game always spawns two tiles
  if (!game2048HasMove(board)) return null; // no legal move left: terminal, not resumable
  // Score bound: every tile of value v can contribute at most v*(log2(v)-1)
  // score if it was merged up entirely from 2s; spawned tiles contribute 0.
  const maxScore = tiles.reduce((sum, v) => sum + v * (Math.log2(v) - 1), 0);
  if (!Number.isInteger(value.score) || (value.score as number) < 0 || (value.score as number) % 4 !== 0 || (value.score as number) > maxScore) return null;
  return { version: 1, board, score: value.score as number };
}

export function loadGame2048Save(): Game2048Save | null { return parseGame2048Save(read(ACTIVE_GAME_KEYS.game2048)); }
export function storeGame2048Save(value: Omit<Game2048Save, "version">) { const parsed = parseGame2048Save({ version: 1, ...value }); if (parsed) write(ACTIVE_GAME_KEYS.game2048, parsed); }
export function clearGame2048Save() { remove(ACTIVE_GAME_KEYS.game2048); }
