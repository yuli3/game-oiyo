export type SnakePoint = { x: number; y: number };
export type SnakeDirection = SnakePoint;
export type SnakeStatus = "ready" | "playing" | "paused" | "over";
export type SnakeState = {
  snake: SnakePoint[];
  food: SnakePoint;
  direction: SnakeDirection | null;
  status: SnakeStatus;
  score: number;
  rngState: number;
};

export const SNAKE_GRID_SIZE = 20;

function nextRandom(state: number): { value: number; state: number } {
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return { value: next / 0x100000000, state: next };
}

function placeFood(snake: SnakePoint[], initialState: number): { food: SnakePoint; rngState: number } {
  let rngState = initialState >>> 0;
  for (let attempt = 0; attempt < SNAKE_GRID_SIZE * SNAKE_GRID_SIZE; attempt += 1) {
    const xRoll = nextRandom(rngState);
    const yRoll = nextRandom(xRoll.state);
    rngState = yRoll.state;
    const food = {
      x: Math.floor(xRoll.value * SNAKE_GRID_SIZE),
      y: Math.floor(yRoll.value * SNAKE_GRID_SIZE),
    };
    if (!snake.some((segment) => segment.x === food.x && segment.y === food.y)) return { food, rngState };
  }
  throw new Error("Snake board has no free food cell");
}

export function createSnakeGame(seed: number): SnakeState {
  const snake = [{ x: 10, y: 10 }];
  const placed = placeFood(snake, seed);
  return { snake, food: placed.food, direction: null, status: "ready", score: 0, rngState: placed.rngState };
}

export function steerSnake(state: SnakeState, direction: SnakeDirection): SnakeState {
  if (state.status === "over") return state;
  const isUnitDirection = Math.abs(direction.x) + Math.abs(direction.y) === 1;
  if (!isUnitDirection) return state;
  if (state.direction && state.snake.length > 1 && direction.x === -state.direction.x && direction.y === -state.direction.y) return state;
  return { ...state, direction: { ...direction }, status: "playing" };
}

export function pauseSnake(state: SnakeState): SnakeState {
  return state.status === "playing" ? { ...state, status: "paused" } : state;
}

export function resumeSnake(state: SnakeState): SnakeState {
  return state.status === "paused" && state.direction ? { ...state, status: "playing" } : state;
}

export function isValidSnakeState(value: unknown, allowTerminal = false): value is SnakeState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Partial<SnakeState>;
  if (!Array.isArray(state.snake) || state.snake.length < 1 || state.snake.length > SNAKE_GRID_SIZE ** 2) return false;
  const isPoint = (point: unknown): point is SnakePoint => Boolean(point) && typeof point === "object" && !Array.isArray(point)
    && Number.isInteger((point as SnakePoint).x) && (point as SnakePoint).x >= 0 && (point as SnakePoint).x < SNAKE_GRID_SIZE
    && Number.isInteger((point as SnakePoint).y) && (point as SnakePoint).y >= 0 && (point as SnakePoint).y < SNAKE_GRID_SIZE;
  if (!state.snake.every(isPoint) || !isPoint(state.food)) return false;
  const cells = state.snake.map((point) => `${point.x},${point.y}`);
  if (new Set(cells).size !== cells.length || cells.includes(`${state.food.x},${state.food.y}`)) return false;
  if (state.snake.slice(1).some((point, index) => Math.abs(point.x - state.snake![index].x) + Math.abs(point.y - state.snake![index].y) !== 1)) return false;
  if (!Number.isInteger(state.score) || state.score !== (state.snake.length - 1) * 10) return false;
  if (!Number.isInteger(state.rngState) || state.rngState! < 0 || state.rngState! > 0xffff_ffff) return false;
  if (state.status !== "ready" && state.status !== "playing" && state.status !== "paused" && state.status !== "over") return false;
  if (!allowTerminal && state.status === "over") return false;
  if (state.status === "ready") return state.direction === null && state.snake.length === 1 && state.score === 0;
  const direction = state.direction;
  return Boolean(direction) && Number.isInteger(direction?.x) && Number.isInteger(direction?.y)
    && Math.abs(direction!.x) + Math.abs(direction!.y) === 1;
}

export type SnakeDeathCause = "wall" | "self";
export type SnakeTickResult = { state: SnakeState; deathCause: SnakeDeathCause | null };

export interface SnakeAugmentModifiers {
  wrap?: boolean;
  ghostActive?: boolean;
  onGhostUsed?: () => void;
  goldenScoreBonus?: number;
}

export function snakeTickMilliseconds(score: number): number {
  return Math.max(50, 150 - Math.max(0, Number.isFinite(score) ? score : 0) / 5);
}

export function bufferSnakeDirection(current: SnakeDirection | null, queued: SnakeDirection | null, requested: SnakeDirection, length: number): SnakeDirection | null {
  if (Math.abs(requested.x) + Math.abs(requested.y) !== 1) return queued;
  if (queued) return queued;
  const basis = current;
  if (basis && length > 1 && requested.x === -basis.x && requested.y === -basis.y) return queued;
  return { ...requested };
}

export function tickSnakeWithCause(state: SnakeState, modifiers?: SnakeAugmentModifiers): SnakeTickResult {
  if (state.status !== "playing" || !state.direction) return { state, deathCause: null };
  const head = state.snake[0];
  let nextX = head.x + state.direction.x;
  let nextY = head.y + state.direction.y;

  if (modifiers?.wrap) {
    nextX = (nextX + SNAKE_GRID_SIZE) % SNAKE_GRID_SIZE;
    nextY = (nextY + SNAKE_GRID_SIZE) % SNAKE_GRID_SIZE;
  }

  const wall = !modifiers?.wrap && (nextX < 0 || nextX >= SNAKE_GRID_SIZE || nextY < 0 || nextY >= SNAKE_GRID_SIZE);
  if (wall) {
    return { state: { ...state, status: "over" }, deathCause: "wall" };
  }

  const nextHead = { x: nextX, y: nextY };
  const self = state.snake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);

  if (self) {
    if (modifiers?.ghostActive) {
      modifiers.onGhostUsed?.();
    } else {
      return { state: { ...state, status: "over" }, deathCause: "self" };
    }
  }

  const isEating = nextHead.x === state.food.x && nextHead.y === state.food.y;
  if (isEating) {
    const nextSnake = [nextHead, ...state.snake];
    const placed = placeFood(nextSnake, state.rngState);
    const addedScore = 10 + (modifiers?.goldenScoreBonus ?? 0);
    return {
      state: {
        ...state,
        snake: nextSnake,
        food: placed.food,
        score: state.score + addedScore,
        rngState: placed.rngState,
      },
      deathCause: null,
    };
  }

  const nextSnake = [nextHead, ...state.snake.slice(0, -1)];
  return { state: { ...state, snake: nextSnake }, deathCause: null };
}

export function tickSnake(state: SnakeState, modifiers?: SnakeAugmentModifiers): SnakeState {
  return tickSnakeWithCause(state, modifiers).state;
}
