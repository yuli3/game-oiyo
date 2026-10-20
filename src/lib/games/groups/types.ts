/** One themed foursome. `lure` is a member that tempts `cousin`, a different category. */
export interface Category {
  id: string;
  name: string;
  level: 0 | 1 | 2 | 3;
  cousin: string;
  lure: string;
  words: readonly string[];
}

export interface WordGroup {
  id: string;
  name: string;
  level: 0 | 1 | 2 | 3;
  words: readonly string[];
}

export interface PuzzleTrap {
  word: string;
  toward: string;
}

export interface WordPuzzle {
  id: string;
  groups: readonly WordGroup[];
  traps: readonly PuzzleTrap[];
}
