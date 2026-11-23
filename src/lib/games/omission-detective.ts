// Omission Detective v2 (2026-11-23). The old version was a daily row of place
// buttons. Now it is a corkboard: the suspect's route is hidden, every witness
// tells the truth but leaves places out, and you pull a red string from pin to
// pin on a city map to rebuild the one route all statements allow.
// 30 cases: 4 → 7 places, fewer and thinner statements, decoy places from
// case 10. GAME_ID and the w/l record are kept; "score" best = highest case.

import { mulberry32, shuffle } from "./daily";

export const GAME_ID = "omission-detective";
export const TRIES = 3;
export const STAGE_COUNT = 30;

export const PLACE_IDS = ["market", "school", "park", "station", "library", "hospital", "bridge", "harbor"] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

/** Pin positions on the 360×360 map (fixed so players learn the town). */
export const PLACE_XY: Record<PlaceId, [number, number]> = {
  market: [70, 70], school: [190, 52], park: [300, 92], station: [96, 178],
  library: [212, 168], hospital: [306, 214], bridge: [74, 290], harbor: [228, 296],
};

export interface Case {
  index: number;
  seed: number;
  order: PlaceId[]; // the true route
  lines: PlaceId[][]; // witness statements (true subsequences)
  pins: PlaceId[]; // places on the board (route + decoys)
}

export interface Board {
  case: Case;
  picks: PlaceId[];
  tries: number;
  phase: "ask" | "won" | "lost";
  broken: number | null; // first statement the last wrong guess broke
}

export function isSubsequence(line: readonly PlaceId[], order: readonly PlaceId[]): boolean {
  let index = 0;
  for (const place of order) {
    if (index < line.length && place === line[index]) index += 1;
  }
  return index === line.length;
}

export function brokenLine(lines: readonly (readonly PlaceId[])[], order: readonly PlaceId[]): number | null {
  for (let index = 0; index < lines.length; index += 1) {
    if (!isSubsequence(lines[index]!, order)) return index;
  }
  return null;
}

/**
 * Whether a partial route can still be completed without breaking a statement:
 * every statement, restricted to the places already picked, must appear in order.
 */
export function lineOk(line: readonly PlaceId[], picks: readonly PlaceId[]): boolean {
  const picked = line.filter((p) => picks.includes(p));
  return isSubsequence(picked, picks);
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += 1) {
    const rest = items.slice(0, index).concat(items.slice(index + 1));
    for (const tail of permutations(rest)) out.push([items[index]!, ...tail]);
  }
  return out;
}

export function solutionCount(places: readonly PlaceId[], lines: readonly PlaceId[][]): number {
  let n = 0;
  for (const cand of permutations(places)) if (brokenLine(lines, cand) === null) n += 1;
  return n;
}

export function routeLength(index: number): number {
  return index < 6 ? 4 : index < 14 ? 5 : index < 22 ? 6 : 7;
}

/** Build case `index`. Statements are trimmed until removing anything more would allow a second route. */
export function makeCase(index: number): Case {
  const i = Math.max(0, Math.min(STAGE_COUNT - 1, Math.floor(index)));
  const seed = (0x0a11ce + i * 7919) >>> 0;
  const rng = mulberry32(seed);
  const n = routeLength(i);
  const order = shuffle([...PLACE_IDS], rng).slice(0, n) as PlaceId[];
  // start from "everyone saw everything but one place", then thin out.
  let lines: PlaceId[][] = order.map((_, k) => order.filter((__, j) => j !== k));
  lines = shuffle(lines, rng);
  const minLines = i < 6 ? 3 : 2;
  for (let k = lines.length - 1; k >= 0 && lines.length > minLines; k -= 1) {
    const trial = lines.filter((_, j) => j !== k);
    if (solutionCount(order, trial) === 1) lines = trial;
  }
  // drop single places from statements (harder later) while still unique
  const thin = i < 4 ? 0 : i < 12 ? 2 : i < 20 ? 4 : 8;
  let dropped = 0;
  for (let guard = 0; guard < 40 && dropped < thin; guard += 1) {
    const li = Math.floor(rng() * lines.length);
    const line = lines[li]!;
    if (line.length <= 2) continue;
    const pi = Math.floor(rng() * line.length);
    const trial = lines.map((l, j) => (j === li ? l.filter((_, q) => q !== pi) : l));
    if (new Set(trial.flat()).size !== n) continue; // every place stays mentioned
    if (solutionCount(order, trial) !== 1) continue;
    lines = trial;
    dropped += 1;
  }
  const decoys = i < 9 ? 0 : i < 20 ? 1 : 2;
  const rest = PLACE_IDS.filter((p) => !order.includes(p));
  const pins = [...order, ...shuffle(rest, rng).slice(0, decoys)];
  return { index: i, seed, order, lines, pins: PLACE_IDS.filter((p) => pins.includes(p)) };
}

export function createBoard(c: Case): Board {
  return { case: c, picks: [], tries: 0, phase: "ask", broken: null };
}

/** Add a pin to the string (or, if it is the last pin, take it back off). */
export function pick(board: Board, place: PlaceId): Board {
  if (board.phase !== "ask") return board;
  if (!board.case.pins.includes(place)) return board;
  const last = board.picks[board.picks.length - 1];
  if (last === place) return { ...board, picks: board.picks.slice(0, -1) };
  if (board.picks.includes(place)) return board;
  if (board.picks.length >= board.case.order.length) return board;
  return { ...board, picks: [...board.picks, place], broken: null };
}

export function clearPicks(board: Board): Board {
  return board.phase === "ask" ? { ...board, picks: [], broken: null } : board;
}

export function submitOrder(board: Board): Board {
  if (board.phase !== "ask") return board;
  if (board.picks.length !== board.case.order.length) return board;
  const tries = board.tries + 1;
  const same = board.picks.every((place, index) => place === board.case.order[index]);
  if (same) return { ...board, tries, phase: "won", broken: null };
  const broken = brokenLine(board.case.lines, board.picks);
  if (tries >= TRIES) return { ...board, tries, phase: "lost", broken };
  return { ...board, tries, broken, picks: [] };
}

export function stars(board: Board): number {
  if (board.phase !== "won") return 0;
  return board.tries === 1 ? 3 : board.tries === 2 ? 2 : 1;
}
