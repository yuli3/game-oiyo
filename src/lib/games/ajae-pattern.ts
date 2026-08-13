/**
 * Pure rules for the 아재패턴 (Lost Ark key-sequence) trainer.
 *
 * The timing rules live here rather than in the component because a
 * requestAnimationFrame countdown cannot be verified in a preview tab — a
 * backgrounded tab runs rAF at zero frames per second and throttles timers, so
 * the on-screen clock proves nothing. These functions are deterministic, so the
 * tests prove them instead.
 */

export const AJAE_KEYS = ["Q", "W", "E", "R", "A", "S", "D", "F"] as const;
export type AjaeKey = (typeof AJAE_KEYS)[number];

export const AJAE_MIN_LEN = 4;
export const AJAE_MAX_LEN = 8;
const BASE_MS = 4000;
const PER_KEY_MS = 500;

/** Time budget for a pattern: 4s for the shortest, half a second per extra key. */
export function ajaeLimitMs(length: number): number {
  const clamped = Math.min(Math.max(Math.round(length), AJAE_MIN_LEN), AJAE_MAX_LEN);
  return BASE_MS + (clamped - AJAE_MIN_LEN) * PER_KEY_MS;
}

/** A random pattern length inside the playable range. */
export function ajaePatternLength(random: () => number = Math.random): number {
  return AJAE_MIN_LEN + Math.floor(random() * (AJAE_MAX_LEN - AJAE_MIN_LEN + 1));
}

/** A random pattern; keys may repeat, which is what the real mechanic does. */
export function makeAjaePattern(length: number, random: () => number = Math.random): AjaeKey[] {
  return Array.from({ length }, () => AJAE_KEYS[Math.floor(random() * AJAE_KEYS.length)]);
}

export function isAjaeKey(value: string): value is AjaeKey {
  return (AJAE_KEYS as readonly string[]).includes(value);
}

/**
 * Whether a completed pattern counts as a clear. A run that finished after the
 * budget is a timeout even when the countdown never got to fire, which is what
 * happens whenever the player switches tabs mid-round.
 */
export function isAjaeClear(elapsedMs: number, length: number): boolean {
  return elapsedMs <= ajaeLimitMs(length);
}
