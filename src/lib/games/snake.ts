import { moveSnake } from "./react-state-transitions";

export type SnakePoint = { x: number; y: number };
export type SnakeDirection = SnakePoint;
export type SnakeStatus = "ready" | "playing" | "over";
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

export function tickSnake(state: SnakeState): SnakeState {
  if (state.status !== "playing" || !state.direction) return state;
  const transition = moveSnake(state.snake, state.direction, state.food, SNAKE_GRID_SIZE);
  if (transition.outcome === "collision") return { ...state, status: "over" };
  if (transition.outcome === "ate") {
    const placed = placeFood(transition.snake, state.rngState);
    return { ...state, snake: transition.snake, food: placed.food, score: state.score + 10, rngState: placed.rngState };
  }
  return { ...state, snake: transition.snake };
}
