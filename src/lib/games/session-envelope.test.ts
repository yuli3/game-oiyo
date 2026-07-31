import { describe, expect, it } from "vitest";
import capabilities from "../../../config/game-session-envelope-v1.fixtures.json";
import { chessApplyState, chessPositionKey, createInitialChessState } from "./ai/chess";
import { serializeChessSave } from "./chess-save";
import { createMinesweeperBoard, revealMinesweeperCell } from "./minesweeper";
import { serializeMinesweeperSave } from "./minesweeper-save";
import { createBrickBreakerState, launchBrickBreakerBall, stepBrickBreaker } from "./brick-breaker";
import { serializeBrickBreakerSave } from "./brick-breaker-save";
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
  adaptActiveGameSaveToSession,
  adaptBrickBreakerSaveToSession,
  adaptHeartsSaveToSession,
  adaptMinesweeperSaveToSession,
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
    moveHistory: [{ notation: "e4", captured: null, white: true }],
    orientation: "black",
  }));
}

function activeHeartsSave() {
  const state = createHeartsGame(() => 0.37);
  return { state, passSelection: state.hands[0].slice(0, 2).map((card) => card.id) };
}

function activeMinesweeperSave() {
  const board = createMinesweeperBoard(10, 10, 10, 0, 0, () => 0.37);
  return JSON.parse(serializeMinesweeperSave({
    board: revealMinesweeperCell(board, 0, 0).board,
    mode: "beginner",
    dailyDate: "2026-07-16",
    generationSeed: 37,
    generationStrategy: "verified",
    firstClick: false,
    hasStarted: true,
    elapsedMs: 30_000,
    savedAtEpochMs: Date.parse(TIMING.savedAt),
    flagMode: false,
    activeCell: 0,
    assist: "none",
  }));
}

function activeBrickBreakerSave() {
  const state = createBrickBreakerState();
  launchBrickBreakerBall(state);
  for (let frame = 0; frame < 20; frame += 1) stepBrickBreaker(state, 16);
  return JSON.parse(serializeBrickBreakerSave({
    state,
    destroyedBricks: state.bricks.filter((brick) => brick.hits === 0).length,
    maxCombo: state.combo,
    savedAtEpochMs: Date.parse(TIMING.savedAt),
  }));
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
  it("adapts a resumable Chess v2 save with mode, difficulty and complete-state determinism", () => {
    const envelope = adaptChessSaveToSession(activeChessSave(), TIMING, {
      personalBest: { unit: "seconds", value: 90 },
    });

    expect(envelope).toMatchObject({
      adapterVersion: "chess-session-adapter-v2",
      determinism: { strategy: "state-complete", seed: null },
      difficulty: "level-3",
      engineVersion: "chess-state-v2",
      gameId: "chess",
      mode: "ai",
      payload: { version: 2, orientation: "black", moveHistory: [{ notation: "e4" }] },
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

  it("adapts only an active validated Minesweeper board", () => {
    const save = activeMinesweeperSave();
    const envelope = adaptMinesweeperSaveToSession(save, TIMING);
    expect(envelope).toMatchObject({
      adapterVersion: "minesweeper-session-adapter-v1",
      difficulty: "beginner",
      engineVersion: "minesweeper-state-v1",
      gameId: "minesweeper",
      mode: "solo",
      payload: { version: 1, elapsedMs: 30_000 },
      terminal: false,
    });
    expect(parseGameSessionEnvelope(serializeGameSessionEnvelope(envelope!))?.gameId).toBe("minesweeper");

    for (const cell of save.board.flat()) if (!cell.isMine) cell.isRevealed = true;
    expect(adaptMinesweeperSaveToSession(save, TIMING)).toBeNull();
  });

  it("adapts a validated Brick Breaker run as deterministic paused-resume state", () => {
    const envelope = adaptBrickBreakerSaveToSession(activeBrickBreakerSave(), TIMING, {
      personalBest: { unit: "score", value: 2400 },
    });
    expect(envelope).toMatchObject({
      adapterVersion: "brick-breaker-session-adapter-v1",
      difficulty: "endless-v1",
      engineVersion: "brick-breaker-state-v1",
      gameId: "brick-breaker",
      mode: "solo",
      payload: { version: 1 },
      source: { schema: "oiyo.brick-breaker-save", storageKey: "oiyo:brick-breaker-state:v1" },
      terminal: false,
    });
    expect(parseGameSessionEnvelope(serializeGameSessionEnvelope(envelope!))).toEqual(envelope);
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
    expect([...byId.values()].filter((game) => game.supportsRestore).map((game) => game.gameId)).toEqual(["chess", "hearts", "minesweeper", "brick-breaker", "solitaire", "freecell", "connect-four", "gomoku", "sudoku", "puzzle15", "checkers", "reversi", "game-2048"]);
    for (const gameId of ["chess", "hearts", "minesweeper", "brick-breaker", "solitaire", "freecell", "connect-four", "gomoku", "sudoku", "puzzle15", "checkers", "reversi", "game-2048"] as const) {
      expect(byId.get(gameId)?.modes).toEqual([...RESTORABLE_GAME_CAPABILITIES[gameId].modes]);
      expect(byId.get(gameId)?.difficulties).toEqual([...RESTORABLE_GAME_CAPABILITIES[gameId].difficulties]);
    }
  });

  it("adapts the nine active-board save formats into the common envelope", async () => {
    const { dealSolitaire } = await import("./solitaire");
    const { createFreeCellGame } = await import("./freecell");
    const connectBoard = Array.from({ length: 6 }, () => Array(7).fill(0));
    connectBoard[5][3] = 1;
    const gomokuBoard = Array<1 | 2 | null>(225).fill(null); gomokuBoard[112] = 1;
    const sudokuGrid = [
      [5, 3, null, null, 7, null, null, null, null],
      [6, null, null, 1, 9, 5, null, null, null],
      [null, 9, 8, null, null, null, null, 6, null],
      [8, null, null, null, 6, null, null, null, 3],
      [4, null, null, 8, null, 3, null, null, 1],
      [7, null, null, null, 2, null, null, null, 6],
      [null, 6, null, null, null, null, 2, 8, null],
      [null, null, null, 4, 1, 9, null, null, 5],
      [null, null, null, null, 8, null, null, 7, 9],
    ];
    sudokuGrid[0][2] = 4;
    const checkersBoard = Array.from({ length: 64 }, (_, i) => {
      const r = Math.floor(i / 8), c = i % 8;
      if ((r + c) % 2 !== 1) return null;
      if (r < 3) return { player: 2, isKing: false };
      if (r > 4) return { player: 1, isKing: false };
      return null;
    });
    const reversiBoard = Array<1 | 2 | null>(64).fill(null);
    reversiBoard[27] = 2; reversiBoard[28] = 1; reversiBoard[35] = 1; reversiBoard[36] = 2;
    const fixtures = [
      ["solitaire", { version: 1, state: dealSolitaire(() => 0.3) }],
      ["freecell", { version: 1, state: createFreeCellGame(() => 0.3) }],
      ["connect-four", { version: 1, board: connectBoard, currentPlayer: 2, mode: "ai", level: 2 }],
      ["gomoku", { version: 1, board: gomokuBoard, isBlackTurn: false, mode: "local", level: 2 }],
      ["sudoku", { version: 1, grid: sudokuGrid, seconds: 42 }],
      ["puzzle15", { version: 1, size: 4, board: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 13, 14, 15, 12], puzzleSeed: "1-2-3-4-5-6-7-8-9-10-11-12-13-14-15-0", moves: 3, seconds: 12 }],
      ["checkers", { version: 1, board: checkersBoard, isRedTurn: true, forcedFrom: null, mode: "local", level: 2 }],
      ["reversi", { version: 1, board: reversiBoard, isBlackTurn: true, mode: "local", level: 2 }],
      ["game-2048", { version: 1, board: [2, 4, null, null, null, null, null, null, null, null, null, null, null, null, null, 8], score: 12 }],
    ] as const;
    for (const [gameId, payload] of fixtures) {
      const envelope = adaptActiveGameSaveToSession(gameId, payload, TIMING);
      expect(envelope?.gameId).toBe(gameId);
      expect(parseGameSessionEnvelope(serializeGameSessionEnvelope(envelope!)!)).toEqual(envelope);
    }
  });

  it("rejects tampered sudoku givens and already-solved puzzle15 boards", async () => {
    const { parseSudokuSave, parsePuzzle15Save } = await import("./active-game-save");
    expect(parseSudokuSave({ version: 1, grid: (() => {
      const g = [
        [5, 3, null, null, 7, null, null, null, null],
        [6, null, null, 1, 9, 5, null, null, null],
        [null, 9, 8, null, null, null, null, 6, null],
        [8, null, null, null, 6, null, null, null, 3],
        [4, null, null, 8, null, 3, null, null, 1],
        [7, null, null, null, 2, null, null, null, 6],
        [null, 6, null, null, null, null, 2, 8, null],
        [null, null, null, 4, 1, 9, null, null, 5],
        [null, null, null, null, 8, null, null, 7, 9],
      ];
      g[0][0] = 9; // tampered given cell
      return g;
    })(), seconds: 5 })).toBeNull();
    expect(parsePuzzle15Save({ version: 1, size: 4, board: Array.from({ length: 16 }, (_, i) => (i + 1) % 16), puzzleSeed: "seed", moves: 40, seconds: 60 })).toBeNull();
  });

  it("rejects checkers/reversi states with no legal move for the side to act", async () => {
    const { parseCheckersSave, parseReversiSave } = await import("./active-game-save");
    // A lone red man cornered with no legal move, claimed as red's turn: fail-closed.
    const cornerBoard = Array<{ player: 1 | 2; isKing: boolean } | null>(64).fill(null);
    cornerBoard[0] = { player: 1, isKing: false };
    expect(parseCheckersSave({ version: 1, board: cornerBoard, isRedTurn: true, forcedFrom: null, mode: "local", level: 2 })).toBeNull();
    // forcedFrom pointing at a square the mover doesn't own is rejected outright.
    const checkersBoard = Array.from({ length: 64 }, (_, i) => {
      const r = Math.floor(i / 8), c = i % 8;
      if ((r + c) % 2 !== 1) return null;
      if (r < 3) return { player: 2 as const, isKing: false };
      if (r > 4) return { player: 1 as const, isKing: false };
      return null;
    });
    expect(parseCheckersSave({ version: 1, board: checkersBoard, isRedTurn: true, forcedFrom: 2, mode: "local", level: 2 })).toBeNull();
    // Empty reversi board has no flanking move for either color.
    expect(parseReversiSave({ version: 1, board: Array(64).fill(null), isBlackTurn: true, mode: "local", level: 2 })).toBeNull();
  });

  it("rejects terminal, impossible, and score-tampered 2048 boards", async () => {
    const { parseGame2048Save } = await import("./active-game-save");
    const empty = Array<number | null>(16).fill(null);
    const resumable = [...empty]; resumable[0] = 2; resumable[1] = 4;
    expect(parseGame2048Save({ version: 1, board: resumable, score: 0 })).not.toBeNull();
    // A tile at or above 2048 means the component already ended the game as won.
    const won = [...resumable]; won[15] = 2048;
    expect(parseGame2048Save({ version: 1, board: won, score: 4096 })).toBeNull();
    // A full board with no adjacent equal pair is game over, not resumable.
    const dead = Array.from({ length: 16 }, (_, i) => {
      const row = Math.floor(i / 4);
      const values = row % 2 === 0 ? [2, 4, 8, 16] : [32, 64, 128, 256];
      return values[i % 4];
    });
    expect(parseGame2048Save({ version: 1, board: dead, score: 0 })).toBeNull();
    // Non-power-of-two tiles, fewer than two tiles, and impossible scores fail closed.
    const odd = [...empty]; odd[0] = 6; odd[1] = 2;
    expect(parseGame2048Save({ version: 1, board: odd, score: 0 })).toBeNull();
    const lone = [...empty]; lone[0] = 2;
    expect(parseGame2048Save({ version: 1, board: lone, score: 0 })).toBeNull();
    // A 2+4 board can have earned at most 4 score, and 10 is not a sum of merge values (each ≥4, power of two).
    expect(parseGame2048Save({ version: 1, board: resumable, score: 400 })).toBeNull();
    expect(parseGame2048Save({ version: 1, board: resumable, score: 10 })).toBeNull();
  });
});
