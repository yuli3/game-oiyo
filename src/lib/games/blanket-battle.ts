/**
 * Blanket Battle (돗자리 쟁탈전) — an OIYO original three-lane card battle (2026-11-25).
 *
 * Three picnic blankets, six turns, and a rival picnic across the field. Each turn you get one more acorn of energy
 * (one on turn 1, six on turn 6). The rival lays its critter cards first, face up; then you answer, playing yours onto
 * the blankets on your side, and they are revealed when you end the turn. After turn six, the side with more power on a blanket
 * holds it — hold two of the three and the picnic is yours. Blankets have quirks: a sunny one gives every card there
 * +1, ants take 1 from every card there, and a small one holds only two cards a side.
 *
 * Pure and deterministic: your deck, the rival's deck and plan, and the blankets are seeded per stage.
 */

export const BLANKET_SLUG = "blanket-battle";
export const STAGE_COUNT = 30;
export const TURNS = 6;
export const LANES = 3;
export const HAND_START = 3;
export const MAX_HAND = 7;
export const CAPACITY = 4;

export type LaneKind = "plain" | "sunny" | "ants" | "small";
export const LANE_KINDS: LaneKind[] = ["plain", "sunny", "ants", "small"];

export interface CardSpec { cost: number; power: number }
/** ant, snail, sparrow, rabbit, hedgehog, owl, fox, bear, deer */
export const CARDS: CardSpec[] = [
  { cost: 1, power: 2 }, // ant
  { cost: 1, power: 1 }, // snail: on reveal, +1 to every other card of yours on this blanket
  { cost: 2, power: 2 }, // sparrow: on reveal, +1 for each other card of yours already here
  { cost: 2, power: 3 }, // rabbit
  { cost: 3, power: 4 }, // hedgehog: on reveal, −1 to every rival card on this blanket
  { cost: 3, power: 3 }, // owl: +3 while it is your only card on this blanket
  { cost: 4, power: 6 }, // fox
  { cost: 5, power: 8 }, // bear
  { cost: 6, power: 11 }, // deer
];
export const CARD_NAMES = ["ant", "snail", "sparrow", "rabbit", "hedgehog", "owl", "fox", "bear", "deer"] as const;
const SNAIL = 1;
const SPARROW = 2;
const HEDGEHOG = 4;
const OWL = 5;

export interface Placed { card: number; bonus: number }
export interface BlanketStage {
  stage: number;
  lanes: LaneKind[];
  deck: number[]; // your draw order
  rivalDeck: number[];
  rivalSkill: number; // 0..1: how often the rival picks its blanket with care rather than at random
  rivalSeed: number;
}

export interface Match {
  stage: BlanketStage;
  turn: number; // 1..TURNS
  hand: number[];
  drawn: number; // cards taken from the deck
  board: [Placed[][], Placed[][]]; // [side][lane]
  staged: Array<{ card: number; lane: number; from: number }>; // your plays this turn, not yet revealed
  rivalHand: number[];
  rivalDrawn: number;
  rivalRng: number;
  rivalLast: Array<{ card: number; lane: number }>; // what the rival laid this turn
  over: boolean;
  won: boolean;
}

function rngStep(state: number): [number, number] {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [a, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
}

export function newMatch(stage: BlanketStage): Match {
  const m: Match = {
    stage, turn: 1, hand: stage.deck.slice(0, HAND_START), drawn: HAND_START, board: [[[], [], []], [[], [], []]], staged: [],
    rivalHand: stage.rivalDeck.slice(0, HAND_START), rivalDrawn: HAND_START, rivalRng: stage.rivalSeed >>> 0, over: false, won: false, rivalLast: [],
  };
  draw(m);
  rivalTurn(m);
  return m;
}

/** The rival lays this turn's cards face up. */
function rivalTurn(m: Match): void {
  const plan = rivalPlan(m);
  for (const p of plan) {
    reveal(m, 1, p.card, p.lane);
    m.rivalHand.splice(m.rivalHand.indexOf(p.card), 1);
  }
  m.rivalLast = plan;
}

function draw(m: Match): void {
  if (m.hand.length < MAX_HAND && m.drawn < m.stage.deck.length) m.hand.push(m.stage.deck[m.drawn++]);
  if (m.rivalHand.length < MAX_HAND && m.rivalDrawn < m.stage.rivalDeck.length) m.rivalHand.push(m.stage.rivalDeck[m.rivalDrawn++]);
}

export const capacity = (st: BlanketStage, lane: number) => (st.lanes[lane] === "small" ? 2 : CAPACITY);
export const energy = (m: Match) => m.turn;
export const spent = (m: Match) => m.staged.reduce((s, p) => s + CARDS[p.card].cost, 0);

/** A card's power where it lies now. */
export function cardPower(m: Match, side: number, lane: number, k: number): number {
  const p = m.board[side][lane][k];
  let v = CARDS[p.card].power + p.bonus;
  const kind = m.stage.lanes[lane];
  if (kind === "sunny") v += 1;
  if (kind === "ants") v -= 1;
  if (p.card === OWL && m.board[side][lane].length === 1) v += 3;
  return Math.max(0, v);
}

export function lanePower(m: Match, side: number, lane: number): number {
  let s = 0;
  for (let k = 0; k < m.board[side][lane].length; k++) s += cardPower(m, side, lane, k);
  return s;
}

/** Stages a card from your hand onto a blanket (it is revealed when you end the turn). */
export function stage(m: Match, handIndex: number, lane: number): boolean {
  if (m.over || handIndex < 0 || handIndex >= m.hand.length || lane < 0 || lane >= LANES) return false;
  const card = m.hand[handIndex];
  if (spent(m) + CARDS[card].cost > energy(m)) return false;
  const here = m.board[0][lane].length + m.staged.filter((s) => s.lane === lane).length;
  if (here >= capacity(m.stage, lane)) return false;
  m.staged.push({ card, lane, from: handIndex });
  m.hand.splice(handIndex, 1);
  return true;
}

/** Takes a staged card back into your hand. */
export function unstage(m: Match, k: number): boolean {
  if (m.over || k < 0 || k >= m.staged.length) return false;
  m.hand.push(m.staged[k].card);
  m.staged.splice(k, 1);
  return true;
}

function reveal(m: Match, side: number, card: number, lane: number): void {
  const mine = m.board[side][lane];
  const theirs = m.board[1 - side][lane];
  const p: Placed = { card, bonus: 0 };
  if (card === SPARROW) p.bonus += mine.length;
  if (card === SNAIL) for (const q of mine) q.bonus += 1;
  if (card === HEDGEHOG) for (const q of theirs) q.bonus -= 1;
  mine.push(p);
}

/** The rival's plays for this turn, chosen from the board as it stands. */
function rivalPlan(m: Match): Array<{ card: number; lane: number }> {
  const plan: Array<{ card: number; lane: number }> = [];
  let budget = energy(m);
  const counts = [0, 1, 2].map((l) => m.board[1][l].length);
  const hand = m.rivalHand.slice().sort((a, b) => CARDS[b].power - CARDS[a].power);
  for (const card of hand) {
    if (CARDS[card].cost > budget) continue;
    let r: number;
    [m.rivalRng, r] = rngStep(m.rivalRng);
    let lane: number;
    const open = [0, 1, 2].filter((l) => counts[l] < capacity(m.stage, l));
    if (!open.length) break;
    if (r < m.stage.rivalSkill) {
      // with care: where it is behind by least, or ahead by least
      lane = open.slice().sort((a, b) => lanePower(m, 1, a) - lanePower(m, 0, a) - (lanePower(m, 1, b) - lanePower(m, 0, b)))[0];
    } else {
      [m.rivalRng, r] = rngStep(m.rivalRng);
      lane = open[Math.floor(r * open.length)];
    }
    plan.push({ card, lane });
    counts[lane]++;
    budget -= CARDS[card].cost;
  }
  return plan;
}

export interface TurnLog { mine: Array<{ card: number; lane: number }>; rival: Array<{ card: number; lane: number }> }

/** Ends the turn: your staged cards are revealed; then cards are drawn and the rival lays the next turn's. */
export function endTurn(m: Match): TurnLog | null {
  if (m.over) return null;
  const mine = m.staged.map((s) => ({ card: s.card, lane: s.lane }));
  for (const s of mine) reveal(m, 0, s.card, s.lane);
  m.staged = [];
  if (m.turn >= TURNS) {
    m.over = true;
    const [a, b] = lanesWon(m);
    m.won = a > b;
    return { mine, rival: [] };
  }
  m.turn++;
  draw(m);
  rivalTurn(m);
  return { mine, rival: m.rivalLast };
}

/** Blankets held by you and by the rival (a tie holds nobody). */
export function lanesWon(m: Match): [number, number] {
  let a = 0;
  let b = 0;
  for (let l = 0; l < LANES; l++) {
    const x = lanePower(m, 0, l);
    const y = lanePower(m, 1, l);
    if (x > y) a++;
    else if (y > x) b++;
  }
  return [a, b];
}

export function starsFor(m: Match): number {
  if (!m.won) return 0;
  const [, b] = lanesWon(m);
  if (b === 0) return 3;
  const [a] = lanesWon(m);
  return a >= 2 ? 2 : 1;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    let r: number;
    [a, r] = rngStep(a);
    return r;
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

export interface PlayerOpts {
  /** chance of putting a card on a random open blanket instead of a sensible one */
  slip?: number;
  seed?: number;
  /** "plan" spends energy well and fights for two blankets; "random" plays at random */
  mode?: "plan" | "random";
}

export function pilot(st: BlanketStage, opts: PlayerOpts = {}): Match {
  const { slip = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 6007 + 21);
  const m = newMatch(st);
  // the two blankets worth fighting for: sunny first, ants last, small ones (room for two) below plain
  const pref: Record<LaneKind, number> = { sunny: 0, plain: 1, small: 2, ants: 3 };
  const targets = shuffle([0, 1, 2], rng).sort((a, b) => pref[st.lanes[a]] - pref[st.lanes[b]]).slice(0, 2);
  while (!m.over) {
    if (mode === "random") {
      for (const i of shuffle(m.hand.map((_, k) => k), rng).reverse()) if (rng() < 0.6) stage(m, Math.min(i, m.hand.length - 1), Math.floor(rng() * LANES));
    } else {
      // the set of cards that puts the most power down for this turn's energy, strongest first
      const n = m.hand.length;
      let bestSet: number[] = [];
      let bestPow = -1;
      for (let mask = 1; mask < 1 << n; mask++) {
        let cost = 0;
        let pow = 0;
        const set: number[] = [];
        for (let k = 0; k < n; k++)
          if (mask & (1 << k)) {
            cost += CARDS[m.hand[k]].cost;
            pow += CARDS[m.hand[k]].power;
            set.push(m.hand[k]);
          }
        if (cost <= energy(m) && pow > bestPow) {
          bestPow = pow;
          bestSet = set;
        }
      }
      bestSet.sort((x, y) => CARDS[y].power - CARDS[x].power);
      for (const card of bestSet) {
        const k = m.hand.indexOf(card);
        const open = [0, 1, 2].filter((l) => m.board[0][l].length + m.staged.filter((x) => x.lane === l).length < capacity(st, l));
        if (!open.length) break;
        let lane: number;
        if (rng() < slip) lane = open[Math.floor(rng() * open.length)];
        else {
          // fight for the two blankets cheapest to hold: close the bigger gap, or pad the thinner lead
          const mineNow = (l: number) => lanePower(m, 0, l) + m.staged.filter((x) => x.lane === l).reduce((a, x) => a + CARDS[x.card].power, 0);
          const gap = (l: number) => lanePower(m, 1, l) - mineNow(l) + (st.lanes[l] === "small" ? 1 : 0);
          const targets = open.slice().sort((x, y) => gap(x) - gap(y)).slice(0, 2);
          lane = targets.sort((x, y) => gap(y) - gap(x))[0];
        }
        if (!stage(m, k, lane)) break;
      }
    }
    endTurn(m);
  }
  return m;
}

function shape(stage: number) {
  return {
    rivalSkill: Math.min(0.45, 0.03 + stage * 0.015),
    rivalTilt: stage < 10 ? -3 : -2, // early rivals get weaker cards
    odd: Math.min(2, Math.floor(stage / 8)), // how many blankets have a quirk
  };
}

/** Human-like players: sensible plays with a wrong blanket one card in six. */
export const HUMAN_PLAYERS: PlayerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ slip: 0.16, seed }));

function deckFor(rng: () => number, tilt: number): number[] {
  // twelve cards across the curve; a negative tilt swaps big cards for small ones
  const base = [0, 0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8];
  const deck = base.map((c) => (tilt < 0 && c >= 6 && rng() < -tilt * 0.35 ? Math.max(0, c - 3) : c));
  return shuffle(deck, rng);
}

export function layout(stage: number, attempt: number): BlanketStage {
  const sh = shape(stage);
  const rng = mulberry(341000 + stage * 227 + attempt * 7919);
  const lanes: LaneKind[] = ["plain", "plain", "plain"];
  const quirks = shuffle(["sunny", "ants", "small"] as LaneKind[], rng).slice(0, sh.odd);
  const spots = shuffle([0, 1, 2], rng);
  quirks.forEach((q, i) => (lanes[spots[i]] = q));
  return { stage, lanes, deck: deckFor(rng, 0), rivalDeck: deckFor(rng, sh.rivalTilt), rivalSkill: sh.rivalSkill, rivalSeed: 351000 + stage * 229 + attempt * 13 };
}

/** Deals decks until sensible human-like play wins every time and random play does not. */
export function buildStage(stage: number): BlanketStage {
  for (let attempt = 0; attempt < 500; attempt++) {
    const st = layout(stage, attempt);
    if (HUMAN_PLAYERS.filter((o) => pilot(st, o).won).length < 6) continue;
    if (starsFor(pilot(st, { seed: 1 })) < 3) continue;
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`blanket-battle stage ${stage + 1}: no fair picnic`);
}

export const BLANKET_STAGES: BlanketStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
