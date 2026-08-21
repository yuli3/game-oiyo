import { reversiFlips, reversiMoves } from "./ai/reversi";

export type ReversiDisc = 1 | 2;
export type ReversiStatus = "playing" | "over";
export interface ReversiState { board: (ReversiDisc | null)[]; current: ReversiDisc; status: ReversiStatus; winner: ReversiDisc | 0 | null; moves: number; passed: ReversiDisc | null }

export function createReversi(): ReversiState {
  const board: (ReversiDisc | null)[] = Array(64).fill(null); board[27] = 2; board[28] = 1; board[35] = 1; board[36] = 2;
  return { board, current: 1, status: "playing", winner: null, moves: 0, passed: null };
}

export function restoreReversi(board: readonly (number | null)[], current: ReversiDisc): ReversiState | null {
  if (board.length !== 64 || board.some((cell) => cell !== null && cell !== 1 && cell !== 2)) return null;
  const restored = [...board] as (ReversiDisc | null)[]; const occupied = restored.filter((cell) => cell !== null).length;
  if (occupied < 4 || reversiMoves(restored, current).length === 0) return null;
  return { board: restored, current, status: "playing", winner: null, moves: occupied - 4, passed: null };
}

export function playReversi(state: ReversiState, index: number): ReversiState {
  if (state.status !== "playing" || !Number.isInteger(index) || index < 0 || index >= 64) return state;
  const flips = reversiFlips(state.board, index, state.current); if (!flips.length) return state;
  const board = [...state.board]; board[index] = state.current; for (const flipped of flips) board[flipped] = state.current;
  const opponent: ReversiDisc = state.current === 1 ? 2 : 1;
  if (reversiMoves(board, opponent).length > 0) return { ...state, board, current: opponent, moves: state.moves + 1, passed: null };
  if (reversiMoves(board, state.current).length > 0) return { ...state, board, moves: state.moves + 1, passed: opponent };
  const black = board.filter((cell) => cell === 1).length; const white = board.filter((cell) => cell === 2).length;
  return { ...state, board, status: "over", winner: black === white ? 0 : black > white ? 1 : 2, moves: state.moves + 1, passed: opponent };
}

export function reversiAnalysis(state: ReversiState, player: ReversiDisc) {
  const opponent: ReversiDisc = player === 1 ? 2 : 1; const corners = [0, 7, 56, 63];
  return { discs: state.board.filter((cell) => cell === player).length, mobility: reversiMoves(state.board, player).length, opponentMobility: reversiMoves(state.board, opponent).length, corners: corners.filter((index) => state.board[index] === player).length };
}

export { reversiBestMove, reversiFlips, reversiMoveReview, reversiMoves, type ReversiMoveReview } from "./ai/reversi";
