/**
 * Universal Lightweight Game Save & High Score Persistence
 * Zero-dependency, SSR-safe, localStorage wrapper for OIYO games.
 */

const STORAGE_PREFIX = 'oiyo:save:';
const HIGHSCORE_PREFIX = 'oiyo:highscore:';

function getStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    return null;
  }
  return null;
}

/**
 * Loads the stored high score for a given game identifier.
 */
export function loadHighScore(gameId: string, defaultValue: number = 0): number {
  const storage = getStorage();
  if (!storage) return defaultValue;
  try {
    const raw = storage.getItem(`${HIGHSCORE_PREFIX}${gameId}`);
    if (raw === null) return defaultValue;
    const num = Number(raw);
    return Number.isFinite(num) ? num : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Saves a score if it exceeds the current personal best.
 * Returns whether a new high score was set and the updated best score.
 */
export function saveHighScore(
  gameId: string,
  score: number
): { isNewBest: boolean; bestScore: number } {
  const storage = getStorage();
  if (!storage) {
    return { isNewBest: false, bestScore: score };
  }
  try {
    const currentBest = loadHighScore(gameId, 0);
    if (score > currentBest) {
      storage.setItem(`${HIGHSCORE_PREFIX}${gameId}`, String(score));
      return { isNewBest: true, bestScore: score };
    }
    return { isNewBest: false, bestScore: currentBest };
  } catch {
    return { isNewBest: false, bestScore: score };
  }
}

/**
 * Loads arbitrary JSON-serializable game state safely.
 */
export function loadGameSave<T>(gameId: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(`${STORAGE_PREFIX}${gameId}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Saves arbitrary JSON-serializable game state safely.
 */
export function saveGameSave<T>(gameId: string, data: T): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(`${STORAGE_PREFIX}${gameId}`, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears saved game state for a given game identifier.
 */
export function clearGameSave(gameId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${STORAGE_PREFIX}${gameId}`);
  } catch {
    // ignore
  }
}

