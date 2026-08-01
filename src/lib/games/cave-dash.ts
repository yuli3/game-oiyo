export const CAVE_WIDTH = 360;
export const CAVE_HEIGHT = 480;
export const CAVE_SHIP_X = 96;
export const CAVE_SHIP_RADIUS = 11;
export const CAVE_GAP = 138;
export const CAVE_WALL_WIDTH = 52;

const GRAVITY = 0.42;
const LIFT = -6.6;
const INITIAL_SPEED = 2.4;
const SPAWN_DISTANCE = 200;
const MAX_FRAME_SCALE = 4;

export interface CaveWall { x: number; gapY: number; passed: boolean }
export interface CaveDashState {
  y: number;
  vy: number;
  walls: CaveWall[];
  spawnDistance: number;
  score: number;
  speed: number;
  elapsedFrames: number;
  rngState: number;
  status: "playing" | "over";
}

export function createCaveDash(seed: number): CaveDashState {
  return {
    y: CAVE_HEIGHT / 2,
    vy: LIFT,
    walls: [],
    spawnDistance: 120,
    score: 0,
    speed: INITIAL_SPEED,
    elapsedFrames: 0,
    rngState: seed >>> 0,
    status: "playing",
  };
}

function nextRandom(state: number): { state: number; value: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let mixed = next;
  mixed = Math.imul(mixed ^ mixed >>> 15, mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
  return { state: next, value: ((mixed ^ mixed >>> 14) >>> 0) / 4294967296 };
}

export function flapCaveDash(state: CaveDashState): CaveDashState {
  return state.status === "playing" ? { ...state, vy: LIFT } : state;
}

function simulateSubstep(state: CaveDashState, scale: number): CaveDashState {
  const next: CaveDashState = {
    ...state,
    walls: state.walls.map((wall) => ({ ...wall })),
    elapsedFrames: state.elapsedFrames + scale,
    speed: INITIAL_SPEED + state.score * 0.12,
  };
  next.vy += GRAVITY * scale;
  next.y += next.vy * scale;
  next.spawnDistance -= next.speed * scale;

  if (next.spawnDistance <= 0) {
    const random = nextRandom(next.rngState);
    next.rngState = random.state;
    next.walls.push({ x: CAVE_WIDTH, gapY: 70 + random.value * (CAVE_HEIGHT - 140 - CAVE_GAP), passed: false });
    next.spawnDistance += SPAWN_DISTANCE;
  }

  let dead = next.y + CAVE_SHIP_RADIUS > CAVE_HEIGHT || next.y - CAVE_SHIP_RADIUS < 0;
  for (const wall of next.walls) {
    wall.x -= next.speed * scale;
    if (!wall.passed && wall.x + CAVE_WALL_WIDTH < CAVE_SHIP_X) {
      wall.passed = true;
      next.score += 1;
    }
    const overlapsX = CAVE_SHIP_X + CAVE_SHIP_RADIUS > wall.x && CAVE_SHIP_X - CAVE_SHIP_RADIUS < wall.x + CAVE_WALL_WIDTH;
    if (overlapsX && (next.y - CAVE_SHIP_RADIUS < wall.gapY || next.y + CAVE_SHIP_RADIUS > wall.gapY + CAVE_GAP)) dead = true;
  }
  next.walls = next.walls.filter((wall) => wall.x + CAVE_WALL_WIDTH > -4);
  if (dead) next.status = "over";
  return next;
}

/** Advances at most four 60 Hz simulation frames and subdivides long deltas so
 * collision checks cannot tunnel through a wall. */
export function stepCaveDash(state: CaveDashState, frameScale = 1): CaveDashState {
  if (state.status !== "playing" || !Number.isFinite(frameScale) || frameScale <= 0) return state;
  let remaining = Math.min(frameScale, MAX_FRAME_SCALE);
  let next = state;
  while (remaining > 0 && next.status === "playing") {
    const scale = Math.min(1, remaining);
    next = simulateSubstep(next, scale);
    remaining -= scale;
  }
  return next;
}
