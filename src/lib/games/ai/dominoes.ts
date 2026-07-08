// Draw Dominoes (double-six) — logic + heuristic AI for a 2-player game.
// Pure/UI-free so the rules and AI can be unit-tested headlessly.
export interface Tile { a: number; b: number; id: number }
export type AiLevel = 1 | 2 | 3;
export type End = "left" | "right";
export interface Ends { left: number; right: number } // open pip values at each end
export interface Move { tile: Tile; end: End }

export function makeSet(): Tile[] {
  const set: Tile[] = [];
  let id = 0;
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) set.push({ a, b, id: id++ });
  return set; // 28 tiles
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const x = arr.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

export const isDouble = (t: Tile) => t.a === t.b;
export const pips = (t: Tile) => t.a + t.b;
export const handPips = (hand: Tile[]) => hand.reduce((s, t) => s + pips(t), 0);

// Can this tile attach at the given end (matching that end's open pip)?
export function tileFits(tile: Tile, endValue: number): boolean {
  return tile.a === endValue || tile.b === endValue;
}

export function legalMoves(hand: Tile[], ends: Ends): Move[] {
  const out: Move[] = [];
  for (const tile of hand) {
    if (tileFits(tile, ends.left)) out.push({ tile, end: "left" });
    if (tileFits(tile, ends.right)) out.push({ tile, end: "right" });
  }
  return out;
}

// Apply a move: returns the new open pip value produced at that end.
export function newEndValue(tile: Tile, endValue: number): number {
  return tile.a === endValue ? tile.b : tile.a;
}

// ── AI ────────────────────────────────────────────────────────────────────
// Choose a move (or null if none). Levels tune how strategic the pick is.
export function aiChoose(hand: Tile[], ends: Ends, level: AiLevel, rng: () => number = Math.random): Move | null {
  const moves = legalMoves(hand, ends);
  if (moves.length === 0) return null;

  if (level === 1) {
    return moves[Math.floor(rng() * moves.length)];
  }

  // Level 2/3: score each move.
  const remaining = (afterTileId: number) => hand.filter((t) => t.id !== afterTileId);
  let best = moves[0], bestScore = -Infinity;
  for (const m of moves) {
    const produced = newEndValue(m.tile, m.end === "left" ? ends.left : ends.right);
    const otherEnd = m.end === "left" ? ends.right : ends.left;
    // Dump heavy pips first (helps block scoring) — always valued.
    let score = pips(m.tile);
    // Prefer unloading doubles early (they're hard to place later).
    if (isDouble(m.tile)) score += 3;
    if (level === 3) {
      // Keep flexibility: reward leaving ends we can still answer from our own hand.
      const rest = remaining(m.tile.id);
      const answerable = rest.filter((t) => tileFits(t, produced) || tileFits(t, otherEnd)).length;
      score += answerable * 1.2;
      // Mild randomness to avoid predictability.
      score += rng() * 0.3;
    }
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}
