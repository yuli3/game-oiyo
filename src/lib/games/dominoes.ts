import { aiChoose, handPips, makeSet, newEndValue, tileFits, type AiLevel, type End, type Ends, type Tile } from "./ai/dominoes";

export type DominoTurn = "you" | "cpu";
export type DominoWinner = DominoTurn | "draw" | null;
export type DominoAction = { kind: "play"; tileId: number; end: End } | { kind: "draw" } | { kind: "pass" } | { kind: "cpu" };
export interface PlacedDomino { a: number; b: number; id: number }
export interface DominoesState { seed: number; rng: number; player: Tile[]; cpu: Tile[]; bone: Tile[]; board: PlacedDomino[]; turn: DominoTurn; status: "playing" | "over"; winner: DominoWinner; passes: number; draws: number; plays: number; history: DominoAction[] }

const nextRandom = (state: number) => { const next = (Math.imul(state, 1664525) + 1013904223) >>> 0; return { state: next, value: next / 0x1_0000_0000 }; };
function seededShuffle<T>(items: readonly T[], seed: number) { const out = [...items]; let rng = seed >>> 0; for (let i = out.length - 1; i > 0; i--) { const roll = nextRandom(rng); rng = roll.state; const j = Math.floor(roll.value * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return { out, rng }; }
export const dominoEnds = (state: Pick<DominoesState, "board">): Ends => ({ left: state.board[0].a, right: state.board[state.board.length - 1].b });
export const dominoHasMove = (hand: readonly Tile[], ends: Ends) => hand.some((tile) => tileFits(tile, ends.left) || tileFits(tile, ends.right));

export function createDominoes(seed: number): DominoesState { const normalized = seed >>> 0; const shuffled = seededShuffle(makeSet(), normalized); const opening = shuffled.out[14]; return { seed: normalized, rng: shuffled.rng, player: shuffled.out.slice(0, 7), cpu: shuffled.out.slice(7, 14), bone: shuffled.out.slice(15), board: [{ ...opening }], turn: "you", status: "playing", winner: null, passes: 0, draws: 0, plays: 0, history: [] }; }

function finishBlocked(state: DominoesState, history: DominoAction[]): DominoesState { const you = handPips(state.player), cpu = handPips(state.cpu); return { ...state, status: "over", winner: you === cpu ? "draw" : you < cpu ? "you" : "cpu", passes: 2, history }; }
function place(state: DominoesState, tile: Tile, end: End, owner: DominoTurn, history: DominoAction[]): DominoesState {
  const ends = dominoEnds(state); const open = end === "left" ? ends.left : ends.right; if (!tileFits(tile, open)) return state;
  const other = newEndValue(tile, open); const placed = end === "left" ? [{ a: other, b: open, id: tile.id }, ...state.board] : [...state.board, { a: open, b: other, id: tile.id }];
  const hand = (owner === "you" ? state.player : state.cpu).filter((item) => item.id !== tile.id); const next: DominoTurn = owner === "you" ? "cpu" : "you";
  return { ...state, ...(owner === "you" ? { player: hand } : { cpu: hand }), board: placed, turn: hand.length ? next : owner, status: hand.length ? "playing" : "over", winner: hand.length ? null : owner, passes: 0, plays: state.plays + 1, history };
}

export function playDominoes(state: DominoesState, tileId: number, end: End): DominoesState { if (state.status !== "playing" || state.turn !== "you" || !Number.isInteger(tileId)) return state; const tile = state.player.find((item) => item.id === tileId); if (!tile) return state; const action: DominoAction = { kind: "play", tileId, end }; return place(state, tile, end, "you", [...state.history, action]); }
export function drawDominoes(state: DominoesState): DominoesState { if (state.status !== "playing" || state.turn !== "you" || dominoHasMove(state.player, dominoEnds(state)) || !state.bone.length) return state; const action: DominoAction = { kind: "draw" }; return { ...state, player: [...state.player, state.bone[0]], bone: state.bone.slice(1), draws: state.draws + 1, history: [...state.history, action] }; }
export function passDominoes(state: DominoesState): DominoesState { if (state.status !== "playing" || state.turn !== "you" || state.bone.length || dominoHasMove(state.player, dominoEnds(state))) return state; const history: DominoAction[] = [...state.history, { kind: "pass" }]; return state.passes + 1 >= 2 ? finishBlocked(state, history) : { ...state, turn: "cpu", passes: state.passes + 1, history }; }

export function cpuDominoes(state: DominoesState, level: AiLevel): DominoesState {
  if (state.status !== "playing" || state.turn !== "cpu") return state; const action: DominoAction = { kind: "cpu" }; const history = [...state.history, action]; let hand = [...state.cpu], bone = [...state.bone], rng = state.rng, draws = state.draws; let move = null;
  while (!move) { const roll = nextRandom(rng); rng = roll.state; move = aiChoose(hand, dominoEnds(state), level, () => roll.value); if (move || !bone.length) break; hand.push(bone[0]); bone = bone.slice(1); draws++; }
  const prepared = { ...state, cpu: hand, bone, rng, draws };
  if (move) return place(prepared, move.tile, move.end, "cpu", history);
  return state.passes + 1 >= 2 ? finishBlocked(prepared, history) : { ...prepared, turn: "you", passes: state.passes + 1, history };
}

export type DominoCpuReview = { tile:Tile; end:End; draws:number; reason:'variation'|'heavy-pips'|'double'|'flexibility' };
export function dominoCpuReview(state:DominoesState,level:AiLevel):DominoCpuReview|null{
  if(state.status!=="playing"||state.turn!=="cpu")return null;
  const next=cpuDominoes(state,level);if(next.board.length===state.board.length)return null;
  const before=new Set(state.board.map(tile=>tile.id));const placed=next.board.find(tile=>!before.has(tile.id));if(!placed)return null;
  const end:End=next.board[0].id===placed.id?'left':'right';const source=next.cpu.length<state.cpu.length?state.cpu:[...state.cpu,...state.bone.slice(0,next.draws-state.draws)];const tile=source.find(item=>item.id===placed.id);if(!tile)return null;
  const remaining=source.filter(item=>item.id!==tile.id),ends=dominoEnds(next),flex=remaining.filter(item=>tileFits(item,ends.left)||tileFits(item,ends.right)).length;
  const reason=level===1?'variation':tile.a===tile.b?'double':level===3&&flex>0?'flexibility':'heavy-pips';
  return{tile,end,draws:next.draws-state.draws,reason};
}

export function replayDominoes(seed: number, level: AiLevel, actions: readonly DominoAction[]): DominoesState | null { let state = createDominoes(seed); for (const action of actions) { const next = action.kind === "play" ? playDominoes(state, action.tileId, action.end) : action.kind === "draw" ? drawDominoes(state) : action.kind === "pass" ? passDominoes(state) : cpuDominoes(state, level); if (next === state) return null; state = next; if (state.status === "over" && action !== actions.at(-1)) return null; } return state; }
export function dominoesAnalysis(state: DominoesState) { return { yourPips: handPips(state.player), cpuPips: handPips(state.cpu), draws: state.draws, plays: state.plays, blocked: state.passes >= 2 }; }
