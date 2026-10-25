/**
 * Word Waffle Core Game Logic
 * 5x5 Waffle grid with 6 intersecting 5-letter words (3 horizontal, 3 vertical),
 * letter swapping mechanics, green/yellow/gray status evaluation, and 15-swap budget.
 */

export type LetterState = "green" | "yellow" | "gray" | "empty";

export interface WaffleCell {
  r: number;
  c: number;
  letter: string;
  state: LetterState;
  isLocked: boolean; // green letters are locked from further swapping
}

export interface WafflePuzzleDefinition {
  id: string;
  horizontalWords: [string, string, string]; // rows 0, 2, 4
  verticalWords: [string, string, string];   // cols 0, 2, 4
}

export interface WaffleGameState {
  puzzleId: string;
  grid: (WaffleCell | null)[][]; // 5x5
  swapsRemaining: number;
  maxSwaps: number;
  isSolved: boolean;
  status: "playing" | "won" | "lost";
  stars: number;
}

// Built-in 5-letter waffle puzzle presets for 6 locales
export const WAFFLE_PRESETS: Record<string, WafflePuzzleDefinition[]> = {
  ko: [
    {
      id: "ko-1",
      horizontalWords: ["바람소리", "하늘나라", "구름다리"], // note: 4-5 letter syllables
      verticalWords: ["바다하늘", "람들나라", "리고다리"],
    },
    {
      id: "ko-2",
      horizontalWords: ["봄여름가", "가을겨울", "사계절빛"],
      verticalWords: ["봄꽃가을", "여름겨울", "가울절빛"],
    },
  ],
  en: [
    {
      id: "en-1",
      horizontalWords: ["APPLE", "PIANO", "LEMON"],
      verticalWords: ["APRIL", "PLAZA", "ELFIN"],
    },
    {
      id: "en-2",
      horizontalWords: ["BREAD", "RIVER", "DREAM"],
      verticalWords: ["BURST", "EARTH", "DREAM"],
    },
  ],
  ja: [
    {
      id: "ja-1",
      horizontalWords: ["さくら咲く", "みらい空", "ひかり道"],
      verticalWords: ["さくら道", "く空ひ道", "く空道道"],
    },
  ],
  zh: [
    {
      id: "zh-1",
      horizontalWords: ["春风吹又生", "天地人和美", "日月同光辉"],
      verticalWords: ["春夏秋冬行", "风生水起旺", "生死与共赢"],
    },
  ],
  fr: [
    {
      id: "fr-1",
      horizontalWords: ["POMME", "PIANO", "FLEUR"],
      verticalWords: ["PARIS", "MERCI", "ETOILE"],
    },
  ],
  es: [
    {
      id: "es-1",
      horizontalWords: ["PLAYA", "NOCHE", "CIELO"],
      verticalWords: ["PANEL", "AGUAS", "AMIGO"],
    },
  ],
};

// Default fallback 5-letter English waffle words
const DEFAULT_PRESET: WafflePuzzleDefinition = {
  id: "default-waffle",
  horizontalWords: ["LIGHT", "AUDIO", "TRACK"],
  verticalWords: ["LEMON", "GRAPE", "TRUCK"],
};

export const IS_WAFFLE_HOLE = (r: number, c: number): boolean => {
  return (r === 1 && c === 1) || (r === 1 && c === 3) || (r === 3 && c === 1) || (r === 3 && c === 3);
};

export function evaluateWaffleGrid(
  currentGrid: (string | null)[][],
  puzzle: WafflePuzzleDefinition
): (WaffleCell | null)[][] {
  const result: (WaffleCell | null)[][] = Array(5)
    .fill(null)
    .map(() => Array(5).fill(null));

  // Determine solution letters at each (r, c)
  const solution: (string | null)[][] = Array(5)
    .fill(null)
    .map(() => Array(5).fill(null));

  for (let c = 0; c < 5; c++) {
    solution[0][c] = puzzle.horizontalWords[0][c];
    solution[2][c] = puzzle.horizontalWords[1][c];
    solution[4][c] = puzzle.horizontalWords[2][c];
  }

  for (let r = 0; r < 5; r++) {
    solution[r][0] = puzzle.verticalWords[0][r];
    solution[r][2] = puzzle.verticalWords[1][r];
    solution[r][4] = puzzle.verticalWords[2][r];
  }

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (IS_WAFFLE_HOLE(r, c)) continue;

      const letter = currentGrid[r][c];
      const solLetter = solution[r][c];
      if (!letter || !solLetter) continue;

      if (letter === solLetter) {
        result[r][c] = { r, c, letter, state: "green", isLocked: true };
      } else {
        // Check if letter belongs in the current intersecting horizontal or vertical word
        const inRow =
          (r === 0 && puzzle.horizontalWords[0].includes(letter)) ||
          (r === 2 && puzzle.horizontalWords[1].includes(letter)) ||
          (r === 4 && puzzle.horizontalWords[2].includes(letter));

        const inCol =
          (c === 0 && puzzle.verticalWords[0].includes(letter)) ||
          (c === 2 && puzzle.verticalWords[1].includes(letter)) ||
          (c === 4 && puzzle.verticalWords[2].includes(letter));

        const state: LetterState = inRow || inCol ? "yellow" : "gray";
        result[r][c] = { r, c, letter, state, isLocked: false };
      }
    }
  }

  return result;
}

export function createInitialWaffleGame(
  locale: string = "ko",
  puzzleIdx: number = 0,
  seed: number = 42
): { game: WaffleGameState; puzzle: WafflePuzzleDefinition } {
  const presets = WAFFLE_PRESETS[locale] ?? WAFFLE_PRESETS["en"] ?? [DEFAULT_PRESET];
  const puzzle = presets[puzzleIdx % presets.length];

  // Construct target letters
  const gridLetters: (string | null)[][] = Array(5)
    .fill(null)
    .map(() => Array(5).fill(null));

  for (let c = 0; c < 5; c++) {
    gridLetters[0][c] = puzzle.horizontalWords[0][c];
    gridLetters[2][c] = puzzle.horizontalWords[1][c];
    gridLetters[4][c] = puzzle.horizontalWords[2][c];
  }
  for (let r = 0; r < 5; r++) {
    gridLetters[r][0] = puzzle.verticalWords[0][r];
    gridLetters[r][2] = puzzle.verticalWords[1][r];
    gridLetters[r][4] = puzzle.verticalWords[2][r];
  }

  // Collect all non-green letters to shuffle
  const mutableCoords: Array<{ r: number; c: number }> = [];
  const mutableLetters: string[] = [];

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (IS_WAFFLE_HOLE(r, c)) continue;
      // Keep corner anchors green occasionally, shuffle the rest
      const isAnchor = (r === 0 && c === 0) || (r === 4 && c === 4);
      if (!isAnchor && gridLetters[r][c]) {
        mutableCoords.push({ r, c });
        mutableLetters.push(gridLetters[r][c]!);
      }
    }
  }

  // Deterministic shuffle using seed
  for (let i = mutableLetters.length - 1; i > 0; i--) {
    const j = Math.abs(Math.sin(seed * 9973 + i * 31) * 10000) % (i + 1);
    const swapIdx = Math.floor(j);
    [mutableLetters[i], mutableLetters[swapIdx]] = [mutableLetters[swapIdx], mutableLetters[i]];
  }

  // Place shuffled letters back
  for (let i = 0; i < mutableCoords.length; i++) {
    const { r, c } = mutableCoords[i];
    gridLetters[r][c] = mutableLetters[i];
  }

  const initialGrid = evaluateWaffleGrid(gridLetters, puzzle);

  return {
    game: {
      puzzleId: puzzle.id,
      grid: initialGrid,
      swapsRemaining: 15,
      maxSwaps: 15,
      isSolved: false,
      status: "playing",
      stars: 0,
    },
    puzzle,
  };
}

export function swapWaffleCells(
  gameState: WaffleGameState,
  puzzle: WafflePuzzleDefinition,
  cellA: { r: number; c: number },
  cellB: { r: number; c: number }
): WaffleGameState | null {
  if (gameState.status !== "playing" || gameState.swapsRemaining <= 0) {
    return null;
  }

  const cA = gameState.grid[cellA.r]?.[cellA.c];
  const cB = gameState.grid[cellB.r]?.[cellB.c];

  if (!cA || !cB || cA.isLocked || cB.isLocked) {
    return null; // Cannot swap locked/green letters or holes
  }

  if (cellA.r === cellB.r && cellA.c === cellB.c) {
    return null; // Same cell
  }

  // Build string grid to swap
  const nextRawGrid: (string | null)[][] = gameState.grid.map((row) =>
    row.map((cell) => cell?.letter ?? null)
  );

  nextRawGrid[cellA.r][cellA.c] = cB.letter;
  nextRawGrid[cellB.r][cellB.c] = cA.letter;

  const nextGrid = evaluateWaffleGrid(nextRawGrid, puzzle);
  const nextSwapsRemaining = gameState.swapsRemaining - 1;

  // Check if all active 21 cells are green
  let allGreen = true;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (IS_WAFFLE_HOLE(r, c)) continue;
      if (nextGrid[r][c]?.state !== "green") {
        allGreen = false;
        break;
      }
    }
  }

  let nextStatus: WaffleGameState["status"] = gameState.status;
  let stars = 0;

  if (allGreen) {
    nextStatus = "won";
    stars = nextSwapsRemaining >= 10 ? 5 : nextSwapsRemaining >= 5 ? 4 : 3;
  } else if (nextSwapsRemaining <= 0) {
    nextStatus = "lost";
  }

  return {
    ...gameState,
    grid: nextGrid,
    swapsRemaining: nextSwapsRemaining,
    isSolved: allGreen,
    status: nextStatus,
    stars,
  };
}
