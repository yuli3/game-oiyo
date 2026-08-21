import {
  aiDiscard,
  buildWall,
  isWinningHand,
  nextRonCandidate,
  ronCandidatesInSeatOrder,
  shanten,
  shuffle,
  type AiLevel,
} from "./ai/mahjong";

export type MahjongPhase = "draw" | "discard" | "ron" | "over";
export type MahjongWinType = "tsumo" | "ron" | null;

export interface MahjongState {
  hands: number[][];
  discards: number[][];
  wall: number[];
  wallPos: number;
  turn: number;
  drawn: number | null;
  phase: MahjongPhase;
  lastDiscard: number | null;
  lastDiscarder: number | null;
  winner: number | null;
  winType: MahjongWinType;
  ronTile: number | null;
  declinedRon: number[];
  rngState: number;
  turns: number;
}

const HAND_SIZE = 13;
const UINT32_RANGE = 0x1_0000_0000;

function nextUint32(state: number): number {
  let value = state >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function randomStream(seed: number): { rng: () => number; state: () => number } {
  let current = seed >>> 0 || 0x9e37_79b9;
  return {
    rng: () => {
      current = nextUint32(current);
      return current / UINT32_RANGE;
    },
    state: () => current,
  };
}

const sortHand = (hand: number[]) => hand.slice().sort((a, b) => a - b);
const cloneRows = (rows: number[][]) => rows.map((row) => row.slice());

export function createMahjong(seed: number): MahjongState {
  const stream = randomStream(seed);
  const wall = shuffle(buildWall(), stream.rng);
  const hands = [0, 1, 2, 3].map((seat) => sortHand(wall.slice(seat * HAND_SIZE, seat * HAND_SIZE + HAND_SIZE)));
  return {
    hands,
    discards: [[], [], [], []],
    wall,
    wallPos: 4 * HAND_SIZE,
    turn: 0,
    drawn: null,
    phase: "draw",
    lastDiscard: null,
    lastDiscarder: null,
    winner: null,
    winType: null,
    ronTile: null,
    declinedRon: [],
    rngState: stream.state(),
    turns: 0,
  };
}

function finish(state: MahjongState, winner: number, winType: MahjongWinType): MahjongState {
  return { ...state, phase: "over", winner, winType, ronTile: null, declinedRon: [] };
}

export function drawMahjong(state: MahjongState): MahjongState {
  if (state.phase !== "draw" || state.winner !== null) return state;
  if (state.wallPos >= state.wall.length) return finish(state, -1, null);
  const tile = state.wall[state.wallPos];
  const hands = cloneRows(state.hands);
  hands[state.turn] = [...hands[state.turn], tile];
  const next = { ...state, hands, wallPos: state.wallPos + 1, drawn: tile, phase: "discard" as const };
  return state.turn !== 0 && isWinningHand(hands[state.turn]) ? finish(next, state.turn, "tsumo") : next;
}

export function claimHumanTsumo(state: MahjongState): MahjongState {
  if (state.phase !== "discard" || state.turn !== 0 || !isWinningHand(state.hands[0])) return state;
  return finish(state, 0, "tsumo");
}

export function discardMahjong(state: MahjongState, tileIndex: number): MahjongState {
  if (state.phase !== "discard" || state.winner !== null || !Number.isInteger(tileIndex)) return state;
  const hand = state.hands[state.turn];
  if (tileIndex < 0 || tileIndex >= hand.length) return state;
  const tile = hand[tileIndex];
  const hands = cloneRows(state.hands);
  hands[state.turn] = sortHand([...hand.slice(0, tileIndex), ...hand.slice(tileIndex + 1)]);
  const discards = cloneRows(state.discards);
  discards[state.turn] = [...discards[state.turn], tile];
  const base: MahjongState = {
    ...state,
    hands,
    discards,
    drawn: null,
    lastDiscard: tile,
    lastDiscarder: state.turn,
    ronTile: null,
    declinedRon: [],
    turns: state.turns + 1,
  };
  const ronWinner = nextRonCandidate(ronCandidatesInSeatOrder(hands, state.turn, tile));
  if (ronWinner === 0) return { ...base, phase: "ron", ronTile: tile };
  if (ronWinner !== null) return finish(base, ronWinner, "ron");
  return { ...base, turn: (state.turn + 1) % 4, phase: "draw" };
}

export function claimHumanRon(state: MahjongState): MahjongState {
  if (state.phase !== "ron" || state.ronTile === null) return state;
  return finish(state, 0, "ron");
}

export function passHumanRon(state: MahjongState): MahjongState {
  if (state.phase !== "ron" || state.ronTile === null || state.lastDiscarder === null) return state;
  const declinedRon = [...state.declinedRon, 0];
  const nextWinner = nextRonCandidate(
    ronCandidatesInSeatOrder(state.hands, state.lastDiscarder, state.ronTile),
    declinedRon,
  );
  const base = { ...state, declinedRon, ronTile: null };
  if (nextWinner !== null) return finish(base, nextWinner, "ron");
  return { ...base, turn: (state.lastDiscarder + 1) % 4, phase: "draw" };
}

export function chooseAiDiscard(state: MahjongState, level: AiLevel): { tileIndex: number; rngState: number } | null {
  if (state.phase !== "discard" || state.turn === 0 || state.winner !== null) return null;
  const stream = randomStream(state.rngState);
  const tile = aiDiscard(state.hands[state.turn], level, stream.rng);
  return { tileIndex: state.hands[state.turn].indexOf(tile), rngState: stream.state() };
}

export function discardMahjongAi(state: MahjongState, level: AiLevel): MahjongState {
  const choice = chooseAiDiscard(state, level);
  if (!choice) return state;
  return discardMahjong({ ...state, rngState: choice.rngState }, choice.tileIndex);
}

export type MahjongCpuReview = { tile: number; shantenAfter: number; reason: "variation" | "tenpai" | "shanten" | "disposable" };
export function mahjongCpuReview(state: MahjongState, level: AiLevel): MahjongCpuReview | null {
  const choice = chooseAiDiscard(state, level);
  if (!choice) return null;
  const hand = state.hands[state.turn];
  const tile = hand[choice.tileIndex];
  const rest = hand.filter((_, index) => index !== choice.tileIndex);
  const shantenAfter = shanten(rest);
  const reason = level === 1 ? "variation" : shantenAfter <= 0 ? "tenpai" : shantenAfter < shanten(hand.slice(0, 13)) ? "shanten" : "disposable";
  return { tile, shantenAfter, reason };
}
