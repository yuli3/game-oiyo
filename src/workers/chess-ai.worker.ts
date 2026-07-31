/// <reference lib="webworker" />

import { chessBestStateMoveIterative } from "../lib/games/ai/chess";
import {
  CHESS_AI_BUDGET_MS,
  CHESS_AI_MAX_DEPTH,
  type ChessSearchRequest,
  type ChessSearchResponse,
} from "../lib/games/chess-worker-protocol";

self.onmessage = (event: MessageEvent<ChessSearchRequest>) => {
  const request = event.data;
  if (request?.type !== "search") return;
  const startedAt = performance.now();
  const deadline = startedAt + CHESS_AI_BUDGET_MS[request.level];
  const result = chessBestStateMoveIterative(
    request.state,
    CHESS_AI_MAX_DEPTH[request.level],
    () => performance.now() >= deadline,
  );
  const response: ChessSearchResponse = {
    type: "result",
    requestId: request.requestId,
    positionKey: request.positionKey,
    ...result,
    elapsedMs: performance.now() - startedAt,
  };
  self.postMessage(response);
};

export {};
