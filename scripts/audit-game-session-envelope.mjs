import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const fixturePath = resolve(root, "config/game-session-envelope-v1.fixtures.json");
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const errors = [];
const expectedGames = ["chess", "hearts", "minesweeper", "brick-breaker", "solitaire", "freecell", "connect-four", "gomoku", "sudoku", "puzzle15", "checkers", "reversi", "game-2048", "snake-game", "kurodoko", "yahtzee", "cave-dash", "dot-runner", "mahjong", "water-sort"];
const restorableSymbols = {
  chess: ["loadChessSave", "storeChessSave"],
  hearts: ["loadHeartsSavedGame", "saveHeartsGame"],
  minesweeper: ["loadMinesweeperSave", "storeMinesweeperSave"],
  "brick-breaker": ["loadBrickBreakerSave", "storeBrickBreakerSave"],
  solitaire: ["loadSolitaireSaveV2", "storeSolitaireSaveV2"],
  freecell: ["loadFreeCellSave", "storeFreeCellSave"],
  "connect-four": ["loadConnectFourSave", "storeConnectFourSave"],
  gomoku: ["loadGomokuSave", "storeGomokuSave"],
  sudoku: ["loadSudokuSave", "storeSudokuSave"],
  puzzle15: ["loadPuzzle15Save", "storePuzzle15Save"],
  checkers: ["loadCheckersSave", "storeCheckersSave"],
  reversi: ["loadReversiSave", "storeReversiSave"],
  "game-2048": ["loadGame2048Save", "storeGame2048Save"],
  "snake-game": ["loadSnakeSave", "storeSnakeSave"],
  kurodoko: ["loadKurodokoSaveV1", "storeKurodokoSaveV1"],
  yahtzee: ["loadYahtzeeSave", "storeYahtzeeSave"],
  "cave-dash": ["loadCaveDashSave", "storeCaveDashSave"],
  "dot-runner": ["loadDotRunnerSave", "storeDotRunnerSave"],
  mahjong: ["loadMahjongSave", "storeMahjongSave"],
  "water-sort": ["loadWaterSortSave", "storeWaterSortSave"],
};
const restorableCapabilities = {
  chess: { modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"] },
  hearts: { modes: ["ai"], difficulties: ["heuristic-v1"] },
  minesweeper: { modes: ["solo"], difficulties: ["daily", "beginner", "intermediate", "expert"] },
  "brick-breaker": { modes: ["solo"], difficulties: ["endless-v1"] },
  solitaire: { modes: ["solo"], difficulties: ["draw-1"] },
  freecell: { modes: ["solo"], difficulties: ["standard"] },
  "connect-four": { modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"] },
  gomoku: { modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"] },
  sudoku: { modes: ["solo"], difficulties: ["daily", "easy", "medium", "hard"] },
  puzzle15: { modes: ["solo"], difficulties: ["3x3", "4x4", "5x5"] },
  checkers: { modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"] },
  reversi: { modes: ["local", "ai"], difficulties: ["level-1", "level-2", "level-3"] },
  "game-2048": { modes: ["solo"], difficulties: ["classic-4x4"] },
  "snake-game": { modes: ["solo"], difficulties: ["classic-20x20"] },
  kurodoko: { modes: ["solo"], difficulties: ["daily", "easy", "medium", "hard"] },
  yahtzee: { modes: ["solo"], difficulties: ["classic"] },
  "cave-dash": { modes: ["solo"], difficulties: ["endless-v1"] },
  "dot-runner": { modes: ["solo"], difficulties: ["endless-v1"] },
  mahjong: { modes: ["ai"], difficulties: ["level-1", "level-2", "level-3"] },
  "water-sort": { modes: ["solo"], difficulties: ["easy", "medium", "hard"] },
};

if (fixture.schema !== "oiyo.game-session-capabilities" || fixture.schemaVersion !== 1) {
  errors.push("fixture schema/version mismatch");
}
if (fixture.timestampPolicy !== "utc-iso-8601-milliseconds-z") {
  errors.push("fixture must declare the canonical UTC timestamp policy");
}
if (!Array.isArray(fixture.games) || fixture.games.length !== expectedGames.length) {
  errors.push(`expected exactly ${expectedGames.length} capability records`);
}

const ids = new Set();
const storageKeys = new Set();
for (const game of fixture.games ?? []) {
  if (!expectedGames.includes(game.gameId) || ids.has(game.gameId)) errors.push(`unknown/duplicate gameId: ${game.gameId}`);
  ids.add(game.gameId);
  if (!Array.isArray(game.modes) || game.modes.length === 0) errors.push(`${game.gameId}: modes required`);
  if (!Array.isArray(game.difficulties) || game.difficulties.length === 0) errors.push(`${game.gameId}: difficulties required`);
  if (!Array.isArray(game.nonSessionPersistence)) errors.push(`${game.gameId}: nonSessionPersistence must be an array`);

  let component = "";
  try { component = await readFile(resolve(root, game.componentPath), "utf8"); }
  catch { errors.push(`${game.gameId}: missing component ${game.componentPath}`); }

  if (game.supportsRestore) {
    if (!game.adapterPath || !game.sessionStorageKey || !game.sourceSchema || !Number.isInteger(game.sourceSchemaVersion) || game.sourceSchemaVersion < 1) {
      errors.push(`${game.gameId}: restorable game requires legacy adapter metadata`);
      continue;
    }
    if (!game.adapterVersion || !game.engineVersion || game.deterministicResume !== true) {
      errors.push(`${game.gameId}: restorable game requires versions and deterministic resume`);
    }
    const expectedCapability = restorableCapabilities[game.gameId];
    if (!expectedCapability || JSON.stringify(game.modes) !== JSON.stringify(expectedCapability.modes) ||
      JSON.stringify(game.difficulties) !== JSON.stringify(expectedCapability.difficulties)) {
      errors.push(`${game.gameId}: modes/difficulties drift from adapter capability metadata`);
    }
    if (storageKeys.has(game.sessionStorageKey)) errors.push(`${game.gameId}: session storage key collision`);
    storageKeys.add(game.sessionStorageKey);
    try {
      const adapter = await readFile(resolve(root, game.adapterPath), "utf8");
      if (!adapter.includes(game.sessionStorageKey)) errors.push(`${game.gameId}: adapter does not own declared storage key`);
    } catch { errors.push(`${game.gameId}: missing adapter ${game.adapterPath}`); }
    for (const symbol of restorableSymbols[game.gameId] ?? []) {
      if (!component.includes(symbol)) errors.push(`${game.gameId}: component is not wired to ${symbol}`);
    }
  } else {
    if (game.adapterPath !== null || game.sessionStorageKey !== null || game.sourceSchema !== null ||
      game.sourceSchemaVersion !== null || game.adapterVersion !== null || game.engineVersion !== null) {
      errors.push(`${game.gameId}: unsupported restore must not claim adapter/version/storage metadata`);
    }
    if (game.deterministicResume !== false || typeof game.reason !== "string" || game.reason.length < 20) {
      errors.push(`${game.gameId}: unsupported restore requires an honest reason`);
    }
    if (/(?:localStorage|sessionStorage)\.setItem\s*\(/.test(component)) {
      errors.push(`${game.gameId}: direct session-like localStorage write found; capability review required`);
    }
  }
}

for (const gameId of expectedGames) if (!ids.has(gameId)) errors.push(`missing game capability: ${gameId}`);
const restorable = (fixture.games ?? []).filter((game) => game.supportsRestore).map((game) => game.gameId);
if (JSON.stringify(restorable) !== JSON.stringify(["chess", "hearts", "minesweeper", "brick-breaker", "solitaire", "freecell", "connect-four", "gomoku", "sudoku", "puzzle15", "checkers", "reversi", "game-2048", "snake-game", "kurodoko", "yahtzee", "cave-dash", "dot-runner", "mahjong", "water-sort"])) {
  errors.push(`restore inventory drift: ${restorable.join(", ")}`);
}

const envelopeSource = await readFile(resolve(root, "src/lib/games/session-envelope.ts"), "utf8");
for (const game of (fixture.games ?? []).filter((item) => item.supportsRestore)) {
  for (const marker of [game.gameId, game.adapterVersion, game.engineVersion, game.sessionStorageKey, game.sourceSchema]) {
    if (!envelopeSource.includes(marker)) errors.push(`${game.gameId}: envelope adapter missing marker ${marker}`);
  }
  const capability = restorableCapabilities[game.gameId];
  for (const marker of [...(capability?.modes ?? []), ...(capability?.difficulties ?? [])]) {
    if (!envelopeSource.includes(`"${marker}"`)) errors.push(`${game.gameId}: envelope capability metadata missing ${marker}`);
  }
}

if (errors.length > 0) {
  console.error(`GameSessionEnvelope audit failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`GameSessionEnvelope audit PASS: ${ids.size} games, ${restorable.length} restorable, ${ids.size - restorable.length} explicitly unsupported`);
