/**
 * 의도 (2026-10-15 세운): 유리 행성 겉과 안은 정반대 칸에 묶인다.
 * 한 축을 누르면 두 탐사가가 함께 한 칸 움직이되, 양쪽 이음이 모두 열려 있을 때만 간다.
 * 출구는 걸어 들어간 걸음만 인정한다. 네 판은 손으로 맞추고 시드가 그중 하나를 고른다.
 * 매 프레임 난수로 길을 만들지 않는다. Math.random 을 넣지 않는다.
 *
 * 칸 0..7 은 정육면체 꼭짓점이다. 비트 1·2·4 가 +x·+y·+z.
 * 맞은편은 세 비트를 뒤집은 칸이다. 위치는 그 방향을 구면에 올린 한 함수다.
 */

export const STEP_CAP = 8;
export const SHELL = 1.25;
export const CORE = 0.62;

/** Same direction as the other arcade scenes, kept as a plain array so this route does not import another game. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

/**
 * Fixed cameras. View 0 sits on world +z and looks at the origin, so screen-right is world +x.
 * The view button only changes which of these is used. It does not move either walker.
 */
export const CAMERA_POSES: readonly (readonly [number, number, number])[] = [
  [0, 0.95, 3.55],
  [3.55, 0.95, 0],
  [0, 0.95, -3.55],
  [-3.55, 0.95, 0],
];

export type AxisBit = 1 | 2 | 4;
export type OuterTag = "empty" | "crack" | "exit";
export type InnerTag = "empty" | "void" | "exit";
export type LoseReason = "trap" | "cap" | "resign";

export interface PlanetState {
  readonly puzzleId: string;
  readonly outer: number;
  readonly outerTags: readonly OuterTag[];
  readonly innerTags: readonly InnerTag[];
  readonly outerEdges: number;
  readonly innerEdges: number;
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
  readonly lastBit: AxisBit | null;
}

interface PuzzleDef {
  readonly id: string;
  readonly outer: readonly OuterTag[];
  readonly inner: readonly InnerTag[];
  readonly outerEdges: number;
  readonly innerEdges: number;
}

const empty = "empty" as const;
const ALL_EDGES = 0xfff;

/**
 * meridian: the first step along x or the cell two flips away is glass or a void.
 * sealed: the x seam and the inner depth seam are shut, so only upright then across wins.
 * echo: the first across and depth seams are shut. A later side step is a crack.
 * long-way: the short across step drops the inner walker into a void. The long walk is the exit.
 */
const PUZZLES: readonly PuzzleDef[] = [
  {
    id: "meridian",
    outer: [empty, "crack", empty, empty, empty, "crack", empty, "exit"],
    inner: ["exit", empty, empty, empty, empty, "void", empty, empty],
    outerEdges: ALL_EDGES,
    innerEdges: ALL_EDGES,
  },
  {
    id: "sealed",
    outer: [empty, empty, empty, "exit", empty, empty, "crack", empty],
    inner: [empty, empty, empty, empty, "exit", empty, empty, empty],
    outerEdges: maskExcept([[0, 1]]),
    innerEdges: maskExcept([[7, 4]]),
  },
  {
    id: "echo",
    outer: [empty, empty, empty, empty, "crack", empty, empty, "exit"],
    inner: ["exit", empty, empty, empty, empty, empty, empty, empty],
    outerEdges: maskExcept([[0, 1], [0, 4]]),
    innerEdges: maskExcept([[5, 1]]),
  },
  {
    id: "long-way",
    outer: [empty, empty, empty, empty, "crack", "exit", empty, empty],
    inner: [empty, empty, "exit", empty, empty, empty, "void", empty],
    outerEdges: maskExcept([[2, 4]]),
    innerEdges: ALL_EDGES,
  },
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function cross(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function antipode(cell: number): number {
  return (cell & 7) ^ 7;
}

export function cellDirection(cell: number): [number, number, number] {
  const index = cell & 7;
  return normalize(index & 1 ? 1 : -1, index & 2 ? 1 : -1, index & 4 ? 1 : -1);
}

export function cellPosition(cell: number, radius: number): [number, number, number] {
  const [x, y, z] = cellDirection(cell);
  return [x * radius, y * radius, z * radius];
}

/** Twelve cube edges. The lower endpoint of each axis-bit maps to one slot in 0..11. */
export function edgeKey(cell: number, bit: AxisBit): number {
  const lo = Math.min(cell & 7, (cell & 7) ^ bit);
  if (bit === 1) return lo >> 1;
  if (bit === 2) return 4 + (lo & 1) + ((lo & 4) >> 1);
  return 8 + (lo & 3);
}

function maskExcept(closed: readonly (readonly [number, AxisBit])[]): number {
  let mask = ALL_EDGES;
  for (const [cell, bit] of closed) mask &= ~(1 << edgeKey(cell, bit));
  return mask;
}

export function edgeOpen(mask: number, cell: number, bit: AxisBit): boolean {
  return (mask & (1 << edgeKey(cell, bit))) !== 0;
}

export function axisOpen(state: PlanetState, bit: AxisBit): boolean {
  if (state.status !== "play") return false;
  return edgeOpen(state.outerEdges, state.outer, bit) && edgeOpen(state.innerEdges, antipode(state.outer), bit);
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

function makeState(puzzle: PuzzleDef, outer = 0, steps = 0): PlanetState {
  return {
    puzzleId: puzzle.id,
    outer: outer & 7,
    outerTags: puzzle.outer.slice(),
    innerTags: puzzle.inner.slice(),
    outerEdges: puzzle.outerEdges,
    innerEdges: puzzle.innerEdges,
    steps,
    status: "play",
    loseReason: null,
    lastBit: null,
  };
}

export function createGlassPlanet(seed = 0): PlanetState {
  return makeState(PUZZLES[puzzleIndexForSeed(seed)]);
}

export function makePlanet(input: {
  outerTags: readonly OuterTag[];
  innerTags: readonly InnerTag[];
  outerEdges?: number;
  innerEdges?: number;
  outer?: number;
  steps?: number;
}): PlanetState {
  return makeState(
    {
      id: "custom",
      outer: input.outerTags,
      inner: input.innerTags,
      outerEdges: input.outerEdges ?? ALL_EDGES,
      innerEdges: input.innerEdges ?? ALL_EDGES,
    },
    input.outer ?? 0,
    input.steps ?? 0,
  );
}

function isBit(bit: number): bit is AxisBit {
  return bit === 1 || bit === 2 || bit === 4;
}

export function stepAxis(state: PlanetState, bit: AxisBit): PlanetState {
  if (state.status !== "play" || !isBit(bit) || !axisOpen(state, bit)) return state;
  const dest = (state.outer ^ bit) & 7;
  const steps = state.steps + 1;
  const outerTag = state.outerTags[dest];
  const innerTag = state.innerTags[antipode(dest)];
  const moved = { ...state, outer: dest, steps, lastBit: bit };
  if (outerTag === "crack" || innerTag === "void") {
    return { ...moved, status: "lose", loseReason: "trap" };
  }
  if (outerTag === "exit" && innerTag === "exit") {
    return { ...moved, status: "win", loseReason: null };
  }
  if (steps >= STEP_CAP) return { ...moved, status: "lose", loseReason: "cap" };
  return moved;
}

export function resign(state: PlanetState): PlanetState {
  if (state.status !== "play") return state;
  return { ...state, status: "lose", loseReason: "resign" };
}

export interface WalkerFrame {
  readonly up: [number, number, number];
  readonly facing: [number, number, number];
  readonly right: [number, number, number];
}

/**
 * One frame for a walker on the sphere. Up is the radius at arc time t.
 * Facing is the chord from `from` to `to`, laid flat on that tangent plane.
 * Right is facing × up, so local −z (the nose) follows the step instead of a second yaw.
 */
export function frameAlong(from: number, to: number, t: number): WalkerFrame {
  const amount = Math.min(1, Math.max(0, t)) || 0;
  const up = slerp(cellDirection(from), cellDirection(to), amount);
  const start = cellDirection(from);
  const end = cellDirection(to);
  const chord: [number, number, number] = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
  const along = dot(chord, up);
  const facing = normalize(chord[0] - up[0] * along, chord[1] - up[1] * along, chord[2] - up[2] * along);
  const right = normalize(...cross(facing, up));
  return { up, facing, right };
}

export function walkerFrame(cell: number, bit: AxisBit | null): WalkerFrame {
  return frameAlong(cell, (cell ^ (bit ?? 1)) & 7, 0);
}

export function poseOnArc(from: number, to: number, t: number, radius: number): [number, number, number] {
  const amount = Math.min(1, Math.max(0, t)) || 0;
  const a = cellDirection(from);
  const b = cellDirection(to);
  const dir = slerp(a, b, amount);
  return [dir[0] * radius, dir[1] * radius, dir[2] * radius];
}

function slerp(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  const cosine = Math.min(1, Math.max(-1, dot(a, b)));
  const theta = Math.acos(cosine);
  if (theta < 1e-5) return [a[0], a[1], a[2]];
  const sine = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / sine;
  const w2 = Math.sin(t * theta) / sine;
  return normalize(a[0] * w1 + b[0] * w2, a[1] * w1 + b[1] * w2, a[2] * w1 + b[2] * w2);
}

export interface Seam {
  readonly key: number;
  readonly outerOpen: boolean;
  readonly innerOpen: boolean;
  readonly outerA: readonly [number, number, number];
  readonly outerB: readonly [number, number, number];
  readonly innerA: readonly [number, number, number];
  readonly innerB: readonly [number, number, number];
}

export function seams(state: PlanetState): Seam[] {
  const list: Seam[] = [];
  const bits: readonly AxisBit[] = [1, 2, 4];
  for (const bit of bits) {
    for (let cell = 0; cell < 8; cell += 1) {
      const other = cell ^ bit;
      if (cell > other) continue;
      list.push({
        key: edgeKey(cell, bit),
        outerOpen: edgeOpen(state.outerEdges, cell, bit),
        innerOpen: edgeOpen(state.innerEdges, cell, bit),
        outerA: cellPosition(cell, SHELL),
        outerB: cellPosition(other, SHELL),
        innerA: cellPosition(cell, CORE),
        innerB: cellPosition(other, CORE),
      });
    }
  }
  return list;
}
