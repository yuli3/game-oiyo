/**
 * 의도 (2026-10-15 세운): 포식자 없는 사냥은 생물을 잡는 게임이 아니다.
 * 읽으면 가장 서쪽의 발자국만 먹이 흔적이 되고, 바람은 한 칸 동쪽으로 걷는다.
 * 찍으면 바람 아래의 먹이만 걷힌다. 표식은 남은 먹이와 바람의 자리를 함께 맞춘다.
 * 네 자리는 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 흔적을 옮기지 않는다.
 * 자유 추적, 물리 엔진, 생물을 없애는 점수는 이 판의 승패가 아니다.
 *
 * 카메라 0 은 월드 +z 다. 화면 오른쪽이 월드 +x(동쪽)이고, 화면 위가 북쪽(−z)이다.
 * 표식은 자리보다 북쪽에 있다. 칸 번호는 화면 왼쪽(서쪽)부터 1이다.
 * 서쪽 먹이를 먼저 찍는 자리, 두 번 찍고 먹이를 남기는 자리,
 * 서쪽 먹이를 남기는 자리, 동쪽 끝에 먹이를 남기는 자리가 있다.
 */

export const STEP_CAP = 8;
export const LEN = 5;
const GAP = 0.86;

export const BARE = 0;
export const TRACK = 1;
export const FEED = 2;

/** North of the plots, so camera 0 puts the mark above the field. */
export const MARK_Z = -0.78;
/** The plots themselves, closer to the camera than the mark. */
export const ROOM_Z = 0.22;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. Every pose stays in the +z hemisphere and faces the field,
 * so screen-right stays world +x and the top of the screen stays north.
 * The view button only swaps among these poses.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 1.35, 4.6],
  [1.2, 1.55, 4.2],
  [0, 2.05, 3.8],
  [-1.15, 1.4, 4.4],
];

export const ACTS = ["R", "S"] as const;
export type Act = (typeof ACTS)[number];
export type LoseReason = "cap" | "resign";

export interface HuntState {
  readonly puzzleId: string;
  readonly cells: readonly number[];
  readonly wind: number;
  readonly goal: readonly number[];
  readonly goalWind: number;
  readonly read: readonly Act[];
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastAction: Act | null;
}

interface HuntDef {
  readonly id: string;
  readonly cells: readonly number[];
  readonly wind: number;
  readonly goal: readonly number[];
  readonly goalWind: number;
}

const HUNTS: readonly HuntDef[] = [
  { id: "opened-feed", cells: [FEED, TRACK, TRACK, BARE, BARE], wind: 0, goal: [BARE, FEED, FEED, BARE, BARE], goalWind: 2 },
  { id: "two-shots", cells: [FEED, TRACK, BARE, TRACK, BARE], wind: 0, goal: [BARE, BARE, BARE, FEED, BARE], goalWind: 2 },
  { id: "kept-west", cells: [FEED, TRACK, TRACK, TRACK, BARE], wind: 0, goal: [FEED, BARE, FEED, BARE, BARE], goalWind: 3 },
  { id: "east-feed", cells: [FEED, TRACK, TRACK, BARE, TRACK], wind: 0, goal: [BARE, BARE, BARE, BARE, FEED], goalWind: 3 },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Plots run west to east. Camera 0 maps +x to screen-right. */
export function cellX(index: number): number {
  return (index - 2) * GAP;
}

function stamp(hunt: HuntDef, steps: number): HuntState {
  return {
    puzzleId: hunt.id,
    cells: [...hunt.cells],
    wind: hunt.wind,
    goal: [...hunt.goal],
    goalWind: hunt.goalWind,
    read: [],
    steps,
    status: "play",
    loseReason: null,
    lastAction: null,
  };
}

/**
 * Reading turns only the westernmost footprint into feed, then walks the wind one plot east.
 * Shooting clears only the feed under the wind and leaves the wind where it is.
 * 2026-10-15
 */
function trace(cells: number[], wind: number, action: Act): { cells: number[]; wind: number } | null {
  if (action === "R") {
    const index = cells.indexOf(TRACK);
    if (index < 0) return null;
    const next = cells.slice();
    next[index] = FEED;
    return { cells: next, wind: Math.min(LEN - 1, wind + 1) };
  }
  if (cells[wind] !== FEED) return null;
  const next = cells.slice();
  next[wind] = BARE;
  return { cells: next, wind };
}

function matches(cells: readonly number[], goal: readonly number[], wind: number, goalWind: number): boolean {
  return wind === goalWind && cells.every((cell, index) => cell === goal[index]);
}

export function stepHunt(state: HuntState, action: Act): HuntState {
  if (state.status !== "play") return state;
  const moved = trace(state.cells.slice(), state.wind, action);
  if (!moved) return state;
  const steps = state.steps + 1;
  const won = matches(moved.cells, state.goal, moved.wind, state.goalWind);
  const capped = !won && steps >= STEP_CAP;
  return {
    ...state,
    cells: moved.cells,
    wind: moved.wind,
    read: [...state.read, action],
    steps,
    lastAction: action,
    status: won ? "win" : capped ? "lose" : "play",
    loseReason: won ? null : capped ? "cap" : null,
  };
}

export function openActions(state: HuntState): Act[] {
  return ACTS.filter((action) => stepHunt(state, action) !== state);
}

export function mixSeed(seed: number): number {
  let mixed = (Number.isFinite(seed) ? Math.trunc(seed) : 0) >>> 0;
  mixed = (mixed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function puzzleIndexForSeed(seed: number): number {
  return mixSeed(seed) % HUNTS.length;
}

export function nextSeed(seed: number): number {
  const current = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return mixSeed(current + 1);
}

export function createHunt(seed = 0): HuntState {
  const hunt = HUNTS[puzzleIndexForSeed(seed)] ?? HUNTS[0];
  return stamp(hunt, 0);
}

export function makeHunt(input: {
  cells: readonly number[];
  wind?: number;
  goal: readonly number[];
  goalWind?: number;
  steps?: number;
}): HuntState {
  return stamp({
    id: "custom",
    cells: input.cells,
    wind: input.wind ?? 0,
    goal: input.goal,
    goalWind: input.goalWind ?? 0,
  }, input.steps ?? 0);
}

export function resign(state: HuntState): HuntState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
