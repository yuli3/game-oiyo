/**
 * 의도 (2026-10-15 세운): 낙서 방어선은 그림을 잘 그리는 게임이 아니다.
 * 펜은 이어진 한 획만 그린다. 돌은 지나가지 못하고, 이미 그린 칸으로는 돌아가지 않는다.
 * 손을 떼면 적이 북쪽 끝에서 남쪽으로 걸어오고, 그 줄에 잉크가 있으면 막히고 없으면 기지가 뚫린다.
 * 네 장은 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 적을 움직이지 않는다.
 * 자유 손그림, 물리 엔진, 적을 쏘는 버튼은 이 판의 승패가 아니다.
 *
 * 카메라 0 은 월드 +z 다. 화면 오른쪽이 월드 +x(동쪽)이고, 화면 위가 북쪽(−z)이다.
 * 남쪽 기지는 카메라 쪽에 있다. 열 번호는 화면에서 1부터 센다.
 * 북쪽 가장자리만으로 두 위협 열이 막히는 장, 북쪽 한 칸이 돌인 장,
 * 남쪽으로 들어가면 막다른 장, 동쪽 끝 열까지 가야 하는 장이 있다.
 */

export const STEP_CAP = 8;
export const COLS = 4;
export const ROWS = 3;
const GAP = 0.78;

export const EMPTY = 0;
export const INK = 1;
export const STONE = 2;

/** North of row 0, before the hand lets go. */
export const SPAWN = -1;
/** This column has no enemy. */
export const ABSENT = -2;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. Every pose stays in the +z hemisphere and looks at the page,
 * so screen-right stays world +x and the top of the screen stays north.
 * The view button only swaps among these poses.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 1.35, 4.6],
  [1.2, 1.55, 4.2],
  [0, 2.05, 3.8],
  [-1.15, 1.4, 4.4],
];

export const ACTS = ["N", "E", "S", "W", "H"] as const;
export type Act = (typeof ACTS)[number];
export type LoseReason = "cap" | "breach" | "resign";
export type Reject = "off" | "stone" | "ink";

export interface LineState {
  readonly puzzleId: string;
  readonly cells: readonly number[];
  readonly stroke: readonly number[];
  readonly tip: number;
  readonly threats: readonly number[];
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastAction: Act | null;
  /** Per column: spawn, absent, the northern ink row, or ROWS when the base is open. */
  readonly caught: readonly number[];
}

interface LineDef {
  readonly id: string;
  readonly start: readonly [number, number];
  readonly stones: readonly (readonly [number, number])[];
  readonly threats: readonly number[];
}

const DIR: Record<Exclude<Act, "H">, readonly [number, number]> = {
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0],
};

const PUZZLES: readonly LineDef[] = [
  { id: "near-span", start: [0, 0], stones: [], threats: [0, 2] },
  { id: "stone-hook", start: [0, 0], stones: [[1, 0]], threats: [0, 2] },
  { id: "trap-south", start: [0, 1], stones: [[0, 0], [1, 2], [2, 1]], threats: [0, 2] },
  { id: "far-lane", start: [0, 0], stones: [[1, 0]], threats: [0, 3] },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Columns run west to east. Camera 0 maps +x to screen-right. */
export function cellX(col: number): number {
  return (col - 1.5) * GAP;
}

/** Rows run north to south. Row 0 is −z, which camera 0 puts at the top of the screen. */
export function cellZ(row: number): number {
  return (row - 1) * GAP;
}

export function cellIndex(col: number, row: number): number {
  return row * COLS + col;
}

export function colOf(index: number): number {
  return index % COLS;
}

export function rowOf(index: number): number {
  return Math.floor(index / COLS);
}

function stamp(puzzle: LineDef, steps: number): LineState {
  const cells = Array.from({ length: COLS * ROWS }, () => EMPTY);
  for (const [col, row] of puzzle.stones) cells[cellIndex(col, row)] = STONE;
  const start = cellIndex(puzzle.start[0], puzzle.start[1]);
  cells[start] = INK;
  const caught = Array.from({ length: COLS }, () => ABSENT);
  for (const col of puzzle.threats) caught[col] = SPAWN;
  return {
    puzzleId: puzzle.id,
    cells,
    stroke: [start],
    tip: start,
    threats: [...puzzle.threats],
    steps,
    status: "play",
    loseReason: null,
    lastAction: null,
    caught,
  };
}

function release(state: LineState): LineState {
  const caught = state.caught.slice();
  let breach = false;
  for (const col of state.threats) {
    let north = -1;
    for (let row = 0; row < ROWS; row += 1) {
      if (state.cells[cellIndex(col, row)] === INK) {
        north = row;
        break;
      }
    }
    if (north < 0) {
      caught[col] = ROWS;
      breach = true;
    } else {
      caught[col] = north;
    }
  }
  const steps = state.steps + 1;
  return {
    ...state,
    steps,
    caught,
    lastAction: "H",
    status: breach ? "lose" : "win",
    loseReason: breach ? "breach" : null,
  };
}

/** Why a pen step does nothing. Letting go is never rejected here. */
export function rejectReason(state: LineState, action: Act): Reject | null {
  if (action === "H" || state.status !== "play") return null;
  const [dc, dr] = DIR[action];
  const col = colOf(state.tip) + dc;
  const row = rowOf(state.tip) + dr;
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return "off";
  const cell = state.cells[cellIndex(col, row)];
  if (cell === STONE) return "stone";
  if (cell === INK) return "ink";
  return null;
}

export function stepLine(state: LineState, action: Act): LineState {
  if (state.status !== "play") return state;
  if (action === "H") return release(state);
  if (rejectReason(state, action)) return state;
  const [dc, dr] = DIR[action];
  const index = cellIndex(colOf(state.tip) + dc, rowOf(state.tip) + dr);
  const cells = state.cells.slice();
  cells[index] = INK;
  const steps = state.steps + 1;
  const capped = steps >= STEP_CAP;
  return {
    ...state,
    cells,
    stroke: [...state.stroke, index],
    tip: index,
    steps,
    lastAction: action,
    status: capped ? "lose" : "play",
    loseReason: capped ? "cap" : null,
  };
}

export function openActions(state: LineState): Act[] {
  return ACTS.filter((action) => stepLine(state, action) !== state);
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

export function createLine(seed = 0): LineState {
  const puzzle = PUZZLES[puzzleIndexForSeed(seed)] ?? PUZZLES[0];
  return stamp(puzzle, 0);
}

export function makeLine(input: {
  start?: readonly [number, number];
  stones?: readonly (readonly [number, number])[];
  threats?: readonly number[];
  steps?: number;
}): LineState {
  return stamp(
    {
      id: "custom",
      start: input.start ?? [0, 0],
      stones: input.stones ?? [],
      threats: input.threats ?? [0],
    },
    input.steps ?? 0,
  );
}

export function resign(state: LineState): LineState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
