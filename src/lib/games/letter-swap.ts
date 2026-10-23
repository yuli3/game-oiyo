// Letter-swap daily. The solved grid is written first and only then scrambled,
// so every start uses the same letters and can be finished (2026-10-20).
// The date is Korea Standard Time, shared by every visitor.
import { mulberry32 } from "./daily";
import type { Locale } from "../i18n";
import { locales } from "../i18n";
import type { BestConditions } from "./records";
import { dateKeyIndex } from "./todays-game";

export const GAME_ID = "letter-swap";
export const SWAP_LIMIT = 15;

export type GridSize = 3 | 5;
export type Mark = "correct" | "present" | "absent" | "hole";

export interface LetterBank {
  across: readonly [string, string, string];
  down: readonly [string, string, string];
}

export interface LetterGrid {
  locale: Locale;
  size: GridSize;
  cells: (string | null)[];
  across: readonly [string, string, string];
  down: readonly [string, string, string];
}

export interface LetterPuzzle {
  locale: Locale;
  dateKey: string;
  size: GridSize;
  solution: (string | null)[];
  start: (string | null)[];
  across: readonly [string, string, string];
  down: readonly [string, string, string];
}

const LOCALE_SALT: Record<Locale, number> = { ko: 1, en: 2, ja: 3, zh: 4, fr: 5, es: 6 };

const BANKS: Record<Locale, readonly LetterBank[]> = {
  ko: [
    bank("정원사", "원숭이", "사이다"),
    bank("타자기", "자동차", "기차표"),
    bank("라디오", "디저트", "오트밀"),
    bank("피아노", "아궁이", "노이즈"),
    bank("소나무", "나머지", "무지개"),
    bank("포도주", "도서관", "주관식"),
    bank("냉장고", "장독대", "고대사"),
    bank("현관문", "관광지", "문지방"),
    bank("주전자", "전시장", "자장면"),
  ],
  en: [
    bank("about", "after", "dance", "award", "often", "three"),
    bank("about", "alike", "event", "awake", "olive", "treat"),
    bank("about", "alter", "nerve", "again", "outer", "three"),
    bank("about", "angle", "month", "alarm", "organ", "teeth"),
    bank("about", "audio", "earth", "awake", "order", "tooth"),
    bank("about", "ahead", "diary", "award", "opera", "today"),
  ],
  ja: [
    bank("あるかない", "あたたかい", "にこにこと", "あのあとに", "かんたんに", "いそいそと"),
    bank("あるかない", "あたたかい", "にやにやと", "あのあとに", "かんたんに", "いきいきと"),
    bank("あるかない", "たまらない", "いそいそと", "あたたかい", "かえらない", "いきいきと"),
    bank("あるかない", "たよらない", "いそいそと", "あたたかい", "かえらない", "いきいきと"),
  ],
  zh: [
    bank("今天不登顶", "明天不刮风", "着火了快跑", "今天明摆着", "不能不去了", "顶着风奔跑"),
    bank("今天不到顶", "明天不怕风", "着急了就跑", "今年明摆着", "不能不说了", "顶着风快跑"),
    bank("今天不登顶", "明天不怕风", "着火了快跑", "今年明摆着", "不能不走了", "顶着风奔跑"),
    bank("今天不到顶", "明天不刮风", "着火了快跑", "今天明摆着", "不能不走了", "顶着风快跑"),
  ],
  fr: [
    bank("fruit", "avion", "singe", "frais", "union", "tante"),
    bank("petit", "oubli", "ouest", "photo", "table", "teint"),
    bank("petit", "saint", "rouge", "poser", "tribu", "titre"),
    bank("cours", "avion", "danse", "chaud", "union", "singe"),
  ],
  es: [
    bank("antes", "girar", "nieve", "algún", "tarde", "serie"),
    bank("antes", "grave", "nuevo", "algún", "traje", "suelo"),
    bank("calor", "noble", "oreja", "canto", "libre", "rueda"),
    bank("cinco", "leche", "rueda", "color", "noche", "oreja"),
    bank("decir", "norte", "etapa", "donde", "carta", "rueda"),
  ],
};

function bank(
  a0: string,
  a1: string,
  a2: string,
  d0 = a0,
  d1 = a1,
  d2 = a2,
): LetterBank {
  return { across: [a0, a1, a2], down: [d0, d1, d2] };
}

function chars(word: string): string[] {
  return Array.from(word);
}

export function sizeFor(locale: Locale): GridSize {
  return locale === "ko" ? 3 : 5;
}

function stepFor(size: GridSize): number {
  return size === 3 ? 1 : 2;
}

export function placeBank(entry: LetterBank, size: GridSize, locale: Locale): LetterGrid {
  const step = stepFor(size);
  const across = entry.across.map(chars);
  const down = entry.down.map(chars);
  for (const word of [...across, ...down]) {
    if (word.length !== size) throw new Error(`letter-swap word length ${locale}`);
  }
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (across[i][j * step] !== down[j][i * step]) {
        throw new Error(`letter-swap crossing ${locale}`);
      }
    }
  }
  const cells: (string | null)[] = Array.from({ length: size * size }, () => null);
  for (let i = 0; i < 3; i++) {
    const row = i * step;
    for (let col = 0; col < size; col++) cells[row * size + col] = across[i][col];
  }
  for (let j = 0; j < 3; j++) {
    const col = j * step;
    for (let row = 0; row < size; row++) {
      const index = row * size + col;
      const existing = cells[index];
      if (existing !== null && existing !== down[j][row]) throw new Error(`letter-swap down clash ${locale}`);
      cells[index] = down[j][row];
    }
  }
  if (size === 5) {
    for (const [row, col] of [[1, 1], [1, 3], [3, 1], [3, 3]] as const) {
      if (cells[row * size + col] !== null) throw new Error(`letter-swap hole filled ${locale}`);
    }
  }
  return { locale, size, cells, across: entry.across, down: entry.down };
}

export const SOLUTIONS: readonly LetterGrid[] = locales.flatMap((locale) => {
  const size = sizeFor(locale);
  const entries = BANKS[locale];
  if (!entries?.length) throw new Error(`letter-swap missing ${locale}`);
  return entries.map((entry) => placeBank(entry, size, locale));
});

export function lettersOf(board: readonly (string | null)[]): string[] {
  return board.filter((cell): cell is string => cell !== null);
}

export function searchCost(letters: readonly string[]): { peak: number; prod: number } {
  const counts = new Map<string, number>();
  for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  let peak = 0;
  let prod = 1;
  for (const count of counts.values()) {
    if (count > peak) peak = count;
    let factorial = 1;
    for (let n = 2; n <= count; n++) factorial *= n;
    prod *= factorial;
  }
  return { peak, prod };
}

export function wordsOf(cells: readonly (string | null)[], size: GridSize): { across: string[]; down: string[] } {
  const step = stepFor(size);
  const word = (indexes: number[]) => indexes.map((index) => {
    const cell = cells[index];
    if (cell === null) throw new Error("letter-swap word hit a hole");
    return cell;
  }).join("");
  const across = [0, 1, 2].map((i) => word(Array.from({ length: size }, (_, col) => i * step * size + col)));
  const down = [0, 1, 2].map((j) => word(Array.from({ length: size }, (_, row) => row * size + j * step)));
  return { across, down };
}

function wordMarks(current: readonly string[], target: readonly string[]): Array<"correct" | "present" | "absent"> {
  const marks = current.map((letter, index) => (letter === target[index] ? "correct" : "absent")) as Array<"correct" | "present" | "absent">;
  const left = new Map<string, number>();
  for (let index = 0; index < target.length; index++) {
    if (marks[index] === "correct") continue;
    left.set(target[index], (left.get(target[index]) ?? 0) + 1);
  }
  for (let index = 0; index < current.length; index++) {
    if (marks[index] === "correct") continue;
    const count = left.get(current[index]) ?? 0;
    if (count <= 0) continue;
    marks[index] = "present";
    left.set(current[index], count - 1);
  }
  return marks;
}

export function cellMarks(current: readonly (string | null)[], solution: readonly (string | null)[], size: GridSize): Mark[] {
  const step = stepFor(size);
  const acrossRows = [0, step, step * 2];
  const downCols = [0, step, step * 2];
  const take = (board: readonly (string | null)[], indexes: number[]) => indexes.map((index) => {
    const cell = board[index];
    if (cell === null) throw new Error("letter-swap mark hit a hole");
    return cell;
  });
  const acrossIndexes = acrossRows.map((row) => Array.from({ length: size }, (_, col) => row * size + col));
  const downIndexes = downCols.map((col) => Array.from({ length: size }, (_, row) => row * size + col));
  const across = acrossIndexes.map((indexes) => wordMarks(take(current, indexes), take(solution, indexes)));
  const down = downIndexes.map((indexes) => wordMarks(take(current, indexes), take(solution, indexes)));
  return current.map((cell, index) => {
    if (cell === null) return "hole";
    if (cell === solution[index]) return "correct";
    const row = Math.floor(index / size);
    const col = index % size;
    const notes: Array<"correct" | "present" | "absent"> = [];
    const acrossIndex = acrossRows.indexOf(row);
    if (acrossIndex >= 0) notes.push(across[acrossIndex][col]);
    const downIndex = downCols.indexOf(col);
    if (downIndex >= 0) notes.push(down[downIndex][row]);
    return notes.some((note) => note === "present") ? "present" : "absent";
  });
}

function countCycles(assignment: ReadonlyMap<number, number>): number {
  const seen = new Set<number>();
  let cycles = 0;
  for (const start of assignment.keys()) {
    if (seen.has(start)) continue;
    cycles += 1;
    let cursor = start;
    while (!seen.has(cursor)) {
      seen.add(cursor);
      const next = assignment.get(cursor);
      if (next === undefined) break;
      cursor = next;
    }
  }
  return cycles;
}

function bestAssignment(current: readonly string[], target: readonly string[]): Map<number, number> | null {
  if (current.length !== target.length) return null;
  const open: number[] = [];
  for (let index = 0; index < current.length; index++) {
    if (current[index] !== target[index]) open.push(index);
  }
  const groups = new Map<string, { src: number[]; dst: number[] }>();
  for (const index of open) {
    const group = groups.get(current[index]) ?? { src: [], dst: [] };
    group.src.push(index);
    groups.set(current[index], group);
  }
  for (const index of open) {
    const group = groups.get(target[index]);
    if (!group) return null;
    group.dst.push(index);
  }
  for (const group of groups.values()) {
    if (group.src.length !== group.dst.length) return null;
  }
  const letters = [...groups.keys()];
  let bestCycles = -1;
  let best = new Map<number, number>();
  const assignment = new Map<number, number>();
  const permute = (index: number) => {
    if (index === letters.length) {
      const cycles = countCycles(assignment);
      if (cycles > bestCycles) {
        bestCycles = cycles;
        best = new Map(assignment);
      }
      return;
    }
    const group = groups.get(letters[index]);
    if (!group) return;
    const used = new Array<boolean>(group.dst.length).fill(false);
    const walk = (slot: number) => {
      if (slot === group.src.length) {
        permute(index + 1);
        return;
      }
      for (let dest = 0; dest < group.dst.length; dest++) {
        if (used[dest]) continue;
        used[dest] = true;
        assignment.set(group.src[slot], group.dst[dest]);
        walk(slot + 1);
        assignment.delete(group.src[slot]);
        used[dest] = false;
      }
    };
    walk(0);
  };
  permute(0);
  return bestCycles < 0 ? null : best;
}

/** Minimum swaps once cells that already match stay fixed. Same letters may trade places. */
export function minSwaps(current: readonly string[], target: readonly string[]): number {
  if (current.length !== target.length) return Number.POSITIVE_INFINITY;
  const assignment = bestAssignment(current, target);
  if (!assignment) return Number.POSITIVE_INFINITY;
  const open = current.reduce((count, letter, index) => count + (letter === target[index] ? 0 : 1), 0);
  return open - countCycles(assignment);
}

export function bestArrangement(current: readonly string[], target: readonly string[]): string[] | null {
  const assignment = bestAssignment(current, target);
  if (!assignment) return null;
  const result = [...current];
  for (const [src, dst] of assignment) result[dst] = current[src];
  return result;
}

export function applySwap(board: readonly (string | null)[], a: number, b: number): { board: (string | null)[]; counted: boolean } {
  if (a === b || board[a] == null || board[b] == null || board[a] === board[b]) {
    return { board: [...board], counted: false };
  }
  const next = [...board];
  next[a] = board[b];
  next[b] = board[a];
  return { board: next, counted: true };
}

export function isSolved(current: readonly (string | null)[], solution: readonly (string | null)[]): boolean {
  return current.length === solution.length && current.every((cell, index) => cell === solution[index]);
}

function scrambleBoard(solution: readonly (string | null)[], rng: () => number): (string | null)[] {
  const slots = solution.flatMap((cell, index) => (cell === null ? [] : [index]));
  const target = slots.map((index) => solution[index] as string);
  let board = [...solution];
  let productive = 0;
  for (let attempt = 0; attempt < 400 && productive < 80; attempt++) {
    const left = slots[Math.floor(rng() * slots.length)];
    const right = slots[Math.floor(rng() * slots.length)];
    if (left === right || board[left] === board[right]) continue;
    const next = [...board];
    next[left] = board[right];
    next[right] = board[left];
    board = next;
    productive += 1;
    const distance = minSwaps(slots.map((index) => board[index] as string), target);
    if (distance >= 4 && distance <= 12) return board;
  }
  throw new Error("letter-swap scramble missed the swap window");
}

export function puzzleForDate(dateKey: string, locale: Locale): LetterPuzzle {
  const size = sizeFor(locale);
  const entries = BANKS[locale];
  const index = dateKeyIndex(dateKey) % entries.length;
  const solution = placeBank(entries[index], size, locale);
  const rng = mulberry32((dateKeyIndex(dateKey) * 0x9e3779b1 + LOCALE_SALT[locale] * 0x85ebca6b) >>> 0);
  return {
    locale,
    dateKey,
    size,
    solution: solution.cells,
    start: scrambleBoard(solution.cells, rng),
    across: solution.across,
    down: solution.down,
  };
}

/** Remaining swaps fall into five bands. Twelve or more left is five stars (2026-10-21). */
export function starsForRemaining(remaining: number): 1 | 2 | 3 | 4 | 5 {
  const left = Math.max(0, Math.min(SWAP_LIMIT, Math.floor(remaining)));
  if (left >= 12) return 5;
  if (left >= 9) return 4;
  if (left >= 6) return 3;
  if (left >= 3) return 2;
  return 1;
}

export const TILE_PX = 44;
export const TILE_GAP = 4;

export function boardPixels(size: number): { width: number; height: number } {
  const span = size * TILE_PX + Math.max(0, size - 1) * TILE_GAP;
  return { width: span, height: span };
}

export function tileOrigin(index: number, size: number): { x: number; y: number } {
  const col = index % size;
  const row = Math.floor(index / size);
  const pitch = TILE_PX + TILE_GAP;
  return { x: col * pitch, y: row * pitch };
}

export function tileAt(x: number, y: number, size: number, cells: readonly (string | null)[]): number | null {
  if (x < 0 || y < 0) return null;
  const pitch = TILE_PX + TILE_GAP;
  const col = Math.floor(x / pitch);
  const row = Math.floor(y / pitch);
  if (col < 0 || row < 0 || col >= size || row >= size) return null;
  if (x - col * pitch >= TILE_PX || y - row * pitch >= TILE_PX) return null;
  const index = row * size + col;
  return cells[index] == null ? null : index;
}

export function lineCells(size: GridSize): { id: string; cells: number[] }[] {
  const step = stepFor(size);
  const across = [0, 1, 2].map((i) => {
    const row = i * step;
    return { id: `a${i}`, cells: Array.from({ length: size }, (_, col) => row * size + col) };
  });
  const down = [0, 1, 2].map((j) => {
    const col = j * step;
    return { id: `d${j}`, cells: Array.from({ length: size }, (_, row) => row * size + col) };
  });
  return [...across, ...down];
}

export function completeLineIds(
  cells: readonly (string | null)[],
  solution: readonly (string | null)[],
  size: GridSize,
): string[] {
  return lineCells(size)
    .filter((line) => line.cells.every((index) => cells[index] !== null && cells[index] === solution[index]))
    .map((line) => line.id);
}

/** A practice board uses another word set when one exists, and never today's scramble seed (2026-10-21). */
export function practicePuzzle(salt: number, dateKey: string, locale: Locale): LetterPuzzle {
  const entries = BANKS[locale];
  const size = sizeFor(locale);
  const today = dateKeyIndex(dateKey) % entries.length;
  const dailySeed = (dateKeyIndex(dateKey) * 0x9e3779b1 + LOCALE_SALT[locale] * 0x85ebca6b) >>> 0;
  let seed = (salt >>> 0) || 1;
  for (let attempt = 0; attempt < 8; attempt++) {
    if (seed === dailySeed) seed = (seed + 1) >>> 0;
    let index = seed % entries.length;
    if (entries.length > 1 && index === today) index = (index + 1) % entries.length;
    try {
      const solution = placeBank(entries[index], size, locale);
      return {
        locale,
        dateKey,
        size,
        solution: solution.cells,
        start: scrambleBoard(solution.cells, mulberry32(seed)),
        across: solution.across,
        down: solution.down,
      };
    } catch {
      seed = (seed + 97) >>> 0;
    }
  }
  throw new Error("letter-swap practice missed the swap window");
}

const GLYPH: Record<Mark, string> = { correct: "🟩", present: "🟨", absent: "⬜", hole: "⬛" };

export function shareGrid(title: string, dateKey: string, swaps: number, marks: readonly Mark[], size: number): string {
  const rows: string[] = [];
  for (let row = 0; row < size; row++) {
    rows.push(marks.slice(row * size, row * size + size).map((mark) => GLYPH[mark]).join(""));
  }
  return `${title} ${dateKey} ${swaps}/${SWAP_LIMIT}\n${rows.join("\n")}`;
}

export function dailyBestConditions(dateKey: string, locale: Locale, assist: "none" | "undo"): BestConditions {
  return { seed: `${dateKey}:${locale}`, difficulty: "daily", assist };
}
