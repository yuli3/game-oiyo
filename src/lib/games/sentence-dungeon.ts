/**
 * 의도 (2026-10-15 세운): 문장 던전은 맞춤법 게임이 아니다.
 * 한 문장은 가장 서쪽의 맞는 짝에만 한 번 읽힌다. 불 바로 동쪽의 얼음은 물이 되고,
 * 물 바로 동쪽의 불은 꺼지며, 불 바로 동쪽의 물은 마른다.
 * 복도가 표식과 같아질 때까지 문장 순서를 고른다.
 * 네 방은 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 방을 바꾸지 않는다.
 * 자유 문장 입력, 물리 엔진, 철자 실력은 이 판의 승패가 아니다.
 *
 * 카메라 0 은 월드 +z 다. 화면 오른쪽이 월드 +x(동쪽)이고, 화면 위가 북쪽(−z)이다.
 * 표식은 복도보다 북쪽에 있다. 칸 번호는 화면 왼쪽(서쪽)부터 1이다.
 * 서쪽 얼음만 녹는 방, 얼음이 둘인 방, 서쪽 불을 먼저 끄면 얼음이 남는 방,
 * 세 문장을 모두 써야 하는 방이 있다.
 */

export const STEP_CAP = 8;
export const LEN = 5;
const GAP = 0.86;

export const EMPTY = 0;
export const ICE = 1;
export const FIRE = 2;
export const WATER = 3;

/** North of the corridor, so camera 0 puts the mark above the room. */
export const MARK_Z = -0.78;
/** The corridor itself, closer to the camera than the mark. */
export const ROOM_Z = 0.22;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. Every pose stays in the +z hemisphere and faces the corridor,
 * so screen-right stays world +x and the top of the screen stays north.
 * The view button only swaps among these poses.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 1.35, 4.6],
  [1.2, 1.55, 4.2],
  [0, 2.05, 3.8],
  [-1.15, 1.4, 4.4],
];

export const ACTS = ["M", "Q", "D"] as const;
export type Act = (typeof ACTS)[number];
export type LoseReason = "cap" | "resign";

export interface RoomState {
  readonly puzzleId: string;
  readonly cells: readonly number[];
  readonly goal: readonly number[];
  readonly read: readonly Act[];
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastAction: Act | null;
}

interface RoomDef {
  readonly id: string;
  readonly cells: readonly number[];
  readonly goal: readonly number[];
}

const PUZZLES: readonly RoomDef[] = [
  { id: "first-thaw", cells: [FIRE, ICE, FIRE, EMPTY, EMPTY], goal: [FIRE, EMPTY, EMPTY, EMPTY, EMPTY] },
  { id: "twin-ice", cells: [FIRE, ICE, FIRE, ICE, FIRE], goal: [FIRE, EMPTY, EMPTY, WATER, FIRE] },
  { id: "shore-water", cells: [WATER, FIRE, ICE, WATER, FIRE], goal: [WATER, EMPTY, EMPTY, WATER, EMPTY] },
  { id: "long-clause", cells: [FIRE, ICE, FIRE, WATER, FIRE], goal: [FIRE, EMPTY, EMPTY, EMPTY, EMPTY] },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Alcoves run west to east. Camera 0 maps +x to screen-right. */
export function cellX(index: number): number {
  return (index - 2) * GAP;
}

function stamp(puzzle: RoomDef, steps: number): RoomState {
  return {
    puzzleId: puzzle.id,
    cells: [...puzzle.cells],
    goal: [...puzzle.goal],
    read: [],
    steps,
    status: "play",
    loseReason: null,
    lastAction: null,
  };
}

/**
 * The sentence's subject is the westernmost pair it fits.
 * An eastern pair does not answer while a western one still matches.
 * 2026-10-15
 */
function hitIndex(cells: readonly number[], action: Act): number {
  for (let index = 1; index < cells.length; index += 1) {
    const west = cells[index - 1];
    const here = cells[index];
    if (action === "M" && west === FIRE && here === ICE) return index;
    if (action === "Q" && west === WATER && here === FIRE) return index;
    if (action === "D" && west === FIRE && here === WATER) return index;
  }
  return -1;
}

function become(action: Act): number {
  if (action === "M") return WATER;
  return EMPTY;
}

function matches(cells: readonly number[], goal: readonly number[]): boolean {
  return cells.every((cell, index) => cell === goal[index]);
}

export function stepRoom(state: RoomState, action: Act): RoomState {
  if (state.status !== "play") return state;
  const index = hitIndex(state.cells, action);
  if (index < 0) return state;
  const cells = state.cells.slice();
  cells[index] = become(action);
  const steps = state.steps + 1;
  const won = matches(cells, state.goal);
  const capped = !won && steps >= STEP_CAP;
  return {
    ...state,
    cells,
    read: [...state.read, action],
    steps,
    lastAction: action,
    status: won ? "win" : capped ? "lose" : "play",
    loseReason: won ? null : capped ? "cap" : null,
  };
}

export function openActions(state: RoomState): Act[] {
  return ACTS.filter((action) => stepRoom(state, action) !== state);
}

export function mixSeed(seed: number): number {
  let mixed = (Number.isFinite(seed) ? Math.trunc(seed) : 0) >>> 0;
  mixed = (mixed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
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

export function createRoom(seed = 0): RoomState {
  const puzzle = PUZZLES[puzzleIndexForSeed(seed)] ?? PUZZLES[0];
  return stamp(puzzle, 0);
}

export function makeRoom(input: {
  cells: readonly number[];
  goal: readonly number[];
  steps?: number;
}): RoomState {
  return stamp({ id: "custom", cells: input.cells, goal: input.goal }, input.steps ?? 0);
}

export function resign(state: RoomState): RoomState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
