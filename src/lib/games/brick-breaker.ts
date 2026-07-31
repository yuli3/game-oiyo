export type BrickBreakerDifficulty = {
  rows: number;
  ballSpeed: number;
  paddleWidth: number;
  durableEvery: number;
};

export const BRICK_BREAKER_BOARD = {
  width: 360,
  height: 480,
  columns: 7,
  padding: 10,
  brickHeight: 16,
  brickTop: 48,
  ballRadius: 6,
  paddleY: 458,
} as const;

export const BRICK_BREAKER_TIME = {
  fixedStepMs: 1_000 / 60,
  maxDeltaMs: 100,
  maxSubsteps: 8,
} as const;

export type BrickBreakerBrick = {
  x: number;
  y: number;
  w: number;
  hits: number;
  maxHits: number;
  hue: number;
  flashUntil: number;
};

export type BrickBreakerState = {
  padX: number;
  padW: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  bricks: BrickBreakerBrick[];
  score: number;
  lives: number;
  level: number;
  launched: boolean;
  combo: number;
  lastHitAt: number;
  paddleFlashUntil: number;
  elapsedMs: number;
  gameOver: boolean;
};

export type BrickBreakerEvent =
  | { type: "paddle-hit" }
  | { type: "brick-hit"; destroyed: boolean; x: number; y: number; hue: number }
  | { type: "level-clear"; level: number }
  | { type: "life-lost"; lives: number }
  | { type: "game-over"; score: number; level: number };

/**
 * Brick Breaker's single tuning surface. Challenge rises on two readable axes:
 * ball speed and brick durability/density. Keep caps here so late levels stay fair.
 */
export const BRICK_BREAKER_CURVE = {
  rows: { base: 4, perLevel: 1, max: 7 },
  ballSpeed: { base: 3.95, perLevel: 0.28, max: 6.75 },
  paddleWidth: { base: 64, perLevel: -2, min: 48 },
  durability: { startsAtLevel: 3, everyNthBrick: 5, maxHits: 2 },
  comboWindowMs: 1_400,
} as const;

export function brickBreakerDifficulty(level: number): BrickBreakerDifficulty {
  const safeLevel = Math.max(1, Math.floor(level));
  return {
    rows: Math.min(
      BRICK_BREAKER_CURVE.rows.max,
      BRICK_BREAKER_CURVE.rows.base + (safeLevel - 1) * BRICK_BREAKER_CURVE.rows.perLevel,
    ),
    ballSpeed: Math.min(
      BRICK_BREAKER_CURVE.ballSpeed.max,
      BRICK_BREAKER_CURVE.ballSpeed.base + (safeLevel - 1) * BRICK_BREAKER_CURVE.ballSpeed.perLevel,
    ),
    paddleWidth: Math.max(
      BRICK_BREAKER_CURVE.paddleWidth.min,
      BRICK_BREAKER_CURVE.paddleWidth.base + (safeLevel - 1) * BRICK_BREAKER_CURVE.paddleWidth.perLevel,
    ),
    durableEvery: safeLevel >= BRICK_BREAKER_CURVE.durability.startsAtLevel
      ? BRICK_BREAKER_CURVE.durability.everyNthBrick
      : 0,
  };
}

export function comboAfterHit(previousCombo: number, previousHitAt: number, now: number): number {
  return now - previousHitAt <= BRICK_BREAKER_CURVE.comboWindowMs ? previousCombo + 1 : 1;
}

export function buildBrickBreakerBricks(level: number): BrickBreakerBrick[] {
  const difficulty = brickBreakerDifficulty(level);
  const bw = (BRICK_BREAKER_BOARD.width - 2 * BRICK_BREAKER_BOARD.padding) / BRICK_BREAKER_BOARD.columns;
  const bricks: BrickBreakerBrick[] = [];
  for (let row = 0; row < difficulty.rows; row += 1) {
    for (let column = 0; column < BRICK_BREAKER_BOARD.columns; column += 1) {
      const index = row * BRICK_BREAKER_BOARD.columns + column;
      const durable = difficulty.durableEvery > 0 && (index + level) % difficulty.durableEvery === 0;
      bricks.push({
        x: BRICK_BREAKER_BOARD.padding + column * bw,
        y: BRICK_BREAKER_BOARD.brickTop + row * (BRICK_BREAKER_BOARD.brickHeight + 4),
        w: bw,
        hits: durable ? 2 : 1,
        maxHits: durable ? 2 : 1,
        hue: 200 + row * 22,
        flashUntil: 0,
      });
    }
  }
  return bricks;
}

export function resetBrickBreakerBall(state: BrickBreakerState): void {
  state.launched = false;
  state.bx = state.padX;
  state.by = BRICK_BREAKER_BOARD.height - 34;
  const speed = brickBreakerDifficulty(state.level).ballSpeed;
  state.vx = speed * 0.5;
  state.vy = -speed;
  state.combo = 0;
}

export function createBrickBreakerState(): BrickBreakerState {
  const state: BrickBreakerState = {
    padX: BRICK_BREAKER_BOARD.width / 2,
    padW: brickBreakerDifficulty(1).paddleWidth,
    bx: BRICK_BREAKER_BOARD.width / 2,
    by: BRICK_BREAKER_BOARD.height - 34,
    vx: 0,
    vy: 0,
    bricks: buildBrickBreakerBricks(1),
    score: 0,
    lives: 3,
    level: 1,
    launched: false,
    combo: 0,
    lastHitAt: Number.NEGATIVE_INFINITY,
    paddleFlashUntil: 0,
    elapsedMs: 0,
    gameOver: false,
  };
  resetBrickBreakerBall(state);
  return state;
}

export function moveBrickBreakerPaddle(state: BrickBreakerState, x: number): void {
  state.padX = Math.max(state.padW / 2, Math.min(BRICK_BREAKER_BOARD.width - state.padW / 2, x));
  if (!state.launched) state.bx = state.padX;
}

export function launchBrickBreakerBall(state: BrickBreakerState): void {
  if (!state.gameOver) state.launched = true;
}

function simulateBrickBreakerSubstep(
  state: BrickBreakerState,
  deltaMs: number,
  events: BrickBreakerEvent[],
): void {
  if (!state.launched || state.gameOver) return;
  const scale = deltaMs / BRICK_BREAKER_TIME.fixedStepMs;
  const { width, height, ballRadius, paddleY, brickHeight } = BRICK_BREAKER_BOARD;

  state.bx += state.vx * scale;
  state.by += state.vy * scale;
  if (state.bx < ballRadius) { state.bx = ballRadius; state.vx = Math.abs(state.vx); }
  if (state.bx > width - ballRadius) { state.bx = width - ballRadius; state.vx = -Math.abs(state.vx); }
  if (state.by < ballRadius) { state.by = ballRadius; state.vy = Math.abs(state.vy); }

  if (
    state.by + ballRadius >= paddleY
    && state.by < paddleY + 12
    && Math.abs(state.bx - state.padX) < state.padW / 2 + ballRadius
  ) {
    const offset = (state.bx - state.padX) / (state.padW / 2);
    const speed = Math.hypot(state.vx, state.vy);
    const angle = offset * 1.05;
    state.vx = speed * Math.sin(angle);
    state.vy = -Math.abs(speed * Math.cos(angle));
    state.by = paddleY - ballRadius;
    state.paddleFlashUntil = state.elapsedMs + 110;
    events.push({ type: "paddle-hit" });
  }

  for (const brick of state.bricks) {
    if (brick.hits <= 0) continue;
    if (
      state.bx + ballRadius > brick.x
      && state.bx - ballRadius < brick.x + brick.w
      && state.by + ballRadius > brick.y
      && state.by - ballRadius < brick.y + brickHeight
    ) {
      brick.hits -= 1;
      brick.flashUntil = state.elapsedMs + 130;
      state.combo = comboAfterHit(state.combo, state.lastHitAt, state.elapsedMs);
      state.lastHitAt = state.elapsedMs;
      const destroyed = brick.hits === 0;
      state.score += destroyed ? 10 + Math.min(20, Math.max(0, state.combo - 1) * 2) : 3;
      events.push({
        type: "brick-hit",
        destroyed,
        x: brick.x + brick.w / 2,
        y: brick.y + brickHeight / 2,
        hue: brick.hue,
      });
      const overlapX = Math.min(
        state.bx + ballRadius - brick.x,
        brick.x + brick.w - (state.bx - ballRadius),
      );
      const overlapY = Math.min(
        state.by + ballRadius - brick.y,
        brick.y + brickHeight - (state.by - ballRadius),
      );
      if (overlapX < overlapY) state.vx = -state.vx;
      else state.vy = -state.vy;
      break;
    }
  }

  if (!state.bricks.some((brick) => brick.hits > 0)) {
    state.level += 1;
    state.bricks = buildBrickBreakerBricks(state.level);
    state.padW = brickBreakerDifficulty(state.level).paddleWidth;
    resetBrickBreakerBall(state);
    events.push({ type: "level-clear", level: state.level });
    return;
  }

  if (state.by - ballRadius > height) {
    state.lives -= 1;
    events.push({ type: "life-lost", lives: state.lives });
    if (state.lives <= 0) {
      state.gameOver = true;
      state.launched = false;
      events.push({ type: "game-over", score: state.score, level: state.level });
      return;
    }
    resetBrickBreakerBall(state);
  }
}

/**
 * Deterministic, browser-independent mutable simulation step. The state object is the
 * runtime snapshot; all external effects are returned as events for the adapter.
 */
export function stepBrickBreaker(state: BrickBreakerState, deltaMs: number): BrickBreakerEvent[] {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0 || state.gameOver) return [];
  const clamped = Math.min(deltaMs, BRICK_BREAKER_TIME.maxDeltaMs);
  const steps = Math.min(
    BRICK_BREAKER_TIME.maxSubsteps,
    Math.max(1, Math.ceil(clamped / BRICK_BREAKER_TIME.fixedStepMs)),
  );
  const substepMs = clamped / steps;
  const events: BrickBreakerEvent[] = [];
  for (let step = 0; step < steps && !state.gameOver; step += 1) {
    state.elapsedMs += substepMs;
    simulateBrickBreakerSubstep(state, substepMs, events);
  }
  return events;
}

export function brickBreakerRecordExtra(level: number): string {
  return `level:${Math.max(1, Math.floor(level))}`;
}

export function levelFromBrickBreakerRecord(extra?: string): number {
  const match = /^level:(\d+)$/.exec(extra ?? "");
  return match ? Math.max(1, Number(match[1])) : 1;
}

export function brickBreakerNextGoal(score: number, best: number): number {
  const baseline = Math.max(0, Math.floor(score), Math.floor(best));
  return Math.max(100, Math.ceil((baseline + 1) / 100) * 100);
}
