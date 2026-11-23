/**
 * 의도 (2026-10-15 세운): 플레이어는 걷지 않고 던전을 90도씩 돌려,
 * 길이 하나일 때만 스스로 걷는 모험가를 출구로 보낸다.
 * 칸은 손작성 열 판에서 시드가 고른다. 같은 시드는 같은 판이다.
 * 매 프레임 난수로 길을 만들지 않는다. Math.random 을 넣지 않는다.
 *
 * 모험가는 회전과 함께 이동하지 않는다. 방·구덩이·출구 아치가 돌고,
 * 모험가는 그 칸에 남는다. 출구 칸으로 걸어 들어갈 때만 이긴다.
 * 출구가 발밑으로 미끄러져 와도 이긴 것이 아니다.
 * 구덩이로 걷거나 구덩이가 발밑으로 오면 진다. 걸음 24도 진다.
 */

export const STEP_CAP = 24;
export const CELL_GAP = 1.2;

/** Same direction as components/games/spirit-vale-toon.ts KEY_LIGHT, so the arcade has one key light. */
export const KEY_LIGHT: readonly [number, number, number] = normalize(0.55, 0.72, 0.42);

const XP = 1;
const XM = 2;
const YP = 4;
const YM = 8;
const ZP = 16;
const ZM = 32;

const DIRS: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
const OPP = [1, 0, 3, 2, 5, 4] as const;
const BITS = [XP, XM, YP, YM, ZP, ZM] as const;
const PLANE: Record<Axis, readonly [number, number]> = {
  z: [0, 1],
  x: [1, 2],
  y: [2, 0],
};
const AXIS_INDEX: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

export type Axis = "x" | "y" | "z";
export type Turn = 1 | -1;
export type Tag = "empty" | "trap" | "exit";
export type LoseReason = "trap" | "cap" | "resign";
export type Move =
  | { readonly axis: Axis; readonly layer: 0 | 1; readonly turn: Turn }
  | "step";

export interface DungeonState {
  readonly puzzleId: string;
  readonly rooms: readonly number[];
  readonly tags: readonly Tag[];
  readonly hero: readonly [number, number, number];
  readonly cameFrom: number | null;
  readonly steps: number;
  readonly status: "play" | "win" | "lose";
  readonly loseReason: LoseReason | null;
}

interface PuzzleDef {
  readonly id: string;
  readonly rooms: readonly number[];
  readonly tags: readonly Tag[];
  readonly solution: readonly Move[];
}

const empty = "empty" as const;

/**
 * Four hand-checked boards. `solution` is replayed by the test; it is not shown.
 * chimney: the upper floor must turn before the shaft opens. Stepping alone waits.
 * pit-step: the first step is a pit. The wrong turn slides that pit under the hero.
 * side-door: a north exit opens only after a y turn and an x turn.
 * twist: the exit is one step away only after an x turn and a y turn. Stepping first dies.
 */
export const PUZZLES: readonly PuzzleDef[] = [
  {
    id: "chimney",
    rooms: [XP, XM | YP, 0, YM | ZP, 0, XP | YM, ZM, 0],
    tags: [empty, empty, empty, empty, empty, "trap", "exit", empty],
    solution: [{ axis: "z", layer: 1, turn: -1 }, "step", "step", "step"],
  },
  {
    id: "pit-step",
    rooms: [XP, XM, XP | YP, XM | ZP, 0, 0, 0, ZM],
    tags: [empty, "trap", empty, empty, empty, empty, empty, "exit"],
    solution: [{ axis: "x", layer: 1, turn: -1 }, "step", "step"],
  },
  {
    id: "side-door",
    rooms: [XP, XM | YP, ZP, YM, 0, 0, 0, 0],
    tags: [empty, "trap", "exit", empty, empty, empty, empty, empty],
    solution: [
      { axis: "y", layer: 1, turn: -1 },
      { axis: "x", layer: 1, turn: -1 },
      "step",
    ],
  },
  {
    id: "twist",
    rooms: [XP, XM | YP, XP, YM, 0, 0, 0, 0],
    tags: [empty, empty, "exit", "trap", empty, empty, empty, empty],
    solution: [
      { axis: "x", layer: 0, turn: -1 },
      { axis: "y", layer: 0, turn: 1 },
      "step",
    ],
  },  // Stages 5-10 (stage range 2026-11-21): each solution is the one shortest line, checked by a search in the tests.
  {
    id: "north-arch",
    rooms: [XP | YP, XP | YP, 0, XP | YP, XP | YP, XP, XP | YP, 0],
    tags: [empty, "exit", empty, empty, "trap", empty, empty, empty],
    solution: [
      { axis: "z", layer: 0, turn: 1 },
      { axis: "x", layer: 0, turn: -1 },
      { axis: "z", layer: 0, turn: 1 },
      "step",
    ],
  },
  {
    id: "quiet-stair",
    rooms: [XP, 0, YP, ZP, XP, 0, YP, XP],
    tags: [empty, empty, empty, empty, "exit", empty, empty, empty],
    solution: [
      { axis: "y", layer: 0, turn: 1 },
      { axis: "z", layer: 0, turn: -1 },
      { axis: "y", layer: 0, turn: 1 },
      "step",
    ],
  },
  {
    id: "upper-ring",
    rooms: [ZP, 0, YP | ZP, XP | ZP, YP, 0, ZP, 0],
    tags: [empty, empty, "exit", "trap", empty, empty, empty, empty],
    solution: [
      { axis: "y", layer: 1, turn: -1 },
      { axis: "z", layer: 0, turn: 1 },
      { axis: "y", layer: 0, turn: -1 },
      "step",
    ],
  },
  {
    id: "far-wheel",
    rooms: [XP, XP | ZP, 0, 0, XP, 0, XP | YP, ZP],
    tags: [empty, "exit", empty, empty, empty, empty, "trap", empty],
    solution: [
      { axis: "x", layer: 1, turn: 1 },
      { axis: "z", layer: 0, turn: -1 },
      { axis: "x", layer: 0, turn: 1 },
      "step",
    ],
  },
  {
    id: "roof-turn",
    rooms: [ZP, 0, XM | ZP, XP | YP, YP, XP | ZP, 0, XP],
    tags: [empty, empty, empty, empty, "exit", empty, empty, empty],
    solution: [
      { axis: "z", layer: 1, turn: 1 },
      { axis: "y", layer: 0, turn: -1 },
      { axis: "z", layer: 0, turn: 1 },
      "step",
    ],
  },
  {
    id: "pit-corner",
    rooms: [XP, ZP, YP, 0, XP, XP | YP, XP | YP, YP],
    tags: [empty, empty, empty, empty, "exit", empty, empty, "trap"],
    solution: [
      { axis: "z", layer: 1, turn: -1 },
      { axis: "x", layer: 0, turn: 1 },
      { axis: "z", layer: 0, turn: -1 },
      "step",
    ],
  },
  // Stages 11-20 (2026-11-23): four turns and one step, each the one shortest line.
  {
    id: "moss-gate",
    rooms: [0, XM | YM, 0, 0, XP, 0, YM, XP],
    tags: [empty, "trap", empty, "trap", "exit", empty, empty, "trap"],
    solution: [
      { axis: "y", layer: 0, turn: -1 },
      { axis: "y", layer: 0, turn: -1 },
      { axis: "z", layer: 1, turn: 1 },
      { axis: "x", layer: 0, turn: 1 },
      "step",
    ],
  },
  {
    id: "bone-bridge",
    rooms: [0, ZP, 0, 0, XP, XP | YP | ZP, 0, XP],
    tags: [empty, "exit", "trap", empty, "trap", empty, empty, empty],
    solution: [
      { axis: "z", layer: 1, turn: -1 },
      { axis: "x", layer: 1, turn: 1 },
      { axis: "z", layer: 0, turn: -1 },
      { axis: "x", layer: 0, turn: 1 },
      "step",
    ],
  },
  {
    id: "ash-stair",
    rooms: [XP | ZM, ZP | ZM, 0, XP | ZP, YP, YM, XP | YP, 0],
    tags: ["exit", empty, "trap", "trap", "trap", empty, "trap", empty],
    solution: [
      { axis: "x", layer: 1, turn: 1 },
      { axis: "y", layer: 0, turn: 1 },
      { axis: "x", layer: 1, turn: -1 },
      { axis: "z", layer: 0, turn: -1 },
      "step",
    ],
  },
  {
    id: "lantern-drop",
    rooms: [0, YM, YM, YM, ZP, 0, 0, 0],
    tags: [empty, "trap", "exit", empty, "trap", empty, "trap", "trap"],
    solution: [
      { axis: "x", layer: 1, turn: 1 },
      { axis: "z", layer: 1, turn: -1 },
      { axis: "x", layer: 1, turn: 1 },
      { axis: "y", layer: 0, turn: 1 },
      "step",
    ],
  },
  {
    id: "iron-cage",
    rooms: [0, 0, XM, 0, 0, XM, 0, XM],
    tags: [empty, "trap", "trap", empty, "trap", empty, "trap", "exit"],
    solution: [
      { axis: "y", layer: 1, turn: -1 },
      { axis: "x", layer: 1, turn: 1 },
      { axis: "y", layer: 0, turn: 1 },
      { axis: "z", layer: 1, turn: 1 },
      "step",
    ],
  },
  {
    id: "echo-hall",
    rooms: [0, 0, 0, 0, ZM, ZP, ZM, 0],
    tags: [empty, "trap", empty, "trap", "exit", "trap", empty, "trap"],
    solution: [
      { axis: "y", layer: 1, turn: 1 },
      { axis: "x", layer: 1, turn: -1 },
      { axis: "y", layer: 1, turn: 1 },
      { axis: "z", layer: 0, turn: 1 },
      "step",
    ],
  },
  {
    id: "dust-crypt",
    rooms: [ZM, XM | YP | YM, 0, 0, XP | YM, XP, XP | YM, 0],
    tags: [empty, "trap", empty, empty, "exit", empty, empty, empty],
    solution: [
      { axis: "y", layer: 0, turn: -1 },
      { axis: "y", layer: 0, turn: -1 },
      { axis: "z", layer: 1, turn: 1 },
      { axis: "x", layer: 0, turn: 1 },
      "step",
    ],
  },
  {
    id: "ember-well",
    rooms: [0, 0, 0, 0, YP, XM, 0, 0],
    tags: [empty, empty, "trap", empty, "exit", empty, empty, empty],
    solution: [
      { axis: "x", layer: 0, turn: 1 },
      { axis: "x", layer: 0, turn: 1 },
      { axis: "z", layer: 1, turn: -1 },
      { axis: "y", layer: 0, turn: -1 },
      "step",
    ],
  },
  {
    id: "crown-vault",
    rooms: [XM, 0, YP | YM, XP | YM, XP, 0, 0, YP | ZM],
    tags: [empty, "trap", "exit", empty, "trap", empty, empty, "trap"],
    solution: [
      { axis: "x", layer: 1, turn: 1 },
      { axis: "z", layer: 1, turn: -1 },
      { axis: "x", layer: 1, turn: 1 },
      { axis: "y", layer: 0, turn: 1 },
      "step",
    ],
  },
  {
    id: "last-door",
    rooms: [0, YP, XP | YP, ZP, ZP, XP, XP, 0],
    tags: [empty, "exit", "trap", empty, empty, empty, "trap", empty],
    solution: [
      { axis: "y", layer: 1, turn: 1 },
      { axis: "x", layer: 1, turn: -1 },
      { axis: "y", layer: 0, turn: 1 },
      { axis: "x", layer: 0, turn: -1 },
      "step",
    ],
  },
];

export const PUZZLE_COUNT = PUZZLES.length;

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

export function cellIndex(x: number, y: number, z: number): number {
  return x + 2 * y + 4 * z;
}

/** Logic z is up, so it maps to world y. Logic +y maps to world +z. */
export function cellCenter(x: number, y: number, z: number): [number, number, number] {
  return [(x - 0.5) * CELL_GAP, (z - 0.5) * CELL_GAP, (y - 0.5) * CELL_GAP];
}

export function doorOpen(mask: number, dir: number): boolean {
  return (mask & (1 << dir)) !== 0;
}

export function doorWorldOffset(dir: number): [number, number, number] {
  const [lx, ly, lz] = DIRS[dir] ?? [0, 0, 0];
  return [lx * 0.46, lz * 0.46, ly * 0.46];
}

/**
 * Yaw of a mesh whose lantern sits on local +x.
 * Three.js rotation.y sends that axis to (cos θ, 0, −sin θ).
 * Logic +y is world +z, so the north corridor is θ = −π/2 (2026-10-15).
 */
export function heroYaw(dir: number | null): number {
  if (dir === 1) return Math.PI;
  if (dir === 2) return -Math.PI / 2;
  if (dir === 3) return Math.PI / 2;
  return 0;
}

/**
 * Euler a room group needs while its slice turns.
 * Object3D rotation sends +x toward −z, but a positive logic turn sends world +x toward world +z,
 * so every axis is negated. t = 1 leaves doors on the bits rotateMask writes.
 * `|| 0` drops the negative zero that -turn * 0 produces, so a resting room is exactly identity.
 */
export function sliceEuler(axis: Axis, turn: Turn, t: number): [number, number, number] {
  const angle = -turn * (Math.PI / 2) * t || 0;
  if (axis === "x") return [angle, 0, 0];
  if (axis === "z") return [0, angle, 0];
  return [0, 0, angle];
}

export function rotateCell(x: number, y: number, z: number, axis: Axis, turn: Turn): [number, number, number] {
  const point = [x, y, z];
  const [ai, bi] = PLANE[axis];
  const a = point[ai] === 0 ? -1 : 1;
  const b = point[bi] === 0 ? -1 : 1;
  const [na, nb] = turn === 1 ? [-b, a] : [b, -a];
  point[ai] = na < 0 ? 0 : 1;
  point[bi] = nb < 0 ? 0 : 1;
  return [point[0], point[1], point[2]];
}

function rotateDir(dir: number, axis: Axis, turn: Turn): number {
  const vector = [...DIRS[dir]];
  const [ai, bi] = PLANE[axis];
  const [na, nb] = turn === 1 ? [-vector[bi], vector[ai]] : [vector[bi], -vector[ai]];
  vector[ai] = na;
  vector[bi] = nb;
  const found = DIRS.findIndex((candidate) => candidate[0] === vector[0] && candidate[1] === vector[1] && candidate[2] === vector[2]);
  if (found < 0) throw new Error("reverse-dungeon direction rotation left the six axes");
  return found;
}

function rotateMask(mask: number, axis: Axis, turn: Turn): number {
  let next = 0;
  for (let dir = 0; dir < 6; dir += 1) {
    if (mask & BITS[dir]) next |= BITS[rotateDir(dir, axis, turn)];
  }
  return next;
}

/**
 * World position of a cell while its slice turns.
 * t = 1 matches cellCenter(rotateCell(...)), so the mesh and the rule share one frame.
 */
export function poseOnArc(x: number, y: number, z: number, axis: Axis, turn: Turn, t: number): [number, number, number] {
  const angle = turn * (Math.PI / 2) * t;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  let lx = x - 0.5;
  let ly = y - 0.5;
  let lz = z - 0.5;
  if (axis === "z") {
    const nx = lx * c - ly * s;
    const ny = lx * s + ly * c;
    lx = nx;
    ly = ny;
  } else if (axis === "x") {
    const ny = ly * c - lz * s;
    const nz = ly * s + lz * c;
    ly = ny;
    lz = nz;
  } else {
    const nz = lz * c - lx * s;
    const nx = lz * s + lx * c;
    lz = nz;
    lx = nx;
  }
  return [lx * CELL_GAP, lz * CELL_GAP, ly * CELL_GAP];
}

function cellsMatch(a: readonly [number, number, number], b: readonly [number, number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function mixSeed(seed: number): number {
  let state = (Number.isFinite(seed) ? Math.trunc(seed) : 0) >>> 0;
  state = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(state ^ (state >>> 15), state | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

/**
 * The first ten boards keep their old seed mapping, so a shared seed still opens the same board.
 * Stages 11+ live at their own seed block: STAGE_SEED_BASE + index.
 */
export const LEGACY_PUZZLE_COUNT = 10;
export const STAGE_SEED_BASE = 0x5244_0000;

export function puzzleIndexForSeed(seed: number): number {
  const whole = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  const offset = whole - STAGE_SEED_BASE;
  if (offset >= LEGACY_PUZZLE_COUNT && offset < PUZZLES.length) return offset;
  return mixSeed(seed) % LEGACY_PUZZLE_COUNT;
}

export function nextSeed(seed: number): number {
  const current = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return mixSeed(current + 1);
}

function makeState(puzzle: PuzzleDef, hero: readonly [number, number, number] = [0, 0, 0], cameFrom: number | null = null): DungeonState {
  return {
    puzzleId: puzzle.id,
    rooms: puzzle.rooms.slice(),
    tags: puzzle.tags.slice(),
    hero,
    cameFrom,
    steps: 0,
    status: "play",
    loseReason: null,
  };
}

/** Smallest seed that opens stage `index`, so a stage button reuses the seed path (address, share card). */
export function seedForPuzzle(index: number): number {
  const target = ((Math.trunc(index) % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
  if (target >= LEGACY_PUZZLE_COUNT) return STAGE_SEED_BASE + target;
  for (let seed = 0; ; seed += 1) if (puzzleIndexForSeed(seed) === target) return seed;
}

export function createReverseDungeon(seed = 0): DungeonState {
  return makeState(PUZZLES[puzzleIndexForSeed(seed)]);
}

export function makeDungeon(input: {
  rooms: readonly number[];
  tags: readonly Tag[];
  hero?: readonly [number, number, number];
  cameFrom?: number | null;
}): DungeonState {
  return makeState(
    { id: "custom", rooms: input.rooms, tags: input.tags, solution: [] },
    input.hero ?? [0, 0, 0],
    input.cameFrom ?? null,
  );
}

function isOpen(rooms: readonly number[], hero: readonly [number, number, number], dir: number): boolean {
  const [dx, dy, dz] = DIRS[dir];
  const next: [number, number, number] = [hero[0] + dx, hero[1] + dy, hero[2] + dz];
  if (next.some((value) => value < 0 || value > 1)) return false;
  const here = rooms[cellIndex(hero[0], hero[1], hero[2])] ?? 0;
  const there = rooms[cellIndex(next[0], next[1], next[2])] ?? 0;
  return (here & BITS[dir]) !== 0 && (there & BITS[OPP[dir]]) !== 0;
}

/** The single corridor that is not the door they entered. Junctions and dead ends wait. */
export function forwardDir(state: DungeonState): number | null {
  const options: number[] = [];
  for (let dir = 0; dir < 6; dir += 1) {
    if (!isOpen(state.rooms, state.hero, dir)) continue;
    if (state.cameFrom !== null && dir === state.cameFrom) continue;
    options.push(dir);
  }
  return options.length === 1 ? options[0] : null;
}

/** Corridor they will walk, or the way they last came once the path ahead is a junction. */
export function facingDir(state: DungeonState): number | null {
  const ahead = forwardDir(state);
  if (ahead !== null) return ahead;
  if (state.cameFrom === null) return null;
  return OPP[state.cameFrom] ?? null;
}

function lose(state: DungeonState, loseReason: LoseReason, hero = state.hero, cameFrom = state.cameFrom, steps = state.steps): DungeonState {
  return { ...state, hero, cameFrom, steps, status: "lose", loseReason };
}

export function rotateSlice(state: DungeonState, axis: Axis, layer: number, turn: number): DungeonState {
  if (state.status !== "play") return state;
  if ((layer !== 0 && layer !== 1) || (turn !== 1 && turn !== -1)) return state;
  const signed = turn as Turn;
  const rooms = state.rooms.slice();
  const tags = state.tags.slice();
  for (let x = 0; x < 2; x += 1) {
    for (let y = 0; y < 2; y += 1) {
      for (let z = 0; z < 2; z += 1) {
        const point: [number, number, number] = [x, y, z];
        if (point[AXIS_INDEX[axis]] !== layer) continue;
        const source = rotateCell(x, y, z, axis, signed === 1 ? -1 : 1);
        const from = cellIndex(source[0], source[1], source[2]);
        const to = cellIndex(x, y, z);
        rooms[to] = rotateMask(state.rooms[from] ?? 0, axis, signed);
        tags[to] = state.tags[from] ?? "empty";
      }
    }
  }
  let cameFrom = state.cameFrom;
  if (cameFrom !== null && state.hero[AXIS_INDEX[axis]] === layer) cameFrom = rotateDir(cameFrom, axis, signed);
  const next: DungeonState = { ...state, rooms, tags, cameFrom };
  const under = tags[cellIndex(state.hero[0], state.hero[1], state.hero[2])];
  if (under === "trap") return lose(next, "trap");
  return next;
}

export function stepAdventurer(state: DungeonState): DungeonState {
  if (state.status !== "play") return state;
  const dir = forwardDir(state);
  if (dir === null) return state;
  const [dx, dy, dz] = DIRS[dir];
  const hero: [number, number, number] = [state.hero[0] + dx, state.hero[1] + dy, state.hero[2] + dz];
  const steps = state.steps + 1;
  const tag = state.tags[cellIndex(hero[0], hero[1], hero[2])];
  const cameFrom = OPP[dir];
  if (tag === "trap") return lose(state, "trap", hero, cameFrom, steps);
  if (tag === "exit") return { ...state, hero, cameFrom, steps, status: "win", loseReason: null };
  if (steps >= STEP_CAP) return lose(state, "cap", hero, cameFrom, steps);
  return { ...state, hero, cameFrom, steps };
}

export function applyMove(state: DungeonState, move: Move): DungeonState {
  if (move === "step") return stepAdventurer(state);
  return rotateSlice(state, move.axis, move.layer, move.turn);
}

export function replay(seed: number, moves: readonly Move[]): DungeonState {
  return moves.reduce(applyMove, createReverseDungeon(seed));
}

export function replayPuzzle(index: number, moves: readonly Move[] = PUZZLES[index]?.solution ?? []): DungeonState {
  const puzzle = PUZZLES[index];
  if (!puzzle) return createReverseDungeon(0);
  return moves.reduce(applyMove, makeState(puzzle));
}

export function resign(state: DungeonState): DungeonState {
  if (state.status !== "play") return state;
  return lose(state, "resign");
}

export function fingerprint(state: DungeonState): string {
  return [
    state.puzzleId,
    state.rooms.join("."),
    state.tags.join("."),
    state.hero.join("."),
    state.cameFrom ?? "-",
    state.steps,
    state.status,
    state.loseReason ?? "-",
  ].join("|");
}
