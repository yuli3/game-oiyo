import { describe, expect, it } from "vitest";
import { bufferSnakeDirection, createSnakeGame, pauseSnake, resumeSnake, snakeTickMilliseconds, steerSnake, tickSnake, tickSnakeWithCause, type SnakeState } from "./snake";

describe("snake engine", () => {
  it("buffers one legal turn and rejects reversal against the queued turn", () => {
    expect(bufferSnakeDirection({ x: 1, y: 0 }, null, { x: 0, y: -1 }, 4)).toEqual({ x: 0, y: -1 });
    expect(bufferSnakeDirection({ x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }, 4)).toEqual({ x: 0, y: -1 });
    expect(bufferSnakeDirection({ x: 1, y: 0 }, null, { x: -1, y: 0 }, 4)).toBeNull();
  });

  it("uses a bounded deterministic tick interval", () => {
    expect(snakeTickMilliseconds(0)).toBe(150);
    expect(snakeTickMilliseconds(250)).toBe(100);
    expect(snakeTickMilliseconds(10_000)).toBe(50);
    expect(snakeTickMilliseconds(Number.NaN)).toBe(150);
  });

  it("names wall and self collisions", () => {
    const wall: SnakeState = { ...createSnakeGame(9), snake: [{ x: 0, y: 5 }], direction: { x: -1, y: 0 }, status: "playing" };
    expect(tickSnakeWithCause(wall).deathCause).toBe("wall");
    const self: SnakeState = { ...createSnakeGame(9), snake: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }], direction: { x: -1, y: 0 }, status: "playing", score: 30 };
    expect(tickSnakeWithCause(self).deathCause).toBe("self");
  });

  it("waits for the first direction instead of killing an idle player", () => {
    const ready = createSnakeGame(42);
    expect(ready.status).toBe("ready");
    expect(tickSnake(ready)).toEqual(ready);
  });

  it("pauses hidden play and resumes only through a fresh direction", () => {
    const playing = steerSnake(createSnakeGame(42), { x: 1, y: 0 });
    const paused = pauseSnake(playing);
    expect(paused.status).toBe("paused");
    expect(tickSnake(paused)).toBe(paused);
    expect(resumeSnake(paused).status).toBe("playing");
    expect(steerSnake(paused, { x: 0, y: 1 }).status).toBe("playing");
  });

  it("is deterministic for the same seed and inputs", () => {
    const run = () => tickSnake(tickSnake(steerSnake(createSnakeGame(7), { x: 1, y: 0 })));
    expect(run()).toEqual(run());
  });

  it("rejects a direct reversal once the snake has a body", () => {
    const state: SnakeState = {
      ...createSnakeGame(3),
      snake: [{ x: 4, y: 4 }, { x: 3, y: 4 }],
      direction: { x: 1, y: 0 },
      status: "playing",
    };
    expect(steerSnake(state, { x: -1, y: 0 })).toBe(state);
  });

  it("ends on a wall collision without mutating the previous state", () => {
    const state: SnakeState = {
      ...createSnakeGame(9),
      snake: [{ x: 0, y: 5 }],
      direction: { x: -1, y: 0 },
      status: "playing",
    };
    const next = tickSnake(state);
    expect(next.status).toBe("over");
    expect(state.status).toBe("playing");
    expect(next.snake).toEqual(state.snake);
  });

  it("grows, scores, and places deterministic food after eating", () => {
    const base = createSnakeGame(11);
    const state: SnakeState = {
      ...base,
      snake: [{ x: 4, y: 4 }],
      food: { x: 5, y: 4 },
      direction: { x: 1, y: 0 },
      status: "playing",
    };
    const next = tickSnake(state);
    expect(next.score).toBe(10);
    expect(next.snake).toHaveLength(2);
    expect(next.snake).not.toContainEqual(next.food);
    expect(tickSnake(state)).toEqual(next);
  });

  describe("Pillar 2: snake augment modifiers", () => {
    it("wraps seamlessly around walls when wrap augment is active", () => {
      const state: SnakeState = {
        snake: [{ x: 19, y: 10 }],
        food: { x: 5, y: 5 },
        direction: { x: 1, y: 0 },
        status: "playing",
        score: 0,
        rngState: 12345,
      };

      // Without wrap: dies of wall collision
      const dead = tickSnakeWithCause(state);
      expect(dead.state.status).toBe("over");
      expect(dead.deathCause).toBe("wall");

      // With wrap: wraps to x: 0
      const wrapped = tickSnakeWithCause(state, { wrap: true });
      expect(wrapped.state.status).toBe("playing");
      expect(wrapped.state.snake[0]).toEqual({ x: 0, y: 10 });
    });

    it("prevents self-collision death and consumes charge when ghost is active", () => {
      let ghostUsed = false;
      const state: SnakeState = {
        // Snake forming a 4-cell loop about to hit its own body at (5, 5)
        snake: [{ x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 5, y: 5 }],
        food: { x: 0, y: 0 },
        direction: { x: -1, y: 0 },
        status: "playing",
        score: 30,
        rngState: 9999,
      };

      // Without ghost: dies of self-collision
      const dead = tickSnakeWithCause(state);
      expect(dead.state.status).toBe("over");
      expect(dead.deathCause).toBe("self");

      // With ghost: survives and triggers callback
      const survived = tickSnakeWithCause(state, {
        ghostActive: true,
        onGhostUsed: () => { ghostUsed = true; },
      });
      expect(survived.state.status).toBe("playing");
      expect(survived.state.snake[0]).toEqual({ x: 5, y: 5 });
      expect(ghostUsed).toBe(true);
    });

    it("awards golden score bonus when golden modifier is passed", () => {
      const state: SnakeState = {
        snake: [{ x: 5, y: 5 }],
        food: { x: 6, y: 5 },
        direction: { x: 1, y: 0 },
        status: "playing",
        score: 0,
        rngState: 7777,
      };

      const result = tickSnakeWithCause(state, { goldenScoreBonus: 30 });
      expect(result.state.score).toBe(40); // 10 base + 30 bonus
    });
  });
});
