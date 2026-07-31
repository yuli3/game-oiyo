import type { ChessMove, ChessState } from "./ai/chess";
import type { AiLevel } from "./ai/types";

export const CHESS_AI_BUDGET_MS: Record<AiLevel, number> = { 1: 80, 2: 250, 3: 800 };
export const CHESS_AI_MAX_DEPTH: Record<AiLevel, number> = { 1: 2, 2: 4, 3: 6 };

export type ChessSearchRequest = {
  type: "search";
  requestId: number;
  positionKey: string;
  state: ChessState;
  level: AiLevel;
};

export type ChessSearchResponse = {
  type: "result";
  requestId: number;
  positionKey: string;
  move: ChessMove | null;
  completedDepth: number;
  aborted: boolean;
  elapsedMs: number;
};

export function isCurrentChessSearchResponse(
  response: ChessSearchResponse,
  requestId: number,
  positionKey: string,
): boolean {
  return response.type === "result"
    && response.requestId === requestId
    && response.positionKey === positionKey;
}
