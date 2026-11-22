/**
 * Yut Nori (윷놀이) — the traditional Korean New Year board game (2026-11-22, before 설 2027-02-07).
 *
 * Spread hook (studio lens): play with family on one phone at 설 + "beat the 10 AI masters".
 *
 * Board: 29 stations. Outer ring 0..19 counter-clockwise from 참먹이 (0, bottom-right):
 *   0 → 1..4 (right side, up) → 5 (top-right corner, 모) → 6..9 (top, left) → 10 (top-left, 뒷모)
 *   → 11..14 (left, down) → 15 (bottom-left, 찌모) → 16..19 (bottom, right) → back to 0.
 * Diagonals: 5 → 21 → 22 → 23 (방, centre) → 24 → 25 → 15, and 10 → 26 → 27 → 23 → 28 → 29 → 0.
 * A piece that *starts* its move on 5, 10 or the centre takes the short cut.
 *
 * Throws (4 sticks, a flat face lands up with p = 0.6): 도 1, 개 2, 걸 3, 윷 4, 모 5, 빽도 −1
 * (도 where the marked stick is the flat one). 윷·모 and every capture earn another throw.
 * Own pieces on one station stack (업기) and move together; landing on rivals sends them home (잡기).
 * A piece must pass 참먹이 to finish (landing exactly on it waits there). First to bring all 4 home wins.
 */

export const YUT_SLUG = "yut-nori";
export const PIECES = 4;
export const AI_LEVELS = 10;
export const HOME = -1;
export const DONE = 99;
export const CENTER = 23;

export type Throw = "backdo" | "do" | "gae" | "geol" | "yut" | "mo";
export const THROW_STEPS: Record<Throw, number> = { backdo: -1, do: 1, gae: 2, geol: 3, yut: 4, mo: 5 };
export const BONUS_THROWS: Throw[] = ["yut", "mo"];

/** Exact probabilities with p(flat up) = 0.6 and one marked stick. */
export const THROW_ODDS: Record<Throw, number> = (() => {
  const p = 0.6;
  const q = 0.4;
  const one = 4 * p * q ** 3;
  return { backdo: one / 4, do: (one * 3) / 4, gae: 6 * p ** 2 * q ** 2, geol: 4 * p ** 3 * q, yut: p ** 4, mo: q ** 4 };
})();

export function throwFrom(r: number): Throw {
  let acc = 0;
  for (const t of ["backdo", "do", "gae", "geol", "yut", "mo"] as Throw[]) {
    acc += THROW_ODDS[t];
    if (r < acc) return t;
  }
  return "mo";
}

/** Station coordinates on a 0..1 square (for drawing and tests). */
export function stationXY(s: number): { x: number; y: number } {
  const side = (i: number) => i / 5;
  if (s >= 0 && s <= 5) return { x: 1, y: 1 - side(s) };
  if (s > 5 && s <= 10) return { x: 1 - side(s - 5), y: 0 };
  if (s > 10 && s <= 15) return { x: 0, y: side(s - 10) };
  if (s > 15 && s < 20) return { x: side(s - 15), y: 1 };
  const diag: Record<number, [number, number]> = {
    21: [5 / 6, 1 / 6], 22: [4 / 6, 2 / 6], 23: [0.5, 0.5], 24: [2 / 6, 4 / 6], 25: [1 / 6, 5 / 6],
    26: [1 / 6, 1 / 6], 27: [2 / 6, 2 / 6], 28: [4 / 6, 4 / 6], 29: [5 / 6, 5 / 6],
  };
  const [x, y] = diag[s];
  return { x, y };
}
export const STATIONS = [...Array.from({ length: 20 }, (_, i) => i), 21, 22, 23, 24, 25, 26, 27, 28, 29];

export interface Piece {
  pos: number; // HOME, a station, or DONE
  /** stations visited this lap (for 빽도 and the centre direction) */
  trail: number[];
  /** true once the piece has gone round (so 0 means 참먹이 waiting, not start) */
  lapped: boolean;
}

export interface YutState {
  players: 2;
  pieces: Piece[][]; // [player][piece]
  turn: number;
  /** results thrown this turn and not yet used */
  pending: Throw[];
  /** throws still owed this turn (1 at turn start, +1 per 윷/모/capture) */
  throwsLeft: number;
  winner: number | null;
  lastCapture: number;
  log: { player: number; text: string }[];
}

export function createState(): YutState {
  return {
    players: 2,
    pieces: [0, 1].map(() => Array.from({ length: PIECES }, () => ({ pos: HOME, trail: [], lapped: false }))),
    turn: 0,
    pending: [],
    throwsLeft: 1,
    winner: null,
    lastCapture: 0,
    log: [],
  };
}

export function cloneState(s: YutState): YutState {
  return {
    ...s,
    pieces: s.pieces.map((ps) => ps.map((p) => ({ pos: p.pos, trail: [...p.trail], lapped: p.lapped }))),
    pending: [...s.pending],
    log: s.log.slice(-6),
  };
}

/** One forward step from `pos`; `first` = the first step of this move, `prev` = station before pos. */
function stepForward(pos: number, first: boolean, prev: number | undefined): number {
  if (pos === HOME) return 1;
  if (first && pos === 5) return 21;
  if (first && pos === 10) return 26;
  if (first && pos === CENTER) return 28;
  switch (pos) {
    case 19: return 0;
    case 21: return 22;
    case 22: return CENTER;
    case CENTER: return prev === 27 ? 28 : 24;
    case 24: return 25;
    case 25: return 15;
    case 26: return 27;
    case 27: return CENTER;
    case 28: return 29;
    case 29: return 0;
    default: return pos + 1;
  }
}

/**
 * Where a piece ends after `t` (DONE when it passes 참먹이), with its new trail.
 * Returns null when the move is not allowed (빽도 for a piece at home).
 */
export function destination(p: Piece, t: Throw): { pos: number; trail: number[]; lapped: boolean; path: number[] } | null {
  const n = THROW_STEPS[t];
  if (p.pos === DONE) return null;
  if (n < 0) {
    if (p.pos === HOME) return null;
    const trail = [...p.trail];
    trail.pop();
    const back = trail.length ? trail[trail.length - 1] : 0;
    // backing off the first station lands on 참먹이; it finishes with its next forward move
    return { pos: back, trail: trail.length ? trail : [0], lapped: p.lapped || back === 0, path: [back] };
  }
  let pos = p.pos;
  const trail = [...p.trail];
  let lapped = p.lapped;
  const path: number[] = [];
  for (let i = 0; i < n; i++) {
    if (pos === 0 && (lapped || (p.pos === 0 && i === 0))) return { pos: DONE, trail: [], lapped: true, path: [...path, DONE] };
    const prev = trail.length > 1 ? trail[trail.length - 2] : undefined;
    pos = stepForward(pos, i === 0, pos === p.pos && i === 0 ? undefined : prev);
    trail.push(pos);
    path.push(pos);
    if (pos === 0) lapped = true;
  }
  return { pos, trail, lapped, path };
}

export function stackAt(s: YutState, player: number, pos: number): number[] {
  if (pos === HOME || pos === DONE) return [];
  return s.pieces[player].map((p, i) => (p.pos === pos ? i : -1)).filter((i) => i >= 0);
}

export interface Move {
  throwIndex: number; // index into pending
  piece: number; // representative piece (its whole stack moves)
}

/** Legal moves for the current player with the pending throws (one representative per stack / home). */
export function legalMoves(s: YutState): Move[] {
  if (s.winner !== null) return [];
  const me = s.turn;
  const moves: Move[] = [];
  s.pending.forEach((t, throwIndex) => {
    const seen = new Set<string>();
    s.pieces[me].forEach((p, i) => {
      const key = p.pos === HOME ? "home" : String(p.pos);
      if (p.pos === DONE || seen.has(key)) return;
      if (!destination(p, t)) return;
      seen.add(key);
      moves.push({ throwIndex, piece: i });
    });
  });
  return moves;
}

export function canThrow(s: YutState): boolean {
  return s.winner === null && s.throwsLeft > 0;
}

export function applyThrow(s: YutState, t: Throw): YutState {
  const n = cloneState(s);
  if (!canThrow(n)) return n;
  n.throwsLeft -= 1;
  n.pending.push(t);
  if (BONUS_THROWS.includes(t)) n.throwsLeft += 1;
  return endIfStuck(n);
}

/** Ends the turn when nothing can be thrown and no pending result can be used. */
function endIfStuck(n: YutState): YutState {
  if (n.winner !== null) return n;
  if (n.throwsLeft > 0) return n;
  if (n.pending.length && legalMoves(n).length) return n;
  n.pending = [];
  n.turn = (n.turn + 1) % n.players;
  n.throwsLeft = 1;
  return n;
}

export function applyMove(s: YutState, m: Move): YutState {
  const n = cloneState(s);
  const me = n.turn;
  const t = n.pending[m.throwIndex];
  const lead = n.pieces[me][m.piece];
  const dest = t ? destination(lead, t) : null;
  if (!t || !dest) return n;
  const group = lead.pos === HOME ? [m.piece] : stackAt(n, me, lead.pos);
  for (const i of group) n.pieces[me][i] = { pos: dest.pos, trail: [...dest.trail], lapped: dest.lapped };
  n.pending.splice(m.throwIndex, 1);
  if (dest.pos !== DONE) {
    for (let o = 0; o < n.players; o++) {
      if (o === me) continue;
      const hit = stackAt(n, o, dest.pos);
      if (hit.length) {
        for (const i of hit) n.pieces[o][i] = { pos: HOME, trail: [], lapped: false };
        n.throwsLeft += 1;
        n.lastCapture += 1;
        n.log.push({ player: me, text: `capture:${hit.length}` });
      }
    }
  }
  if (n.pieces[me].every((p) => p.pos === DONE)) {
    n.winner = me;
    n.pending = [];
    n.throwsLeft = 0;
    return n;
  }
  return endIfStuck(n);
}

/* ---------------- AI ---------------- */

function progress(p: Piece): number {
  if (p.pos === DONE) return 40;
  if (p.pos === HOME) return 0;
  if (p.pos === 0 && p.lapped) return 30;
  // remaining steps to finish along the shortest route from here
  return 31 - remaining(p);
}

/** Steps still needed to pass 참먹이, walking one 도 at a time (which takes every corner short cut). */
export function remaining(p: Piece): number {
  if (p.pos === DONE) return 0;
  let cur: Piece = { pos: p.pos, trail: [...p.trail], lapped: p.lapped };
  for (let k = 1; k <= 40; k++) {
    const d = destination(cur, "do");
    if (!d) break;
    if (d.pos === DONE) return k;
    cur = { pos: d.pos, trail: d.trail, lapped: d.lapped };
  }
  return 40;
}

/** Danger: how likely rivals can land on `pos` next turn (sum of throw odds over rival pieces behind it). */
function danger(s: YutState, me: number, pos: number): number {
  if (pos === HOME || pos === DONE) return 0;
  let risk = 0;
  for (let o = 0; o < s.players; o++) {
    if (o === me) continue;
    const seen = new Set<number>();
    for (const rp of s.pieces[o]) {
      if (rp.pos === DONE || seen.has(rp.pos)) continue;
      seen.add(rp.pos);
      for (const t of Object.keys(THROW_ODDS) as Throw[]) {
        const d = destination(rp, t);
        if (d && d.pos === pos) risk += THROW_ODDS[t];
      }
    }
  }
  return Math.min(1, risk);
}

export function evaluate(s: YutState, me: number): number {
  if (s.winner === me) return 10_000;
  if (s.winner !== null) return -10_000;
  let score = 0;
  for (let o = 0; o < s.players; o++) {
    const sign = o === me ? 1 : -1;
    for (const p of s.pieces[o]) {
      score += sign * progress(p) * 3;
      if (o === me && p.pos !== HOME && p.pos !== DONE) score -= danger(s, me, p.pos) * (progress(p) * 2 + 10);
    }
  }
  // 업기: a stack is strong but also a big target; small bonus
  return score;
}

function rng(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x = (x + 0x6d2b79f5) >>> 0;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * AI move for level 1..10. Level 1 plays almost at random; level 10 evaluates each move,
 * including extra throws from captures, and never blunders a free capture.
 */
export function aiMove(s: YutState, level: number, seed = 1): Move | null {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  const r = rng(seed * 977 + s.log.length * 31 + s.pending.length);
  const lv = Math.max(1, Math.min(AI_LEVELS, Math.round(level)));
  if (r() < 0.75 - lv * 0.075) return moves[Math.floor(r() * moves.length)];
  const me = s.turn;
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const m of moves) {
    const n = applyMove(s, m);
    let v = evaluate(n, me);
    if (n.lastCapture > s.lastCapture) v += 25 + lv * 4;
    // later levels prefer using big throws on pieces that reach a corner short cut
    const lead = n.pieces[me][m.piece];
    if (lv >= 5 && (lead.pos === 5 || lead.pos === 10 || lead.pos === CENTER)) v += 6;
    v += (r() - 0.5) * (22 - lv * 2.2);
    if (v > bestScore) {
      bestScore = v;
      best = m;
    }
  }
  return best;
}

/** Plays a whole game between two AI levels (tests and balance checks). */
export function simulate(levelA: number, levelB: number, seed: number, maxPlies = 2000): YutState {
  let s = createState();
  const r = rng(seed);
  for (let ply = 0; ply < maxPlies && s.winner === null; ply++) {
    if (s.pending.length && legalMoves(s).length && (s.throwsLeft === 0 || r() < 0.5)) {
      const m = aiMove(s, s.turn === 0 ? levelA : levelB, seed + ply);
      if (m) s = applyMove(s, m);
    } else if (canThrow(s)) s = applyThrow(s, throwFrom(r()));
  }
  return s;
}
