import { describe, expect, it } from "vitest";
import { createBrickBreakerState, launchBrickBreakerBall, stepBrickBreaker } from "./brick-breaker";
import {
  BRICK_BREAKER_SAVE_KEY,
  clearBrickBreakerSave,
  loadBrickBreakerSave,
  parseBrickBreakerSave,
  serializeBrickBreakerSave,
  storeBrickBreakerSave,
  type BrickBreakerSave,
} from "./brick-breaker-save";

const NOW = Date.parse("2026-07-31T12:00:00.000Z");

function activeSave(): Omit<BrickBreakerSave, "version"> {
  const state = createBrickBreakerState();
  launchBrickBreakerBall(state);
  for (let index = 0; index < 20; index += 1) stepBrickBreaker(state, 16);
  return { state, destroyedBricks: 0, maxCombo: state.combo, savedAtEpochMs: NOW - 1_000 };
}

describe("Brick Breaker active save", () => {
  it("round-trips a complete nonterminal state without sharing brick references", () => {
    const source = activeSave();
    const parsed = parseBrickBreakerSave(serializeBrickBreakerSave(source), NOW)!;
    expect(parsed).toMatchObject({ version: 1, savedAtEpochMs: NOW - 1_000 });
    expect(parsed.state).toEqual(source.state);
    expect(parsed.state).not.toBe(source.state);
    expect(parsed.state.bricks[0]).not.toBe(source.state.bricks[0]);
  });

  it("rejects unknown versions, terminal/completed state, geometry, hits, ranges, and future timestamps", () => {
    const source = activeSave();
    expect(parseBrickBreakerSave(JSON.stringify({ version: 2, ...source }), NOW)).toBeNull();
    expect(parseBrickBreakerSave(serializeBrickBreakerSave({ ...source, state: { ...source.state, gameOver: true } }), NOW)).toBeNull();
    expect(parseBrickBreakerSave(serializeBrickBreakerSave({ ...source, state: { ...source.state, bricks: source.state.bricks.map((brick) => ({ ...brick, hits: 0 })) } }), NOW)).toBeNull();

    const badGeometry = structuredClone(source);
    badGeometry.state.bricks[0]!.x += 1;
    expect(parseBrickBreakerSave(serializeBrickBreakerSave(badGeometry), NOW)).toBeNull();
    const badHits = structuredClone(source);
    badHits.state.bricks[0]!.hits = 99;
    expect(parseBrickBreakerSave(serializeBrickBreakerSave(badHits), NOW)).toBeNull();
    expect(parseBrickBreakerSave(serializeBrickBreakerSave({ ...source, state: { ...source.state, lives: 0 } }), NOW)).toBeNull();
    expect(parseBrickBreakerSave(serializeBrickBreakerSave({ ...source, savedAtEpochMs: NOW + 300_001 }), NOW)).toBeNull();
  });

  it("loads, stores, and clears only its independent key", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    storeBrickBreakerSave(activeSave(), storage);
    expect(values.has(BRICK_BREAKER_SAVE_KEY)).toBe(true);
    expect(loadBrickBreakerSave(NOW, storage)?.state.gameOver).toBe(false);
    clearBrickBreakerSave(storage);
    expect(values.has(BRICK_BREAKER_SAVE_KEY)).toBe(false);
  });
});
