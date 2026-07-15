// Shared helpers for daily-puzzle modes: everyone gets the same puzzle on the
// same calendar day (device-local, matching WordleGame's day convention).

/** Days elapsed since the shared epoch, at device-local midnight. */
export function dayIndex(now: Date = new Date()): number {
  // Turn the device-local civil date into a UTC ordinal before subtracting.
  // Mixing `new Date("YYYY-MM-DD")` (UTC) with local midnight shifts the
  // epoch outside UTC and makes elapsed milliseconds drift across DST.
  const epochOrdinal = Date.UTC(2024, 0, 1);
  const todayOrdinal = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((todayOrdinal - epochOrdinal) / 86400000);
}

/** Device-local calendar date as "YYYY-MM-DD" — the key used by daily streaks. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The calendar day before a "YYYY-MM-DD" key (pure calendar math, no TZ). */
export function previousDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}-${String(prev.getUTCDate()).padStart(2, "0")}`;
}

/** Deterministic PRNG (mulberry32) — same seed, same sequence, every engine. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle (returns a copy) — deterministic under a seeded rng. */
export function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
