// American/English draughts (checkers): mandatory captures, chained jumps,
// forward-only men, and crowning ends a capture turn.
import { pickWeighted, type AiLevel } from "./types";

const SIZE = 8;

export type CheckersPiece = { player: number; isKing: boolean };
export type CheckersBoard = (CheckersPiece | null)[];
export type CheckersMove = { from: number; to: number; jumpOver?: number };
export type CheckersTurn = { from: number; path: number[]; captures: number[] };

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function movesForPiece(board: CheckersBoard, from: number, capturesOnly: boolean): CheckersMove[] {
  const piece = board[from];
  if (!piece) return [];
  const r = Math.floor(from / SIZE);
  const c = from % SIZE;
  const directions = piece.isKing ? [-1, 1] : [piece.player === 1 ? -1 : 1];
  const captures: CheckersMove[] = [];
  const steps: CheckersMove[] = [];

  for (const dr of directions) {
    for (const dc of [-1, 1]) {
      const stepR = r + dr;
      const stepC = c + dc;
      if (!inBounds(stepR, stepC)) continue;
      const step = stepR * SIZE + stepC;
      if (board[step] === null) {
        if (!capturesOnly) steps.push({ from, to: step });
        continue;
      }
      const landR = r + dr * 2;
      const landC = c + dc * 2;
      if (!inBounds(landR, landC)) continue;
      const landing = landR * SIZE + landC;
      if (board[step]?.player !== piece.player && board[landing] === null) {
        captures.push({ from, to: landing, jumpOver: step });
      }
    }
  }
  return captures.length > 0 ? captures : steps;
}

/** Immediate legal moves. Captures are mandatory. `forcedFrom` is used during a jump chain. */
export function checkersMoves(board: CheckersBoard, player: number, forcedFrom?: number): CheckersMove[] {
  if (forcedFrom !== undefined) {
    const piece = board[forcedFrom];
    if (!piece || piece.player !== player) return [];
    return movesForPiece(board, forcedFrom, true).filter((move) => move.jumpOver !== undefined);
  }

  const captures: CheckersMove[] = [];
  const steps: CheckersMove[] = [];
  for (let from = 0; from < board.length; from++) {
    if (board[from]?.player !== player) continue;
    const pieceMoves = movesForPiece(board, from, false);
    for (const move of pieceMoves) {
      (move.jumpOver !== undefined ? captures : steps).push(move);
    }
  }
  return captures.length > 0 ? captures : steps;
}

export function checkersApply(board: CheckersBoard, move: CheckersMove): CheckersBoard {
  const next = board.slice();
  const piece = next[move.from];
  if (!piece) return next;
  const row = Math.floor(move.to / SIZE);
  const promoted = !piece.isKing && ((piece.player === 1 && row === 0) || (piece.player === 2 && row === SIZE - 1));
  next[move.to] = promoted ? { ...piece, isKing: true } : piece;
  next[move.from] = null;
  if (move.jumpOver !== undefined) next[move.jumpOver] = null;
  return next;
}

function expandCaptureTurn(board: CheckersBoard, move: CheckersMove): CheckersTurn[] {
  const before = board[move.from]!;
  const next = checkersApply(board, move);
  const after = next[move.to]!;
  const crowned = !before.isKing && after.isKing;
  const continuations = crowned ? [] : checkersMoves(next, before.player, move.to);
  if (continuations.length === 0) {
    return [{ from: move.from, path: [move.to], captures: [move.jumpOver!] }];
  }
  return continuations.flatMap((continuation) =>
    expandCaptureTurn(next, continuation).map((tail) => ({
      from: move.from,
      path: [move.to, ...tail.path],
      captures: [move.jumpOver!, ...tail.captures],
    })),
  );
}

/** Complete legal turns, with every mandatory jump chain expanded. */
export function checkersTurns(board: CheckersBoard, player: number): CheckersTurn[] {
  return checkersMoves(board, player).flatMap((move) =>
    move.jumpOver === undefined
      ? [{ from: move.from, path: [move.to], captures: [] }]
      : expandCaptureTurn(board, move),
  );
}

export function checkersApplyTurn(board: CheckersBoard, turn: CheckersTurn): CheckersBoard {
  let next = board;
  let from = turn.from;
  for (let i = 0; i < turn.path.length; i++) {
    next = checkersApply(next, { from, to: turn.path[i], jumpOver: turn.captures[i] });
    from = turn.path[i];
  }
  return next;
}

function evaluate(board: CheckersBoard, player: number): number {
  let score = 0;
  for (let i = 0; i < board.length; i++) {
    const piece = board[i];
    if (!piece) continue;
    const row = Math.floor(i / SIZE);
    const advance = piece.player === 1 ? SIZE - 1 - row : row;
    const value = (piece.isKing ? 165 : 100) + advance * 2;
    score += piece.player === player ? value : -value;
  }
  return score;
}

function negamax(board: CheckersBoard, depth: number, alpha: number, beta: number, player: number): number {
  const turns = checkersTurns(board, player);
  if (turns.length === 0) return -100_000 - depth;
  if (depth <= 0) return evaluate(board, player);
  const opponent = player === 1 ? 2 : 1;
  turns.sort((a, b) => b.captures.length - a.captures.length);
  let best = -Infinity;
  for (const turn of turns) {
    const value = -negamax(checkersApplyTurn(board, turn), depth - 1, -beta, -alpha, opponent);
    best = Math.max(best, value);
    alpha = Math.max(alpha, best);
    if (alpha >= beta) break;
  }
  return best;
}

export type CheckersTurnReview = { from: number; to: number; captures: number; chain: boolean };
export function checkersTurnReview(turn: CheckersTurn): CheckersTurnReview {
  return { from: turn.from, to: turn.path.at(-1) ?? turn.from, captures: turn.captures.length, chain: turn.captures.length > 1 };
}

/** Best complete turn for `ai`; null means the player loses because no legal move exists. */
export function checkersBestMove(board: CheckersBoard, ai: number, level: AiLevel): CheckersTurn | null {
  const opponent = ai === 1 ? 2 : 1;
  const turns = checkersTurns(board, ai);
  if (turns.length === 0) return null;
  const depth = level === 1 ? 2 : level === 2 ? 4 : 6;
  const scored = turns
    .map((turn) => ({ m: turn, val: -negamax(checkersApplyTurn(board, turn), depth - 1, -Infinity, Infinity, opponent) }))
    .sort((a, b) => b.val - a.val || a.m.from - b.m.from || a.m.path[0] - b.m.path[0]);
  if (level === 1 && scored[0].val < 50_000) return pickWeighted(scored, 3).m;
  return scored[0].m;
}
