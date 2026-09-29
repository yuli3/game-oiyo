import { mulberry32, shuffle } from "./daily";
import { generateUniqueTents, type Pos, type TentsPuzzle } from "./tents";

/**
 * Chaos is a third tab beside daily and free. Replacing the daily tab would
 * change the board people already play. The board and the three-card offer
 * both come from the device-local day index alone, so two people on the same
 * day see the same board before either of them picks a card. 2026-09-29
 */
export const CHAOS_POOL = ["fog", "hourglass", "flashlight", "banned", "trailhead", "safeGrass"] as const;
export type ChaosAugmentId = (typeof CHAOS_POOL)[number];

export const CHAOS_ACTIVE_CAP = 3;
export const CHAOS_SECONDS = 90;
export const CHAOS_BANNED_COUNT = 3;

/** Same geometry as the daily board. The salt below is what keeps the boards apart. */
const CHAOS_SIZE = 6;
const CHAOS_PAIRS = 7;

const cellKey = (r: number, c: number) => `${r}:${c}`;

export function isChaosAugmentId(value: unknown): value is ChaosAugmentId {
  return typeof value === "string" && (CHAOS_POOL as readonly string[]).includes(value);
}

/** Device-local day salt. Distinct from the daily tab's 0x74656e salt. */
export function chaosDaySeed(dayIndex: number): number {
  return (0x6368616f ^ Math.imul(dayIndex + 1, 2654435761)) >>> 0;
}

const boardCache = new Map<number, { puzzle: TentsPuzzle; solution: Pos[] }>();
const effectsCache = new Map<number, ChaosEffects>();

export function chaosBoard(dayIndex: number): { puzzle: TentsPuzzle; solution: Pos[] } {
  const cached = boardCache.get(dayIndex);
  if (cached) return cached;
  // The page, the save parser, and the decorations all need this same board.
  // A unique 6×6 search is the expensive part, so a day is generated once. 2026-09-29
  const board = generateUniqueTents(CHAOS_SIZE, CHAOS_PAIRS, mulberry32(chaosDaySeed(dayIndex)));
  boardCache.set(dayIndex, board);
  return board;
}

/** Three cards for the day. A separate salt so the offer does not consume the board RNG. */
export function chaosOffer(dayIndex: number): ChaosAugmentId[] {
  return shuffle([...CHAOS_POOL], mulberry32(chaosDaySeed(dayIndex) ^ 0x6f666665)).slice(0, 3);
}

export type ChaosEffects = {
  fogRows: number[];
  fogCols: number[];
  banned: Pos[];
  trailhead: Pos;
  safeGrass: Pos;
};

/**
 * Every decoration is drawn, in this order, whether or not its card is picked.
 * The picked card only chooses which decoration is shown. 2026-09-29
 */
export function chaosEffects(dayIndex: number): ChaosEffects {
  const cached = effectsCache.get(dayIndex);
  if (cached) return cached;
  const { puzzle, solution } = chaosBoard(dayIndex);
  const rng = mulberry32(chaosDaySeed(dayIndex) ^ 0x65666665);
  const { size } = puzzle;
  const hideCount = Math.floor(size / 2);
  const indexes = Array.from({ length: size }, (_, i) => i);

  const fogRows = shuffle(indexes, rng).slice(0, hideCount).sort((a, b) => a - b);
  const fogCols = shuffle(indexes, rng).slice(0, hideCount).sort((a, b) => a - b);

  const solutionKeys = new Set(solution.map(([r, c]) => cellKey(r, c)));
  const treeKeys = new Set(puzzle.trees.map(([r, c]) => cellKey(r, c)));
  const open: Pos[] = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const key = cellKey(r, c);
      if (!solutionKeys.has(key) && !treeKeys.has(key)) open.push([r, c]);
    }
  }

  const banned = shuffle(open, rng).slice(0, CHAOS_BANNED_COUNT);
  const bannedKeys = new Set(banned.map(([r, c]) => cellKey(r, c)));
  const trailhead = shuffle(solution, rng)[0];
  const safeGrass = shuffle(open.filter(([r, c]) => !bannedKeys.has(cellKey(r, c))), rng)[0];

  const effects = { fogRows, fogCols, banned, trailhead, safeGrass };
  effectsCache.set(dayIndex, effects);
  return effects;
}

export function addChaosAugment(
  active: readonly ChaosAugmentId[],
  id: ChaosAugmentId,
): { ok: true; active: ChaosAugmentId[] } | { ok: false; reason: "cap" } {
  if (active.includes(id)) return { ok: true, active: [...active] };
  if (active.length >= CHAOS_ACTIVE_CAP) return { ok: false, reason: "cap" };
  return { ok: true, active: [...active, id] };
}

/** Hidden hints must not reveal the count, including to the accessible name. */
export function visibleHint(count: number, hidden: boolean): string {
  return hidden ? "·" : String(count);
}

export function hintAriaCount(count: number, hidden: boolean, hiddenLabel: string): string {
  return hidden ? hiddenLabel : String(count);
}

export function chaosShareLine(label: string, ruleName: string, elapsedSec: number, url: string): string {
  return `${label} · ${ruleName} · ${elapsedSec}s · ${url}`;
}

export function chaosShareUrl(locale: string): string {
  return `https://game.oiyo.net/${locale}/tents-and-trees/`;
}

export function chaosElapsedSec(startedAtEpochMs: number, now: number): number {
  return Math.max(0, Math.round((now - startedAtEpochMs) / 1000));
}

/** Eight-neighbor check for the one-shot flashlight. Banned cells count only when that card is active. */
export function chaosNeighborVerdict(
  cell: Pos,
  puzzle: TentsPuzzle,
  tents: readonly Pos[],
  banned: readonly Pos[] = [],
): "legal" | "illegal" {
  const [r, c] = cell;
  if (puzzle.trees.some(([tr, tc]) => tr === r && tc === c)) return "illegal";
  if (banned.some(([br, bc]) => br === r && bc === c)) return "illegal";
  if (tents.some(([tr, tc]) => Math.abs(tr - r) <= 1 && Math.abs(tc - c) <= 1)) return "illegal";
  const besideTree = puzzle.trees.some(([tr, tc]) => Math.abs(tr - r) + Math.abs(tc - c) === 1);
  return besideTree ? "legal" : "illegal";
}
