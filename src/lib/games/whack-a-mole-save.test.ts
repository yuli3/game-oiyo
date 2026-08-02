import { describe, expect, it } from "vitest";
import { advanceWhack, createWhackGame, hitWhack } from "./whack-a-mole";
import { parseWhackSave } from "./whack-a-mole-save";

describe("whack-a-mole save", () => {
  it("accepts only an exact replayable active state", () => {
    let state = advanceWhack(createWhackGame(91), 800);
    const mole = state.cells.indexOf("mole");
    if (mole >= 0) state = hitWhack(state, mole);
    const raw = JSON.stringify({ version: 1, state, savedAtEpochMs: 10_000 });
    expect(parseWhackSave(raw, 11_000)?.state).toEqual(state);
    expect(parseWhackSave(raw.replace(`\"score\":${state.score}`, `\"score\":99`), 11_000)).toBeNull();
  });
  it("rejects terminal, stale and malformed histories", () => {
    const active = advanceWhack(createWhackGame(4), 500);
    const terminal = advanceWhack(active, 30_000);
    expect(parseWhackSave(JSON.stringify({ version: 1, state: terminal, savedAtEpochMs: 1_000 }), 2_000)).toBeNull();
    expect(parseWhackSave(JSON.stringify({ version: 1, state: active, savedAtEpochMs: 1_000 }), 86_402_000)).toBeNull();
    expect(parseWhackSave('{"version":1}', 2_000)).toBeNull();
  });
});
