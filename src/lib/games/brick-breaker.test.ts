import { describe, expect, it } from "vitest";
import {
  BRICK_BREAKER_CURVE,
  BRICK_BREAKER_BOARD,
  BRICK_BREAKER_TIME,
  buildBrickBreakerBricks,
  brickBreakerDifficulty,
  brickBreakerNextGoal,
  brickBreakerRecordExtra,
  comboAfterHit,
  createBrickBreakerState,
  launchBrickBreakerBall,
  levelFromBrickBreakerRecord,
  moveBrickBreakerPaddle,
  stepBrickBreaker,
} from "./brick-breaker";
import { frameScale } from "./time-contracts";

describe("Brick Breaker tuning contracts", () => {
  it("keeps the difficulty curve centralized, bounded, and escalating", () => {
    const first = brickBreakerDifficulty(1);
    const third = brickBreakerDifficulty(3);
    const late = brickBreakerDifficulty(99);

    expect(first.rows).toBe(BRICK_BREAKER_CURVE.rows.base);
    expect(third.ballSpeed).toBeGreaterThan(first.ballSpeed);
    expect(third.durableEvery).toBe(BRICK_BREAKER_CURVE.durability.everyNthBrick);
    expect(late.rows).toBe(BRICK_BREAKER_CURVE.rows.max);
    expect(late.ballSpeed).toBe(BRICK_BREAKER_CURVE.ballSpeed.max);
    expect(late.paddleWidth).toBe(BRICK_BREAKER_CURVE.paddleWidth.min);
  });

  it("gives 60 Hz and 120 Hz the same one-second travel", () => {
    const travel = (hz: number) => {
      let previous = 0;
      let distance = 0;
      for (let frame = 1; frame <= hz; frame += 1) {
        const now = (frame * 1_000) / hz;
        distance += 4 * frameScale(previous, now);
        previous = now;
      }
      return distance;
    };

    expect(travel(60)).toBeCloseTo(travel(120), 8);
  });

  it("resets stale combos and preserves compact level metadata in the existing best record", () => {
    expect(comboAfterHit(2, 1_000, 2_000)).toBe(3);
    expect(comboAfterHit(3, 1_000, 2_401)).toBe(1);
    expect(levelFromBrickBreakerRecord(brickBreakerRecordExtra(7))).toBe(7);
    expect(levelFromBrickBreakerRecord("legacy value")).toBe(1);
    expect(brickBreakerNextGoal(0, 0)).toBe(100);
    expect(brickBreakerNextGoal(140, 220)).toBe(300);
  });
});

describe("Brick Breaker deterministic simulation", () => {
  it("produces the same snapshot for the same input and delta sequence", () => {
    const play = () => {
      const state = createBrickBreakerState();
      moveBrickBreakerPaddle(state, 120);
      launchBrickBreakerBall(state);
      for (const delta of [16, 17, 8, 25, 16, 33, 12]) stepBrickBreaker(state, delta);
      return state;
    };

    expect(play()).toEqual(play());
  });

  it("keeps one-second free travel stable at 30, 60, and 120 Hz", () => {
    const travel = (hz: number) => {
      const state = createBrickBreakerState();
      state.bricks = [];
      state.bx = 180;
      state.by = 300;
      state.vx = 1;
      state.vy = 0;
      state.launched = true;
      // Preserve one inert brick so the level-clear transition does not run.
      state.bricks = [{ x: 10, y: 48, w: 10, hits: 1, maxHits: 1, hue: 200, flashUntil: 0 }];
      for (let frame = 0; frame < hz; frame += 1) stepBrickBreaker(state, 1_000 / hz);
      return state.bx;
    };

    expect(travel(30)).toBeCloseTo(travel(60), 8);
    expect(travel(120)).toBeCloseTo(travel(60), 8);
  });

  it("clamps long resumed frames and substeps through a brick collision", () => {
    const state = createBrickBreakerState();
    state.bricks = [{ x: 150, y: 180, w: 60, hits: 1, maxHits: 1, hue: 220, flashUntil: 0 }];
    state.bx = 180;
    state.by = 220;
    state.vx = 0;
    state.vy = -8;
    state.launched = true;

    const events = stepBrickBreaker(state, 5_000);

    expect(state.elapsedMs).toBeCloseTo(BRICK_BREAKER_TIME.maxDeltaMs, 8);
    expect(events.some((event) => event.type === "brick-hit")).toBe(true);
    expect(state.level).toBe(2);
  });

  it("requires two hits for durable bricks and preserves combo scoring", () => {
    const state = createBrickBreakerState();
    state.bricks = [{ x: 150, y: 180, w: 60, hits: 2, maxHits: 2, hue: 220, flashUntil: 0 }];
    state.bx = 180;
    state.by = 195;
    state.vx = 0;
    state.vy = -4;
    state.launched = true;
    const first = stepBrickBreaker(state, BRICK_BREAKER_TIME.fixedStepMs);

    expect(first).toContainEqual(expect.objectContaining({ type: "brick-hit", destroyed: false }));
    expect(state.score).toBe(3);
    expect(state.bricks[0]?.hits).toBe(1);

    state.by = 195;
    state.vy = -4;
    const second = stepBrickBreaker(state, BRICK_BREAKER_TIME.fixedStepMs);

    expect(second).toContainEqual(expect.objectContaining({ type: "brick-hit", destroyed: true }));
    expect(state.score).toBe(15);
    expect(state.combo).toBe(0);
    expect(state.level).toBe(2);
  });

  it("emits life loss and game over without resetting a terminal ball", () => {
    const state = createBrickBreakerState();
    state.lives = 1;
    state.by = BRICK_BREAKER_BOARD.height + BRICK_BREAKER_BOARD.ballRadius + 1;
    state.vy = 4;
    state.launched = true;

    const events = stepBrickBreaker(state, BRICK_BREAKER_TIME.fixedStepMs);

    expect(events.map((event) => event.type)).toEqual(["life-lost", "game-over"]);
    expect(state.gameOver).toBe(true);
    expect(state.launched).toBe(false);
    expect(state.lives).toBe(0);
  });

  it("builds bounded level layouts and clamps paddle input", () => {
    expect(buildBrickBreakerBricks(1)).toHaveLength(28);
    expect(buildBrickBreakerBricks(99)).toHaveLength(49);
    const state = createBrickBreakerState();
    moveBrickBreakerPaddle(state, -1_000);
    expect(state.padX).toBe(state.padW / 2);
    moveBrickBreakerPaddle(state, 1_000);
    expect(state.padX).toBe(BRICK_BREAKER_BOARD.width - state.padW / 2);
  });
});
