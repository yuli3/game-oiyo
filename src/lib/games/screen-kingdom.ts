/**
 * 의도 (2026-10-15 세운): 한 화면 왕국은 영토를 넓히는 게임이 아니다.
 * 키우면 표식이 선 칸만 바로 동쪽의 층을 받고, 그 동쪽 칸은 한 층 낮아진다.
 * 걸으면 표식만 한 칸 동쪽으로 옮고, 동쪽 끝이면 서쪽 끝으로 돌아온다.
 * 표식은 남은 높이와 표식의 자리를 함께 맞춘다.
 * 네 왕국은 손으로 맞추고 시드가 그중 하나를 고른다. 매 프레임 난수로 층을 옮기지 않는다.
 * 스크롤, 물리 엔진, 칸을 전부 비우는 점수는 이 판의 승패가 아니다.
 *
 * 카메라 0 은 월드 +z 다. 화면 오른쪽이 월드 +x(동쪽)이고, 화면 위가 북쪽(−z)이다.
 * 표식 줄은 왕국보다 북쪽에 있다. 칸 번호는 화면 왼쪽(서쪽)부터 1이다.
 * 성채 옆에 서야 키울 수 있는 왕국, 집을 비우고 성채를 세우는 왕국,
 * 성채와 집을 맞바꾼 뒤 서쪽으로 돌아오는 왕국, 집을 한 칸 서쪽으로 옮기고 제자리로 돌아오는 왕국이 있다.
 */

export const STEP_CAP = 8;
export const LEN = 5;
const GAP = 0.86;

export const YARD = 0;
export const HOUSE = 1;
export const KEEP = 2;

/** North of the plots, so camera 0 puts the mark above the kingdom. */
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

export const ACTS = ["R", "W"] as const;
export type Act = (typeof ACTS)[number];
export type LoseReason = "cap" | "resign";

export interface KingdomState {
  readonly puzzleId: string;
  readonly cells: readonly number[];
  readonly mark: number;
  readonly goal: readonly number[];
  readonly goalMark: number;
  readonly read: readonly Act[];
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastAction: Act | null;
}

interface RealmDef {
  readonly id: string;
  readonly cells: readonly number[];
  readonly mark: number;
  readonly goal: readonly number[];
  readonly goalMark: number;
}

const REALMS: readonly RealmDef[] = [
  { id: "beside-keep", cells: [YARD, YARD, YARD, KEEP, HOUSE], mark: 1, goal: [YARD, YARD, KEEP, YARD, HOUSE], goalMark: 2 },
  { id: "clear-house", cells: [YARD, YARD, YARD, HOUSE, KEEP], mark: 2, goal: [YARD, YARD, HOUSE, KEEP, YARD], goalMark: 3 },
  { id: "swapped-keep", cells: [YARD, YARD, YARD, HOUSE, KEEP], mark: 2, goal: [YARD, YARD, YARD, KEEP, HOUSE], goalMark: 1 },
  { id: "return-court", cells: [YARD, YARD, YARD, HOUSE, KEEP], mark: 0, goal: [YARD, YARD, HOUSE, YARD, KEEP], goalMark: 0 },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Plots run west to east. Camera 0 maps +x to screen-right. */
export function cellX(index: number): number {
  return (index - 2) * GAP;
}

function stamp(realm: RealmDef, steps: number): KingdomState {
  return {
    puzzleId: realm.id,
    cells: [...realm.cells],
    mark: realm.mark,
    goal: [...realm.goal],
    goalMark: realm.goalMark,
    read: [],
    steps,
    status: "play",
    loseReason: null,
    lastAction: null,
  };
}

/**
 * Raising takes one story from the east neighbor into the marked plot and leaves the mark there.
 * Walking moves only the mark one plot east, and the east end returns to the west end.
 * 2026-10-15
 */
function trace(cells: number[], mark: number, action: Act): { cells: number[]; mark: number } | null {
  if (action === "W") return { cells: cells.slice(), mark: (mark + 1) % LEN };
  if (mark >= LEN - 1 || cells[mark] >= KEEP || cells[mark + 1] <= YARD) return null;
  const next = cells.slice();
  next[mark] += 1;
  next[mark + 1] -= 1;
  return { cells: next, mark };
}

function matches(cells: readonly number[], goal: readonly number[], mark: number, goalMark: number): boolean {
  return mark === goalMark && cells.every((cell, index) => cell === goal[index]);
}

export function stepKingdom(state: KingdomState, action: Act): KingdomState {
  if (state.status !== "play") return state;
  const moved = trace(state.cells.slice(), state.mark, action);
  if (!moved) return state;
  const steps = state.steps + 1;
  const won = matches(moved.cells, state.goal, moved.mark, state.goalMark);
  const capped = !won && steps >= STEP_CAP;
  return {
    ...state,
    cells: moved.cells,
    mark: moved.mark,
    read: [...state.read, action],
    steps,
    lastAction: action,
    status: won ? "win" : capped ? "lose" : "play",
    loseReason: won ? null : capped ? "cap" : null,
  };
}

export function openActions(state: KingdomState): Act[] {
  return ACTS.filter((action) => stepKingdom(state, action) !== state);
}

export function mixSeed(seed: number): number {
  let mixed = (Number.isFinite(seed) ? Math.trunc(seed) : 0) >>> 0;
  mixed = (mixed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function puzzleIndexForSeed(seed: number): number {
  return mixSeed(seed) % REALMS.length;
}

export function nextSeed(seed: number): number {
  const current = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return mixSeed(current + 1);
}

export function createKingdom(seed = 0): KingdomState {
  const realm = REALMS[puzzleIndexForSeed(seed)] ?? REALMS[0];
  return stamp(realm, 0);
}

export function makeKingdom(input: {
  cells: readonly number[];
  mark?: number;
  goal: readonly number[];
  goalMark?: number;
  steps?: number;
}): KingdomState {
  return stamp({
    id: "custom",
    cells: input.cells,
    mark: input.mark ?? 0,
    goal: input.goal,
    goalMark: input.goalMark ?? 0,
  }, input.steps ?? 0);
}

export function resign(state: KingdomState): KingdomState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
