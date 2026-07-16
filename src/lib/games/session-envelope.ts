import { parseChessSave, type ChessSave } from "./chess-save";
import { parseHeartsSavedGame, type HeartsSavedGame } from "./hearts";

export const GAME_SESSION_SCHEMA = "oiyo.game-session" as const;
export const GAME_SESSION_SCHEMA_VERSION = 1 as const;

export type RestorableGameId = "chess" | "hearts";
export type GameSessionMode = "local" | "ai";

export const RESTORABLE_GAME_CAPABILITIES = {
  chess: {
    modes: ["local", "ai"],
    difficulties: ["level-1", "level-2", "level-3"],
  },
  hearts: {
    modes: ["ai"],
    difficulties: ["heuristic-v1"],
  },
} as const satisfies Record<RestorableGameId, {
  modes: readonly GameSessionMode[];
  difficulties: readonly string[];
}>;

export interface GameSessionTiming {
  savedAt: string;
  startedAt: string;
  resumedAt?: string;
}

export interface GameSessionProgress {
  personalBest?: { unit: "score" | "seconds"; value: number };
  streak?: { best: number; current: number; period: "daily" };
}

export interface GameSessionEnvelope<TPayload = unknown> {
  adapterVersion: string;
  determinism: {
    strategy: "state-complete" | "seed-replay";
    seed: number | string | null;
  };
  difficulty: string;
  engineVersion: string;
  gameId: RestorableGameId;
  mode: GameSessionMode;
  payload: TPayload;
  progress?: GameSessionProgress;
  resumedAt?: string;
  savedAt: string;
  schema: typeof GAME_SESSION_SCHEMA;
  schemaVersion: typeof GAME_SESSION_SCHEMA_VERSION;
  source: {
    format: "legacy-local-storage";
    schema: string;
    schemaVersion: number;
    storageKey: string;
  };
  startedAt: string;
  terminal: false;
}

type Adapter<TPayload> = {
  adapterVersion: string;
  engineVersion: string;
  gameId: RestorableGameId;
  modes: readonly GameSessionMode[];
  difficulties: readonly string[];
  parsePayload(value: unknown): TPayload | null;
  payloadDifficulty(value: TPayload): string;
  payloadMode(value: TPayload): GameSessionMode;
  source: GameSessionEnvelope["source"];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  const timestamp = Date.parse(value);
  // Session timestamps use one canonical UTC representation. Offset-bearing
  // ISO strings are valid instants but are rejected to avoid DST/local-time
  // ambiguity and byte-level drift between producers.
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isTimingValid(timing: GameSessionTiming): boolean {
  if (!isIsoTimestamp(timing.startedAt) || !isIsoTimestamp(timing.savedAt)) return false;
  const started = Date.parse(timing.startedAt);
  const saved = Date.parse(timing.savedAt);
  if (started > saved) return false;
  if (timing.resumedAt === undefined) return true;
  if (!isIsoTimestamp(timing.resumedAt)) return false;
  const resumed = Date.parse(timing.resumedAt);
  return resumed >= started && resumed <= saved;
}

function sourceMatches(value: unknown, expected: GameSessionEnvelope["source"]): boolean {
  return isRecord(value) &&
    value.format === expected.format &&
    value.schema === expected.schema &&
    value.schemaVersion === expected.schemaVersion &&
    value.storageKey === expected.storageKey;
}

function parseProgress(value: unknown): GameSessionProgress | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const progress: GameSessionProgress = {};
  if (value.personalBest !== undefined) {
    if (!isRecord(value.personalBest)) return null;
    const { unit, value: best } = value.personalBest;
    if ((unit !== "score" && unit !== "seconds") || typeof best !== "number" || !Number.isFinite(best) || best < 0) return null;
    progress.personalBest = { unit, value: best };
  }
  if (value.streak !== undefined) {
    if (!isRecord(value.streak)) return null;
    const { best, current, period } = value.streak;
    if (period !== "daily" || !Number.isInteger(best) || !Number.isInteger(current) || (best as number) < 0 || (current as number) < 0 || (current as number) > (best as number)) return null;
    progress.streak = { best: best as number, current: current as number, period };
  }
  if (!progress.personalBest && !progress.streak) return null;
  return progress;
}

function createEnvelope<TPayload>(
  adapter: Adapter<TPayload>,
  payload: TPayload,
  timing: GameSessionTiming,
  progress?: GameSessionProgress,
): GameSessionEnvelope<TPayload> | null {
  if (!isTimingValid(timing)) return null;
  const parsedProgress = parseProgress(progress);
  if (parsedProgress === null) return null;
  return {
    adapterVersion: adapter.adapterVersion,
    determinism: { strategy: "state-complete", seed: null },
    difficulty: adapter.payloadDifficulty(payload),
    engineVersion: adapter.engineVersion,
    gameId: adapter.gameId,
    mode: adapter.payloadMode(payload),
    payload,
    ...(parsedProgress ? { progress: parsedProgress } : {}),
    ...(timing.resumedAt !== undefined ? { resumedAt: timing.resumedAt } : {}),
    savedAt: timing.savedAt,
    schema: GAME_SESSION_SCHEMA,
    schemaVersion: GAME_SESSION_SCHEMA_VERSION,
    source: adapter.source,
    startedAt: timing.startedAt,
    terminal: false,
  };
}

const chessAdapter: Adapter<ChessSave> = {
  adapterVersion: "chess-session-adapter-v1",
  engineVersion: "chess-state-v1",
  gameId: "chess",
  modes: RESTORABLE_GAME_CAPABILITIES.chess.modes,
  difficulties: RESTORABLE_GAME_CAPABILITIES.chess.difficulties,
  parsePayload: (value) => {
    try {
      const parsed = parseChessSave(JSON.stringify(value));
      return parsed ? {
        level: parsed.level,
        mode: parsed.mode,
        positionHistory: [...parsed.positionHistory],
        state: {
          board: parsed.state.board.map((row) => [...row]),
          whiteToMove: parsed.state.whiteToMove,
          castling: {
            K: parsed.state.castling.K,
            Q: parsed.state.castling.Q,
            k: parsed.state.castling.k,
            q: parsed.state.castling.q,
          },
          enPassant: parsed.state.enPassant ? [...parsed.state.enPassant] : null,
          halfmoveClock: parsed.state.halfmoveClock,
          fullmoveNumber: parsed.state.fullmoveNumber,
        },
        version: 1,
      } : null;
    } catch { return null; }
  },
  payloadDifficulty: (value) => `level-${value.level}`,
  payloadMode: (value) => value.mode,
  source: {
    format: "legacy-local-storage",
    schema: "oiyo.chess-save",
    schemaVersion: 1,
    storageKey: "oiyo:chess-state:v1",
  },
};

type VersionedHeartsPayload = HeartsSavedGame & { version: 1 };
const heartsAdapter: Adapter<VersionedHeartsPayload> = {
  adapterVersion: "hearts-session-adapter-v1",
  engineVersion: "hearts-rules-v1",
  gameId: "hearts",
  modes: RESTORABLE_GAME_CAPABILITIES.hearts.modes,
  difficulties: RESTORABLE_GAME_CAPABILITIES.hearts.difficulties,
  parsePayload: (value) => {
    if (!isRecord(value) || value.version !== 1) return null;
    const parsed = parseHeartsSavedGame(JSON.stringify(value));
    if (!parsed || parsed.state.phase === "gameOver") return null;
    const card = (value: HeartsSavedGame["state"]["hands"][number][number]) => ({
      id: value.id,
      suit: value.suit,
      value: value.value,
      power: value.power,
    });
    const play = (value: HeartsSavedGame["state"]["trick"][number]) => ({
      player: value.player,
      card: card(value.card),
    });
    return {
      version: 1,
      state: {
        hands: parsed.state.hands.map((hand) => hand.map(card)),
        trick: parsed.state.trick.map(play),
        lastTrick: parsed.state.lastTrick.map(play),
        leader: parsed.state.leader,
        currentPlayer: parsed.state.currentPlayer,
        heartsBroken: parsed.state.heartsBroken,
        trickNumber: parsed.state.trickNumber,
        capturedPoints: [...parsed.state.capturedPoints],
        finalScores: parsed.state.finalScores ? [...parsed.state.finalScores] : null,
        matchScores: [...parsed.state.matchScores],
        roundNumber: parsed.state.roundNumber,
        passDirection: parsed.state.passDirection,
        phase: parsed.state.phase,
      },
      passSelection: [...parsed.passSelection],
    };
  },
  payloadDifficulty: () => "heuristic-v1",
  payloadMode: () => "ai",
  source: {
    format: "legacy-local-storage",
    schema: "oiyo.hearts-save",
    schemaVersion: 1,
    storageKey: "oiyo:game:hearts:v1",
  },
};

const adapters: Record<RestorableGameId, Adapter<unknown>> = {
  chess: chessAdapter as Adapter<unknown>,
  hearts: heartsAdapter as Adapter<unknown>,
};

export function adaptChessSaveToSession(
  value: unknown,
  timing: GameSessionTiming,
  progress?: GameSessionProgress,
): GameSessionEnvelope<ChessSave> | null {
  const payload = chessAdapter.parsePayload(value);
  return payload ? createEnvelope(chessAdapter, payload, timing, progress) : null;
}

export function adaptHeartsSaveToSession(
  value: unknown,
  timing: GameSessionTiming,
  progress?: GameSessionProgress,
): GameSessionEnvelope<VersionedHeartsPayload> | null {
  const candidate = isRecord(value) && value.version === undefined ? { version: 1, ...value } : value;
  const payload = heartsAdapter.parsePayload(candidate);
  return payload ? createEnvelope(heartsAdapter, payload, timing, progress) : null;
}

/** Parse an untrusted common envelope and re-run the owning game's state validator. */
export function parseGameSessionEnvelope(raw: string | null): GameSessionEnvelope | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.schema !== GAME_SESSION_SCHEMA || value.schemaVersion !== GAME_SESSION_SCHEMA_VERSION) return null;
    if (value.gameId !== "chess" && value.gameId !== "hearts") return null;
    const adapter = adapters[value.gameId];
    if (value.adapterVersion !== adapter.adapterVersion || value.engineVersion !== adapter.engineVersion) return null;
    if (value.terminal !== false || value.mode !== "local" && value.mode !== "ai" || typeof value.difficulty !== "string" || value.difficulty.length === 0) return null;
    if (!isRecord(value.determinism) || value.determinism.strategy !== "state-complete" || value.determinism.seed !== null) return null;
    if (!sourceMatches(value.source, adapter.source)) return null;
    const timing = { savedAt: value.savedAt, startedAt: value.startedAt, ...(value.resumedAt === undefined ? {} : { resumedAt: value.resumedAt }) } as GameSessionTiming;
    if (!isTimingValid(timing)) return null;
    const progress = parseProgress(value.progress);
    if (progress === null) return null;
    const payload = adapter.parsePayload(value.payload);
    if (!payload || value.mode !== adapter.payloadMode(payload) || value.difficulty !== adapter.payloadDifficulty(payload)) return null;
    return {
      adapterVersion: adapter.adapterVersion,
      determinism: { strategy: "state-complete", seed: null },
      difficulty: adapter.payloadDifficulty(payload),
      engineVersion: adapter.engineVersion,
      gameId: adapter.gameId,
      mode: adapter.payloadMode(payload),
      payload,
      ...(progress ? { progress } : {}),
      ...(timing.resumedAt !== undefined ? { resumedAt: timing.resumedAt } : {}),
      savedAt: timing.savedAt,
      schema: GAME_SESSION_SCHEMA,
      schemaVersion: GAME_SESSION_SCHEMA_VERSION,
      source: { ...adapter.source },
      startedAt: timing.startedAt,
      terminal: false,
    };
  } catch {
    return null;
  }
}

export function serializeGameSessionEnvelope(envelope: GameSessionEnvelope): string | null {
  try {
    const parsed = parseGameSessionEnvelope(JSON.stringify(envelope));
    return parsed ? JSON.stringify(parsed) : null;
  } catch {
    return null;
  }
}
