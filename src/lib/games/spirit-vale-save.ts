import { SPIRITS } from "./spirit-vale";

/* ────────────────────────────────────────────────────────────────────────────
 * Which spirits the wanderer has caught, kept in its own localStorage key.
 *
 * `records.ts` owns win/loss tallies and best scores for every game; a caught
 * list is neither, so it lives here under a separate namespaced key rather than
 * being bent into that schema. Nothing else in the arcade reads or writes it.
 *
 * localStorage is user-editable and may hold values from older builds, so the
 * reader validates instead of trusting — an edited entry drops out rather than
 * crashing the collection view.
 * ────────────────────────────────────────────────────────────────────────── */

const KEY = "oiyo:spirit-vale:v1";

export interface SpiritValeSave {
  caught: string[];
  /** Experience per spirit id, which drives its stage. */
  xp: Record<string, number>;
}

/** Ids that exist in the current roster — anything else is stale or forged. */
function knownIds(): Set<string> {
  return new Set(SPIRITS.map((s) => s.id));
}

export function loadSave(): SpiritValeSave {
  if (typeof localStorage === "undefined") return { caught: [], xp: {} };
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { caught: [], xp: {} };
    }
    const obj = parsed as Record<string, unknown>;
    const valid = knownIds();

    const rawCaught = obj.caught;
    // De-duplicate as well as filter: a hand-edited file could repeat an id and
    // inflate the "n/12" counter past the roster size.
    const caught = Array.isArray(rawCaught)
      ? [...new Set(rawCaught.filter((id): id is string => typeof id === "string" && valid.has(id)))]
      : [];

    // `xp` was added after the first release, so a save written by the earlier
    // build simply has no field here — absent is normal, not corrupt.
    const xp: Record<string, number> = {};
    const rawXp = obj.xp;
    if (typeof rawXp === "object" && rawXp !== null && !Array.isArray(rawXp)) {
      for (const [id, value] of Object.entries(rawXp as Record<string, unknown>)) {
        if (valid.has(id) && typeof value === "number" && Number.isFinite(value) && value >= 0) {
          xp[id] = value;
        }
      }
    }

    return { caught, xp };
  } catch {
    return { caught: [], xp: {} };
  }
}

function persist(save: SpiritValeSave): SpiritValeSave {
  if (typeof localStorage === "undefined") return save;
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Private-browsing quota errors must not break a caught spirit mid-battle;
    // the run simply stops persisting.
  }
  return save;
}

/** Records a catch. Returns the new save; repeat catches are a no-op. */
export function recordCatch(id: string): SpiritValeSave {
  if (!knownIds().has(id)) return loadSave();
  const save = loadSave();
  if (save.caught.includes(id)) return save;
  return persist({ ...save, caught: [...save.caught, id] });
}

/** Adds experience to a spirit the player owns. Returns the new save. */
export function addXp(id: string, amount: number): SpiritValeSave {
  const save = loadSave();
  if (!knownIds().has(id) || !Number.isFinite(amount) || amount <= 0) return save;
  return persist({ ...save, xp: { ...save.xp, [id]: (save.xp[id] ?? 0) + amount } });
}

export function xpOf(save: SpiritValeSave, id: string): number {
  return save.xp[id] ?? 0;
}

export function clearSave(): SpiritValeSave {
  return persist({ caught: [], xp: {} });
}

export function completion(save: SpiritValeSave): { caught: number; total: number } {
  return { caught: save.caught.length, total: SPIRITS.length };
}
