import { describe, expect, it } from "vitest";

import { allLegalPlacements, emptyBoard, emptyCrowns } from "../kingdomino";
import { aiClaim, claim, finalResult, kingdominoAiReview, place, startGame } from "./kingdomino";

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function finishSetup() {
  const state = startGame(() => 0);
  while (state.phase === "setup" && state.pending.kind === "claim") {
    claim(state, state.pending.options[0]);
  }
  return state;
}

describe("kingdomino draft flow", () => {
  it("keeps apprentice choices deterministic and explains its claim", () => {
    const state = startGame(() => 0);
    claim(state, state.pending.kind === "claim" ? state.pending.options[0] : -1);
    expect(state.pending).toMatchObject({ kind:"claim", owner:"ai" });
    expect(aiClaim(state,1)).toBe(aiClaim(state,1));
    expect(kingdominoAiReview(state,1)).toMatchObject({ kind:"claim", tileId: expect.any(Number), crowns: expect.any(Number), projectedValue: expect.any(Number) });
  });

  it("uses the two-player A-B-B-A snake order for the opening draft", () => {
    const state = startGame(() => 0);
    expect(state.claimSeq).toEqual(["you", "ai", "ai", "you"]);
  });

  it("rejects a claim outside the pending option contract", () => {
    const state = startGame(() => 0);
    const pending = state.pending;
    expect(pending.kind).toBe("claim");
    claim(state, 99);
    expect(state.claimPos).toBe(0);
    expect(state.pending).toBe(pending);
  });

  it("rejects illegal placement and voluntary discard, then accepts a legal placement", () => {
    const state = finishSetup();
    expect(state.pending.kind).toBe("place");
    if (state.pending.kind !== "place") throw new Error("expected placement");

    const before = state.curIdx;
    place(state, { a: { r: 0, c: 0 }, b: { r: 0, c: 1 } });
    expect(state.curIdx).toBe(before);
    place(state, null);
    expect(state.curIdx).toBe(before);

    if (state.pending.kind !== "place") throw new Error("expected placement");
    const kingdom = state[state.pending.owner];
    const legal = allLegalPlacements(kingdom.board, state.pending.tile)[0];
    place(state, legal);
    expect(state.curIdx).toBe(before + 1);
  });
});

describe("kingdomino final tie-breaks", () => {
  it("uses the largest connected territory when final scores tie", () => {
    const state = startGame(() => 0);
    state.you = { board: emptyBoard(), crowns: emptyCrowns(), discarded: 0 };
    state.ai = { board: emptyBoard(), crowns: emptyCrowns(), discarded: 0 };

    state.you.board[0][0] = "forest";
    state.you.board[0][1] = "forest";
    state.you.crowns[0][0] = 1; // 2 points, 1 crown
    state.ai.board[0][0] = "water";
    state.ai.board[8][8] = "water";
    state.ai.crowns[0][0] = 1;
    state.ai.crowns[8][8] = 1; // 2 points, 2 crowns

    expect(finalResult(state)).toMatchObject({ winner: "you", tieBreaker: "largest-region", you: 2, ai: 2 });
  });

  it("shares victory after score and largest-territory ties, regardless of total crowns", () => {
    const state = startGame(() => 0);
    state.you = { board: emptyBoard(), crowns: emptyCrowns(), discarded: 0 };
    state.ai = { board: emptyBoard(), crowns: emptyCrowns(), discarded: 0 };

    state.you.board[0][0] = "forest";
    state.you.board[0][1] = "forest";
    state.you.crowns[0][0] = 1;

    state.ai.board[0][0] = "water";
    state.ai.crowns[0][0] = 1;
    state.ai.board[8][8] = "water";
    state.ai.crowns[8][8] = 1;
    state.ai.board[8][2] = "grass";
    state.ai.board[8][3] = "grass"; // crownless size-2 region ties the largest territory

    expect(finalResult(state)).toMatchObject({ winner: "draw", tieBreaker: "draw", you: 2, ai: 2 });
  });
});

describe("kingdomino complete games", () => {
  it("finishes 20 seeded drafts with 12 resolved dominoes per kingdom", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = startGame(seeded(seed));
      let turns = 0;
      while (state.pending.kind !== "gameover" && turns++ < 100) {
        if (state.pending.kind === "claim") {
          const option = state.pending.owner === "ai" ? aiClaim(state, 2) : state.pending.options[0];
          claim(state, option);
          continue;
        }
        const kingdom = state[state.pending.owner];
        const legal = allLegalPlacements(kingdom.board, state.pending.tile)[0] ?? null;
        place(state, legal);
      }
      expect(state.pending.kind, `seed ${seed}`).toBe("gameover");
      for (const player of ["you", "ai"] as const) {
        const occupied = state[player].board.flat().filter((cell) => cell !== null && cell !== "castle").length;
        expect(occupied + state[player].discarded * 2, `${player}, seed ${seed}`).toBe(24);
      }
      expect(Number.isFinite(finalResult(state).you)).toBe(true);
      expect(Number.isFinite(finalResult(state).ai)).toBe(true);
    }
  });
});
