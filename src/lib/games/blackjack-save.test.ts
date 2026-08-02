import { describe, expect, it } from "vitest";
import { createBlackjackGame, hitBlackjack, standBlackjack } from "./blackjack";
import { parseBlackjackSave } from "./blackjack-save";
describe("blackjack save", () => {
  it("accepts an exact replayable active round", () => {
    let state = createBlackjackGame(31); if (state.status === "playing") state = hitBlackjack(state);
    if (state.status !== "playing") state = createBlackjackGame(32);
    const raw = JSON.stringify({ version: 1, state, savedAtEpochMs: 10_000 });
    expect(parseBlackjackSave(raw, 11_000)?.state).toEqual(state);
    expect(parseBlackjackSave(raw.replace(`\"seed\":${state.seed}`, `\"seed\":999`), 11_000)).toBeNull();
  });
  it("rejects terminal, stale and malformed rounds", () => {
    let active = createBlackjackGame(44); if (active.status !== "playing") active = createBlackjackGame(45);
    const terminal = standBlackjack(active);
    expect(parseBlackjackSave(JSON.stringify({ version: 1, state: terminal, savedAtEpochMs: 1_000 }), 2_000)).toBeNull();
    expect(parseBlackjackSave(JSON.stringify({ version: 1, state: active, savedAtEpochMs: 1_000 }), 7 * 86_400_000 + 1_001)).toBeNull();
    expect(parseBlackjackSave("{}", 2_000)).toBeNull();
  });
});
