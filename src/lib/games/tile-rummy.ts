// Number-tile rummy. The genre (groups, runs, a 30-point first meld, table
// rearrangement) is the public ruleset. Names, colors, and the wild-tile mark
// are ours — do not import a branded tile set's name into copy or comments.
// 2026-10-20: the first meld cannot borrow the table, because those points
// would no longer describe what left the hand.

import { mulberry32 } from "./daily";

export const TILE_COLORS = ["crimson", "amber", "teal", "violet"] as const;
export type TileColor = (typeof TILE_COLORS)[number];
export type OpponentCount = 1 | 2 | 3;
export type MeldShape = "group" | "run";

export interface Tile {
  id: number;
  kind: "number" | "joker";
  color: TileColor | null;
  value: number | null;
}

export interface Meld {
  tiles: Tile[];
  /** Set when a line can be read as both a group and a run. */
  shape?: MeldShape;
}

export interface Assignment {
  color: TileColor;
  value: number;
}

export type MeldCheck =
  | { ok: true; shape: MeldShape; points: number; roles: Assignment[] }
  | { ok: false };

export interface RummyState {
  seed: number;
  seats: number;
  hands: Tile[][];
  pool: Tile[];
  table: Meld[];
  opened: boolean[];
  turn: number;
  status: "playing" | "over";
  winner: number | "draw" | null;
  passes: number;
  turnCount: number;
  mode: "match" | "daily";
  dateKey: string | null;
  /** Points the first meld needs. Absent on states saved before 2026-10-21, which means 30. */
  firstMeld?: number;
}

export type RummyAction = { type: "draw" } | { type: "play"; table: Meld[] };

export type PlayReject =
  | "turn"
  | "over"
  | "no-tile"
  | "duplicate"
  | "foreign"
  | "missing-table"
  | "invalid-meld"
  | "initial-locked"
  | "under-thirty";

export interface PlayCheck {
  ok: boolean;
  reason?: PlayReject;
  added?: number;
  addedPoints?: number;
  goesOut?: boolean;
}

const FIRST_MELD = 30;
const JOKER_PENALTY = 30;
const HAND_SIZE = 14;

export function numberTile(id: number, color: TileColor, value: number): Tile {
  return { id, kind: "number", color, value };
}

export function jokerTile(id: number): Tile {
  return { id, kind: "joker", color: null, value: null };
}

export function seedFromDateKey(dateKey: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Daily scores compare only inside this cohort. The date is the seed.
 * `daily` is one fixed ruleset (one opponent, adept search, no hint/undo),
 * so a freer match does not share the record.
 */
export function dailyBestConditions(dateKey: string): { seed: string; difficulty: string; assist: "none" } {
  return { seed: dateKey, difficulty: "daily", assist: "none" };
}

function makeDeck(): Tile[] {
  const deck: Tile[] = [];
  let id = 1;
  for (const color of TILE_COLORS) {
    for (let copy = 0; copy < 2; copy++) {
      for (let value = 1; value <= 13; value++) deck.push(numberTile(id++, color, value));
    }
  }
  deck.push(jokerTile(id++), jokerTile(id++));
  return deck;
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/**
 * Table rules a match can bend (augments and chaos tables, 2026-10-21).
 * The daily table never passes these, so its cohort keeps one ruleset.
 */
export interface RummyVariant {
  firstMeld?: number;
  handSize?: number;
  rivalHandSize?: number;
  /** Seat 0 starts holding a wild tile, swapped in from the pool. */
  startJoker?: boolean;
  /** The pool is cut to this many tiles after the deal. */
  poolLimit?: number;
  /** Wild tiles still in the pool move into its top ten. */
  jokersNearTop?: boolean;
}

export function createTileRummy(options: {
  seed: number;
  opponents: OpponentCount;
  mode?: "match" | "daily";
  dateKey?: string | null;
  variant?: RummyVariant;
}): RummyState {
  const seats = options.opponents + 1;
  const variant = options.variant ?? {};
  const rng = mulberry32(options.seed >>> 0);
  const deck = shuffle(makeDeck(), rng);
  const hands: Tile[][] = [];
  let cursor = 0;
  for (let seat = 0; seat < seats; seat++) {
    const size = seat === 0 ? variant.handSize ?? HAND_SIZE : variant.rivalHandSize ?? HAND_SIZE;
    hands.push(deck.slice(cursor, cursor + size));
    cursor += size;
  }
  let pool = deck.slice(cursor);
  if (variant.startJoker && hands[0].length > 0 && !hands[0].some((tile) => tile.kind === "joker")) {
    // Take the wild tile from the pool, or from a rival when both were dealt out.
    const holders = [pool, ...hands.slice(1)];
    const holder = holders.find((tiles) => tiles.some((tile) => tile.kind === "joker"));
    if (holder) {
      const at = holder.findIndex((tile) => tile.kind === "joker");
      const swapIndex = Math.floor(rng() * hands[0].length);
      const outgoing = hands[0][swapIndex];
      hands[0] = hands[0].map((tile, index) => (index === swapIndex ? holder[at] : tile));
      holder[at] = outgoing;
    }
  }
  if (variant.jokersNearTop) {
    const jokers = pool.filter((tile) => tile.kind === "joker");
    const rest = pool.filter((tile) => tile.kind !== "joker");
    for (const joker of jokers) rest.splice(Math.floor(rng() * Math.min(10, rest.length + 1)), 0, joker);
    pool = rest;
  }
  if (variant.poolLimit !== undefined) pool = pool.slice(0, Math.max(0, variant.poolLimit));
  return {
    seed: options.seed >>> 0,
    seats,
    hands,
    pool,
    table: [],
    opened: Array.from({ length: seats }, () => false),
    turn: 0,
    status: "playing",
    winner: null,
    passes: 0,
    turnCount: 0,
    mode: options.mode ?? "match",
    dateKey: options.dateKey ?? null,
    ...(variant.firstMeld !== undefined ? { firstMeld: variant.firstMeld } : {}),
  };
}

export function firstMeldOf(state: RummyState): number {
  return state.firstMeld ?? FIRST_MELD;
}

function asGroup(tiles: Tile[]): MeldCheck {
  if (tiles.length < 3 || tiles.length > 4) return { ok: false };
  const naturals = tiles.filter((tile) => tile.kind === "number");
  if (naturals.length === 0 || naturals.length + tiles.filter((tile) => tile.kind === "joker").length !== tiles.length) {
    return { ok: false };
  }
  const value = naturals[0].value;
  const used = new Set<TileColor>();
  for (const tile of naturals) {
    if (tile.value !== value || !tile.color || used.has(tile.color)) return { ok: false };
    used.add(tile.color);
  }
  const free = TILE_COLORS.filter((color) => !used.has(color));
  const jokers = tiles.filter((tile) => tile.kind === "joker");
  if (jokers.length > free.length) return { ok: false };
  let jokerIndex = 0;
  const roles = tiles.map((tile) =>
    tile.kind === "number"
      ? { color: tile.color as TileColor, value: value as number }
      : { color: free[jokerIndex++], value: value as number },
  );
  return { ok: true, shape: "group", points: roles.reduce((sum, role) => sum + role.value, 0), roles };
}

function asRun(tiles: Tile[]): MeldCheck {
  if (tiles.length < 3 || tiles.length > 13) return { ok: false };
  const anchor = tiles.findIndex((tile) => tile.kind === "number");
  if (anchor < 0) return { ok: false };
  const color = tiles[anchor].color;
  const start = (tiles[anchor].value ?? 0) - anchor;
  if (!color || start < 1 || start + tiles.length - 1 > 13) return { ok: false };
  const roles: Assignment[] = [];
  for (let index = 0; index < tiles.length; index++) {
    const expected = start + index;
    const tile = tiles[index];
    if (tile.kind === "number" && (tile.color !== color || tile.value !== expected)) return { ok: false };
    roles.push({ color, value: expected });
  }
  return { ok: true, shape: "run", points: roles.reduce((sum, role) => sum + role.value, 0), roles };
}

export function meldShapes(tiles: Tile[]): MeldShape[] {
  const shapes: MeldShape[] = [];
  if (asGroup(tiles).ok) shapes.push("group");
  if (asRun(tiles).ok) shapes.push("run");
  return shapes;
}

export function validateMeld(meld: Meld): MeldCheck {
  if (meld.shape === "group") return asGroup(meld.tiles);
  if (meld.shape === "run") return asRun(meld.tiles);
  const group = asGroup(meld.tiles);
  const run = asRun(meld.tiles);
  // One natural plus wild tiles can be read either way. The group keeps the
  // printed number, which is the value the player can see on the tile.
  if (group.ok && run.ok) return group;
  return group.ok ? group : run;
}

/**
 * Orders a player's selection into one legal line.
 * Spare wild tiles sit on the high side of a run, so the same selection
 * always lays the same tiles (2026-10-20).
 */
export function arrangeMeld(tiles: readonly Tile[], shape: MeldShape): Meld | null {
  if (shape === "group") {
    const meld: Meld = { tiles: tiles.map((tile) => ({ ...tile })), shape: "group" };
    return validateMeld(meld).ok ? meld : null;
  }
  const numbers = tiles.filter((tile) => tile.kind === "number");
  const jokers = tiles.filter((tile) => tile.kind === "joker").slice().sort((a, b) => a.id - b.id);
  if (numbers.length === 0) return null;
  const color = numbers[0].color;
  if (!color || numbers.some((tile) => tile.color !== color)) return null;
  const sorted = numbers.slice().sort((a, b) => (a.value ?? 0) - (b.value ?? 0) || a.id - b.id);
  const values = sorted.map((tile) => tile.value ?? 0);
  if (values.some((value, index) => index > 0 && value === values[index - 1])) return null;
  const startValue = values[0];
  const endValue = values[values.length - 1];
  const holes = endValue - startValue + 1 - values.length;
  if (holes < 0 || holes > jokers.length) return null;
  const extra = jokers.length - holes;
  const byValue = new Map(sorted.map((tile) => [tile.value, tile]));
  for (let before = 0; before <= extra; before++) {
    const runStart = startValue - before;
    const runEnd = endValue + (extra - before);
    if (runStart < 1 || runEnd > 13) continue;
    const placed: Tile[] = [];
    let jokerIndex = 0;
    for (let value = runStart; value <= runEnd; value++) {
      const natural = byValue.get(value);
      placed.push(natural ? { ...natural } : { ...jokers[jokerIndex++] });
    }
    const meld: Meld = { tiles: placed, shape: "run" };
    if (validateMeld(meld).ok) return meld;
  }
  return null;
}

function combinations<T>(items: readonly T[], count: number): T[][] {
  const out: T[][] = [];
  const current: T[] = [];
  const walk = (start: number) => {
    if (current.length === count) {
      out.push(current.slice());
      return;
    }
    for (let index = start; index < items.length; index++) {
      current.push(items[index]);
      walk(index + 1);
      current.pop();
    }
  };
  walk(0);
  return out;
}

/** Every legal group and run inside `tiles`, each with an explicit shape. */
export function meldOptions(tiles: readonly Tile[]): Meld[] {
  const jokers = tiles.filter((tile) => tile.kind === "joker").sort((a, b) => a.id - b.id);
  const numbers = tiles.filter((tile) => tile.kind === "number");
  const found: Meld[] = [];
  const seen = new Set<string>();
  const push = (meld: Meld) => {
    const key = `${meld.shape}:${meld.tiles.map((tile) => tile.id).join(".")}`;
    if (seen.has(key) || !validateMeld(meld).ok) return;
    seen.add(key);
    found.push(meld);
  };

  for (let value = 1; value <= 13; value++) {
    const byColor = TILE_COLORS.map((color) =>
      numbers.filter((tile) => tile.color === color && tile.value === value).sort((a, b) => a.id - b.id),
    );
    const available = TILE_COLORS.map((_, index) => index).filter((index) => byColor[index].length > 0);
    for (const target of [3, 4]) {
      for (let use = 1; use <= Math.min(target, available.length); use++) {
        const need = target - use;
        if (need > jokers.length) continue;
        for (const picks of combinations(available, use)) {
          let choices: Tile[][] = [[]];
          for (const index of picks) {
            choices = choices.flatMap((prefix) => byColor[index].map((tile) => [...prefix, tile]));
          }
          for (const choice of choices) push({ tiles: [...choice, ...jokers.slice(0, need)], shape: "group" });
        }
      }
    }
  }

  for (const color of TILE_COLORS) {
    const byValue: Tile[][] = Array.from({ length: 14 }, () => []);
    for (const tile of numbers) if (tile.color === color && tile.value) byValue[tile.value].push(tile);
    for (const list of byValue) list.sort((a, b) => a.id - b.id);
    for (let start = 1; start <= 11; start++) {
      for (let length = 3; length <= 14 - start; length++) {
        let missing = 0;
        let naturals = 0;
        const slots: Tile[][] = [];
        for (let value = start; value < start + length; value++) {
          slots.push(byValue[value]);
          if (byValue[value].length === 0) missing += 1;
          else naturals += 1;
        }
        if (naturals === 0 || missing > jokers.length) continue;
        const placed: Tile[] = [];
        let jokerIndex = 0;
        for (const slot of slots) placed.push(slot.length === 0 ? jokers[jokerIndex++] : slot[0]);
        push({ tiles: placed, shape: "run" });
        const alternate = slots.findIndex((slot) => slot.length > 1);
        if (alternate >= 0) {
          const copy = placed.slice();
          copy[alternate] = slots[alternate][1];
          push({ tiles: copy, shape: "run" });
        }
      }
    }
  }
  return found;
}

function sameTiles(a: Meld, b: Meld): boolean {
  return a.tiles.length === b.tiles.length && a.tiles.every((tile, index) => tile.id === b.tiles[index].id);
}

function initialLayoutOk(previous: Meld[], next: Meld[], handIds: Set<number>): boolean {
  const used = new Set<number>();
  for (const meld of previous) {
    const index = next.findIndex((candidate, candidateIndex) => !used.has(candidateIndex) && sameTiles(meld, candidate));
    if (index < 0) return false;
    used.add(index);
  }
  return next.every((meld, index) => used.has(index) || meld.tiles.every((tile) => handIds.has(tile.id)));
}

export function checkPlay(state: RummyState, seat: number, table: Meld[]): PlayCheck {
  if (state.status !== "playing") return { ok: false, reason: "over" };
  if (seat !== state.turn) return { ok: false, reason: "turn" };
  const seen = new Set<number>();
  for (const meld of table) {
    if (!validateMeld(meld).ok) return { ok: false, reason: "invalid-meld" };
    for (const tile of meld.tiles) {
      if (seen.has(tile.id)) return { ok: false, reason: "duplicate" };
      seen.add(tile.id);
    }
  }

  const handIds = new Set(state.hands[seat].map((tile) => tile.id));
  const tableIds = new Set(state.table.flatMap((meld) => meld.tiles.map((tile) => tile.id)));
  for (const id of seen) if (!handIds.has(id) && !tableIds.has(id)) return { ok: false, reason: "foreign" };
  for (const id of tableIds) if (!seen.has(id)) return { ok: false, reason: "missing-table" };
  const addedIds = [...seen].filter((id) => !tableIds.has(id));
  if (addedIds.length === 0) return { ok: false, reason: "no-tile" };
  if (!state.opened[seat] && !initialLayoutOk(state.table, table, handIds)) return { ok: false, reason: "initial-locked" };

  let addedPoints = 0;
  for (const meld of table) {
    const check = validateMeld(meld);
    if (!check.ok) return { ok: false, reason: "invalid-meld" };
    meld.tiles.forEach((tile, index) => {
      if (!tableIds.has(tile.id)) addedPoints += check.roles[index].value;
    });
  }
  if (!state.opened[seat] && addedPoints < firstMeldOf(state)) return { ok: false, reason: "under-thirty" };
  return { ok: true, added: addedIds.length, addedPoints, goesOut: addedIds.length === state.hands[seat].length };
}

export function handPenalty(hand: readonly Tile[]): number {
  return hand.reduce((sum, tile) => sum + (tile.kind === "joker" ? JOKER_PENALTY : tile.value ?? 0), 0);
}

function finishByPenalty(state: RummyState): RummyState {
  const scores = state.hands.map((hand) => handPenalty(hand));
  const best = Math.min(...scores);
  const leaders = scores.flatMap((score, index) => (score === best ? [index] : []));
  return {
    ...state,
    status: "over",
    winner: leaders.length === 1 ? leaders[0] : "draw",
    turnCount: state.turnCount + 1,
  };
}

function advance(state: RummyState, patch: Partial<RummyState>): RummyState {
  return { ...state, ...patch, turn: (state.turn + 1) % state.seats, turnCount: state.turnCount + 1 };
}

export function applyRummy(state: RummyState, action: RummyAction): RummyState | null {
  if (state.status !== "playing") return null;
  if (action.type === "draw") {
    if (state.pool.length === 0) {
      const passes = state.passes + 1;
      const next = { ...state, passes };
      return passes >= state.seats ? finishByPenalty(next) : advance(next, {});
    }
    const [drawn, ...pool] = state.pool;
    const hands = state.hands.map((hand, index) => (index === state.turn ? hand.concat(drawn) : hand.slice()));
    return advance(state, { hands, pool, passes: 0 });
  }

  const check = checkPlay(state, state.turn, action.table);
  if (!check.ok) return null;
  const tableIds = new Set(state.table.flatMap((meld) => meld.tiles.map((tile) => tile.id)));
  const added = new Set(action.table.flatMap((meld) => meld.tiles.map((tile) => tile.id)).filter((id) => !tableIds.has(id)));
  const hands = state.hands.map((hand, index) => (index === state.turn ? hand.filter((tile) => !added.has(tile.id)) : hand.slice()));
  const opened = state.opened.slice();
  opened[state.turn] = true;
  const table = action.table.map((meld) => ({ tiles: meld.tiles.map((tile) => ({ ...tile })), ...(meld.shape ? { shape: meld.shape } : {}) }));
  const base: RummyState = { ...state, hands, opened, table, passes: 0 };
  if (check.goesOut) {
    return { ...base, status: "over", winner: state.turn, turnCount: state.turnCount + 1 };
  }
  return advance(base, {});
}

export function humanOutcome(state: RummyState): "w" | "l" | "d" | null {
  if (state.status !== "over" || state.winner === null) return null;
  if (state.winner === "draw") return "d";
  return state.winner === 0 ? "w" : "l";
}

export const COLOR_MARK: Record<TileColor, string> = { crimson: "🟥", amber: "🟧", teal: "🟦", violet: "🟪" };

export function tileMark(tile: Tile, role?: Assignment): string {
  if (tile.kind === "joker") return role ? `⭐${role.value}` : "⭐";
  return `${COLOR_MARK[tile.color as TileColor]}${tile.value}`;
}

/** Emoji rows, one meld per line. No image. */
/** Table number for the copied result: the date for today's table, the seed otherwise. */
export function tableNumber(state: RummyState): string {
  return state.mode === "daily" && state.dateKey ? state.dateKey : `#${state.seed}`;
}

/** Copied result: heading with table number, outcome, then the public table only (never a hand). */
export function shareGrid(state: RummyState, heading: string, outcome: string): string {
  const rows = state.table.map((meld) => {
    const check = validateMeld(meld);
    return meld.tiles.map((tile, index) => tileMark(tile, check.ok ? check.roles[index] : undefined)).join(" ");
  });
  return [`${heading} ${tableNumber(state)}`, outcome, ...rows].join("\n");
}
