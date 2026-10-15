/**
 * 의도 (2026-10-15 세운): 구름 조각사는 구름을 더하지 않는다.
 * 가운데 돌은 바람이 지나지 못한다. 바람을 한 방향으로 깎으면 구름은 그쪽으로 한 칸 밀리고,
 * 돌에 닿거나 판 밖으로 나간 덩이는 흩어진다. 남은 덩이가 목표 칸과 같으면 그 카드가 남는다.
 * 처음 구름은 목표보다 항상 커서, 전부 보존하는 수는 없다.
 * 네 하늘은 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 구름을 옮기지 않는다.
 * 카드는 이 방문의 화면만 남기고 기기에는 저장하지 않는다.
 *
 * 카메라 0 은 월드 +z 다. 그래서 화면 오른쪽이 월드 +x(동쪽), 화면 위가 월드 +y(북쪽)이다.
 */

export const STEP_CAP = 8;
export const STONE = 4;
const GAP = 0.78;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. Every pose stays in the +z hemisphere and looks at the sky,
 * so screen-right stays world +x and screen-up stays world +y.
 * The view button only swaps among these poses.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 0.4, 4.6],
  [1.2, 1.1, 4.2],
  [0, 1.35, 3.7],
  [-1.15, 0.7, 4.4],
];

export const DIRS = ["N", "E", "S", "W"] as const;
export type Dir = (typeof DIRS)[number];
export type LoseReason = "cap" | "resign" | "scattered";

export interface CloudState {
  readonly puzzleId: string;
  readonly cells: readonly number[];
  readonly target: readonly number[];
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastAction: Dir | null;
}

interface PuzzleDef {
  readonly id: string;
  readonly cells: readonly number[];
  readonly target: readonly number[];
}

/**
 * lee-side: east gathers the pair, then south sends one puff into the stone.
 * cross-cut: south drops the pair, then east sends the upper puff into the stone.
 * high-blow: west splits the pair, then two north winds carry the survivor up after the other blows off.
 * shed-east: the first east wind sheds the corner, then the remaining puff walks to the mark.
 */
const PUZZLES: readonly PuzzleDef[] = [
  { id: "lee-side", cells: [0, 1], target: [5] },
  { id: "cross-cut", cells: [0, 3], target: [7] },
  { id: "high-blow", cells: [1, 7], target: [0] },
  { id: "shed-east", cells: [0, 2], target: [3] },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Columns run west to east. Camera 0 maps +x to screen-right. */
export function cellX(index: number): number {
  return (index % 3 - 1) * GAP;
}

/** Rows run north to south. Camera 0 maps +y to screen-up. */
export function cellY(index: number): number {
  return (1 - Math.floor(index / 3)) * GAP;
}

/**
 * Where a puff is blown, including off the board and into the stone.
 * Callers that keep puffs use destination() instead. The scene uses this
 * so a dispersing puff slides toward the place that removed it.
 */
export function aimPoint(cell: number, dir: Dir): readonly [number, number] {
  let column = cell % 3;
  let row = Math.floor(cell / 3);
  if (dir === "E") column += 1;
  else if (dir === "W") column -= 1;
  else if (dir === "N") row -= 1;
  else row += 1;
  return [(column - 1) * GAP, (1 - row) * GAP];
}

/** Null when the wind leaves the 3×3 sky or runs into the center stone. */
export function destination(cell: number, dir: Dir): number | null {
  let column = cell % 3;
  let row = Math.floor(cell / 3);
  if (dir === "E") column += 1;
  else if (dir === "W") column -= 1;
  else if (dir === "N") row -= 1;
  else row += 1;
  if (column < 0 || column > 2 || row < 0 || row > 2) return null;
  const next = row * 3 + column;
  if (next === STONE) return null;
  return next;
}

export function blow(cells: readonly number[], dir: Dir): number[] {
  const next = new Set<number>();
  for (const cell of cells) {
    const to = destination(cell, dir);
    // A uniform wind on this grid does not land two puffs on one open cell.
    // The set still refuses a doubled cell if a later rule ever stacks them. 2026-10-15
    if (to !== null) next.add(to);
  }
  return [...next].sort((left, right) => left - right);
}

function sameCells(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((cell, index) => cell === right[index]);
}

function finish(state: CloudState, cells: readonly number[], action: Dir): CloudState {
  const steps = state.steps + 1;
  const won = sameCells(cells, state.target);
  const scattered = !won && cells.length === 0;
  const capped = !won && !scattered && steps >= STEP_CAP;
  const loseReason: LoseReason | null = won ? null : scattered ? "scattered" : capped ? "cap" : null;
  return {
    ...state,
    cells,
    steps,
    lastAction: action,
    status: won ? "win" : loseReason ? "lose" : "play",
    loseReason,
  };
}

export function stepCloud(state: CloudState, action: Dir): CloudState {
  if (state.status !== "play") return state;
  const cells = blow(state.cells, action);
  if (sameCells(cells, state.cells)) return state;
  return finish(state, cells, action);
}

export function openActions(state: CloudState): Dir[] {
  return DIRS.filter((action) => stepCloud(state, action) !== state);
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

function makeState(puzzle: PuzzleDef, cells: readonly number[], steps = 0): CloudState {
  return {
    puzzleId: puzzle.id,
    cells: [...cells].sort((left, right) => left - right),
    target: [...puzzle.target].sort((left, right) => left - right),
    steps,
    status: "play",
    loseReason: null,
    lastAction: null,
  };
}

export function createCloud(seed = 0): CloudState {
  const puzzle = PUZZLES[puzzleIndexForSeed(seed)] ?? PUZZLES[0];
  return makeState(puzzle, puzzle.cells);
}

export function makeCloud(input: { cells: readonly number[]; target?: readonly number[]; steps?: number }): CloudState {
  return makeState(
    { id: "custom", cells: input.cells, target: input.target ?? [8] },
    input.cells,
    input.steps ?? 0,
  );
}

export function resign(state: CloudState): CloudState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
