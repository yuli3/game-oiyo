// Daily omission detective. Every spoken line is a true subsequence.
// The case is the one order those lines allow, so the grade is a check
// against the lines, not a generated sentence (2026-10-20).

import { mulberry32, shuffle } from "./daily";

export const GAME_ID = "omission-detective";
export const TRIES = 3;

export const PLACE_IDS = ["market", "school", "park", "station", "library", "hospital", "bridge", "harbor"] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

export interface DailyCase {
  seed: number;
  order: PlaceId[];
  lines: [PlaceId[], PlaceId[], PlaceId[]];
}

export interface Board {
  daily: DailyCase;
  picks: PlaceId[];
  tries: number;
  phase: "ask" | "won" | "lost";
  broken: number | null;
}

const OMISSIONS: readonly (readonly number[])[] = [[2], [0, 4], [1, 3]];

function isSubsequence(line: readonly PlaceId[], order: readonly PlaceId[]): boolean {
  let index = 0;
  for (const place of order) {
    if (place === line[index]) index += 1;
    if (index === line.length) return true;
  }
  return index === line.length;
}

export function brokenLine(lines: readonly (readonly PlaceId[])[], order: readonly PlaceId[]): number | null {
  for (let index = 0; index < lines.length; index += 1) {
    if (!isSubsequence(lines[index] as readonly PlaceId[], order)) return index;
  }
  return null;
}

function permutations(items: readonly PlaceId[]): PlaceId[][] {
  if (items.length <= 1) return [items.slice()];
  const out: PlaceId[][] = [];
  for (let index = 0; index < items.length; index += 1) {
    const head = items[index] as PlaceId;
    const rest = items.slice(0, index).concat(items.slice(index + 1));
    for (const tail of permutations(rest)) out.push([head, ...tail]);
  }
  return out;
}

function isUnique(order: readonly PlaceId[], lines: readonly PlaceId[][]): boolean {
  let count = 0;
  for (const candidate of permutations(order)) {
    if (brokenLine(lines, candidate) !== null) continue;
    count += 1;
    if (count > 1) return false;
  }
  return count === 1;
}

function omit(order: readonly PlaceId[], drop: readonly number[]): PlaceId[] {
  return order.filter((_, index) => !drop.includes(index));
}

function fallback(seed: number): DailyCase {
  const order: PlaceId[] = ["market", "school", "park", "station", "library"];
  const lines = OMISSIONS.map((drop) => omit(order, drop)) as DailyCase["lines"];
  return { seed, order, lines };
}

export function createCase(seed: number): DailyCase {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0x0a11ce);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const order = shuffle([...PLACE_IDS], rng).slice(0, 5) as PlaceId[];
    const lines = OMISSIONS.map((drop) => omit(order, drop)) as DailyCase["lines"];
    if (new Set(lines.flat()).size !== order.length) continue;
    if (!isUnique(order, lines)) continue;
    return { seed: mixed, order, lines };
  }
  return fallback(mixed);
}

export function tray(daily: DailyCase): PlaceId[] {
  const mixed = shuffle(daily.order, mulberry32((daily.seed + 1) >>> 0));
  if (mixed.every((place, index) => place === daily.order[index])) {
    return [mixed[mixed.length - 1] as PlaceId, ...mixed.slice(0, -1)];
  }
  return mixed;
}

export function createBoard(daily: DailyCase): Board {
  return { daily, picks: [], tries: 0, phase: "ask", broken: null };
}

export function togglePlace(board: Board, place: PlaceId): Board {
  if (board.phase !== "ask") return board;
  if (!board.daily.order.includes(place)) return board;
  if (board.picks.includes(place)) return { ...board, picks: board.picks.filter((item) => item !== place) };
  if (board.picks.length >= board.daily.order.length) return board;
  return { ...board, picks: [...board.picks, place] };
}

export function submitOrder(board: Board): Board {
  if (board.phase !== "ask") return board;
  if (board.picks.length !== board.daily.order.length) return board;
  const tries = board.tries + 1;
  const same = board.picks.every((place, index) => place === board.daily.order[index]);
  if (same) return { ...board, tries, phase: "won", broken: null };
  const broken = brokenLine(board.daily.lines, board.picks);
  if (tries >= TRIES) return { ...board, tries, phase: "lost", broken };
  return { ...board, tries, broken };
}
