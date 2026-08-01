import { describe, expect, it } from "vitest";
import { createSnakeGame, pauseSnake, resumeSnake, steerSnake, tickSnake, type SnakeState } from "./snake";

describe("snake engine", () => {
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
});
