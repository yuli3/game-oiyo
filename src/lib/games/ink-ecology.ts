/**
 * 의도 (2026-10-15 세운): 잉크 생태계는 그림을 잘 그리는 게임이 아니다.
 * 원은 서쪽 빈 연못에 포자를 낳고, 직선은 동쪽 빈 연못에 다리를 세운다.
 * 다리가 서는 칸의 바로 서쪽에 포자가 있으면 그 포자는 먹힌다.
 * 바람은 가장 동쪽 포자만 한 칸 동쪽으로 민다. 그 칸이 다리이거나 연못 밖이면 포자는 사라진다.
 * 다리는 한 번 서면 남지 않는 법이 없고, 연못이 표식과 같아지면 그 계절이 끝난다.
 * 네 계절은 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 생물을 움직이지 않는다.
 *
 * 카메라 0 은 월드 +z 다. 화면 오른쪽이 월드 +x(동쪽)이고 화면 왼쪽이 서쪽이다.
 * fed-bridge: 동쪽 포자는 연못 밖으로 나가고, 남은 포자가 동쪽 끝 앞에 서면 다리가 먹는다.
 * beside-bridge: 직선이 동쪽 끝 포자를 먹고, 서쪽 포자는 다리 앞까지만 온다.
 * held-spore: 동쪽 다리를 세운 뒤 포자를 한 칸 밀고, 두 번째 다리가 포자를 사이에 둔다.
 * late-legs: 이미 있는 동쪽 다리 앞까지 포자를 민 다음, 새 다리는 그 포자의 서쪽 빈 칸에 선다.
 */

export const STEP_CAP = 8;
export const POND = 5;
const GAP = 0.78;

export const EMPTY = 0;
export const SPORE = 1;
export const LEGS = 2;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. Every pose stays in the +z hemisphere and looks at the pond,
 * so screen-right stays world +x. The view button only swaps among these poses.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 1.35, 4.6],
  [1.2, 1.55, 4.2],
  [0, 2.05, 3.8],
  [-1.15, 1.4, 4.4],
];

export const ACTS = ["C", "G", "L"] as const;
export type Act = (typeof ACTS)[number];
export type LoseReason = "cap" | "resign";

export interface PondState {
  readonly puzzleId: string;
  readonly cells: readonly number[];
  readonly ids: readonly number[];
  readonly nextId: number;
  readonly goal: readonly number[];
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastAction: Act | null;
}

interface PondDef {
  readonly id: string;
  readonly cells: readonly number[];
  readonly goal: readonly number[];
}

const PUZZLES: readonly PondDef[] = [
  { id: "fed-bridge", cells: [EMPTY, EMPTY, SPORE, EMPTY, SPORE], goal: [EMPTY, EMPTY, EMPTY, EMPTY, LEGS] },
  { id: "beside-bridge", cells: [SPORE, EMPTY, EMPTY, SPORE, EMPTY], goal: [EMPTY, EMPTY, SPORE, EMPTY, LEGS] },
  { id: "held-spore", cells: [EMPTY, EMPTY, SPORE, EMPTY, EMPTY], goal: [EMPTY, EMPTY, LEGS, SPORE, LEGS] },
  { id: "late-legs", cells: [EMPTY, EMPTY, EMPTY, EMPTY, LEGS], goal: [EMPTY, EMPTY, LEGS, EMPTY, LEGS] },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Ponds run west to east. Camera 0 maps +x to screen-right. */
export function cellX(index: number): number {
  return (index - 2) * GAP;
}

/** Unit direction from a watcher to a point. ConeGeometry's axis is +Y, so the scene aims that axis here. */
export function gazeVector(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
): [number, number, number] {
  return normalize(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
}

/** Center of a cone whose base sits on the origin and whose tip reaches toward the target. */
export function coneCenter(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  height = 1.15,
): [number, number, number] {
  const dir = gazeVector(from, to);
  const half = height / 2;
  return [from[0] + dir[0] * half, from[1] + dir[1] * half, from[2] + dir[2] * half];
}

/** The gust crosses the pond toward +x, slightly downward, so the cone tip is the east end. */
export function windFrom(): readonly [number, number, number] {
  return [-1.7, 0.72, 0.35];
}

export function windTo(): readonly [number, number, number] {
  return [1.7, 0.5, 0.12];
}

function westEmpty(cells: readonly number[]): number {
  for (let index = 0; index < cells.length; index += 1) {
    if (cells[index] === EMPTY) return index;
  }
  return -1;
}

function eastEmpty(cells: readonly number[]): number {
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    if (cells[index] === EMPTY) return index;
  }
  return -1;
}

function eastSpore(cells: readonly number[]): number {
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    if (cells[index] === SPORE) return index;
  }
  return -1;
}

function stamp(puzzle: PondDef, steps: number): PondState {
  let nextId = 1;
  const ids = puzzle.cells.map((cell) => {
    if (cell === EMPTY) return 0;
    const id = nextId;
    nextId += 1;
    return id;
  });
  return {
    puzzleId: puzzle.id,
    cells: [...puzzle.cells],
    ids,
    nextId,
    goal: [...puzzle.goal],
    steps,
    status: "play",
    loseReason: null,
    lastAction: null,
  };
}

function finish(state: PondState, cells: number[], ids: number[], nextId: number, action: Act): PondState {
  const steps = state.steps + 1;
  const won = cells.every((cell, index) => cell === state.goal[index]);
  const capped = !won && steps >= STEP_CAP;
  return {
    ...state,
    cells,
    ids,
    nextId,
    steps,
    lastAction: action,
    status: won ? "win" : capped ? "lose" : "play",
    loseReason: won ? null : capped ? "cap" : null,
  };
}

export function stepPond(state: PondState, action: Act): PondState {
  if (state.status !== "play") return state;
  const cells = state.cells.slice();
  const ids = state.ids.slice();
  let nextId = state.nextId;
  if (action === "C") {
    const index = westEmpty(cells);
    if (index < 0) return state;
    cells[index] = SPORE;
    ids[index] = nextId;
    nextId += 1;
    return finish(state, cells, ids, nextId, action);
  }
  if (action === "L") {
    const index = eastEmpty(cells);
    if (index < 0) return state;
    cells[index] = LEGS;
    ids[index] = nextId;
    nextId += 1;
    if (index > 0 && cells[index - 1] === SPORE) {
      cells[index - 1] = EMPTY;
      ids[index - 1] = 0;
    }
    return finish(state, cells, ids, nextId, action);
  }
  const index = eastSpore(cells);
  if (index < 0) return state;
  const dest = index + 1;
  if (dest >= cells.length || cells[dest] === LEGS) {
    cells[index] = EMPTY;
    ids[index] = 0;
  } else {
    cells[dest] = SPORE;
    ids[dest] = ids[index] ?? 0;
    cells[index] = EMPTY;
    ids[index] = 0;
  }
  return finish(state, cells, ids, nextId, action);
}

export function openActions(state: PondState): Act[] {
  return ACTS.filter((action) => stepPond(state, action) !== state);
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

export function createPond(seed = 0): PondState {
  const puzzle = PUZZLES[puzzleIndexForSeed(seed)] ?? PUZZLES[0];
  return stamp(puzzle, 0);
}

export function makePond(input: {
  cells?: readonly number[];
  goal?: readonly number[];
  steps?: number;
}): PondState {
  const cells = input.cells ? [...input.cells] : [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
  const goal = input.goal ? [...input.goal] : [EMPTY, EMPTY, EMPTY, EMPTY, LEGS];
  return stamp({ id: "custom", cells, goal }, input.steps ?? 0);
}

export function resign(state: PondState): PondState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
