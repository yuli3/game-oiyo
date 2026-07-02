// Shared types for game AI opponents.
// Levels: 1=Apprentice(견습생) 2=Adept(숙련가) 3=Master(명인)
export type AiLevel = 1 | 2 | 3;

export type GameMode = "local" | "ai";

/** Pick a random element, biased toward the front of a score-sorted list. */
export function pickWeighted<T>(sorted: T[], topN = 4): T {
  const pool = sorted.slice(0, Math.max(1, Math.min(topN, sorted.length)));
  // weight: first item heaviest (n, n-1, ..., 1)
  const total = (pool.length * (pool.length + 1)) / 2;
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= pool.length - i;
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
