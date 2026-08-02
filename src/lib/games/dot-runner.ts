export const DOT_RUNNER_WIDTH = 800;
export const DOT_RUNNER_HEIGHT = 400;
export const DOT_RUNNER_GROUND = 50;
export const DOT_RUNNER_PLAYER_X = 50;
export const DOT_RUNNER_PLAYER_SIZE = 20;

const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const GAME_SPEED = 5;
const OBSTACLE_FREQUENCY = 0.02;
const ITEM_FREQUENCY = 0.008;
const MAX_FRAME_SCALE = 4;

export interface DotRunnerEntity { x: number; y: number; w: number; h: number; speed: number }
export interface DotRunnerState {
  playerY: number;
  velocityY: number;
  jumping: boolean;
  obstacles: DotRunnerEntity[];
  items: DotRunnerEntity[];
  score: number;
  coins: number;
  elapsedFrames: number;
  rngState: number;
  status: "playing" | "over";
}

export function createDotRunner(seed: number): DotRunnerState {
  return {
    playerY: DOT_RUNNER_HEIGHT - DOT_RUNNER_GROUND - DOT_RUNNER_PLAYER_SIZE,
    velocityY: 0,
    jumping: false,
    obstacles: [],
    items: [],
    score: 0,
    coins: 0,
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

function draw(state: DotRunnerState): number {
  const random = nextRandom(state.rngState);
  state.rngState = random.state;
  return random.value;
}

export function jumpDotRunner(state: DotRunnerState): DotRunnerState {
  if (state.status !== "playing" || state.jumping) return state;
  return { ...state, velocityY: JUMP_FORCE, jumping: true };
}

function overlapsPlayer(entity: DotRunnerEntity, playerY: number): boolean {
  return DOT_RUNNER_PLAYER_X < entity.x + entity.w && DOT_RUNNER_PLAYER_X + DOT_RUNNER_PLAYER_SIZE > entity.x &&
    playerY < entity.y + entity.h && playerY + DOT_RUNNER_PLAYER_SIZE > entity.y;
}

function simulateSubstep(state: DotRunnerState, scale: number): DotRunnerState {
  const next: DotRunnerState = {
    ...state,
    obstacles: state.obstacles.map((entity) => ({ ...entity })),
    items: state.items.map((entity) => ({ ...entity })),
  };
  const previousSurvival = Math.floor((next.elapsedFrames + 1e-9) / 5);
  next.elapsedFrames += scale;
  next.score += Math.floor((next.elapsedFrames + 1e-9) / 5) - previousSurvival;

  next.velocityY += GRAVITY * scale;
  next.playerY += next.velocityY * scale;
  const floorY = DOT_RUNNER_HEIGHT - DOT_RUNNER_GROUND - DOT_RUNNER_PLAYER_SIZE;
  if (next.playerY >= floorY) {
    next.playerY = floorY;
    next.velocityY = 0;
    next.jumping = false;
  }

  if (draw(next) < OBSTACLE_FREQUENCY * scale) {
    const height = 20 + draw(next) * 40;
    next.obstacles.push({ x: DOT_RUNNER_WIDTH, y: DOT_RUNNER_HEIGHT - DOT_RUNNER_GROUND - height, w: 20, h: height, speed: GAME_SPEED + draw(next) * 2 });
  }
  if (draw(next) < ITEM_FREQUENCY * scale) {
    const y = 240 + draw(next) * 75;
    next.items.push({ x: DOT_RUNNER_WIDTH, y, w: 15, h: 15, speed: GAME_SPEED });
  }

  for (const entity of next.obstacles) entity.x -= entity.speed * scale;
  for (const entity of next.items) entity.x -= entity.speed * scale;
  next.obstacles = next.obstacles.filter((entity) => entity.x + entity.w > 0);
  next.items = next.items.filter((entity) => {
    if (!overlapsPlayer(entity, next.playerY)) return entity.x + entity.w > 0;
    next.score += 10;
    next.coins += 1;
    return false;
  });
  if (next.obstacles.some((entity) => overlapsPlayer(entity, next.playerY))) next.status = "over";
  return next;
}

/** Advances at most four 60 Hz frames, subdividing long deltas for collision safety. */
export function stepDotRunner(state: DotRunnerState, frameScale = 1): DotRunnerState {
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
