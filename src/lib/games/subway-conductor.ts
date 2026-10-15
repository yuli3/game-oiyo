/**
 * 의도 (2026-10-15 세운): 지하철 지휘자는 노선을 그리는 게임이 아니다.
 * 붙잡으면 가장 서쪽의 지연만 한 박자 줄고, 바로 동쪽은 한 단계 한산해진다.
 * 보내면 가장 서쪽의 정시만 떠나고, 바로 동쪽은 한 단계 밀린다.
 * 표식은 한산과 지연을 남긴다. 모두 비우거나 모두 정시로 만드는 순서는 답이 아니다.
 * 네 시각표는 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 열차를 움직이지 않는다.
 * 자유 노선, 물리 엔진, 승객 점수의 최대화는 이 판의 승패가 아니다.
 *
 * 카메라 0 은 월드 +z 다. 화면 오른쪽이 월드 +x(동쪽)이고, 화면 위가 북쪽(−z)이다.
 * 표식은 승강장보다 북쪽에 있다. 칸 번호는 화면 왼쪽(서쪽)부터 1이다.
 * 지연을 가운데 남기는 시각표, 다음 묶음을 남기는 시각표,
 * 동쪽 끝에 정시를 남기는 시각표, 지연을 동쪽 끝까지 민 시각표가 있다.
 */

export const STEP_CAP = 8;
export const LEN = 5;
const GAP = 0.86;

export const QUIET = 0;
export const DUE = 1;
export const LATE = 2;

/** North of the platforms, so camera 0 puts the mark above the line. */
export const MARK_Z = -0.78;
/** The platforms themselves, closer to the camera than the mark. */
export const ROOM_Z = 0.22;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. Every pose stays in the +z hemisphere and faces the line,
 * so screen-right stays world +x and the top of the screen stays north.
 * The view button only swaps among these poses.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 1.35, 4.6],
  [1.2, 1.55, 4.2],
  [0, 2.05, 3.8],
  [-1.15, 1.4, 4.4],
];

export const ACTS = ["H", "S"] as const;
export type Act = (typeof ACTS)[number];
export type LoseReason = "cap" | "resign";

export interface LineState {
  readonly puzzleId: string;
  readonly cells: readonly number[];
  readonly goal: readonly number[];
  readonly read: readonly Act[];
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastAction: Act | null;
}

interface LineDef {
  readonly id: string;
  readonly cells: readonly number[];
  readonly goal: readonly number[];
}

const LINES: readonly LineDef[] = [
  { id: "kept-late", cells: [LATE, DUE, DUE, QUIET, QUIET], goal: [QUIET, DUE, LATE, QUIET, QUIET] },
  { id: "second-bunch", cells: [LATE, DUE, QUIET, DUE, QUIET], goal: [QUIET, QUIET, LATE, DUE, QUIET] },
  { id: "east-due", cells: [LATE, LATE, DUE, DUE, QUIET], goal: [QUIET, LATE, QUIET, QUIET, DUE] },
  { id: "pushed-late", cells: [LATE, DUE, QUIET, QUIET, DUE], goal: [QUIET, QUIET, DUE, QUIET, LATE] },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Platforms run west to east. Camera 0 maps +x to screen-right. */
export function cellX(index: number): number {
  return (index - 2) * GAP;
}

function stamp(line: LineDef, steps: number): LineState {
  return {
    puzzleId: line.id,
    cells: [...line.cells],
    goal: [...line.goal],
    read: [],
    steps,
    status: "play",
    loseReason: null,
    lastAction: null,
  };
}

/**
 * Holding eases only the westernmost late train, and the east gets one step quieter.
 * Sending clears only the westernmost due train, and the east takes one step of the bunch.
 * 2026-10-15
 */
function spill(cells: number[], action: Act): boolean {
  if (action === "H") {
    const index = cells.indexOf(LATE);
    if (index < 0) return false;
    cells[index] = DUE;
    if (index + 1 < cells.length) cells[index + 1] = Math.max(QUIET, cells[index + 1] - 1);
    return true;
  }
  const index = cells.indexOf(DUE);
  if (index < 0) return false;
  cells[index] = QUIET;
  if (index + 1 < cells.length) cells[index + 1] = Math.min(LATE, cells[index + 1] + 1);
  return true;
}

function matches(cells: readonly number[], goal: readonly number[]): boolean {
  return cells.every((cell, index) => cell === goal[index]);
}

export function stepLine(state: LineState, action: Act): LineState {
  if (state.status !== "play") return state;
  const cells = state.cells.slice();
  if (!spill(cells, action)) return state;
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
  return mixSeed(seed) % LINES.length;
}

export function nextSeed(seed: number): number {
  const current = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return mixSeed(current + 1);
}

export function createLine(seed = 0): LineState {
  const line = LINES[puzzleIndexForSeed(seed)] ?? LINES[0];
  return stamp(line, 0);
}

export function makeLine(input: {
  cells: readonly number[];
  goal: readonly number[];
  steps?: number;
}): LineState {
  return stamp({ id: "custom", cells: input.cells, goal: input.goal }, input.steps ?? 0);
}

export function resign(state: LineState): LineState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
