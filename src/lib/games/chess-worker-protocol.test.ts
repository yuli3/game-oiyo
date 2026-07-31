import { describe, expect, it } from "vitest";
import { createInitialChessState } from "./ai/chess";
import {
  CHESS_AI_BUDGET_MS,
  CHESS_AI_MAX_DEPTH,
  isCurrentChessSearchResponse,
  type ChessSearchResponse,
} from "./chess-worker-protocol";

describe("chess worker protocol", () => {
  it("uses strictly increasing bounded budgets and depths", () => {
    expect([CHESS_AI_BUDGET_MS[1], CHESS_AI_BUDGET_MS[2], CHESS_AI_BUDGET_MS[3]]).toEqual([80, 250, 800]);
    expect(CHESS_AI_MAX_DEPTH[1]).toBeLessThan(CHESS_AI_MAX_DEPTH[2]);
    expect(CHESS_AI_MAX_DEPTH[2]).toBeLessThan(CHESS_AI_MAX_DEPTH[3]);
  });

  it("rejects stale request ids and position keys", () => {
    const response: ChessSearchResponse = {
      type: "result", requestId: 4, positionKey: "position-a", move: null,
      completedDepth: 2, aborted: false, elapsedMs: 20,
    };
    expect(isCurrentChessSearchResponse(response, 4, "position-a")).toBe(true);
    expect(isCurrentChessSearchResponse(response, 5, "position-a")).toBe(false);
    expect(isCurrentChessSearchResponse(response, 4, "position-b")).toBe(false);
  });

  it("keeps protocol state structured-clone compatible", () => {
    expect(() => structuredClone({ type: "search", requestId: 1, positionKey: "initial", state: createInitialChessState(), level: 3 })).not.toThrow();
  });
});
