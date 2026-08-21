import { janggiApply, janggiMoves, type JanggiBoard, type JanggiMove } from "./ai/janggi";

export type JanggiSide = "cho" | "han";
export type JanggiStatus = "playing" | "over";
export interface JanggiState { board: JanggiBoard; current: JanggiSide; status: JanggiStatus; winner: JanggiSide | null; moves: number; passed: JanggiSide | null; history: JanggiMove[] }

export const makeInitialJanggiBoard = (): JanggiBoard => [
  ["r", "n", "b", "g", null, "g", "b", "n", "r"],
  [null, null, null, null, "k", null, null, null, null],
  [null, "p", null, null, null, null, null, "p", null],
  ["s", null, "s", null, "s", null, "s", null, "s"],
  Array(9).fill(null), Array(9).fill(null),
  ["S", null, "S", null, "S", null, "S", null, "S"],
  [null, "P", null, null, null, null, null, "P", null],
  [null, null, null, null, "K", null, null, null, null],
  ["R", "N", "B", "G", null, "G", "B", "N", "R"],
];

export function createJanggi(): JanggiState { return { board: makeInitialJanggiBoard(), current: "cho", status: "playing", winner: null, moves: 0, passed: null, history: [] }; }
const sameMove = (a: JanggiMove, b: JanggiMove) => a.from[0] === b.from[0] && a.from[1] === b.from[1] && a.to[0] === b.to[0] && a.to[1] === b.to[1];
const hasGeneral = (board: JanggiBoard, side: JanggiSide) => board.some((row) => row.includes(side === "cho" ? "k" : "K"));

export function playJanggi(state: JanggiState, move: JanggiMove): JanggiState {
  if (state.status !== "playing") return state;
  const legal = janggiMoves(state.board, state.current === "cho").some((candidate) => sameMove(candidate, move));
  if (!legal) return state;
  const board = janggiApply(state.board, move); const winner = !hasGeneral(board, "cho") ? "han" : !hasGeneral(board, "han") ? "cho" : null;
  const next: JanggiSide = state.current === "cho" ? "han" : "cho"; const history = [...state.history, move];
  if (winner) return { board, current: state.current, status: "over", winner, moves: state.moves + 1, passed: null, history };
  const nextMoves = janggiMoves(board, next === "cho");
  return { board, current: nextMoves.length ? next : state.current, status: "playing", winner: null, moves: state.moves + 1, passed: nextMoves.length ? null : next, history };
}

export function replayJanggi(history: readonly JanggiMove[]): JanggiState | null {
  let state = createJanggi();
  for (const move of history) { const next = playJanggi(state, move); if (next === state) return null; state = next; if (state.status === "over" && move !== history.at(-1)) return null; }
  return state;
}

const VALUES: Record<string, number> = { r: 13, p: 7, n: 5, b: 3, g: 3, s: 2, k: 0 };
export function janggiAnalysis(state: JanggiState, side: JanggiSide) {
  let material = 0; let pieces = 0; let captures = 16;
  for (const row of state.board) for (const piece of row) if (piece) { if ((piece === piece.toLowerCase()) === (side === "cho")) { material += VALUES[piece.toLowerCase()]; pieces++; } }
  captures -= state.board.flat().filter((piece) => piece && (piece === piece.toLowerCase()) !== (side === "cho")).length;
  return { material, pieces, captures, mobility: janggiMoves(state.board, side === "cho").length };
}

export { janggiBestMove, janggiMoveReview, janggiMoves, janggiTargets, isChoPiece, type JanggiMoveReview } from "./ai/janggi";
export type { JanggiBoard, JanggiMove } from "./ai/janggi";
