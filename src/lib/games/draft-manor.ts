/**
 * Draft Manor (방 뽑기 저택) — an OIYO original room-drafting puzzle roguelite (2026-11-24).
 *
 * The manor is a grid of empty plots. You start in the entrance hall at the bottom and must reach the vault at
 * the top before your steps run out. Every time you walk through a door into an empty plot, you are offered
 * three room cards and choose one: it is built there, turned so its back door meets yours. Rooms differ in their
 * doors (straight on, left, right) and some hold something: a pantry gives back steps, a key room a key, and the
 * vault opens only with the stage's number of keys. Walking between rooms you have built costs a step too, so the
 * shape you draft is the route you will have to walk.
 *
 * Pure and deterministic: every manor and its deck of room cards are seeded per stage (or per day).
 */

export const MANOR_SLUG = "draft-manor";
export const STAGE_COUNT = 30;

export type Effect = "none" | "pantry" | "key";
/** A room card: exits relative to the door you came in by (forward, left, right), and what it holds. */
export interface Card { f: boolean; l: boolean; r: boolean; effect: Effect; gain: number }
export interface ManorStage {
  stage: number;
  cols: number;
  rows: number;
  steps: number; // steps at the start
  keys: number; // keys the vault needs
  deck: Card[];
  par: number; // steps left by a careful drafter
}

export const HALL: Card = { f: true, l: false, r: false, effect: "none", gain: 0 };
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export interface Room { doors: number; effect: Effect; gain: number; used: boolean }

export interface Manor {
  stage: ManorStage;
  rooms: Array<Room | null>; // per cell
  at: number;
  steps: number;
  keys: number;
  drawn: number; // cards drawn from the deck
  offer: { cell: number; dir: number; cards: Card[] } | null; // a draft waiting for a pick
  knocks: number; // walls knocked through
  over: boolean;
  won: boolean;
}

export const cellOf = (st: ManorStage, c: number, r: number) => r * st.cols + c;
export const colOf = (st: ManorStage, i: number) => i % st.cols;
export const rowOf = (st: ManorStage, i: number) => Math.floor(i / st.cols);
export const entrance = (st: ManorStage) => cellOf(st, Math.floor(st.cols / 2), st.rows - 1);
export const vault = (st: ManorStage) => cellOf(st, Math.floor(st.cols / 2), 0);

/** The neighbour of a cell through a side, or −1 off the grid. */
export function next(st: ManorStage, i: number, dir: number): number {
  const c = colOf(st, i) + DX[dir];
  const r = rowOf(st, i) + DY[dir];
  return c < 0 || r < 0 || c >= st.cols || r >= st.rows ? -1 : cellOf(st, c, r);
}

/** The doors (bitmask of sides) of a card built by coming in through side `dir` (the direction of travel). */
export function doorsOf(card: Card, dir: number): number {
  let m = 1 << ((dir + 2) % 4); // the back door
  if (card.f) m |= 1 << dir;
  if (card.l) m |= 1 << ((dir + 3) % 4);
  if (card.r) m |= 1 << ((dir + 1) % 4);
  return m;
}

export function newManor(stage: ManorStage): Manor {
  const rooms: Array<Room | null> = new Array(stage.cols * stage.rows).fill(null);
  rooms[entrance(stage)] = { doors: 1 | 2 | 8, effect: "none", gain: 0, used: true };
  rooms[vault(stage)] = { doors: 15, effect: "none", gain: 0, used: true };
  return { stage, rooms, at: entrance(stage), steps: stage.steps, keys: 0, drawn: 0, offer: null, knocks: 0, over: false, won: false };
}

const hasDoor = (room: Room | null, dir: number) => Boolean(room && room.doors & (1 << dir));
/** Whether you can walk between two built rooms: a door on either side of the shared wall will do. */
const passage = (m: Manor, i: number, dir: number, j: number) => Boolean(m.rooms[j]) && (hasDoor(m.rooms[i], dir) || hasDoor(m.rooms[j], (dir + 2) % 4));

export type MoveResult = "moved" | "draft" | "locked" | "wall" | null;
/** Extra steps it takes to knock through a wall where there is no door. */
export const KNOCK = 3;

/** Tries to walk from the current room through side `dir`. */
export function move(m: Manor, dir: number): MoveResult {
  if (m.over || m.offer) return null;
  const st = m.stage;
  const here = m.rooms[m.at];
  const to = next(st, m.at, dir);
  if (to < 0) return "wall";
  const there = m.rooms[to];
  // a door on either side of a shared wall lets you through between built rooms (the vault has doors all round)
  if (there && !hasDoor(here, dir) && !hasDoor(there, (dir + 2) % 4)) return "wall";
  if (to === vault(st)) {
    if (m.keys < st.keys) return "locked";
    step(m, to);
    if (!m.over) {
      m.over = true;
      m.won = true;
    }
    return "moved";
  }
  if (there) {
    step(m, to);
    return "moved";
  }
  if (m.drawn + 3 > st.deck.length) return "wall"; // the deck is spent: no more building
  // no door that way: knock a way through the wall, for a few steps more
  if (!hasDoor(here, dir)) {
    if (m.steps <= KNOCK + 1) return "wall";
    m.steps -= KNOCK;
    m.knocks++;
  }
  const cards = st.deck.slice(m.drawn, m.drawn + 3);
  // an offer always holds at least one room with a way on: the last card becomes a plain hall if none does
  if (!cards.some((c) => c.f || c.l || c.r)) cards[2] = HALL;
  m.offer = { cell: to, dir, cards };
  m.drawn += 3;
  return "draft";
}

function step(m: Manor, to: number): void {
  m.at = to;
  m.steps--;
  const room = m.rooms[to]!;
  if (!room.used) {
    room.used = true;
    if (room.effect === "pantry") m.steps += room.gain;
    if (room.effect === "key") m.keys++;
  }
  if (m.steps <= 0 && to !== vault(m.stage)) {
    m.over = true;
    return;
  }
  if (!m.over && to !== vault(m.stage) && !canGoOn(m)) m.over = true;
}

/** Builds the chosen card from the waiting draft and walks into it. */
export function pick(m: Manor, k: number): boolean {
  if (m.over || !m.offer || k < 0 || k >= m.offer.cards.length) return false;
  const { cell, dir, cards } = m.offer;
  const card = cards[k];
  m.rooms[cell] = { doors: doorsOf(card, dir), effect: card.effect, gain: card.gain, used: false };
  m.offer = null;
  step(m, cell);
  return true;
}

/** Steps from the current room to every room reachable through built doors. */
export function distances(m: Manor): number[] {
  const st = m.stage;
  const d = new Array(st.cols * st.rows).fill(Infinity);
  d[m.at] = 0;
  const q = [m.at];
  while (q.length) {
    const i = q.shift()!;
    if (i === vault(st)) continue;
    for (let dir = 0; dir < 4; dir++) {
      const j = next(st, i, dir);
      if (j < 0 || j === vault(st) || !passage(m, i, dir, j)) continue;
      if (d[j] > d[i] + 1) {
        d[j] = d[i] + 1;
        q.push(j);
      }
    }
  }
  return d;
}

/** Every way on to an empty plot (through a door, or knocking through a wall) or into the vault, with its steps. */
export function frontier(m: Manor): Array<{ room: number; dir: number; to: number; cost: number }> {
  const st = m.stage;
  const d = distances(m);
  const out: Array<{ room: number; dir: number; to: number; cost: number }> = [];
  for (let i = 0; i < d.length; i++) {
    if (!Number.isFinite(d[i]) || i === vault(st)) continue;
    for (let dir = 0; dir < 4; dir++) {
      const j = next(st, i, dir);
      if (j < 0) continue;
      const door = hasDoor(m.rooms[i], dir);
      if (j === vault(st)) out.push({ room: i, dir, to: j, cost: d[i] + 1 });
      else if (!m.rooms[j]) out.push({ room: i, dir, to: j, cost: d[i] + 1 + (door ? 0 : KNOCK) });
    }
  }
  return out;
}

/** Whether there is anything left to explore within reach (and enough cards to draft it). */
export function canGoOn(m: Manor): boolean {
  return frontier(m).some((f) => (f.to === vault(m.stage) ? m.keys >= m.stage.keys : m.drawn + 3 <= m.stage.deck.length) && f.cost <= m.steps);
}

/** The route (sides to walk) from the current room to a room, through built doors. */
export function route(m: Manor, target: number): number[] {
  const st = m.stage;
  const prev = new Map<number, [number, number]>();
  const seen = new Set([m.at]);
  const q = [m.at];
  while (q.length) {
    const i = q.shift()!;
    if (i === target) break;
    for (let dir = 0; dir < 4; dir++) {
      const j = next(st, i, dir);
      if (j < 0 || seen.has(j) || j === vault(st) || !passage(m, i, dir, j)) continue;
      seen.add(j);
      prev.set(j, [i, dir]);
      q.push(j);
    }
  }
  const path: number[] = [];
  let i = target;
  while (i !== m.at) {
    const p = prev.get(i);
    if (!p) return [];
    path.unshift(p[1]);
    i = p[0];
  }
  return path;
}

export function starsFor(m: Manor): number {
  if (!m.won) return 0;
  if (m.steps >= m.stage.par) return 3;
  if (m.steps >= Math.ceil(m.stage.par / 2)) return 2;
  return 1;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates, the only shuffle used here. */
function shuffle<T>(xs: T[], rng: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const manhattan = (st: ManorStage, a: number, b: number) => Math.abs(colOf(st, a) - colOf(st, b)) + Math.abs(rowOf(st, a) - rowOf(st, b));

/** How promising a plot is: the steps it would still take to the vault from there (as the crow walks). */
function plotValue(m: Manor, cell: number): number {
  return manhattan(m.stage, cell, vault(m.stage));
}

/** Scores a card for a draft: lower is better. */
function cardScore(m: Manor, card: Card, cell: number, dir: number): number {
  const st = m.stage;
  const doors = doorsOf(card, dir);
  let best = Infinity;
  let open = 0;
  for (let d = 0; d < 4; d++) {
    if (d === (dir + 2) % 4 || !(doors & (1 << d))) continue;
    const j = next(st, cell, d);
    if (j < 0) continue;
    if (j === vault(st)) {
      best = Math.min(best, m.keys + (card.effect === "key" ? 1 : 0) >= st.keys ? -1 : 1);
      open++;
    } else if (!m.rooms[j]) {
      best = Math.min(best, plotValue(m, j));
      open++;
    }
  }
  let score = Number.isFinite(best) ? best : 20;
  score -= Math.min(open, 2) * 0.3;
  // never seal the manor off: count the other ways on that are still open
  const others = frontier(m).filter((f) => f.to !== cell).length;
  if (others + open === 0) score += 40;
  else if (others + open === 1) score += 6;
  const needKey = m.keys < st.keys;
  if (card.effect === "key" && needKey) score -= 6;
  if (card.effect === "pantry") score -= m.steps < 8 ? card.gain * 0.8 : card.gain * 0.25;
  return score;
}

export interface DrafterOpts {
  /** chance to take a worse card or door than the best seen */
  slip?: number;
  /** how many cards of an offer the drafter actually weighs (a hasty one reads only the first) */
  look?: number;
  seed?: number;
  /** "plan" drafts toward the vault; "random" picks doors and cards at random */
  mode?: "plan" | "random";
}

/** Plays a whole manor with these habits; returns the finished manor. */
export function pilot(stage: ManorStage, opts: DrafterOpts = {}): Manor {
  const { slip = 0, look = 3, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 4241 + 17);
  const m = newManor(stage);
  let guard = 0;
  while (!m.over && guard++ < 500) {
    if (m.offer) {
      const offer = m.offer;
      let k: number;
      if (mode === "random") k = Math.floor(rng() * offer.cards.length);
      else {
        const seen = offer.cards.slice(0, Math.max(1, look)).map((c, i) => ({ i, s: cardScore(m, c, offer.cell, offer.dir) }));
        seen.sort((a, b) => a.s - b.s);
        k = seen.length > 1 && rng() < slip ? seen[1].i : seen[0].i;
      }
      pick(m, k);
      continue;
    }
    const fr = frontier(m).filter((f) => (f.to === vault(stage) ? m.keys >= stage.keys : true) && f.cost <= m.steps);
    if (!fr.length) break;
    let target: { room: number; dir: number; to: number; cost: number };
    if (mode === "random") target = fr[Math.floor(rng() * fr.length)];
    else {
      const scored = fr.map((f) => ({ f, s: f.to === vault(stage) ? -100 : f.cost * 1.2 + plotValue(m, f.to) * 1.0 }));
      scored.sort((a, b) => a.s - b.s);
      target = (scored.length > 1 && rng() < slip ? scored[1] : scored[0]).f;
    }
    for (const dir of route(m, target.room)) move(m, dir);
    if (!m.over) move(m, target.dir);
  }
  if (!m.over) m.over = true;
  return m;
}

function shape(stage: number) {
  return {
    cols: stage < 10 ? 5 : 7,
    rows: 6 + Math.floor(stage / 6),
    keys: stage < 4 ? 0 : stage < 14 ? 1 : stage < 24 ? 2 : 3,
    deadEnds: Math.min(0.24, 0.1 + stage * 0.005), // share of plain dead ends in the deck
    pantries: Math.max(0.06, 0.14 - stage * 0.003),
  };
}

function deckFor(stage: number, seed: number): Card[] {
  const sh = shape(stage);
  const rng = mulberry(seed);
  const cards: Card[] = [];
  const n = 150;
  const keyCards = sh.keys * 3 + 1;
  for (let k = 0; k < n; k++) {
    const u = rng();
    let card: Card;
    if (k < keyCards) card = rng() < 0.5 ? { f: false, l: true, r: false, effect: "key", gain: 0 } : { f: false, l: false, r: true, effect: "key", gain: 0 };
    else if (u < sh.pantries) card = { f: rng() < 0.4, l: false, r: false, effect: "pantry", gain: 3 + Math.floor(rng() * 3) };
    else if (u < sh.pantries + sh.deadEnds) card = { f: false, l: false, r: false, effect: "none", gain: 0 };
    else {
      const v = rng();
      card = v < 0.3 ? { f: true, l: false, r: false, effect: "none", gain: 0 }
        : v < 0.5 ? { f: false, l: true, r: false, effect: "none", gain: 0 }
        : v < 0.7 ? { f: false, l: false, r: true, effect: "none", gain: 0 }
        : v < 0.8 ? { f: false, l: true, r: true, effect: "none", gain: 0 }
        : v < 0.88 ? { f: true, l: true, r: false, effect: "none", gain: 0 }
        : v < 0.96 ? { f: true, l: false, r: true, effect: "none", gain: 0 }
        : { f: true, l: true, r: true, effect: "none", gain: 0 };
    }
    cards.push(card);
  }
  return shuffle(cards, rng);
}

/** Human-like drafters used to set the steps: they weigh all three cards but slip now and then. */
export const HUMAN_DRAFTERS: DrafterOpts[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => ({ slip: 0.15, seed }));

export function layout(stage: number, seed: number): ManorStage {
  const sh = shape(stage);
  return { stage, cols: sh.cols, rows: sh.rows, steps: 999, keys: sh.keys, deck: deckFor(stage, seed), par: 0 };
}

/** Lays a manor out and sets its steps from human-like drafters, re-rolling the deck until it is fair. */
export function buildStage(stage: number, seedBase = 171000): ManorStage {
  let fallback: ManorStage | null = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const st = layout(stage, seedBase + stage * 131 + attempt * 7919);
    const used = HUMAN_DRAFTERS.map((o) => {
      const m = pilot(st, o);
      return m.won ? st.steps - m.steps : Infinity;
    }).sort((a, b) => a - b);
    if (!Number.isFinite(used[8])) continue; // most human-like drafters must get there at all
    // enough steps for most of them, with a little to spare
    st.steps = used[8] + 2;
    const careful = pilot(st);
    if (!careful.won) continue;
    st.par = Math.max(1, careful.steps - 1);
    const randomWins = [1, 2, 3, 4].filter((seed) => pilot(st, { mode: "random", seed }).won).length;
    if (randomWins > 0) {
      fallback = fallback ?? st;
      continue;
    }
    return st;
  }
  if (fallback) return fallback;
  throw new Error(`draft-manor stage ${stage + 1}: no fair manor`);
}

/** Today's manor: everyone playing on the same date gets the same deck (a mid-game shape). */
export function dailyStage(dayKey: string): ManorStage {
  let h = 2166136261;
  for (const ch of dayKey) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return { ...buildStage(14, h % 100000), stage: 14 };
}

export const MANOR_STAGES: ManorStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
