// Per-game vs-AI records in localStorage (new key, no collision with oiyo:* profile keys).
export type GameRecord = { w: number; l: number; d: number };

const KEY = "oiyo:game-records:v1";

function readAll(): Record<string, GameRecord> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function getRecord(game: string): GameRecord {
  const r = readAll()[game];
  return r && typeof r.w === "number" ? r : { w: 0, l: 0, d: 0 };
}

export function recordResult(game: string, result: "w" | "l" | "d"): GameRecord {
  const all = readAll();
  const r = all[game] ?? { w: 0, l: 0, d: 0 };
  r[result] += 1;
  all[game] = r;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* quota/private mode — records are best-effort */
  }
  return r;
}
