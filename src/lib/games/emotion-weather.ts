/**
 * 의도 (2026-10-15 세운): 감정 기상청은 좋은 감정을 최대로 모으는 게임이 아니다.
 * 기쁘게 하면 가장 서쪽의 비만 걷히고, 바로 동쪽은 한 단계 마른다.
 * 비를 부르면 가장 서쪽의 가뭄만 풀리고, 바로 동쪽은 한 단계 젖는다.
 * 표식은 가뭄이나 비를 남긴다. 그 균형과 같아질 때까지 순서를 고른다.
 * 네 마을은 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 날씨를 바꾸지 않는다.
 * 자유 문장 입력, 물리 엔진, 감정 점수의 최대화는 이 판의 승패가 아니다.
 *
 * 카메라 0 은 월드 +z 다. 화면 오른쪽이 월드 +x(동쪽)이고, 화면 위가 북쪽(−z)이다.
 * 표식은 마을보다 북쪽에 있다. 칸 번호는 화면 왼쪽(서쪽)부터 1이다.
 * 동쪽 비를 남기는 마을, 강 하나만 남기는 마을, 두 기슭이 다른 마을,
 * 가뭄을 일부러 남기는 마을이 있다.
 */

export const STEP_CAP = 8;
export const LEN = 5;
const GAP = 0.86;

export const DRY = 0;
export const FAIR = 1;
export const WET = 2;

/** North of the town, so camera 0 puts the mark above the districts. */
export const MARK_Z = -0.78;
/** The districts themselves, closer to the camera than the mark. */
export const ROOM_Z = 0.22;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. Every pose stays in the +z hemisphere and faces the town,
 * so screen-right stays world +x and the top of the screen stays north.
 * The view button only swaps among these poses.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 1.35, 4.6],
  [1.2, 1.55, 4.2],
  [0, 2.05, 3.8],
  [-1.15, 1.4, 4.4],
];

export const ACTS = ["C", "R"] as const;
export type Act = (typeof ACTS)[number];
export type LoseReason = "cap" | "resign";

export interface TownState {
  readonly puzzleId: string;
  readonly cells: readonly number[];
  readonly goal: readonly number[];
  readonly read: readonly Act[];
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastAction: Act | null;
}

interface TownDef {
  readonly id: string;
  readonly cells: readonly number[];
  readonly goal: readonly number[];
}

const TOWNS: readonly TownDef[] = [
  { id: "east-rain", cells: [WET, FAIR, DRY, FAIR, DRY], goal: [FAIR, FAIR, WET, WET, DRY] },
  { id: "keep-river", cells: [DRY, FAIR, DRY, WET, DRY], goal: [FAIR, FAIR, FAIR, WET, FAIR] },
  { id: "two-banks", cells: [WET, DRY, FAIR, DRY, FAIR], goal: [FAIR, FAIR, WET, DRY, WET] },
  { id: "kept-dry", cells: [DRY, WET, DRY, FAIR, WET], goal: [FAIR, FAIR, DRY, FAIR, DRY] },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Districts run west to east. Camera 0 maps +x to screen-right. */
export function cellX(index: number): number {
  return (index - 2) * GAP;
}

function stamp(town: TownDef, steps: number): TownState {
  return {
    puzzleId: town.id,
    cells: [...town.cells],
    goal: [...town.goal],
    read: [],
    steps,
    status: "play",
    loseReason: null,
    lastAction: null,
  };
}

/**
 * Joy and rain each answer the westernmost district they fit.
 * The neighbor to the east takes the spill, so clearing the west
 * changes the balance the east still needed.
 * 2026-10-15
 */
function spill(cells: number[], action: Act): boolean {
  if (action === "C") {
    const index = cells.indexOf(WET);
    if (index < 0) return false;
    cells[index] = FAIR;
    if (index + 1 < cells.length) cells[index + 1] = Math.max(DRY, cells[index + 1] - 1);
    return true;
  }
  const index = cells.indexOf(DRY);
  if (index < 0) return false;
  cells[index] = FAIR;
  if (index + 1 < cells.length) cells[index + 1] = Math.min(WET, cells[index + 1] + 1);
  return true;
}

function matches(cells: readonly number[], goal: readonly number[]): boolean {
  return cells.every((cell, index) => cell === goal[index]);
}

export function stepTown(state: TownState, action: Act): TownState {
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

export function openActions(state: TownState): Act[] {
  return ACTS.filter((action) => stepTown(state, action) !== state);
}

export function mixSeed(seed: number): number {
  let mixed = (Number.isFinite(seed) ? Math.trunc(seed) : 0) >>> 0;
  mixed = (mixed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function puzzleIndexForSeed(seed: number): number {
  return mixSeed(seed) % TOWNS.length;
}

export function nextSeed(seed: number): number {
  const current = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return mixSeed(current + 1);
}

export function createTown(seed = 0): TownState {
  const town = TOWNS[puzzleIndexForSeed(seed)] ?? TOWNS[0];
  return stamp(town, 0);
}

export function makeTown(input: {
  cells: readonly number[];
  goal: readonly number[];
  steps?: number;
}): TownState {
  return stamp({ id: "custom", cells: input.cells, goal: input.goal }, input.steps ?? 0);
}

export function resign(state: TownState): TownState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
