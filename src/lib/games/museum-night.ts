/**
 * 의도 (2026-10-15 세운): 박물관의 밤은 사람이 아니라 전시품이 움직이는 짧은 잠입이다.
 * 빨간 카메라는 이번 밤 내내 한 좌대만 보고, 관람 시선은 걸음마다 다음 박자로 돈다.
 * 지금 서 있는 좌대나 들어가려는 좌대가 보이면 그 걸음은 들킨다. 그대로 서 있으면 안전하고 시선만 한 박자 돌아간다.
 * 출발과 도착이 모두 어두울 때만 옆 전시품과 자리를 바꾼다. 야간 표식 좌대에 서면 그 밤이 끝난다.
 * 네 밤은 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 시선을 옮기지 않는다.
 *
 * 카메라 0 은 월드 +z 다. 그래서 화면 오른쪽이 월드 +x(동쪽, 번호가 커지는 쪽)이고 화면 왼쪽이 서쪽이다.
 * still-plinth: 서쪽 문 카메라가 1번 좌대를 계속 보고, 첫 박자에는 관람객이 당신 위에 있다.
 * under-cone: 한 칸 동쪽으로 들어가면 다음 박자의 시선이 그 좌대를 덮는다.
 * long-hall: 표식 직전 좌대에서 관람객과 마주친 뒤에야 동쪽 표식이 어두워진다.
 * west-mark: 빨간 카메라는 동쪽 끝 좌대에 있다. 한 칸 서쪽으로 들어가면 다음 박자가 그 좌대를 덮고, 표식은 그 다음 서쪽 칸이다.
 */

export const STEP_CAP = 8;
export const HALL = 5;
const GAP = 0.78;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. Every pose stays in the +z hemisphere and looks at the hall,
 * so screen-right stays world +x. The view button only swaps among these poses.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 1.35, 4.6],
  [1.2, 1.55, 4.2],
  [0, 2.05, 3.8],
  [-1.15, 1.4, 4.4],
];

export const ACTS = ["W", "H", "E"] as const;
export type Act = (typeof ACTS)[number];
export type LoseReason = "cap" | "resign" | "seen";

export interface NightState {
  readonly puzzleId: string;
  readonly seats: readonly number[];
  readonly phase: number;
  readonly goal: number;
  readonly camera: readonly number[];
  readonly visitors: readonly (readonly number[])[];
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastAction: Act | null;
}

interface NightDef {
  readonly id: string;
  readonly start: number;
  readonly goal: number;
  readonly camera: readonly number[];
  readonly visitors: readonly (readonly number[])[];
}

const PUZZLES: readonly NightDef[] = [
  { id: "still-plinth", start: 1, goal: 3, camera: [0], visitors: [[1], [0], [2]] },
  { id: "under-cone", start: 1, goal: 3, camera: [0], visitors: [[0], [2], [1]] },
  { id: "long-hall", start: 1, goal: 4, camera: [0], visitors: [[0], [1], [3]] },
  { id: "west-mark", start: 3, goal: 1, camera: [4], visitors: [[0], [2], [3]] },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Pedestals run west to east. Camera 0 maps +x to screen-right. */
export function cellX(index: number): number {
  return (index - 2) * GAP;
}

/** A visitor stands on the near side of a plinth, toward the +z camera. */
export function visitorAt(index: number): readonly [number, number, number] {
  return [cellX(index), 1.15, 1.35];
}

/** The fixed lens sits above its plinth. */
export function lensAt(index: number): readonly [number, number, number] {
  return [cellX(index), 1.85, 0.2];
}

/** The point a cone is aimed at, on the plinth rather than at the floor. */
export function focusAt(index: number): readonly [number, number, number] {
  return [cellX(index), 0.42, 0];
}

/** Unit direction from a watcher to a plinth. ConeGeometry's axis is +Y, so the scene aims that axis here. */
export function gazeVector(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
): [number, number, number] {
  return normalize(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
}

/** Center of a cone whose base sits on the watcher and whose tip reaches toward the plinth. */
export function coneCenter(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  height = 0.7,
): [number, number, number] {
  const dir = gazeVector(from, to);
  const half = height / 2;
  return [from[0] + dir[0] * half, from[1] + dir[1] * half, from[2] + dir[2] * half];
}

export function playerAt(seats: readonly number[]): number {
  return seats.indexOf(0);
}

export function beatVisitors(state: NightState): readonly number[] {
  return state.visitors[state.phase] ?? [];
}

export function watchedCells(state: NightState): Set<number> {
  return new Set([...state.camera, ...beatVisitors(state)]);
}

function seatsFor(start: number): number[] {
  const seats: number[] = [];
  let prop = 1;
  for (let index = 0; index < HALL; index += 1) {
    if (index === start) seats.push(0);
    else {
      seats.push(prop);
      prop += 1;
    }
  }
  return seats;
}

function finish(
  state: NightState,
  seats: readonly number[],
  at: number,
  phase: number,
  action: Act,
  seen: boolean,
): NightState {
  const steps = state.steps + 1;
  const won = !seen && at === state.goal;
  const capped = !seen && !won && steps >= STEP_CAP;
  const loseReason: LoseReason | null = seen ? "seen" : won ? null : capped ? "cap" : null;
  return {
    ...state,
    seats,
    phase: seen ? state.phase : phase,
    steps,
    lastAction: action,
    status: won ? "win" : loseReason ? "lose" : "play",
    loseReason,
  };
}

export function stepNight(state: NightState, action: Act): NightState {
  if (state.status !== "play") return state;
  const at = playerAt(state.seats);
  if (action === "H") return finish(state, state.seats, at, (state.phase + 1) % state.visitors.length, action, false);
  const dest = action === "E" ? at + 1 : at - 1;
  if (dest < 0 || dest >= HALL) return state;
  const eyes = watchedCells(state);
  if (eyes.has(at) || eyes.has(dest)) return finish(state, state.seats, at, state.phase, action, true);
  const seats = state.seats.slice();
  const leaving = seats[at];
  seats[at] = seats[dest] ?? leaving;
  seats[dest] = leaving;
  return finish(state, seats, dest, (state.phase + 1) % state.visitors.length, action, false);
}

export function openActions(state: NightState): Act[] {
  return ACTS.filter((action) => stepNight(state, action) !== state);
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

function makeState(puzzle: NightDef, at: number, steps: number): NightState {
  return {
    puzzleId: puzzle.id,
    seats: seatsFor(at),
    phase: 0,
    goal: puzzle.goal,
    camera: [...puzzle.camera],
    visitors: puzzle.visitors.map((beat) => [...beat]),
    steps,
    status: "play",
    loseReason: null,
    lastAction: null,
  };
}

export function createNight(seed = 0): NightState {
  const puzzle = PUZZLES[puzzleIndexForSeed(seed)] ?? PUZZLES[0];
  return makeState(puzzle, puzzle.start, 0);
}

export function makeNight(input: {
  at?: number;
  goal?: number;
  camera?: readonly number[];
  visitors?: readonly (readonly number[])[];
  steps?: number;
}): NightState {
  const at = input.at ?? 1;
  return makeState(
    {
      id: "custom",
      start: at,
      goal: input.goal ?? 4,
      camera: input.camera ?? [],
      visitors: input.visitors ?? [[], [], []],
    },
    at,
    input.steps ?? 0,
  );
}

export function resign(state: NightState): NightState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
