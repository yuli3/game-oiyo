/**
 * SpellTower Web - Pure Core Game Logic
 *
 * Inspired by Zach Gage's mobile hit SpellTower.
 * Features 7x9 letter grid, word path tracing (8 directions),
 * adjacent dead block clearance, gravity cascade collapse, and tower rising.
 */

export const COLS = 7;
export const ROWS = 9;

export interface Position {
  r: number;
  c: number;
}

export type TileType = "normal" | "bonus" | "dead";

export interface SpellTile {
  id: string;
  letter: string;
  type: TileType;
  points: number;
}

export interface SpellTowerState {
  grid: (SpellTile | null)[][]; // [ROWS][COLS], null means empty
  score: number;
  wordsFound: string[];
  selectedPath: Position[];
  status: "playing" | "game_over";
  combo: number;
  highestWord: { word: string; score: number };
}

// Letter frequency table for natural word forming (Scrabble weights)
const LETTER_WEIGHTS: Record<string, { weight: number; points: number }> = {
  E: { weight: 12, points: 1 },
  A: { weight: 9, points: 1 },
  I: { weight: 9, points: 1 },
  O: { weight: 8, points: 1 },
  N: { weight: 6, points: 1 },
  R: { weight: 6, points: 1 },
  T: { weight: 6, points: 1 },
  L: { weight: 4, points: 1 },
  S: { weight: 4, points: 1 },
  U: { weight: 4, points: 1 },
  D: { weight: 4, points: 2 },
  G: { weight: 3, points: 2 },
  B: { weight: 2, points: 3 },
  C: { weight: 2, points: 3 },
  M: { weight: 2, points: 3 },
  P: { weight: 2, points: 3 },
  F: { weight: 2, points: 4 },
  H: { weight: 2, points: 4 },
  V: { weight: 2, points: 4 },
  W: { weight: 2, points: 4 },
  Y: { weight: 2, points: 4 },
  K: { weight: 1, points: 5 },
  J: { weight: 1, points: 8 },
  X: { weight: 1, points: 8 },
  Q: { weight: 1, points: 10 },
  Z: { weight: 1, points: 10 },
};

const WEIGHTED_LETTERS: string[] = [];
for (const [char, meta] of Object.entries(LETTER_WEIGHTS)) {
  for (let i = 0; i < meta.weight; i++) {
    WEIGHTED_LETTERS.push(char);
  }
}

// Comprehensive vocabulary of common 3-7 letter words for instant client-side lookup
export const VALID_WORDS: Set<string> = new Set([
  // 3-letter words
  "THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "ANY", "CAN", "HAD", "HER", "WAS", "ONE", "OUR",
  "OUT", "DAY", "GET", "HAS", "HIM", "HIS", "HOW", "MAN", "NEW", "NOW", "OLD", "SEE", "TWO", "WAY", "WHO",
  "BOY", "DID", "ITS", "LET", "PUT", "SAY", "SHE", "TOO", "USE", "CAT", "DOG", "SUN", "RUN", "TOP", "WIN",
  "RED", "BOX", "CAR", "SKY", "SEA", "AIR", "ICE", "WAR", "EAR", "EYE", "HOT", "COLD", "TEA", "CUP", "BAG",
  "BED", "PAN", "PEN", "PIG", "COW", "FLY", "FRY", "CRY", "DRY", "BIG", "LOW", "FIT", "HIT", "SIT", "LIP",
  "MAP", "NET", "PIN", "ROD", "ROW", "SEW", "TAX", "TIE", "VAN", "WET", "YES", "YET", "ZOO", "KEY", "JOY",
  // 4-letter words
  "THAT", "WITH", "HAVE", "THIS", "WILL", "YOUR", "FROM", "THEY", "KNOW", "WANT", "BEEN", "GOOD", "MUCH",
  "SOME", "TIME", "VERY", "WHEN", "COME", "HERE", "JUST", "LIKE", "LONG", "MAKE", "MANY", "MORE", "ONLY",
  "OVER", "SUCH", "TAKE", "THAN", "THEM", "WELL", "WERE", "BIRD", "FISH", "BOOK", "TREE", "FIRE", "WIND",
  "STAR", "MOON", "GAME", "PLAY", "GOLD", "BLUE", "WALK", "JUMP", "FALL", "RAIN", "SNOW", "ROAD", "SHIP",
  "DOOR", "FAST", "SLOW", "LOVE", "HOPE", "LIFE", "CITY", "TOWN", "LAND", "FARM", "HERO", "KING", "WORD",
  "CAST", "MINE", "CAMP", "WAVE", "BEAR", "LION", "WOLF", "DUCK", "FROG", "WORM", "DEER", "HAIR", "HEAD",
  "HAND", "FOOT", "IRON", "ROCK", "WOOD", "SAND", "LEAF", "SEED", "PARK", "HILL", "LAKE", "RIVER", "POND",
  // 5-letter words
  "ABOUT", "OTHER", "WHICH", "THEIR", "THERE", "FIRST", "WOULD", "THESE", "CLICK", "PRICE", "STATE",
  "WORLD", "MUSIC", "WATER", "AFTER", "WHERE", "POWER", "THOSE", "MEDIA", "HOUSE", "POINT", "GREAT",
  "SMALL", "LARGE", "LIGHT", "NIGHT", "GREEN", "WHITE", "BLACK", "EARTH", "SPACE", "PLANT", "TOWER",
  "SPELL", "MAGIC", "SWORD", "SHIELD", "CROWN", "QUEEN", "KNIGHT", "CHESS", "STONE", "RIVER", "OCEAN",
  "CLOUD", "STORM", "FLAME", "HEART", "DREAM", "BRAIN", "VOICE", "SOUND", "SMILE", "LAUGH", "DANCE",
  "TRAIN", "PLANE", "TRUCK", "CLOCK", "PAPER", "BREAD", "FRUIT", "APPLE", "GRAPE", "BERRY", "HONEY",
  // 6-letter words
  "TOWERS", "SPELLS", "KNIGHT", "CASTLE", "FOREST", "STREAM", "SPRING", "SUMMER", "WINTER", "AUTUMN",
  "PLANET", "GALAXY", "ROCKET", "FLIGHT", "SHADOW", "DRAGON", "WIZARD", "LEGEND", "SILVER", "GOLDEN",
  "PURPLE", "YELLOW", "ORANGE", "CHERRY", "PENCIL", "SCREEN", "WINDOW", "GARDEN", "FLOWER", "BRIDGE",
  // 7-letter words
  "KINGDOM", "DRAGONS", "WARRIOR", "CRYSTAL", "MYSTERY", "JOURNEY", "THUNDER", "MORNING", "EVENING",
  "WEATHER", "RAINBOW", "DIAMOND", "MONSTER", "TACTICS", "VICTORY", "DEFENSE", "ARCADE", "OFFENSE",
]);

let nextTileSeq = 1;

export function getRandomLetter(): string {
  const idx = Math.floor(Math.random() * WEIGHTED_LETTERS.length);
  return WEIGHTED_LETTERS[idx] ?? "E";
}

export function createRandomTile(type: TileType = "normal"): SpellTile {
  const id = `tile_${nextTileSeq++}`;
  if (type === "dead") {
    return { id, letter: "☠", type: "dead", points: 0 };
  }
  const letter = getRandomLetter();
  const meta = LETTER_WEIGHTS[letter] ?? { points: 1 };
  const isBonus = Math.random() < 0.1;
  return {
    id,
    letter,
    type: isBonus ? "bonus" : "normal",
    points: meta.points * (isBonus ? 2 : 1),
  };
}

/**
 * Initializes a 7x9 SpellTower grid with bottom 5 rows filled with letters and dead blocks.
 */
export function initSpellTower(): SpellTowerState {
  const grid: (SpellTile | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  // Fill bottom 5 rows (rows 4..8)
  for (let r = 4; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // 10% chance of dead block in initial layout
      const isDead = Math.random() < 0.08;
      grid[r]![c] = createRandomTile(isDead ? "dead" : "normal");
    }
  }

  return {
    grid,
    score: 0,
    wordsFound: [],
    selectedPath: [],
    status: "playing",
    combo: 0,
    highestWord: { word: "", score: 0 },
  };
}

/**
 * Checks if two grid positions are adjacent (8-directional).
 */
export function isAdjacent(p1: Position, p2: Position): boolean {
  const dr = Math.abs(p1.r - p2.r);
  const dc = Math.abs(p1.c - p2.c);
  return (dr <= 1 && dc <= 1) && !(dr === 0 && dc === 0);
}

/**
 * Toggles or extends the selected tile path.
 */
export function selectTile(state: SpellTowerState, pos: Position): SpellTowerState {
  if (state.status !== "playing") return state;
  const tile = state.grid[pos.r]?.[pos.c];
  if (!tile || tile.type === "dead") return state;

  const path = [...state.selectedPath];
  const lastIndex = path.findIndex((p) => p.r === pos.r && p.c === pos.c);

  if (lastIndex >= 0) {
    // If clicking the previous tile in path, backtrack!
    if (lastIndex === path.length - 2) {
      path.pop();
      return { ...state, selectedPath: path };
    }
    // If clicking the very last tile, keep it
    if (lastIndex === path.length - 1) return state;
    // Otherwise shorten path to that point
    return { ...state, selectedPath: path.slice(0, lastIndex + 1) };
  }

  // If path is empty, start with this tile
  if (path.length === 0) {
    return { ...state, selectedPath: [pos] };
  }

  // Must be adjacent to last tile
  const last = path[path.length - 1]!;
  if (!isAdjacent(last, pos)) return state;

  path.push(pos);
  return { ...state, selectedPath: path };
}

export function getSelectedWord(state: SpellTowerState): string {
  return state.selectedPath
    .map((p) => state.grid[p.r]?.[p.c]?.letter ?? "")
    .join("");
}

export function isValidWord(word: string): boolean {
  if (word.length < 3) return false;
  return VALID_WORDS.has(word.toUpperCase());
}

/**
 * Submits the currently selected word path.
 * 1. Validates word.
 * 2. Removes selected tiles.
 * 3. Pops adjacent dead tiles.
 * 4. Applies gravity cascade collapse.
 * 5. Pushes a new row from bottom (Tower Rise).
 */
export function submitWord(state: SpellTowerState): {
  state: SpellTowerState;
  clearedWord: string | null;
  pointsEarned: number;
  deadTilesCleared: number;
} {
  if (state.status !== "playing" || state.selectedPath.length < 3) {
    return { state: { ...state, selectedPath: [] }, clearedWord: null, pointsEarned: 0, deadTilesCleared: 0 };
  }

  const word = getSelectedWord(state);
  if (!isValidWord(word)) {
    return { state: { ...state, selectedPath: [] }, clearedWord: null, pointsEarned: 0, deadTilesCleared: 0 };
  }

  // Clone grid
  const newGrid: (SpellTile | null)[][] = state.grid.map((row) => [...row]);

  // Calculate base score
  let basePoints = 0;
  for (const pos of state.selectedPath) {
    const tile = newGrid[pos.r]![pos.c];
    if (tile) {
      basePoints += tile.points;
      newGrid[pos.r]![pos.c] = null; // Remove tile
    }
  }

  // Multiplier based on word length
  const lengthMultiplier = word.length >= 6 ? 3 : word.length >= 5 ? 2 : word.length >= 4 ? 1.5 : 1;
  const wordScore = Math.round(basePoints * lengthMultiplier * 10);

  // Clear adjacent dead blocks
  let deadTilesCleared = 0;
  for (const pos of state.selectedPath) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = pos.r + dr;
        const nc = pos.c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          const adjTile = newGrid[nr]![nc];
          if (adjTile && adjTile.type === "dead") {
            newGrid[nr]![nc] = null;
            deadTilesCleared++;
          }
        }
      }
    }
  }

  // Apply Gravity Cascade (drop tiles in each column down)
  for (let c = 0; c < COLS; c++) {
    const colTiles: SpellTile[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const tile = newGrid[r]![c];
      if (tile) colTiles.push(tile);
    }

    for (let r = ROWS - 1; r >= 0; r--) {
      const fillIndex = ROWS - 1 - r;
      newGrid[r]![c] = colTiles[fillIndex] ?? null;
    }
  }

  // Tower Rise: Bump entire grid up by 1 and generate new bottom row
  const nextGrid = pushBottomRow(newGrid);

  // Check Game Over: if any tile pushed to top overflow (row 0 has any tiles)
  let gameOver = false;
  for (let c = 0; c < COLS; c++) {
    if (nextGrid[0]![c] !== null) {
      gameOver = true;
      break;
    }
  }

  const newScore = state.score + wordScore;
  const newHighest =
    wordScore > state.highestWord.score
      ? { word, score: wordScore }
      : state.highestWord;

  return {
    state: {
      ...state,
      grid: nextGrid,
      score: newScore,
      wordsFound: [word, ...state.wordsFound],
      selectedPath: [],
      status: gameOver ? "game_over" : "playing",
      combo: state.combo + 1,
      highestWord: newHighest,
    },
    clearedWord: word,
    pointsEarned: wordScore,
    deadTilesCleared,
  };
}

/**
 * Pushes a new row of letter tiles at the bottom, shifting everything up.
 */
export function pushBottomRow(grid: (SpellTile | null)[][]): (SpellTile | null)[][] {
  const result: (SpellTile | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  // Shift existing rows up: row r moves to r - 1
  for (let r = 1; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      result[r - 1]![c] = grid[r]![c];
    }
  }

  // New bottom row at ROWS - 1
  for (let c = 0; c < COLS; c++) {
    const isDead = Math.random() < 0.12;
    result[ROWS - 1]![c] = createRandomTile(isDead ? "dead" : "normal");
  }

  return result;
}
