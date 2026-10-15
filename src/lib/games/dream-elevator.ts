/**
 * 의도 (2026-10-15 세운): 꿈의 엘리베이터는 손에 든 물건으로 다음 층의 꿈을 쓴다.
 * 돌은 중력, 티끌은 작아짐, 시계는 멈춤이다. 그 꿈이 층의 봉인과 같을 때만 더 올라간다.
 * 빈손으로는 문이 열리지 않는다. 아래로 내리는 걸음은 꿈을 바꾸지 않는다.
 * 승리는 꼭대기 층으로 올라서는 걸음이고, 그때 손에 든 물건이 그 봉인과 같아야 한다.
 * 네 층계는 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 층을 만들지 않는다.
 *
 * 층 0 이 로비, 층 3 이 꼭대기다. 층 번호가 커지면 월드 +y 도 커진다.
 * 카메라 0 은 월드 +z 에서 원점을 보므로, 화면 위가 더 높은 층이다.
 */

export const STEP_CAP = 12;
export const FLOOR_COUNT = 4;
export const FLOOR_GAP = 1.35;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. View 0 sits on world +z and looks at the origin, so screen-up is world +y
 * and a higher floor is higher on screen. The view button only changes which of these is used.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 0.15, 8.4],
  [8.4, 0.15, 0],
  [0, 0.15, -8.4],
  [-8.4, 0.15, 0],
];

export const ACTS = ["up", "down", "swap"] as const;
export type Act = (typeof ACTS)[number];
export type Relic = "stone" | "mote" | "hour";
export type Seal = "lobby" | Relic;
export type LoseReason = "cap" | "resign";

export interface DreamState {
  readonly puzzleId: string;
  readonly floor: number;
  readonly hand: Relic | null;
  readonly slots: readonly (Relic | null)[];
  readonly laws: readonly (Relic | null)[];
  readonly seals: readonly [Seal, Relic, Relic, Relic];
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastAct: Act | null;
}

interface PuzzleDef {
  readonly id: string;
  readonly hand: Relic | null;
  readonly slots: readonly (Relic | null)[];
  readonly seals: readonly [Seal, Relic, Relic, Relic];
}

/**
 * first-bell: the stone already matches the first seal, and each landing holds the next relic.
 * wrong-dream: the mote opens the first landing, where the stone for that seal is waiting.
 * borrowed-stone: the first seal is the mote and the second seal is the stone, so the ferry runs the other way.
 * wake-mote: the lower seals open in order, and the mote is sitting on the last landing.
 */
const PUZZLES: readonly PuzzleDef[] = [
  {
    id: "first-bell",
    hand: null,
    slots: ["stone", "mote", "hour", null],
    seals: ["lobby", "stone", "mote", "hour"],
  },
  {
    id: "wrong-dream",
    hand: null,
    slots: ["mote", "stone", "hour", null],
    seals: ["lobby", "stone", "mote", "hour"],
  },
  {
    id: "borrowed-stone",
    hand: null,
    slots: ["stone", "mote", "hour", null],
    seals: ["lobby", "mote", "stone", "hour"],
  },
  {
    id: "wake-mote",
    hand: null,
    slots: ["hour", "stone", null, "mote"],
    seals: ["lobby", "hour", "stone", "mote"],
  },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Floor 0 is the lobby. A larger index is a higher floor, and a higher floor is a larger world y. */
export function floorY(index: number): number {
  return (index - 1.5) * FLOOR_GAP;
}

function blankLaws(): (Relic | null)[] {
  return [null, null, null, null];
}

function finish(
  state: DreamState,
  next: { floor: number; hand: Relic | null; slots: readonly (Relic | null)[]; laws: readonly (Relic | null)[]; act: Act; won: boolean },
): DreamState {
  const steps = state.steps + 1;
  return {
    ...state,
    floor: next.floor,
    hand: next.hand,
    slots: next.slots,
    laws: next.laws,
    steps,
    lastAct: next.act,
    status: next.won ? "win" : steps >= STEP_CAP ? "lose" : "play",
    loseReason: next.won ? null : steps >= STEP_CAP ? "cap" : null,
  };
}

export function stepDream(state: DreamState, act: Act): DreamState {
  if (state.status !== "play") return state;
  if (act === "swap") {
    const slot = state.slots[state.floor] ?? null;
    if (state.hand === null && slot === null) return state;
    const slots = state.slots.slice();
    slots[state.floor] = state.hand;
    return finish(state, { floor: state.floor, hand: slot, slots, laws: state.laws, act, won: false });
  }
  if (act === "down") {
    if (state.floor <= 0) return state;
    return finish(state, { floor: state.floor - 1, hand: state.hand, slots: state.slots, laws: state.laws, act, won: false });
  }
  if (state.floor >= FLOOR_COUNT - 1) return state;
  // The dream on this floor has to match its seal before the cabin may leave upward. The lobby has no seal.
  if (state.floor > 0 && state.laws[state.floor] !== state.seals[state.floor]) return state;
  // An empty cabin does not open the next door. The carried relic is what writes that floor's dream.
  if (state.hand === null) return state;
  const laws = state.laws.slice();
  const dest = state.floor + 1;
  laws[dest] = state.hand;
  const won = dest === FLOOR_COUNT - 1 && state.hand === state.seals[dest];
  return finish(state, { floor: dest, hand: state.hand, slots: state.slots, laws, act, won });
}

export function openActs(state: DreamState): Act[] {
  return ACTS.filter((act) => stepDream(state, act) !== state);
}

export function mixSeed(seed: number): number {
  let state = (Number.isFinite(seed) ? Math.trunc(seed) : 0) >>> 0;
  state = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(state ^ (state >>> 15), state | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function puzzleIndexForSeed(seed: number): number {
  return mixSeed(seed) % PUZZLES.length;
}

export function nextSeed(seed: number): number {
  const current = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return mixSeed(current + 1);
}

function makeState(puzzle: PuzzleDef, steps = 0, floor = 0, hand: Relic | null = puzzle.hand, laws = blankLaws()): DreamState {
  return {
    puzzleId: puzzle.id,
    floor,
    hand,
    slots: puzzle.slots.slice(),
    laws,
    seals: puzzle.seals,
    steps,
    status: "play",
    loseReason: null,
    lastAct: null,
  };
}

export function createDream(seed = 0): DreamState {
  return makeState(PUZZLES[puzzleIndexForSeed(seed)]);
}

export function makeDream(input: {
  seals: readonly [Seal, Relic, Relic, Relic];
  slots: readonly (Relic | null)[];
  hand: Relic | null;
  laws?: readonly (Relic | null)[];
  floor?: number;
  steps?: number;
}): DreamState {
  return makeState(
    { id: "custom", hand: input.hand, slots: input.slots, seals: input.seals },
    input.steps ?? 0,
    input.floor ?? 0,
    input.hand,
    input.laws ? input.laws.slice() : blankLaws(),
  );
}

export function resign(state: DreamState): DreamState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
