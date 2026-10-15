/**
 * 의도 (2026-10-15 세운): 별자리 목동은 빈 하늘로는 걷고, 줄이 별에 닿으면 가벼운 쪽이 움직인다.
 * 가벼운 별은 목동 쪽으로 한 칸 오고, 무거운 별은 목동을 한 칸 끌어당긴다.
 * 이미 깔린 끈과 가운데서 엇갈리는 당김은 일어나지 않는다.
 * 승리는 별이 제 자리로 들어오는 걸음이다. 네 판은 손으로 맞추고 시드가 그중 하나를 고른다.
 * 매 프레임 난수로 길을 만들지 않는다. Math.random 을 넣지 않는다.
 *
 * 칸 0..8 은 3×3 이다. 0 이 왼쪽 위, 1 이 그 오른쪽, 3 이 그 아래.
 * 카메라 0 은 월드 +z 에서 원점을 보므로, 화면 오른쪽이 칸의 오른쪽이고 화면 위가 칸의 위다.
 */

export const STEP_CAP = 8;
export const SPACING = 1.15;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. View 0 sits on world +z and looks at the origin, so screen-right is world +x
 * and screen-up is world +y. The view button only changes which of these is used.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 0.25, 6.5],
  [6.5, 0.25, 0],
  [0, 0.25, -6.5],
  [-6.5, 0.25, 0],
];

export const DIRS = ["left", "right", "up", "down"] as const;
export type Dir = (typeof DIRS)[number];
export type Mass = 1 | 3;
export type LoseReason = "cap" | "resign";

export interface Tether {
  readonly axis: "h" | "v";
  readonly fixed: number;
  readonly lo: number;
  readonly hi: number;
}

export interface Star {
  readonly mass: Mass;
  readonly at: number;
  readonly goal: number;
  readonly tether: Tether | null;
}

export interface SkyState {
  readonly puzzleId: string;
  readonly shepherd: number;
  readonly stars: readonly Star[];
  readonly figure: readonly number[];
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastDir: Dir | null;
}

interface PuzzleDef {
  readonly id: string;
  readonly shepherd: number;
  readonly stars: readonly { readonly mass: Mass; readonly at: number; readonly goal: number }[];
  readonly figure: readonly number[];
}

/**
 * kindle: reel the light star in, then give way to the heavy one, then lead the light star down into its seat.
 * snag: seat the light star across the middle before the heavy rope is laid. The other order crosses.
 * hook: walk to the light star, then nudge the heavy star down and give the freed peg to the light star.
 * long-night: seat the light star first, then walk around and nudge the heavy star up into the corner.
 */
const PUZZLES: readonly PuzzleDef[] = [
  {
    id: "kindle",
    shepherd: 0,
    stars: [
      { mass: 1, at: 2, goal: 4 },
      { mass: 3, at: 3, goal: 6 },
    ],
    figure: [1, 4, 6, 7],
  },
  {
    id: "snag",
    shepherd: 0,
    stars: [
      { mass: 1, at: 5, goal: 4 },
      { mass: 3, at: 7, goal: 8 },
    ],
    figure: [1, 4, 8],
  },
  {
    id: "hook",
    shepherd: 1,
    stars: [
      { mass: 1, at: 6, goal: 4 },
      { mass: 3, at: 4, goal: 7 },
    ],
    figure: [0, 3, 4, 7],
  },
  {
    id: "long-night",
    shepherd: 0,
    stars: [
      { mass: 1, at: 2, goal: 1 },
      { mass: 3, at: 4, goal: 2 },
    ],
    figure: [0, 1, 2, 5],
  },
];

const DELTA: Record<Dir, readonly [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

export function pegOf(index: number): { row: number; col: number } {
  return { row: Math.floor(index / 3), col: index % 3 };
}

export function pegIndex(row: number, col: number): number {
  return row * 3 + col;
}

export function pegPosition(index: number): [number, number, number] {
  const { row, col } = pegOf(index);
  return [(col - 1) * SPACING, (1 - row) * SPACING, 0];
}

/**
 * The cloak stays upright so the head remains screen-up on view 0.
 * The crook, not the spine, points along the pull (2026-10-15).
 */
export function toolOffset(dir: Dir | null): [number, number, number] {
  if (!dir) return [0, 0.16, 0.08];
  const [col, row] = DELTA[dir];
  // A zero component times a sign must stay 0, not -0, so later equality checks hold.
  return [(col * 0.2) || 0, (-row * 0.2) || 0, 0.04];
}

export function ropeBetween(a: number, b: number): Tether {
  const from = pegOf(a);
  const to = pegOf(b);
  if (from.row === to.row) {
    return { axis: "h", fixed: from.row, lo: Math.min(from.col, to.col), hi: Math.max(from.col, to.col) };
  }
  return { axis: "v", fixed: from.col, lo: Math.min(from.row, to.row), hi: Math.max(from.row, to.row) };
}

export function ropesCross(a: Tether | null, b: Tether | null): boolean {
  if (!a || !b || a.axis === b.axis) return false;
  const horizontal = a.axis === "h" ? a : b;
  const vertical = a.axis === "v" ? a : b;
  return vertical.fixed > horizontal.lo
    && vertical.fixed < horizontal.hi
    && horizontal.fixed > vertical.lo
    && horizontal.fixed < vertical.hi;
}

function inside(row: number, col: number): boolean {
  return row >= 0 && row < 3 && col >= 0 && col < 3;
}

export function lineStar(state: SkyState, dir: Dir): { index: number; at: number } | null {
  const [dc, dr] = DELTA[dir];
  const here = pegOf(state.shepherd);
  let row = here.row + dr;
  let col = here.col + dc;
  while (inside(row, col)) {
    const at = pegIndex(row, col);
    const index = state.stars.findIndex((star) => star.at === at);
    if (index >= 0) return { index, at };
    row += dr;
    col += dc;
  }
  return null;
}

function occupy(stars: readonly Star[], at: number): boolean {
  return stars.some((star) => star.at === at);
}

function advance(state: SkyState, dir: Dir, shepherd: number, stars: readonly Star[]): SkyState {
  const steps = state.steps + 1;
  const arrived = stars.some((star, index) => star.at === star.goal && state.stars[index].at !== star.goal);
  const seated = stars.every((star) => star.at === star.goal);
  const won = arrived && seated;
  return {
    ...state,
    shepherd,
    stars,
    steps,
    lastDir: dir,
    status: won ? "win" : steps >= STEP_CAP ? "lose" : "play",
    loseReason: won ? null : steps >= STEP_CAP ? "cap" : null,
  };
}

export function stepDir(state: SkyState, dir: Dir): SkyState {
  if (state.status !== "play" || !DELTA[dir]) return state;
  const [dc, dr] = DELTA[dir];
  const here = pegOf(state.shepherd);
  const nextRow = here.row + dr;
  const nextCol = here.col + dc;
  if (!inside(nextRow, nextCol)) return state;
  const found = lineStar(state, dir);
  if (!found) return advance(state, dir, pegIndex(nextRow, nextCol), state.stars);
  const rope = ropeBetween(state.shepherd, found.at);
  if (state.stars.some((star, index) => index !== found.index && ropesCross(rope, star.tether))) return state;
  const star = state.stars[found.index];
  const from = pegOf(star.at);
  const dist = Math.abs(from.row - here.row) + Math.abs(from.col - here.col);
  let shepherd = state.shepherd;
  let at = star.at;
  if (star.mass === 1) {
    if (dist > 1) {
      at = pegIndex(from.row - dr, from.col - dc);
    } else {
      const backRow = here.row - dr;
      const backCol = here.col - dc;
      if (!inside(backRow, backCol)) return state;
      const back = pegIndex(backRow, backCol);
      if (occupy(state.stars, back)) return state;
      shepherd = back;
      at = state.shepherd;
    }
  } else if (dist > 1) {
    shepherd = pegIndex(nextRow, nextCol);
  } else {
    const forwardRow = from.row + dr;
    const forwardCol = from.col + dc;
    if (!inside(forwardRow, forwardCol)) return state;
    const forward = pegIndex(forwardRow, forwardCol);
    if (occupy(state.stars, forward)) return state;
    at = forward;
    shepherd = star.at;
  }
  const stars = state.stars.map((item, index) => (index === found.index ? { ...item, at, tether: rope } : item));
  return advance(state, dir, shepherd, stars);
}

export function openDirs(state: SkyState): Dir[] {
  return DIRS.filter((dir) => stepDir(state, dir) !== state);
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

function makeState(puzzle: PuzzleDef, steps = 0): SkyState {
  return {
    puzzleId: puzzle.id,
    shepherd: puzzle.shepherd,
    stars: puzzle.stars.map((star) => ({ ...star, tether: null })),
    figure: puzzle.figure,
    steps,
    status: "play",
    loseReason: null,
    lastDir: null,
  };
}

export function createConstellation(seed = 0): SkyState {
  return makeState(PUZZLES[puzzleIndexForSeed(seed)]);
}

export function makeSky(input: {
  shepherd: number;
  stars: readonly { mass: Mass; at: number; goal: number }[];
  steps?: number;
}): SkyState {
  return makeState(
    { id: "custom", shepherd: input.shepherd, stars: input.stars, figure: input.stars.map((star) => star.goal) },
    input.steps ?? 0,
  );
}

export function resign(state: SkyState): SkyState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}
