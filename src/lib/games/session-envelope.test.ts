import { describe, expect, it } from "vitest";
import capabilities from "../../../config/game-session-envelope-v1.fixtures.json";
import { chessApplyState, chessPositionKey, createInitialChessState } from "./ai/chess";
import { serializeChessSave } from "./chess-save";
import {
  chooseHeartsCpuCard,
  chooseHeartsPassCards,
  createHeartsGame,
  passHeartsCards,
  playHeartsCard,
  startNextHeartsRound,
  type HeartsState,
} from "./hearts";
import {
  adaptChessSaveToSession,
  adaptHeartsSaveToSession,
  parseGameSessionEnvelope,
  RESTORABLE_GAME_CAPABILITIES,
  serializeGameSessionEnvelope,
} from "./session-envelope";

const TIMING = {
  savedAt: "2026-07-16T09:30:00.000Z",
  startedAt: "2026-07-16T09:00:00.000Z",
  resumedAt: "2026-07-16T09:20:00.000Z",
};

function activeChessSave() {
  const initial = createInitialChessState();
  const state = chessApplyState(initial, { from: [6, 4], to: [4, 4] });
  return JSON.parse(serializeChessSave({
    level: 3,
    mode: "ai",
    positionHistory: [chessPositionKey(initial), chessPositionKey(state)],
    state,
  }));
}

function activeHeartsSave() {
  const state = createHeartsGame(() => 0.37);
  return { state, passSelection: state.hands[0].slice(0, 2).map((card) => card.id) };
}

function finishHeartsMatch(): HeartsState {
  let state = createHeartsGame(() => 0.37);
  for (let rounds = 0; rounds < 20 && state.phase !== "gameOver"; rounds += 1) {
    if (state.phase === "passing") {
      state = passHeartsCards(
        state,
        state.hands.map((hand) => chooseHeartsPassCards(hand).map((card) => card.id)),
      );
    }
    while (state.phase === "playing") {
      const card = chooseHeartsCpuCard(state, state.currentPlayer);
      state = playHeartsCard(state, state.currentPlayer, card.id);
    }
    if (state.phase === "roundComplete") state = startNextHeartsRound(state, () => 0.37);
  }
  if (state.phase !== "gameOver") throw new Error("deterministic Hearts fixture did not terminate");
  return state;
}

describe("GameSessionEnvelope v1", () => {
  it("declares the canonical UTC timestamp policy", () => {
    expect(capabilities.timestampPolicy).toBe("utc-iso-8601-milliseconds-z");
  });
  it("adapts a resumable Chess v1 save with mode, difficulty and complete-state determinism", () => {
    const envelope = adaptChessSaveToSession(activeChessSave(), TIMING, {
      personalBest: { unit: "seconds", value: 90 },
    });

    expect(envelope).toMatchObject({
      adapterVersion: "chess-session-adapter-v1",
      determinism: { strategy: "state-complete", seed: null },
      difficulty: "level-3",
      engineVersion: "chess-state-v1",
      gameId: "chess",
      mode: "ai",
      savedAt: TIMING.savedAt,
      schema: "oiyo.game-session",
      schemaVersion: 1,
      startedAt: TIMING.startedAt,
      terminal: false,
    });
    const serialized = serializeGameSessionEnvelope(envelope!);
    expect(serialized).not.toBeNull();
    expect(parseGameSessionEnvelope(serialized)).toEqual(envelope);
  });

  it("adapts the existing unversioned Hearts load shape and preserves resumable round state", () => {
    const envelope = adaptHeartsSaveToSession(activeHeartsSave(), TIMING);

    expect(envelope).toMatchObject({
      adapterVersion: "hearts-session-adapter-v1",
      difficulty: "heuristic-v1",
      gameId: "hearts",
      mode: "ai",
      payload: { version: 1 },
      source: { schemaVersion: 1, storageKey: "oiyo:game:hearts:v1" },
      terminal: false,
    });
    expect(parseGameSessionEnvelope(serializeGameSessionEnvelope(envelope!)!)).toEqual(envelope);
  });

  it("rejects terminal Chess and Hearts sessions", () => {
    const chess = activeChessSave();
    chess.state.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    expect(adaptChessSaveToSession(chess, TIMING)).toBeNull();

    const gameOver = finishHeartsMatch();
    expect(adaptHeartsSaveToSession({ state: gameOver, passSelection: [] }, TIMING)).toBeNull();
  });

  it("rejects corrupt data, unsupported versions, invalid chronology and metadata/payload mismatch", () => {
    expect(adaptChessSaveToSession({ version: 1, state: {} }, TIMING)).toBeNull();
    expect(adaptHeartsSaveToSession({ version: 0, ...activeHeartsSave() }, TIMING)).toBeNull();
    expect(adaptChessSaveToSession(activeChessSave(), { ...TIMING, savedAt: "not-a-date" })).toBeNull();
    expect(adaptChessSaveToSession(activeChessSave(), { ...TIMING, startedAt: "2026-07-16T10:00:00.000Z" })).toBeNull();

    const envelope = adaptChessSaveToSession(activeChessSave(), TIMING)!;
    expect(parseGameSessionEnvelope(JSON.stringify({ ...envelope, schemaVersion: 2 }))).toBeNull();
    expect(parseGameSessionEnvelope(JSON.stringify({ ...envelope, difficulty: "level-1" }))).toBeNull();
    expect(parseGameSessionEnvelope(JSON.stringify({ ...envelope, mode: "local" }))).toBeNull();
    expect(parseGameSessionEnvelope(JSON.stringify({ ...envelope, terminal: true }))).toBeNull();
    expect(parseGameSessionEnvelope("not json")).toBeNull();
  });

  it("returns a canonical allowlisted envelope instead of retaining unknown fields", () => {
    const chessSave = activeChessSave();
    chessSave.state.unknownStateField = "DROP_CHESS_STATE";
    const envelope = adaptChessSaveToSession(chessSave, TIMING)!;
    const parsed = parseGameSessionEnvelope(JSON.stringify({
      ...envelope,
      unknownEnvelopeField: "DROP_ME",
      payload: { ...(envelope.payload as object), unknownPayloadField: "DROP_ME_TOO" },
      source: { ...envelope.source, unknownSourceField: "DROP_SOURCE" },
    }));
    const serialized = JSON.stringify(parsed);

    expect(parsed).not.toBeNull();
    expect(serialized).not.toContain("unknownEnvelopeField");
    expect(serialized).not.toContain("unknownPayloadField");
    expect(serialized).not.toContain("unknownSourceField");
    expect(serialized).not.toContain("DROP_ME");
    expect(serialized).not.toContain("DROP_CHESS_STATE");

    const heartsSave = activeHeartsSave();
    (heartsSave.state as HeartsState & { unknownStateField: string }).unknownStateField = "DROP_HEARTS_STATE";
    (heartsSave.state.hands[0][0] as typeof heartsSave.state.hands[0][0] & { unknownCardField: string }).unknownCardField = "DROP_CARD";
    const hearts = adaptHeartsSaveToSession(heartsSave, TIMING)!;
    expect(JSON.stringify(parseGameSessionEnvelope(JSON.stringify(hearts)))).not.toContain("DROP_HEARTS_STATE");
    expect(JSON.stringify(parseGameSessionEnvelope(JSON.stringify(hearts)))).not.toContain("DROP_CARD");
  });

  it("requires canonical UTC timestamps, rejects malformed resumedAt, and orders DST fallback instants by UTC", () => {
    const save = activeChessSave();
    expect(adaptChessSaveToSession(save, { ...TIMING, resumedAt: "" })).toBeNull();
    expect(adaptChessSaveToSession(save, { ...TIMING, resumedAt: null } as never)).toBeNull();

    const envelope = adaptChessSaveToSession(save, TIMING)!;
    expect(parseGameSessionEnvelope(JSON.stringify({ ...envelope, resumedAt: "" }))).toBeNull();
    expect(parseGameSessionEnvelope(JSON.stringify({ ...envelope, resumedAt: null }))).toBeNull();
    expect(adaptChessSaveToSession(save, {
      startedAt: "2026-11-01T01:15:00.000-04:00",
      resumedAt: "2026-11-01T01:45:00.000-04:00",
      savedAt: "2026-11-01T01:15:00.000-05:00",
    })).toBeNull();
    expect(adaptChessSaveToSession(save, {
      startedAt: "2026-11-01T05:15:00.000Z",
      resumedAt: "2026-11-01T05:45:00.000Z",
      savedAt: "2026-11-01T06:15:00.000Z",
    })).not.toBeNull();
  });

  it("validates optional PB/streak snapshots without making them restore authority", () => {
    const save = activeChessSave();
    expect(adaptChessSaveToSession(save, TIMING, {
      personalBest: { unit: "score", value: 1200 },
      streak: { best: 7, current: 3, period: "daily" },
    })?.progress).toEqual({
      personalBest: { unit: "score", value: 1200 },
      streak: { best: 7, current: 3, period: "daily" },
    });
    expect(adaptChessSaveToSession(save, TIMING, {
      streak: { best: 2, current: 3, period: "daily" },
    })).toBeNull();
  });

  it("keeps unsupported games explicitly non-restorable", () => {
    const byId = new Map(capabilities.games.map((game) => [game.gameId, game]));
    expect([...byId.values()].filter((game) => game.supportsRestore).map((game) => game.gameId)).toEqual(["chess", "hearts"]);
    for (const gameId of ["chess", "hearts"] as const) {
      expect(byId.get(gameId)?.modes).toEqual([...RESTORABLE_GAME_CAPABILITIES[gameId].modes]);
      expect(byId.get(gameId)?.difficulties).toEqual([...RESTORABLE_GAME_CAPABILITIES[gameId].difficulties]);
    }
    for (const gameId of ["minesweeper", "solitaire", "freecell", "connect-four", "gomoku"]) {
      expect(byId.get(gameId)).toMatchObject({
        adapterPath: null,
        deterministicResume: false,
        sessionStorageKey: null,
        supportsRestore: false,
      });
    }
  });
});
