// Kingdomino — 2-player draft engine + heuristic AI.
// Authentic flow: each round you PLACE the tile your king claimed last round, then
// CLAIM a tile from the new draft (claim order sets next round's placement order).
import {
  buildDeck, emptyBoard, emptyCrowns, shuffle, allLegalPlacements, applyPlacement,
  scoreBoard, scoreBoardBreakdown, bonuses, isLegal,
  CENTER,
  type Board, type CrownGrid, type Tile, type Placement,
} from "../kingdomino";

export type Player = "you" | "ai";
export type AiLevel = 1 | 2 | 3;

export interface Kingdom { board: Board; crowns: CrownGrid; discarded: number }
export interface Slot { tile: Tile; owner: Player | null } // owner = who claimed this draft tile

// What the engine is waiting for next.
export type Pending =
  | { kind: "claim"; owner: Player; options: number[] }          // pick a slot index in `draft`
  | { kind: "place"; owner: Player; tile: Tile; canPlace: boolean } // place held tile (or discard if !canPlace)
  | { kind: "gameover" };

export interface GameState {
  you: Kingdom;
  ai: Kingdom;
  deck: Tile[];
  deckPos: number;
  current: Slot[];   // tiles claimed last round, being placed this round (sorted asc by id)
  draft: Slot[];     // new tiles being claimed this round (sorted asc by id), or []
  curIdx: number;    // pointer into `current` for placement order
  claimSeq: Player[]; // round-1 only: randomized claim order
  claimPos: number;
  phase: "setup" | "round" | "gameover";
  pending: Pending;
  round: number;
}

const TILES_2P = 24;
const bySortId = (a: Slot, b: Slot) => a.tile.id - b.tile.id;

function drawLine(s: GameState): Slot[] {
  const line: Slot[] = [];
  for (let i = 0; i < 4 && s.deckPos < s.deck.length; i++) {
    line.push({ tile: s.deck[s.deckPos++], owner: null });
  }
  line.sort(bySortId);
  return line;
}

export function startGame(rng: () => number = Math.random): GameState {
  const deck = shuffle(buildDeck(), rng).slice(0, TILES_2P);
  const first: Player = rng() < 0.5 ? "you" : "ai";
  const second: Player = first === "you" ? "ai" : "you";
  const s: GameState = {
    you: { board: emptyBoard(), crowns: emptyCrowns(), discarded: 0 },
    ai: { board: emptyBoard(), crowns: emptyCrowns(), discarded: 0 },
    deck, deckPos: 0, current: [], draft: [], curIdx: 0,
    // Two-player setup uses the snake order A-B-B-A, not an arbitrary shuffle.
    claimSeq: [first, second, second, first],
    claimPos: 0, phase: "setup", round: 1,
    pending: { kind: "gameover" },
  };
  s.draft = drawLine(s); // first line to claim
  s.pending = nextSetupClaim(s);
  return s;
}

function nextSetupClaim(s: GameState): Pending {
  if (s.claimPos >= s.claimSeq.length) {
    // Round 1 claims done: claimed line becomes `current`, draw the next draft.
    s.current = s.draft.slice().sort(bySortId);
    s.curIdx = 0;
    s.draft = drawLine(s);
    s.phase = "round";
    return nextPlace(s);
  }
  const owner = s.claimSeq[s.claimPos];
  const options = s.draft.map((sl, i) => (sl.owner === null ? i : -1)).filter((i) => i >= 0);
  return { kind: "claim", owner, options };
}

function nextPlace(s: GameState): Pending {
  if (s.curIdx >= s.current.length) {
    // Whole line placed. Promote draft → current, draw new draft (or end).
    if (s.draft.length === 0) { s.phase = "gameover"; return { kind: "gameover" }; }
    s.current = s.draft.slice().sort(bySortId);
    s.curIdx = 0;
    s.draft = drawLine(s);
    s.round++;
    return nextPlace(s);
  }
  const slot = s.current[s.curIdx];
  const owner = slot.owner as Player;
  const k = s[owner];
  const canPlace = allLegalPlacements(k.board, slot.tile).length > 0;
  return { kind: "place", owner, tile: slot.tile, canPlace };
}

// Apply a placement (or discard when placement === null because no legal spot).
export function place(s: GameState, placement: Placement | null): GameState {
  if (s.pending.kind !== "place") return s;
  const owner = s.pending.owner;
  const k = s[owner];
  if (placement) {
    if (!isLegal(k.board, s.pending.tile, placement)) return s;
    applyPlacement(k.board, k.crowns, s.pending.tile, placement);
  } else {
    // A legal tile may never be discarded voluntarily.
    if (s.pending.canPlace) return s;
    k.discarded++;
  }
  s.curIdx++;
  // After placing, the same actor claims from the draft (if any tiles remain to claim).
  if (s.draft.length > 0 && s.draft.some((sl) => sl.owner === null)) {
    const options = s.draft.map((sl, i) => (sl.owner === null ? i : -1)).filter((i) => i >= 0);
    s.pending = { kind: "claim", owner, options };
  } else {
    s.pending = nextPlace(s);
  }
  return s;
}

export function claim(s: GameState, slotIdx: number): GameState {
  if (s.pending.kind !== "claim") return s;
  if (!s.pending.options.includes(slotIdx)) return s;
  const slot = s.draft[slotIdx];
  if (!slot || slot.owner !== null) return s;
  slot.owner = s.pending.owner;
  if (s.phase === "setup") {
    s.claimPos++;
    s.pending = nextSetupClaim(s);
  } else {
    // Claim followed a placement; advance to the next king in the current line.
    s.pending = nextPlace(s);
  }
  return s;
}

// ── Scoring ───────────────────────────────────────────────────────────────
export interface ScoreSummary {
  terrain: number;
  bonus: number;
  total: number;
  crowns: number;
  largestRegion: number;
  harmony: boolean;
  middleKingdom: boolean;
}

export function scoreSummary(k: Kingdom): ScoreSummary {
  const terrain = scoreBoardBreakdown(k.board, k.crowns);
  const bonus = bonuses(k.board, k.discarded);
  return {
    terrain: terrain.points,
    bonus: bonus.points,
    total: terrain.points + bonus.points,
    crowns: terrain.crowns,
    largestRegion: terrain.largestRegion,
    harmony: bonus.harmony,
    middleKingdom: bonus.middleKingdom,
  };
}

export function totalScore(k: Kingdom): number {
  return scoreSummary(k).total;
}

export interface FinalResult {
  you: number;
  ai: number;
  winner: Player | "draw";
  youSummary: ScoreSummary;
  aiSummary: ScoreSummary;
  tieBreaker: "score" | "largest-region" | "draw";
}

export function finalResult(s: GameState): FinalResult {
  const youSummary = scoreSummary(s.you);
  const aiSummary = scoreSummary(s.ai);
  let winner: Player | "draw" = "draw";
  let tieBreaker: FinalResult["tieBreaker"] = "draw";
  // Blue Orange's second-edition rules resolve a score tie by the largest
  // connected territory. If that is tied too, the players share the victory.
  if (youSummary.total !== aiSummary.total) {
    winner = youSummary.total > aiSummary.total ? "you" : "ai";
    tieBreaker = "score";
  } else if (youSummary.largestRegion !== aiSummary.largestRegion) {
    winner = youSummary.largestRegion > aiSummary.largestRegion ? "you" : "ai";
    tieBreaker = "largest-region";
  }
  return { you: youSummary.total, ai: aiSummary.total, winner, youSummary, aiSummary, tieBreaker };
}

// ── AI ────────────────────────────────────────────────────────────────────
// Marginal value of placing `tile` on a board: best achievable score gain, with a
// small compactness nudge so the AI keeps room to grow.
function bestPlacementValue(k: Kingdom, tile: Tile): { value: number; placement: Placement | null } {
  const legals = allLegalPlacements(k.board, tile);
  if (legals.length === 0) return { value: -5, placement: null }; // forced discard is bad
  const base = scoreBoard(k.board, k.crowns);
  let best = -Infinity, bestPl: Placement | null = null;
  for (const pl of legals) {
    const b2 = k.board.map((row) => row.slice());
    const c2 = k.crowns.map((row) => row.slice());
    applyPlacement(b2, c2, tile, pl);
    const gain = scoreBoard(b2, c2) - base;
    // Prefer central-ish placements (more future connection options).
    const centro = -(Math.abs(pl.a.r - CENTER) + Math.abs(pl.a.c - CENTER) + Math.abs(pl.b.r - CENTER) + Math.abs(pl.b.c - CENTER)) * 0.05;
    const score = gain + centro;
    if (score > best) { best = score; bestPl = pl; }
  }
  return { value: best, placement: bestPl };
}

export function aiPlace(s: GameState, level: AiLevel): Placement | null {
  if (s.pending.kind !== "place" || s.pending.owner !== "ai") return null;
  const { placement } = bestPlacementValue(s.ai, s.pending.tile);
  if (level === 1 && placement) {
    // Apprentice: sometimes takes a decent-but-not-best spot.
    const legals = allLegalPlacements(s.ai.board, s.pending.tile);
    if (legals.length && Math.random() < 0.35) return legals[Math.floor(Math.random() * legals.length)];
  }
  return placement;
}

export function aiClaim(s: GameState, level: AiLevel): number {
  if (s.pending.kind !== "claim" || s.pending.owner !== "ai") return -1;
  const opts = s.pending.options;
  let best = opts[0], bestVal = -Infinity;
  for (const i of opts) {
    const tile = s.draft[i].tile;
    const { value } = bestPlacementValue(s.ai, tile);
    const crowns = tile.a.crowns + tile.b.crowns;
    // Higher tiles (larger id) act later next round — a mild penalty at higher levels.
    const orderPenalty = level >= 2 ? (tile.id / 48) * 0.6 : 0;
    const v = value + crowns * 1.5 - orderPenalty + (level === 1 ? Math.random() * 0.5 : 0);
    if (v > bestVal) { bestVal = v; best = i; }
  }
  return best;
}
