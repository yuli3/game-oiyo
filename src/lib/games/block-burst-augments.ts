import {
  parseAugmentOffer,
  parseAugmentOwned,
  rollAugmentOffer,
  takeAugment,
  type AugmentDef,
  type AugmentOwned,
} from "./augment";
import {
  COLS,
  NO_MODS,
  canPlace,
  parseBurst,
  serializeBurst,
  settleLock,
  spawnBurstPiece,
  type BurstMods,
  type BurstState,
} from "./block-burst";

/**
 * Augment mode for Block Burst: one card at the start and one more at every
 * level, picked from three. It is a separate mode with its own save and its
 * own best score, so a classic record is never compared with a run that had
 * "one gem short also detonates" switched on. 2026-10-06
 */
export const BURST_AUGMENT_SAVE = "oiyo:block-burst-augment-state:v1";
export const BURST_AUGMENT_BEST = "oiyo:block-burst-augment-best:v1";

export const BURST_AUGMENTS = [
  { id: "score", tier: "silver", max: 3 },
  { id: "slow", tier: "silver", max: 3 },
  { id: "chain", tier: "silver", max: 3 },
  { id: "drop", tier: "silver", max: 3 },
  { id: "dot", tier: "gold", max: 1 },
  { id: "bomb", tier: "gold", max: 1 },
  { id: "cross", tier: "gold", max: 1 },
  { id: "undertow", tier: "gold", max: 1 },
  { id: "magnet", tier: "prismatic", max: 1 },
  { id: "revive", tier: "prismatic", max: 1 },
  { id: "rush", tier: "prismatic", max: 1 },
  { id: "colorBurst", tier: "prismatic", max: 1 },
] as const satisfies readonly AugmentDef[];

export type BurstAugmentId = (typeof BURST_AUGMENTS)[number]["id"];
export type BurstOwned = AugmentOwned<BurstAugmentId>;

export const BURST_DOT_EVERY = 4;
export const BURST_BOMB_EVERY = 6;
export const BURST_REVIVE_ROWS = 5;

export interface BurstRun {
  owned: BurstOwned;
  rng: number;
  /** Pieces spawned so far, the first one included. */
  pieces: number;
  /** The piece now falling is a bomb. */
  bomb: boolean;
  revived: boolean;
  /** Cards taken or skipped. A pick is owed while this is below the level. */
  picks: number;
  offer: BurstAugmentId[] | null;
}

export interface BurstRunMods extends BurstMods {
  /** Multiplies the gravity interval: above 1 falls slower. */
  fallMult: number;
  dropMult: number;
}

export function burstMods(owned: BurstOwned): BurstRunMods {
  const rush = (owned.rush ?? 0) > 0;
  return {
    ...NO_MODS,
    scoreMult: (1 + 0.25 * (owned.score ?? 0)) * (rush ? 2 : 1),
    chainBonus: owned.chain ?? 0,
    crossMult: owned.cross ? 4 : 2,
    magnet: Boolean(owned.magnet),
    undertow: Boolean(owned.undertow),
    colorBurst: Boolean(owned.colorBurst),
    fallMult: (1 + 0.15 * (owned.slow ?? 0)) * (rush ? 0.75 : 1),
    dropMult: 1 + 2 * (owned.drop ?? 0),
  };
}

/** Rolls the next offer when one is owed. Leaves the run alone otherwise. */
export function offerBurstAugments(run: BurstRun, level: number): BurstRun {
  if (run.offer || run.picks >= level) return run;
  const rolled = rollAugmentOffer(BURST_AUGMENTS, run.owned, run.rng);
  // Nothing left to offer: the pick is spent so the game never stalls on an empty draft.
  if (rolled.offer.length === 0) return { ...run, rng: rolled.rng, picks: level };
  return { ...run, rng: rolled.rng, offer: rolled.offer };
}

export function createBurstRun(seed: number): BurstRun {
  // A salt keeps the draft from walking the same sequence as the piece bag.
  return offerBurstAugments({ owned: {}, rng: (seed ^ 0x61756721) >>> 0, pieces: 1, bomb: false, revived: false, picks: 0, offer: null }, 1);
}

export function pickBurstAugment(run: BurstRun, id: BurstAugmentId): BurstRun {
  if (!run.offer || !run.offer.includes(id)) return run;
  return { ...run, owned: takeAugment(BURST_AUGMENTS, run.owned, id), picks: run.picks + 1, offer: null };
}

export function lockBurstAugmented(state: BurstState, run: BurstRun) {
  return { ...settleLock(state, burstMods(run.owned), run.bomb), run: { ...run, bomb: false } };
}

export function spawnBurstAugmented(state: BurstState, run: BurstRun): { state: BurstState; run: BurstRun; revivedNow: boolean } {
  let spawned = spawnBurstPiece(state);
  let revivedNow = false;
  if (spawned.status === "over" && run.owned.revive && !run.revived) {
    const board = spawned.board.map((row, r) => (r < BURST_REVIVE_ROWS ? Array<null>(COLS).fill(null) : [...row]));
    spawned = spawnBurstPiece({ ...spawned, board, status: "playing" });
    revivedNow = true;
  }
  const pieces = run.pieces + 1;
  let bomb = false;
  if (spawned.status === "playing" && spawned.active) {
    if (run.owned.dot && pieces % BURST_DOT_EVERY === 0) {
      const dot = { ...spawned.active, shape: "D" as const, rotation: 0, x: Math.floor((COLS - 1) / 2), y: 0 };
      if (canPlace(spawned.board, dot)) spawned = { ...spawned, active: dot };
    }
    bomb = Boolean(run.owned.bomb) && pieces % BURST_BOMB_EVERY === 0;
  }
  return { state: spawned, run: { ...run, pieces, bomb, revived: run.revived || revivedNow }, revivedNow };
}

export function serializeBurstRun(state: BurstState, run: BurstRun) {
  return JSON.stringify({
    v: 1,
    game: serializeBurst(state),
    owned: run.owned,
    rng: run.rng,
    pieces: run.pieces,
    bomb: run.bomb,
    revived: run.revived,
    picks: run.picks,
    offer: run.offer,
  });
}

export function parseBurstRun(raw: string | null): { state: BurstState; run: BurstRun } | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const saved = data as Record<string, unknown>;
    if (saved.v !== 1 || typeof saved.game !== "string") return null;
    const state = parseBurst(saved.game);
    if (!state) return null;
    if (state.active && !canPlace(state.board, state.active)) return null;
    const count = (value: unknown, cap: number) => (typeof value === "number" && Number.isInteger(value) && value >= 0 ? Math.min(cap, value) : null);
    const rng = count(saved.rng, 0xffff_ffff);
    const pieces = count(saved.pieces, 1_000_000);
    const picks = count(saved.picks, 15);
    if (rng === null || pieces === null || picks === null) return null;
    const owned = parseAugmentOwned(BURST_AUGMENTS, saved.owned);
    const run: BurstRun = {
      owned,
      rng,
      pieces: Math.max(1, pieces),
      bomb: saved.bomb === true,
      revived: saved.revived === true,
      picks,
      offer: parseAugmentOffer(BURST_AUGMENTS, owned, saved.offer),
    };
    return { state: { ...state, level: Math.min(15, Math.max(1, Math.floor(state.level))) }, run };
  } catch {
    return null;
  }
}

export function readBurstAugmentBest(): number {
  if (typeof localStorage === "undefined") return 0;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(BURST_AUGMENT_BEST) ?? "0");
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

export function writeBurstAugmentBest(score: number): number {
  const best = Math.max(readBurstAugmentBest(), Math.floor(score));
  try { localStorage.setItem(BURST_AUGMENT_BEST, JSON.stringify(best)); } catch { /* storage is best-effort */ }
  return best;
}
