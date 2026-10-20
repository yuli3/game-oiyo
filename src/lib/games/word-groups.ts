// 네 묶음 (Word Groups) — 16 words, four hidden themes of four words each.
// The format (sort a 4×4 board into four groups) is a common puzzle genre; every
// theme and word list here is written for OIYO, and no puzzle set is taken from
// another site. Pure logic only: the component owns storage, audio, and layout.
import { mulberry32, shuffle } from "./daily";
import { dateKeyIndex } from "./todays-game";

export const WORD_GROUPS_ID = "word-groups";
export const WORD_GROUPS_SCHEMA = "oiyo.word-groups" as const;
export const WORD_GROUPS_SIZE = 4;
export const WORD_GROUPS_MAX_MISTAKES = 4;
/** Puzzle 0 is the KST day the game launched; later days walk the pack in order. */
export const WORD_GROUPS_LAUNCH = "2026-10-20";

export type GroupLevel = 0 | 1 | 2 | 3;
export type WordGroup = { theme: string; level: GroupLevel; words: string[] };
export type WordGroupsPuzzle = { id: string; groups: WordGroup[] };
export type WordGroupsPack = { schema: typeof WORD_GROUPS_SCHEMA; v: 1; locale: string; puzzles: WordGroupsPuzzle[] };

export type WordGroupsStatus = "playing" | "won" | "lost";
export type WordGroupsState = {
  puzzleId: string;
  /** Levels in the order the player found them. */
  solved: GroupLevel[];
  /** Every submitted guess, each sorted so a repeat is recognised in any order. */
  guesses: string[][];
  mistakes: number;
  status: WordGroupsStatus;
};
export type GuessResult = "solved" | "one-away" | "miss" | "repeat" | "invalid";

const norm = (word: string) => word.trim().toLocaleLowerCase();

/** Structural checks for one puzzle. An empty list means the puzzle is playable. */
export function validateWordGroupsPuzzle(puzzle: WordGroupsPuzzle): string[] {
  const errors: string[] = [];
  if (!puzzle.id?.trim()) errors.push("missing id");
  if (puzzle.groups?.length !== WORD_GROUPS_SIZE) {
    errors.push(`expected ${WORD_GROUPS_SIZE} groups, got ${puzzle.groups?.length ?? 0}`);
    return errors;
  }
  const levels = new Set(puzzle.groups.map((g) => g.level));
  for (const level of [0, 1, 2, 3]) if (!levels.has(level as GroupLevel)) errors.push(`level ${level} missing`);
  const seen = new Set<string>();
  for (const group of puzzle.groups) {
    if (!group.theme?.trim()) errors.push("empty theme");
    if (group.words?.length !== WORD_GROUPS_SIZE) errors.push(`"${group.theme}" needs ${WORD_GROUPS_SIZE} words`);
    for (const word of group.words ?? []) {
      const key = norm(word);
      if (!key) errors.push(`"${group.theme}" has an empty word`);
      else if (seen.has(key)) errors.push(`"${word}" appears twice`);
      seen.add(key);
    }
  }
  return errors;
}

/** The pack index for a KST date. Days before launch fall back to puzzle 0. */
export function wordGroupsIndexForDate(dateKey: string, count: number): number {
  if (count <= 0) throw new Error("word-groups pack is empty");
  const day = Math.max(0, dateKeyIndex(dateKey) - dateKeyIndex(WORD_GROUPS_LAUNCH));
  return day % count;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The 16 words in a fixed starting order for this puzzle, the same on every device. */
export function wordGroupsTiles(puzzle: WordGroupsPuzzle, salt = 0): string[] {
  return shuffle(puzzle.groups.flatMap((g) => g.words), mulberry32(hash(puzzle.id) ^ salt));
}

export function createWordGroups(puzzle: WordGroupsPuzzle): WordGroupsState {
  return { puzzleId: puzzle.id, solved: [], guesses: [], mistakes: 0, status: "playing" };
}

export function groupOf(puzzle: WordGroupsPuzzle, word: string): WordGroup | undefined {
  const key = norm(word);
  return puzzle.groups.find((g) => g.words.some((w) => norm(w) === key));
}

/** Words still on the board, in the given display order. */
export function remainingWords(puzzle: WordGroupsPuzzle, state: WordGroupsState, order: readonly string[]): string[] {
  const done = new Set(puzzle.groups.filter((g) => state.solved.includes(g.level)).flatMap((g) => g.words.map(norm)));
  return order.filter((w) => !done.has(norm(w)));
}

export function submitWordGroupsGuess(
  puzzle: WordGroupsPuzzle,
  state: WordGroupsState,
  selection: readonly string[],
): { state: WordGroupsState; result: GuessResult } {
  if (state.status !== "playing" || selection.length !== WORD_GROUPS_SIZE) return { state, result: "invalid" };
  const picked = selection.map(norm);
  if (new Set(picked).size !== WORD_GROUPS_SIZE) return { state, result: "invalid" };
  const groups = picked.map((w) => groupOf(puzzle, w));
  if (groups.some((g) => !g || state.solved.includes(g.level))) return { state, result: "invalid" };

  const key = [...picked].sort();
  if (state.guesses.some((g) => g.join("\u0000") === key.join("\u0000"))) return { state, result: "repeat" };
  const guesses = [...state.guesses, key];

  const first = groups[0]!;
  if (groups.every((g) => g === first)) {
    const solved = [...state.solved, first.level];
    return { state: { ...state, guesses, solved, status: solved.length === WORD_GROUPS_SIZE ? "won" : "playing" }, result: "solved" };
  }
  const mistakes = state.mistakes + 1;
  const counts = new Map<WordGroup, number>();
  for (const g of groups) counts.set(g!, (counts.get(g!) ?? 0) + 1);
  const oneAway = [...counts.values()].some((n) => n === WORD_GROUPS_SIZE - 1);
  return {
    state: { ...state, guesses, mistakes, status: mistakes >= WORD_GROUPS_MAX_MISTAKES ? "lost" : "playing" },
    result: oneAway ? "one-away" : "miss",
  };
}

const LEVEL_EMOJI = ["🟨", "🟩", "🟦", "🟪"] as const;

/** Spoiler-free result: one row per guess, one square per word, colored by its true group. */
export function wordGroupsShareText(puzzle: WordGroupsPuzzle, state: WordGroupsState, heading: string): string {
  const rows = state.guesses.map((guess) => guess.map((w) => LEVEL_EMOJI[groupOf(puzzle, w)?.level ?? 0]).join(""));
  return [heading, ...rows].join("\n");
}

export type WordGroupsSave = { v: 1; puzzleId: string; guesses: string[][]; recorded: boolean };

export function serializeWordGroups(state: WordGroupsState, recorded: boolean): string {
  const save: WordGroupsSave = { v: 1, puzzleId: state.puzzleId, guesses: state.guesses, recorded };
  return JSON.stringify(save);
}

/**
 * Rebuilds a saved game by replaying its guesses, so a save from an edited or
 * different puzzle cannot leave the board in an impossible state.
 */
export function parseWordGroups(raw: string | null, puzzle: WordGroupsPuzzle): { state: WordGroupsState; recorded: boolean } | null {
  try {
    const save = JSON.parse(raw ?? "") as WordGroupsSave;
    if (save?.v !== 1 || save.puzzleId !== puzzle.id || !Array.isArray(save.guesses)) return null;
    let state = createWordGroups(puzzle);
    for (const guess of save.guesses) {
      if (!Array.isArray(guess)) return null;
      const next = submitWordGroupsGuess(puzzle, state, guess);
      if (next.result === "invalid" || next.result === "repeat") return null;
      state = next.state;
    }
    return { state, recorded: save.recorded === true };
  } catch {
    return null;
  }
}
