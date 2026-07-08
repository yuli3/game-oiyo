// Simplified 4-player Mahjong — closed hands only (no pon/chi/kan), draw & discard,
// win by tsumo (self-draw) or ron (on a discard). Pure logic so the winning-hand
// detector, shanten, and AI can be unit-tested headlessly.
//
// Tile kinds 0..33 (34 kinds, 4 of each = 136):
//   0-8 man(萬)1-9, 9-17 pin(筒)1-9, 18-26 sou(索)1-9,
//   27-30 winds E/S/W/N, 31-33 dragons white/green/red.
export const KINDS = 34;
export type Counts = number[]; // length 34, how many of each kind

export const isHonor = (k: number) => k >= 27;
export const suitOf = (k: number) => (k < 9 ? 0 : k < 18 ? 1 : k < 27 ? 2 : 3); // 3 = honor
export const rankOf = (k: number) => (k < 27 ? (k % 9) + 1 : 0); // 1-9 for suited, 0 honor
export const isTerminalOrHonor = (k: number) => isHonor(k) || rankOf(k) === 1 || rankOf(k) === 9;

export function emptyCounts(): Counts { return new Array(KINDS).fill(0); }
export function toCounts(tiles: number[]): Counts {
  const c = emptyCounts();
  for (const t of tiles) c[t]++;
  return c;
}

export function buildWall(): number[] {
  const wall: number[] = [];
  for (let k = 0; k < KINDS; k++) for (let n = 0; n < 4; n++) wall.push(k);
  return wall;
}
export function shuffle<T>(a: T[], rng: () => number = Math.random): T[] {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}

// ── Winning shape ─────────────────────────────────────────────────────────
// Can these counts (12 tiles → 4 melds, no pair) be fully split into melds?
function formsAllMelds(c: Counts): boolean {
  let i = 0;
  while (i < KINDS && c[i] === 0) i++;
  if (i === KINDS) return true; // nothing left
  // Triplet
  if (c[i] >= 3) {
    c[i] -= 3;
    if (formsAllMelds(c)) { c[i] += 3; return true; }
    c[i] += 3;
  }
  // Run (suited only, i and i+1,i+2 in same suit)
  if (!isHonor(i) && rankOf(i) <= 7 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--; c[i + 1]--; c[i + 2]--;
    if (formsAllMelds(c)) { c[i]++; c[i + 1]++; c[i + 2]++; return true; }
    c[i]++; c[i + 1]++; c[i + 2]++;
  }
  return false;
}

// Standard hand: one pair + four melds (14 tiles).
export function isStandardWin(c: Counts): boolean {
  const total = c.reduce((s, n) => s + n, 0);
  if (total !== 14) return false;
  for (let k = 0; k < KINDS; k++) {
    if (c[k] >= 2) {
      c[k] -= 2;
      const ok = formsAllMelds(c);
      c[k] += 2;
      if (ok) return true;
    }
  }
  return false;
}

// Seven pairs (chiitoitsu): 7 distinct pairs.
export function isSevenPairs(c: Counts): boolean {
  let pairs = 0;
  for (let k = 0; k < KINDS; k++) {
    if (c[k] === 0) continue;
    if (c[k] === 2) pairs++; else return false;
  }
  return pairs === 7;
}

export function isWinningHand(tiles: number[]): boolean {
  if (tiles.length !== 14) return false;
  const c = toCounts(tiles);
  return isStandardWin(c) || isSevenPairs(c);
}

// ── Shanten (how many tiles away from tenpai; -1 = complete, 0 = tenpai) ──────
// Standard-form shanten via meld/partial extraction, plus a chiitoitsu estimate.
function standardShanten(c: Counts): number {
  // Extract melds and partial sets (blocks ≤ 4) plus at most one pair, then
  // shanten = 8 − 2·melds − partials − hasPair. Search all decompositions.
  let best = 8;
  const rec = (idx: number, melds: number, partials: number, hasPair: boolean): void => {
    let i = idx;
    while (i < KINDS && c[i] === 0) i++;
    if (i === KINDS) {
      const blocks = Math.min(melds + partials, 4);
      const sh = 8 - 2 * melds - (blocks - melds) - (hasPair ? 1 : 0);
      if (sh < best) best = sh;
      return;
    }
    if (melds + partials < 4) {
      if (c[i] >= 3) { c[i] -= 3; rec(i, melds + 1, partials, hasPair); c[i] += 3; }
      if (!isHonor(i) && rankOf(i) <= 7 && c[i + 1] > 0 && c[i + 2] > 0) {
        c[i]--; c[i + 1]--; c[i + 2]--; rec(i, melds + 1, partials, hasPair); c[i]++; c[i + 1]++; c[i + 2]++;
      }
      if (c[i] >= 2) { c[i] -= 2; rec(i, melds, partials + 1, hasPair); c[i] += 2; } // pair as partial toward triplet
      if (!isHonor(i) && rankOf(i) <= 8 && c[i + 1] > 0) { c[i]--; c[i + 1]--; rec(i, melds, partials + 1, hasPair); c[i]++; c[i + 1]++; }
      if (!isHonor(i) && rankOf(i) <= 7 && c[i + 2] > 0) { c[i]--; c[i + 2]--; rec(i, melds, partials + 1, hasPair); c[i]++; c[i + 2]++; }
    }
    if (!hasPair && c[i] >= 2) { c[i] -= 2; rec(i, melds, partials, true); c[i] += 2; } // the designated pair
    c[i]--; rec(i, melds, partials, hasPair); c[i]++; // discard one isolated copy
  };
  rec(0, 0, 0, false);
  return best;
}

function sevenPairsShanten(c: Counts): number {
  let pairs = 0, kinds = 0;
  for (let k = 0; k < KINDS; k++) { if (c[k] >= 2) pairs++; if (c[k] >= 1) kinds++; }
  return 6 - pairs + Math.max(0, 7 - kinds);
}

export function shanten(tiles: number[]): number {
  const c = toCounts(tiles);
  const total = tiles.length;
  const st = standardShanten(c.slice());
  // chiitoitsu only meaningful for 13/14-tile closed hands
  const sp = total >= 13 ? sevenPairsShanten(c) : 99;
  return Math.min(st, sp);
}

export function isTenpai(tiles13: number[]): boolean {
  // tenpai if some tile completes the hand
  if (tiles13.length !== 13) return shanten(tiles13) <= 0;
  for (let k = 0; k < KINDS; k++) {
    if (isWinningHand([...tiles13, k])) return true;
  }
  return false;
}

// ── AI ────────────────────────────────────────────────────────────────────
export type AiLevel = 1 | 2 | 3;

// How disposable is `tile` within `hand` — higher = safer to discard.
// Isolated honors/terminals score highest; tiles in pairs/near-runs score low.
function disposability(hand: number[], tile: number): number {
  const c = toCounts(hand);
  let connected = c[tile] - 1; // other copies of the same tile
  if (!isHonor(tile)) {
    const r = rankOf(tile);
    for (const d of [-2, -1, 1, 2]) {
      const nr = r + d;
      if (nr >= 1 && nr <= 9) connected += c[tile + d] > 0 ? (Math.abs(d) === 1 ? 1.5 : 0.8) : 0;
    }
  }
  const junk = isTerminalOrHonor(tile) ? 0.6 : 0;
  return -connected + junk; // fewer connections + terminal/honor → more disposable
}

// Choose a tile to discard from a 14-tile hand. Prefers a discard that keeps the
// hand tenpai/most complete; falls back to discarding the most isolated tile.
export function aiDiscard(hand14: number[], level: AiLevel, rng: () => number = Math.random): number {
  const distinct = Array.from(new Set(hand14));
  if (level === 1 && rng() < 0.5) return distinct[Math.floor(rng() * distinct.length)];

  // 1) Keep tenpai if we can.
  const tenpaiKeeps: number[] = [];
  let bestSh = 99;
  const shByTile = new Map<number, number>();
  for (const tile of distinct) {
    const rest = hand14.slice(); rest.splice(rest.indexOf(tile), 1);
    if (isTenpai13(rest)) tenpaiKeeps.push(tile);
    const sh = shanten(rest); shByTile.set(tile, sh);
    if (sh < bestSh) bestSh = sh;
  }
  const pool = tenpaiKeeps.length ? tenpaiKeeps
    : distinct.filter((tile) => shByTile.get(tile) === bestSh);

  // 2) Among the best-shanten discards, throw the most disposable tile.
  let best = pool[0], bestDisp = -Infinity;
  for (const tile of pool) {
    const d = disposability(hand14, tile) + (level >= 3 ? rng() * 0.1 : rng() * 0.4);
    if (d > bestDisp) { bestDisp = d; best = tile; }
  }
  return best;
}

// tenpai check for an arbitrary-length closed hand (13 tiles here)
function isTenpai13(tiles: number[]): boolean {
  for (let k = 0; k < KINDS; k++) {
    const c = toCounts(tiles);
    if (c[k] >= 4) continue; // can't draw a 5th
    if (isWinningHand([...tiles, k])) return true;
  }
  return false;
}
