import { parseChessSave, type ChessSave } from "./chess-save";
import { parseHeartsSavedGame, type HeartsSavedGame } from "./hearts";
import { parseMinesweeperSave, type MinesweeperSave } from "./minesweeper-save";
import { parseBrickBreakerSave, type BrickBreakerSave } from "./brick-breaker-save";
import {
  parseCheckersSave,
  parseConnectFourSave,
  parseFreeCellSave,
  parseGame2048Save,
  parsePuzzle15Save,
  parseReversiSave,
  type CheckersSave,
  type Game2048Save,
  type Puzzle15Save,
  type ReversiSave,
} from "./active-game-save";
import { parseSudokuSaveV2, type SudokuSaveV2 } from "./sudoku-save";
import { parseSolitaireSaveV2, type SolitaireSaveV2 } from "./solitaire-save";
import { parseSnakeSave, type SnakeSaveV1 } from "./snake-save";
import { parseJanggiSave, type JanggiSaveV1 } from "./janggi-save";
import { parseGomokuSaveV2, type GomokuSaveV2 } from "./gomoku-save";
import { parseKurodokoSaveV1, type KurodokoSaveV1 } from "./kurodoko-save";
import { parseYahtzeeSave, type YahtzeeSaveV1 } from "./yahtzee-save";
import { parseCaveDashSave, type CaveDashSaveV1 } from "./cave-dash-save";
import { parseDotRunnerSave, type DotRunnerSaveV1 } from "./dot-runner-save";
import { parseMahjongSave, type MahjongSaveV1 } from "./mahjong-save";
import { parseWaterSortSave, type WaterSortSaveV1 } from "./water-sort-save";
import { parsePsychologyWordleSave, type PsychologyWordleSaveV1 } from "./psychology-wordle-save";
import { parseMemoryCardSave, type MemoryCardSaveV1 } from "./memory-card-game-save";
import { parseNumberGuessingSave, type NumberGuessingSaveV1 } from "./number-guessing-save";
import { parseWordleSave, type WordleSaveV1 } from "./wordle-save";

export const GAME_SESSION_SCHEMA = "oiyo.game-session" as const;
export const GAME_SESSION_SCHEMA_VERSION = 1 as const;

export type RestorableGameId = "chess" | "hearts" | "minesweeper" | "brick-breaker" | "solitaire" | "freecell" | "connect-four" | "gomoku" | "sudoku" | "puzzle15" | "checkers" | "reversi" | "game-2048" | "snake-game" | "kurodoko" | "yahtzee" | "cave-dash" | "dot-runner" | "mahjong" | "water-sort" | "psychology-wordle" | "memory-card-game" | "number-guessing" | "wordle" | "janggi";
export type GameSessionMode = "local" | "ai" | "solo";

export const RESTORABLE_GAME_CAPABILITIES = {
  chess: {
    modes: ["local", "ai"],
    difficulties: ["level-1", "level-2", "level-3"],
  },
  hearts: {
    modes: ["ai"],
    difficulties: ["heuristic-v1"],
  },
  minesweeper: {
    modes: ["solo"],
    difficulties: ["daily", "beginner", "intermediate", "expert"],
  },
  "brick-breaker": {
    modes: ["solo"],
    difficulties: ["endless-v1"],
  },
  solitaire: { modes: ["solo"], difficulties: ["draw-1"] },
  freecell: { modes: ["solo"], difficulties: ["standard"] },
  "connect-four": { modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"] },
  gomoku: { modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"] },
  sudoku: { modes: ["solo"], difficulties: ["daily", "easy", "medium", "hard"] },
  puzzle15: { modes: ["solo"], difficulties: ["3x3", "4x4", "5x5"] },
  checkers: { modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"] },
  reversi: { modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"] },
  janggi: { modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"] },
  "game-2048": { modes: ["solo"], difficulties: ["classic-4x4"] },
  "snake-game": { modes: ["solo"], difficulties: ["classic-20x20"] },
  kurodoko: { modes: ["solo"], difficulties: ["daily", "easy", "medium", "hard"] },
  yahtzee: { modes: ["solo"], difficulties: ["classic"] },
  "cave-dash": { modes: ["solo"], difficulties: ["endless-v1"] },
  "dot-runner": { modes: ["solo"], difficulties: ["endless-v1"] },
  mahjong: { modes: ["ai"], difficulties: ["level-1", "level-2", "level-3"] },
  "water-sort": { modes: ["solo"], difficulties: ["easy", "medium", "hard"] },
  "psychology-wordle": { modes: ["solo"], difficulties: ["daily", "random"] },
  "memory-card-game": { modes: ["solo"], difficulties: ["4x4", "6x4", "6x6"] },
  "number-guessing": { modes: ["solo"], difficulties: ["easy", "normal", "hard"] },
  wordle: { modes: ["solo"], difficulties: ["daily", "random"] },
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
  adapterVersion: "chess-session-adapter-v2",
  engineVersion: "chess-state-v2",
  gameId: "chess",
  modes: RESTORABLE_GAME_CAPABILITIES.chess.modes,
  difficulties: RESTORABLE_GAME_CAPABILITIES.chess.difficulties,
  parsePayload: (value) => {
    try {
      const parsed = parseChessSave(JSON.stringify(value));
      return parsed ? {
        level: parsed.level,
        mode: parsed.mode,
        moveHistory: parsed.moveHistory.map((move) => ({ ...move })),
        orientation: parsed.orientation,
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
        version: 2,
      } : null;
    } catch { return null; }
  },
  payloadDifficulty: (value) => `level-${value.level}`,
  payloadMode: (value) => value.mode,
  source: {
    format: "legacy-local-storage",
    schema: "oiyo.chess-save",
    schemaVersion: 2,
    storageKey: "oiyo:chess-state:v2",
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

const minesweeperAdapter: Adapter<MinesweeperSave> = {
  adapterVersion: "minesweeper-session-adapter-v1",
  engineVersion: "minesweeper-state-v1",
  gameId: "minesweeper",
  modes: RESTORABLE_GAME_CAPABILITIES.minesweeper.modes,
  difficulties: RESTORABLE_GAME_CAPABILITIES.minesweeper.difficulties,
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.dailyDate !== "string" || typeof value.savedAtEpochMs !== "number") return null;
    const parsed = parseMinesweeperSave(JSON.stringify(value), value.dailyDate, value.savedAtEpochMs);
    return parsed ? { ...parsed, board: parsed.board.map((row) => row.map((cell) => ({ ...cell }))) } : null;
  },
  payloadDifficulty: (value) => value.mode,
  payloadMode: () => "solo",
  source: {
    format: "legacy-local-storage",
    schema: "oiyo.minesweeper-save",
    schemaVersion: 1,
    storageKey: "oiyo:minesweeper-state:v1",
  },
};

const brickBreakerAdapter: Adapter<BrickBreakerSave> = {
  adapterVersion: "brick-breaker-session-adapter-v1",
  engineVersion: "brick-breaker-state-v1",
  gameId: "brick-breaker",
  modes: RESTORABLE_GAME_CAPABILITIES["brick-breaker"].modes,
  difficulties: RESTORABLE_GAME_CAPABILITIES["brick-breaker"].difficulties,
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null;
    const parsed = parseBrickBreakerSave(JSON.stringify(value), value.savedAtEpochMs);
    return parsed ? { ...parsed, state: { ...parsed.state, bricks: parsed.state.bricks.map((brick) => ({ ...brick })) } } : null;
  },
  payloadDifficulty: () => "endless-v1",
  payloadMode: () => "solo",
  source: {
    format: "legacy-local-storage",
    schema: "oiyo.brick-breaker-save",
    schemaVersion: 1,
    storageKey: "oiyo:brick-breaker-state:v1",
  },
};

type FreeCellPayload = NonNullable<ReturnType<typeof parseFreeCellSave>>;
type ConnectFourPayload = NonNullable<ReturnType<typeof parseConnectFourSave>>;

const solitaireAdapter: Adapter<SolitaireSaveV2> = {
  adapterVersion: "solitaire-session-adapter-v2", engineVersion: "solitaire-rules-v1", gameId: "solitaire",
  modes: ["solo"], difficulties: ["draw-1"],
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.dailyDate !== "string" || typeof value.savedAtEpochMs !== "number") return null;
    const parsed = parseSolitaireSaveV2(JSON.stringify(value), value.dailyDate, value.savedAtEpochMs);
    return parsed ? { ...parsed, state: { ...parsed.state, tableau: parsed.state.tableau.map((pile) => [...pile]) } } : null;
  },
  payloadDifficulty: () => "draw-1", payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.solitaire-save", schemaVersion: 2, storageKey: "oiyo:solitaire-state:v2" },
};
const freecellAdapter: Adapter<FreeCellPayload> = {
  adapterVersion: "freecell-session-adapter-v1", engineVersion: "freecell-rules-v1", gameId: "freecell",
  modes: ["solo"], difficulties: ["standard"], parsePayload: parseFreeCellSave,
  payloadDifficulty: () => "standard", payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.freecell-save", schemaVersion: 1, storageKey: "oiyo:freecell-state:v1" },
};
const connectFourAdapter: Adapter<ConnectFourPayload> = {
  adapterVersion: "connect-four-session-adapter-v1", engineVersion: "connect-four-rules-v1", gameId: "connect-four",
  modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"], parsePayload: parseConnectFourSave,
  payloadDifficulty: (value) => `level-${value.level}`, payloadMode: (value) => value.mode,
  source: { format: "legacy-local-storage", schema: "oiyo.connect-four-save", schemaVersion: 1, storageKey: "oiyo:connect-four-state:v1" },
};
const gomokuAdapter: Adapter<GomokuSaveV2> = {
  adapterVersion: "gomoku-session-adapter-v2", engineVersion: "gomoku-rules-v1", gameId: "gomoku",
  modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"],
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null;
    return parseGomokuSaveV2(JSON.stringify(value), value.savedAtEpochMs);
  },
  payloadDifficulty: (value) => `level-${value.level}`, payloadMode: (value) => value.mode,
  source: { format: "legacy-local-storage", schema: "oiyo.gomoku-save", schemaVersion: 2, storageKey: "oiyo:gomoku-state:v2" },
};

const sudokuAdapter: Adapter<SudokuSaveV2> = {
  adapterVersion: "sudoku-session-adapter-v2", engineVersion: "sudoku-rules-v2", gameId: "sudoku",
  modes: RESTORABLE_GAME_CAPABILITIES.sudoku.modes, difficulties: RESTORABLE_GAME_CAPABILITIES.sudoku.difficulties,
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.dailyDate !== "string" || typeof value.savedAtEpochMs !== "number") return null;
    const parsed = parseSudokuSaveV2(JSON.stringify(value), value.dailyDate, value.savedAtEpochMs);
    return parsed ? { ...parsed, entries: parsed.entries.map((row) => [...row]) } : null;
  },
  payloadDifficulty: (value) => value.mode === "daily" ? "daily" : value.mode,
  payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.sudoku-save", schemaVersion: 2, storageKey: "oiyo:sudoku-state:v2" },
};
const puzzle15Adapter: Adapter<Puzzle15Save> = {
  adapterVersion: "puzzle15-session-adapter-v1", engineVersion: "puzzle15-rules-v1", gameId: "puzzle15",
  modes: ["solo"], difficulties: ["3x3", "4x4", "5x5"], parsePayload: parsePuzzle15Save,
  payloadDifficulty: (value) => `${value.size}x${value.size}`, payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.puzzle15-save", schemaVersion: 1, storageKey: "oiyo:puzzle15-state:v1" },
};

const checkersAdapter: Adapter<CheckersSave> = {
  adapterVersion: "checkers-session-adapter-v1", engineVersion: "checkers-rules-v1", gameId: "checkers",
  modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"], parsePayload: parseCheckersSave,
  payloadDifficulty: (value) => `level-${value.level}`, payloadMode: (value) => value.mode,
  source: { format: "legacy-local-storage", schema: "oiyo.checkers-save", schemaVersion: 1, storageKey: "oiyo:checkers-state:v1" },
};
const reversiAdapter: Adapter<ReversiSave> = {
  adapterVersion: "reversi-session-adapter-v1", engineVersion: "reversi-rules-v1", gameId: "reversi",
  modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"], parsePayload: parseReversiSave,
  payloadDifficulty: (value) => `level-${value.level}`, payloadMode: (value) => value.mode,
  source: { format: "legacy-local-storage", schema: "oiyo.reversi-save", schemaVersion: 1, storageKey: "oiyo:reversi-state:v1" },
};
const janggiAdapter: Adapter<JanggiSaveV1> = {
  adapterVersion: "janggi-session-adapter-v1", engineVersion: "janggi-rules-v1", gameId: "janggi",
  modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"],
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null;
    return parseJanggiSave(JSON.stringify(value), value.savedAtEpochMs);
  },
  payloadDifficulty: (value) => `level-${value.level}`, payloadMode: (value) => value.mode,
  source: { format: "legacy-local-storage", schema: "oiyo.janggi-save", schemaVersion: 1, storageKey: "oiyo:janggi-state:v1" },
};

const game2048Adapter: Adapter<Game2048Save> = {
  adapterVersion: "game-2048-session-adapter-v1", engineVersion: "game-2048-rules-v1", gameId: "game-2048",
  modes: ["solo"], difficulties: ["classic-4x4"], parsePayload: parseGame2048Save,
  payloadDifficulty: () => "classic-4x4", payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.game-2048-save", schemaVersion: 1, storageKey: "oiyo:game-2048-state:v1" },
};

const snakeAdapter: Adapter<SnakeSaveV1> = {
  adapterVersion: "snake-session-adapter-v1", engineVersion: "snake-rules-v1", gameId: "snake-game",
  modes: ["solo"], difficulties: ["classic-20x20"],
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null;
    return parseSnakeSave(JSON.stringify(value), value.savedAtEpochMs);
  },
  payloadDifficulty: () => "classic-20x20", payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.snake-save", schemaVersion: 1, storageKey: "oiyo:snake-state:v1" },
};

const kurodokoAdapter: Adapter<KurodokoSaveV1> = {
  adapterVersion: "kurodoko-session-adapter-v1", engineVersion: "kurodoko-rules-v1", gameId: "kurodoko",
  modes: ["solo"], difficulties: ["daily", "easy", "medium", "hard"],
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.dailyDate !== "string" || typeof value.savedAtEpochMs !== "number") return null;
    return parseKurodokoSaveV1(JSON.stringify(value), value.dailyDate, value.savedAtEpochMs);
  },
  payloadDifficulty: (value) => value.mode === "daily" ? "daily" : value.difficulty,
  payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.kurodoko-save", schemaVersion: 1, storageKey: "oiyo:kurodoko-state:v1" },
};

const yahtzeeAdapter: Adapter<YahtzeeSaveV1> = {
  adapterVersion: "yahtzee-session-adapter-v1", engineVersion: "yahtzee-rules-v1", gameId: "yahtzee",
  modes: ["solo"], difficulties: ["classic"],
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null;
    return parseYahtzeeSave(JSON.stringify(value), value.savedAtEpochMs);
  },
  payloadDifficulty: () => "classic", payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.yahtzee-save", schemaVersion: 1, storageKey: "oiyo:yahtzee-state:v1" },
};

const caveDashAdapter: Adapter<CaveDashSaveV1> = {
  adapterVersion: "cave-dash-session-adapter-v1", engineVersion: "cave-dash-physics-v1", gameId: "cave-dash",
  modes: ["solo"], difficulties: ["endless-v1"],
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null;
    return parseCaveDashSave(JSON.stringify(value), value.savedAtEpochMs);
  },
  payloadDifficulty: () => "endless-v1", payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.cave-dash-save", schemaVersion: 1, storageKey: "oiyo:cave-dash-state:v1" },
};

const dotRunnerAdapter: Adapter<DotRunnerSaveV1> = {
  adapterVersion: "dot-runner-session-adapter-v1", engineVersion: "dot-runner-physics-v1", gameId: "dot-runner",
  modes: ["solo"], difficulties: ["endless-v1"],
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null;
    return parseDotRunnerSave(JSON.stringify(value), value.savedAtEpochMs);
  },
  payloadDifficulty: () => "endless-v1", payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.dot-runner-save", schemaVersion: 1, storageKey: "oiyo:dot-runner-state:v1" },
};

const mahjongAdapter: Adapter<MahjongSaveV1> = {
  adapterVersion: "mahjong-session-adapter-v1", engineVersion: "mahjong-closed-hand-v1", gameId: "mahjong",
  modes: ["ai"], difficulties: ["level-1", "level-2", "level-3"],
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null;
    return parseMahjongSave(JSON.stringify(value), value.savedAtEpochMs);
  },
  payloadDifficulty: (payload) => `level-${payload.level}`,
  payloadMode: () => "ai",
  source: { format: "legacy-local-storage", schema: "oiyo.mahjong-save", schemaVersion: 1, storageKey: "oiyo:mahjong-state:v1" },
};

const waterSortAdapter: Adapter<WaterSortSaveV1> = {
  adapterVersion: "water-sort-session-adapter-v1", engineVersion: "water-sort-rules-v1", gameId: "water-sort",
  modes: ["solo"], difficulties: ["easy", "medium", "hard"],
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null;
    return parseWaterSortSave(JSON.stringify(value), value.savedAtEpochMs);
  },
  payloadDifficulty: (payload) => payload.state.difficulty, payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.water-sort-save", schemaVersion: 1, storageKey: "oiyo:water-sort-state:v1" },
};

const psychologyWordleAdapter: Adapter<PsychologyWordleSaveV1> = {
  adapterVersion: "psychology-wordle-session-adapter-v1", engineVersion: "psychology-wordle-rules-v1", gameId: "psychology-wordle",
  modes: ["solo"], difficulties: ["daily", "random"],
  parsePayload: (value) => {
    if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null;
    return parsePsychologyWordleSave(JSON.stringify(value), value.savedAtEpochMs);
  },
  payloadDifficulty: (payload) => payload.mode, payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.psychology-wordle-save", schemaVersion: 1, storageKey: "oiyo:psychology-wordle-state:v1" },
};

const memoryCardAdapter: Adapter<MemoryCardSaveV1> = {
  adapterVersion: "memory-card-session-adapter-v1", engineVersion: "memory-card-rules-v1", gameId: "memory-card-game",
  modes: ["solo"], difficulties: ["4x4", "6x4", "6x6"],
  parsePayload: (value) => { if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null; return parseMemoryCardSave(JSON.stringify(value), value.savedAtEpochMs); },
  payloadDifficulty: (payload) => payload.state.gridSize, payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.memory-card-save", schemaVersion: 1, storageKey: "oiyo:memory-card-game-state:v1" },
};

const numberGuessingAdapter: Adapter<NumberGuessingSaveV1> = {
  adapterVersion: "number-guessing-session-adapter-v1", engineVersion: "number-guessing-rules-v1", gameId: "number-guessing",
  modes: ["solo"], difficulties: ["easy", "normal", "hard"],
  parsePayload: (value) => { if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null; return parseNumberGuessingSave(JSON.stringify(value), value.savedAtEpochMs); },
  payloadDifficulty: (payload) => payload.state.difficulty, payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.number-guessing-save", schemaVersion: 1, storageKey: "oiyo:number-guessing-state:v1" },
};

const wordleAdapter: Adapter<WordleSaveV1> = {
  adapterVersion: "wordle-session-adapter-v1", engineVersion: "wordle-rules-v1", gameId: "wordle",
  modes: ["solo"], difficulties: ["daily", "random"],
  parsePayload: (value) => { if (!isRecord(value) || typeof value.savedAtEpochMs !== "number") return null; return parseWordleSave(JSON.stringify(value), value.savedAtEpochMs); },
  payloadDifficulty: (payload) => payload.state.mode, payloadMode: () => "solo",
  source: { format: "legacy-local-storage", schema: "oiyo.wordle-save", schemaVersion: 1, storageKey: "oiyo:wordle-state:v1" },
};

const adapters: Record<RestorableGameId, Adapter<unknown>> = {
  chess: chessAdapter as Adapter<unknown>,
  hearts: heartsAdapter as Adapter<unknown>,
  minesweeper: minesweeperAdapter as Adapter<unknown>,
  "brick-breaker": brickBreakerAdapter as Adapter<unknown>,
  solitaire: solitaireAdapter as Adapter<unknown>,
  freecell: freecellAdapter as Adapter<unknown>,
  "connect-four": connectFourAdapter as Adapter<unknown>,
  gomoku: gomokuAdapter as Adapter<unknown>,
  sudoku: sudokuAdapter as Adapter<unknown>,
  puzzle15: puzzle15Adapter as Adapter<unknown>,
  checkers: checkersAdapter as Adapter<unknown>,
  reversi: reversiAdapter as Adapter<unknown>,
  janggi: janggiAdapter as Adapter<unknown>,
  "game-2048": game2048Adapter as Adapter<unknown>,
  "snake-game": snakeAdapter as Adapter<unknown>,
  kurodoko: kurodokoAdapter as Adapter<unknown>,
  yahtzee: yahtzeeAdapter as Adapter<unknown>,
  "cave-dash": caveDashAdapter as Adapter<unknown>,
  "dot-runner": dotRunnerAdapter as Adapter<unknown>,
  mahjong: mahjongAdapter as Adapter<unknown>,
  "water-sort": waterSortAdapter as Adapter<unknown>,
  "psychology-wordle": psychologyWordleAdapter as Adapter<unknown>,
  "memory-card-game": memoryCardAdapter as Adapter<unknown>,
  "number-guessing": numberGuessingAdapter as Adapter<unknown>,
  wordle: wordleAdapter as Adapter<unknown>,
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

export function adaptMinesweeperSaveToSession(
  value: unknown,
  timing: GameSessionTiming,
  progress?: GameSessionProgress,
): GameSessionEnvelope<MinesweeperSave> | null {
  const payload = minesweeperAdapter.parsePayload(value);
  return payload ? createEnvelope(minesweeperAdapter, payload, timing, progress) : null;
}

export function adaptBrickBreakerSaveToSession(
  value: unknown,
  timing: GameSessionTiming,
  progress?: GameSessionProgress,
): GameSessionEnvelope<BrickBreakerSave> | null {
  const payload = brickBreakerAdapter.parsePayload(value);
  return payload ? createEnvelope(brickBreakerAdapter, payload, timing, progress) : null;
}

export function adaptActiveGameSaveToSession(
  gameId: "solitaire" | "freecell" | "connect-four" | "gomoku" | "sudoku" | "puzzle15" | "checkers" | "reversi" | "game-2048" | "snake-game" | "kurodoko" | "yahtzee" | "cave-dash" | "dot-runner" | "mahjong" | "water-sort" | "psychology-wordle" | "memory-card-game" | "number-guessing" | "wordle" | "janggi",
  value: unknown,
  timing: GameSessionTiming,
): GameSessionEnvelope | null {
  const adapter = adapters[gameId];
  const payload = adapter.parsePayload(value);
  return payload ? createEnvelope(adapter, payload, timing) : null;
}

/** Parse an untrusted common envelope and re-run the owning game's state validator. */
export function parseGameSessionEnvelope(raw: string | null): GameSessionEnvelope | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.schema !== GAME_SESSION_SCHEMA || value.schemaVersion !== GAME_SESSION_SCHEMA_VERSION) return null;
    if (typeof value.gameId !== "string" || !(value.gameId in adapters)) return null;
    const gameId = value.gameId as RestorableGameId;
    const adapter = adapters[gameId];
    if (value.adapterVersion !== adapter.adapterVersion || value.engineVersion !== adapter.engineVersion) return null;
    if (value.terminal !== false || value.mode !== "local" && value.mode !== "ai" && value.mode !== "solo" || typeof value.difficulty !== "string" || value.difficulty.length === 0) return null;
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
