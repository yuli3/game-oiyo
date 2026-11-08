import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadHighScore,
  saveHighScore,
  loadGameSave,
  saveGameSave,
  clearGameSave,
} from './game-save';

describe('game-save', () => {
  let memoryStorage: Map<string, string>;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    memoryStorage = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => { memoryStorage.set(key, String(value)); },
      removeItem: (key: string) => { memoryStorage.delete(key); },
      clear: () => { memoryStorage.clear(); },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('high score persistence', () => {
    it('returns default value when no high score exists', () => {
      expect(loadHighScore('test-game', 0)).toBe(0);
      expect(loadHighScore('test-game', 100)).toBe(100);
    });

    it('saves new high score and detects new personal best', () => {
      const res1 = saveHighScore('test-game', 150);
      expect(res1.isNewBest).toBe(true);
      expect(res1.bestScore).toBe(150);
      expect(loadHighScore('test-game')).toBe(150);

      const res2 = saveHighScore('test-game', 120);
      expect(res2.isNewBest).toBe(false);
      expect(res2.bestScore).toBe(150);
      expect(loadHighScore('test-game')).toBe(150);

      const res3 = saveHighScore('test-game', 200);
      expect(res3.isNewBest).toBe(true);
      expect(res3.bestScore).toBe(200);
      expect(loadHighScore('test-game')).toBe(200);
    });
  });

  describe('arbitrary state persistence', () => {
    it('saves and loads structured game state', () => {
      const initial = { level: 1, inventory: ['sword', 'shield'], gold: 50 };
      expect(loadGameSave('rogue-game', initial)).toEqual(initial);

      const updated = { level: 3, inventory: ['sword+1', 'shield', 'ring'], gold: 180 };
      expect(saveGameSave('rogue-game', updated)).toBe(true);
      expect(loadGameSave('rogue-game', initial)).toEqual(updated);
    });

    it('clears state correctly', () => {
      saveGameSave('rogue-game', { level: 5 });
      clearGameSave('rogue-game');
      expect(loadGameSave('rogue-game', { level: 1 })).toEqual({ level: 1 });
    });
  });
});
