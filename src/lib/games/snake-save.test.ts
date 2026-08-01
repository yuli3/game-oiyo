import { describe, expect, it } from "vitest";
import { clearSnakeSave, loadSnakeSave, parseSnakeSave, SNAKE_SAVE_KEY, storeSnakeSave } from "./snake-save";
import { createSnakeGame, pauseSnake, steerSnake, tickSnake, type SnakeState } from "./snake";

const NOW = Date.UTC(2026, 7, 1, 12, 0, 0);

function validState(): SnakeState {
  return tickSnake(steerSnake(createSnakeGame(42), { x: 1, y: 0 }));
}

function serialized(state: SnakeState = validState(), savedAtEpochMs = NOW): string {
  return JSON.stringify({ version: 1, state, savedAtEpochMs });
}

describe("snake active save", () => {
  it("round-trips a cloned nonterminal state", () => {
    const state = pauseSnake(validState());
    const parsed = parseSnakeSave(serialized(state), NOW);
    expect(parsed?.state).toEqual(state);
    expect(parsed?.state).not.toBe(state);
    expect(parsed?.state.snake).not.toBe(state.snake);
  });

  it("fails closed on malformed, terminal, future, or inconsistent saves", () => {
    expect(parseSnakeSave(null, NOW)).toBeNull();
    expect(parseSnakeSave("not json {", NOW)).toBeNull();
    expect(parseSnakeSave(serialized({ ...validState(), status: "over" }), NOW)).toBeNull();
    expect(parseSnakeSave(serialized(validState(), NOW + 600_000), NOW)).toBeNull();
    expect(parseSnakeSave(serialized({ ...validState(), score: 10 }), NOW)).toBeNull();
    expect(parseSnakeSave(serialized({ ...validState(), food: { ...validState().snake[0] } }), NOW)).toBeNull();
    expect(parseSnakeSave(serialized({ ...validState(), snake: [{ x: 1, y: 1 }, { x: 3, y: 1 }], score: 10 }), NOW)).toBeNull();
  });

  it("stores, loads, and clears through a storage boundary", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    const state = validState();
    storeSnakeSave(state, NOW, storage);
    expect(loadSnakeSave(NOW, storage)?.state).toEqual(state);
    expect(values.has(SNAKE_SAVE_KEY)).toBe(true);
    clearSnakeSave(storage);
    expect(values.has(SNAKE_SAVE_KEY)).toBe(false);
  });
});
