/**
 * Universal Lightweight Game Save & High Score Persistence
 * Zero-dependency, SSR-safe, localStorage wrapper for OIYO games.
 */

import { recordBest } from './records';

const STORAGE_PREFIX = 'oiyo:save:';
const HIGHSCORE_PREFIX = 'oiyo:highscore:';

/** High-score ids that predate the page slug they now live on. null = no public page. */
const HIGHSCORE_SLUG: Record<string, string | null> = {
  'backpack-hero': 'satchel-crawl',
  'chess-table': null,
  'into-the-breach': 'mech-grid-tactics',
  'loop-hero': 'loop-road',
  'merge-mansion': 'merge-cottage',
  'mini-metro': 'subway-sketch',
  'paper-flight': 'paper-flight-3d',
  'peglin-rogue': 'peg-dungeon',
  'potion-craft': 'potion-bench',
  'space-pinball': 'space-pinball-3d',
  'spell-tower': 'word-stack',
  'spire-rogue': 'tower-deck-rogue',
  'vampire-survivor': 'night-horde',
};

/** Page slug that the shared records store (achievements, best list) uses for a high-score id. */
export function recordSlugForHighScore(gameId: string): string | null {
  return gameId in HIGHSCORE_SLUG ? HIGHSCORE_SLUG[gameId] : gameId;
}

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
      // Mirror the best into the shared records store so the achievements page sees it.
      // trackPlay:false because some games call saveHighScore on every score change.
      const slug = recordSlugForHighScore(gameId);
      if (slug && Number.isFinite(score)) recordBest(slug, score, 'score', undefined, { trackPlay: false });
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

